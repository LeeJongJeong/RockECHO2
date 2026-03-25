import { AppError } from '../lib/AppError'
import type { KnowledgeEntry, RunbookStep } from '../types'
import { buildSystemPrompt, buildUserPrompt } from './prompt'
import { sanitizeKnowledge } from './sanitize'

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>
}

type ChatCompletionPayload = {
  model: string
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  temperature: number
  max_tokens: number
  response_format?: { type: 'json_object' }
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  let attempt = 0

  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, options)
      if (response.ok || [400, 401, 403, 404, 422].includes(response.status)) {
        return response
      }

      if (response.status === 429 || response.status >= 500) {
        throw new Error(`Retryable status: ${response.status}`)
      }

      return response
    } catch (error) {
      attempt += 1
      if (attempt >= maxRetries) {
        throw error
      }

      const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw new Error('Max retries exceeded')
}

function extractJsonObject(content: string): Record<string, unknown> {
  const firstBrace = content.indexOf('{')
  const lastBrace = content.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('No JSON braces found in LLM response')
  }

  return JSON.parse(content.substring(firstBrace, lastBrace + 1)) as Record<string, unknown>
}

function needsKoreanNarrative(value: unknown): value is string {
  return typeof value === 'string' && /[A-Za-z]/.test(value) && !/[\uAC00-\uD7A3]/.test(value)
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

function shouldRetryWithoutJsonMode(status: number, errorText: string): boolean {
  if (![400, 404, 422].includes(status)) {
    return false
  }

  return /response_format|json_object|json schema|unsupported|not support|invalid format/i.test(errorText)
}

function mapKnowledgeFields(rawParsed: Record<string, unknown>): Record<string, unknown> {
  return {
    reasoning: rawParsed['\uCD94\uB860\uACFC\uC815'] || rawParsed.reasoning,
    title: rawParsed['\uC81C\uBAA9'] || rawParsed.title,
    symptom: rawParsed['\uC99D\uC0C1'] || rawParsed.symptom,
    cause: rawParsed['\uC6D0\uC778'] || rawParsed.cause,
    action: rawParsed['\uC870\uCE58'] || rawParsed.action,
    runbook: rawParsed['\uB7F0\uBD81'] || rawParsed.runbook,
    diagnostic_steps: rawParsed['\uC9C4\uB2E8\uB2E8\uACC4'] || rawParsed.diagnostic_steps,
    tags: rawParsed['\uD0DC\uADF8'] || rawParsed.tags,
    aliases: rawParsed['\uC720\uC0AC\uAC80\uC0C9\uC5B4'] || rawParsed.aliases,
    version_range: rawParsed['\uC801\uC6A9\uBC84\uC804'] || rawParsed.version_range,
    ai_quality_score: rawParsed['\uC2E0\uB8B0\uB3C4'] || rawParsed.ai_quality_score
  }
}

function hasText(value: unknown, minLength = 1): boolean {
  return typeof value === 'string' && value.trim().length >= minLength
}

function hasStepList(value: unknown): value is RunbookStep[] {
  return Array.isArray(value) && value.length > 0
}

function needsKnowledgeRepair(entry: Partial<KnowledgeEntry>): boolean {
  return !hasText(entry.title, 5)
    || !hasText(entry.symptom, 8)
    || !hasText(entry.cause, 10)
    || !hasText(entry.action, 10)
    || !hasText(entry.version_range, 1)
    || !hasStepList(entry.runbook)
    || !hasStepList(entry.diagnostic_steps)
}

async function postChatCompletion(
  apiKey: string,
  baseUrl: string,
  payload: ChatCompletionPayload,
  label: string,
  allowJsonModeRetry = true
): Promise<string> {
  let response: Response

  try {
    response = await fetchWithRetry(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
  } catch (error) {
    throw new AppError(`${label} request failed: ${getErrorMessage(error)}`, 503)
  }

  if (!response.ok) {
    const errorText = await response.text()
    if (allowJsonModeRetry && payload.response_format && shouldRetryWithoutJsonMode(response.status, errorText)) {
      const retryPayload: ChatCompletionPayload = { ...payload }
      delete retryPayload.response_format
      return postChatCompletion(apiKey, baseUrl, retryPayload, label, false)
    }

    throw new AppError(`${label} error: ${response.status} ${errorText}`, 502)
  }

  let data: ChatCompletionResponse
  try {
    data = await response.json() as ChatCompletionResponse
  } catch {
    throw new AppError(`${label} returned a non-JSON response`, 502)
  }

  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new AppError(`${label} returned empty content`, 502)
  }

  return content
}

async function localizeNarrativeFields(
  apiKey: string,
  baseUrl: string,
  model: string,
  rawInput: string,
  dbms: string,
  parsed: Record<string, unknown>
): Promise<Partial<Record<'cause' | 'action', string>>> {
  const cause = typeof parsed.cause === 'string' ? parsed.cause.trim() : ''
  const action = typeof parsed.action === 'string' ? parsed.action.trim() : ''

  if (!needsKoreanNarrative(cause) && !needsKoreanNarrative(action)) {
    return {}
  }

  try {
    const content = await postChatCompletion(apiKey, baseUrl, {
      model,
      messages: [
        {
          role: 'system',
          content: [
            'You rewrite RockECHO incident narrative fields into natural Korean.',
            'Return strict JSON only.',
            'Translate only the cause and action values into Korean.',
            'Do not summarize or omit technical meaning.',
            'Preserve SQL, commands, identifiers, product names, version strings, and error codes exactly as-is.'
          ].join('\n')
        },
        {
          role: 'user',
          content: JSON.stringify({
            dbms,
            raw_input: rawInput,
            cause,
            action
          })
        }
      ],
      temperature: 0,
      max_tokens: 1200,
      response_format: { type: 'json_object' }
    }, 'LLM localization')

    const localized = extractJsonObject(content)
    return {
      cause: typeof localized.cause === 'string' && localized.cause.trim() ? localized.cause.trim() : cause,
      action: typeof localized.action === 'string' && localized.action.trim() ? localized.action.trim() : action
    }
  } catch {
    return {}
  }
}

async function repairKnowledgeJson(
  apiKey: string,
  baseUrl: string,
  model: string,
  rawInput: string,
  dbms: string,
  originalContent: string,
  contextInfo = ''
): Promise<Record<string, unknown>> {
  const content = await postChatCompletion(apiKey, baseUrl, {
    model,
    messages: [
      {
        role: 'system',
        content: [
          'You repair RockECHO incident analysis output into one strict JSON object.',
          'All narrative text except SQL, commands, identifiers, product names, version strings, and error codes must be in Korean.',
          'You must include these keys: title, symptom, cause, action, runbook, diagnostic_steps, tags, aliases, version_range, ai_quality_score.',
          'action must be a numbered Korean list.',
          'runbook and diagnostic_steps must each be arrays of objects with step, title, sql.'
        ].join('\n')
      },
      {
        role: 'user',
        content: JSON.stringify({
          dbms,
          raw_input: rawInput,
          context: contextInfo || null,
          previous_response: originalContent
        })
      }
    ],
    temperature: 0.1,
    max_tokens: 4000,
    response_format: { type: 'json_object' }
  }, 'LLM repair')

  return mapKnowledgeFields(extractJsonObject(content))
}

async function parseKnowledgeFromContent(
  apiKey: string,
  baseUrl: string,
  model: string,
  rawInput: string,
  dbms: string,
  content: string,
  contextInfo = ''
): Promise<Partial<KnowledgeEntry>> {
  let parsed: Record<string, unknown>

  try {
    parsed = mapKnowledgeFields(extractJsonObject(content))
  } catch {
    parsed = await repairKnowledgeJson(apiKey, baseUrl, model, rawInput, dbms, content, contextInfo)
  }

  let localized = await localizeNarrativeFields(apiKey, baseUrl, model, rawInput, dbms, parsed)
  let sanitized = sanitizeKnowledge({ ...parsed, ...localized }, rawInput, dbms, { useFallback: false })

  if (needsKnowledgeRepair(sanitized)) {
    parsed = await repairKnowledgeJson(
      apiKey,
      baseUrl,
      model,
      rawInput,
      dbms,
      JSON.stringify({ original_response: content, partial_json: parsed }, null, 2),
      contextInfo
    )
    localized = await localizeNarrativeFields(apiKey, baseUrl, model, rawInput, dbms, parsed)
    sanitized = sanitizeKnowledge({ ...parsed, ...localized }, rawInput, dbms, { useFallback: false })
  }

  if (needsKnowledgeRepair(sanitized)) {
    throw new AppError('LLM returned incomplete structured output', 502)
  }

  return sanitized
}

export async function generateWithOpenAI(
  apiKey: string,
  baseUrl: string,
  rawInput: string,
  dbms: string,
  contextInfo = '',
  modelName = ''
): Promise<Partial<KnowledgeEntry>> {
  const model = modelName || 'gpt-4o-mini'
  const content = await postChatCompletion(apiKey, baseUrl, {
    model,
    messages: [
      { role: 'system', content: buildSystemPrompt(dbms) },
      { role: 'user', content: buildUserPrompt(rawInput, dbms, contextInfo) }
    ],
    temperature: 0.2,
    max_tokens: 4000,
    response_format: { type: 'json_object' }
  }, 'LLM API')

  return parseKnowledgeFromContent(apiKey, baseUrl, model, rawInput, dbms, content, contextInfo)
}
