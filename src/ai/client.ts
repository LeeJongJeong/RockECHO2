import { AppError } from '../lib/AppError'
import type { KnowledgeEntry, RunbookStep } from '../types'
import {
  buildProcedureRepairSystemPrompt,
  buildProcedureRepairUserPrompt,
  buildProcedureSystemPrompt,
  buildProcedureUserPrompt,
  buildSummaryRepairSystemPrompt,
  buildSummaryRepairUserPrompt,
  buildSummarySystemPrompt,
  buildSummaryUserPrompt
} from './prompt'
import { evaluateKnowledgeQuality, formatQualityIssuesForPrompt } from './quality'
import { extractIncidentSignals, formatIncidentSignals } from './signal-extractor'
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

type SummaryDraft = {
  title?: string
  symptom?: string
  cause?: string
  action?: string
  tags?: string[]
  aliases?: string[]
  version_range?: string
  error_log?: string
  ai_quality_score?: number
}

type ProcedureDraft = {
  action?: string
  runbook?: RunbookStep[]
  diagnostic_steps?: RunbookStep[]
  ai_quality_score?: number
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

function shouldRetryWithoutJsonMode(status: number, errorText: string): boolean {
  if (![400, 404, 422].includes(status)) {
    return false
  }

  return /response_format|json_object|json schema|unsupported|not support|invalid format/i.test(errorText)
}

function needsKoreanNarrative(value: unknown): value is string {
  return typeof value === 'string' && /[A-Za-z]/.test(value) && !/[\uAC00-\uD7A3]/.test(value)
}

function countNumberedLines(action: string): number {
  return action
    .split(/\r?\n/)
    .filter((line) => /^\s*\d+\.\s+/.test(line))
    .length
}

function hasText(value: unknown, minLength = 1): boolean {
  return typeof value === 'string' && value.trim().length >= minLength
}

function hasStepList(value: unknown, minLength = 1): value is RunbookStep[] {
  return Array.isArray(value) && value.length >= minLength
}

function mapSummaryFields(rawParsed: Record<string, unknown>): SummaryDraft {
  return {
    title: (rawParsed['제목'] || rawParsed.title) as string | undefined,
    symptom: (rawParsed['증상'] || rawParsed.symptom) as string | undefined,
    cause: (rawParsed['원인'] || rawParsed.cause) as string | undefined,
    action: (rawParsed['조치'] || rawParsed.action) as string | undefined,
    tags: (rawParsed['태그'] || rawParsed.tags) as string[] | undefined,
    aliases: (rawParsed['유사검색어'] || rawParsed.aliases) as string[] | undefined,
    version_range: (rawParsed['적용버전'] || rawParsed.version_range) as string | undefined,
    error_log: (rawParsed['에러로그'] || rawParsed.error_log) as string | undefined,
    ai_quality_score: (rawParsed['신뢰도'] || rawParsed.ai_quality_score) as number | undefined
  }
}

function mapProcedureFields(rawParsed: Record<string, unknown>): ProcedureDraft {
  return {
    action: (rawParsed['조치'] || rawParsed.action) as string | undefined,
    runbook: (rawParsed['런북'] || rawParsed.runbook) as RunbookStep[] | undefined,
    diagnostic_steps: (rawParsed['진단단계'] || rawParsed.diagnostic_steps) as RunbookStep[] | undefined,
    ai_quality_score: (rawParsed['신뢰도'] || rawParsed.ai_quality_score) as number | undefined
  }
}

function needsSummaryRepair(entry: Partial<KnowledgeEntry>): boolean {
  return !hasText(entry.title, 5)
    || !hasText(entry.symptom, 8)
    || !hasText(entry.cause, 12)
    || !hasText(entry.action, 10)
    || countNumberedLines(entry.action || '') < 3
    || !hasText(entry.version_range, 1)
}

function combineQualityScore(modelScore: number | undefined, proceduralScore: number): number {
  const normalizedModelScore = typeof modelScore === 'number' && Number.isFinite(modelScore)
    ? Math.min(1, Math.max(0, modelScore))
    : proceduralScore

  return Math.min(1, Math.max(0, (normalizedModelScore * 0.35) + (proceduralScore * 0.65)))
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

async function requestSummaryDraft(
  apiKey: string,
  baseUrl: string,
  model: string,
  rawInput: string,
  dbms: string,
  contextInfo: string,
  signalInfo: string
): Promise<Partial<KnowledgeEntry>> {
  const content = await postChatCompletion(apiKey, baseUrl, {
    model,
    messages: [
      { role: 'system', content: buildSummarySystemPrompt(dbms) },
      { role: 'user', content: buildSummaryUserPrompt(rawInput, dbms, contextInfo, signalInfo) }
    ],
    temperature: 0.2,
    max_tokens: 2200,
    response_format: { type: 'json_object' }
  }, 'LLM summary')

  let parsed: SummaryDraft
  try {
    parsed = mapSummaryFields(extractJsonObject(content))
  } catch {
    const repairedContent = await postChatCompletion(apiKey, baseUrl, {
      model,
      messages: [
        { role: 'system', content: buildSummaryRepairSystemPrompt(dbms) },
        { role: 'user', content: buildSummaryRepairUserPrompt(rawInput, dbms, content, contextInfo, signalInfo) }
      ],
      temperature: 0.1,
      max_tokens: 2200,
      response_format: { type: 'json_object' }
    }, 'LLM summary repair')

    parsed = mapSummaryFields(extractJsonObject(repairedContent))
  }

  const localized = await localizeNarrativeFields(apiKey, baseUrl, model, rawInput, dbms, {
    cause: parsed.cause,
    action: parsed.action
  })

  let sanitized = sanitizeKnowledge({ ...parsed, ...localized }, rawInput, dbms, { useFallback: false })
  if (needsSummaryRepair(sanitized)) {
    const repairedContent = await postChatCompletion(apiKey, baseUrl, {
      model,
      messages: [
        { role: 'system', content: buildSummaryRepairSystemPrompt(dbms) },
        {
          role: 'user',
          content: buildSummaryRepairUserPrompt(
            rawInput,
            dbms,
            JSON.stringify({ original_response: content, partial_json: parsed }, null, 2),
            contextInfo,
            signalInfo
          )
        }
      ],
      temperature: 0.1,
      max_tokens: 2200,
      response_format: { type: 'json_object' }
    }, 'LLM summary repair')

    parsed = mapSummaryFields(extractJsonObject(repairedContent))
    const repairedLocalized = await localizeNarrativeFields(apiKey, baseUrl, model, rawInput, dbms, {
      cause: parsed.cause,
      action: parsed.action
    })
    sanitized = sanitizeKnowledge({ ...parsed, ...repairedLocalized }, rawInput, dbms, { useFallback: false })
  }

  if (needsSummaryRepair(sanitized)) {
    throw new AppError('LLM returned incomplete summary output', 502)
  }

  return sanitized
}

async function requestProcedureDraft(
  apiKey: string,
  baseUrl: string,
  model: string,
  rawInput: string,
  dbms: string,
  contextInfo: string,
  summaryDraft: Partial<KnowledgeEntry>,
  signalInfo: string
): Promise<Partial<KnowledgeEntry>> {
  const summaryPayload = {
    title: summaryDraft.title,
    symptom: summaryDraft.symptom,
    cause: summaryDraft.cause,
    action: summaryDraft.action,
    version_range: summaryDraft.version_range,
    error_log: summaryDraft.error_log,
    tags: summaryDraft.tags,
    aliases: summaryDraft.aliases
  }

  const content = await postChatCompletion(apiKey, baseUrl, {
    model,
    messages: [
      { role: 'system', content: buildProcedureSystemPrompt(dbms) },
      { role: 'user', content: buildProcedureUserPrompt(rawInput, dbms, summaryPayload, contextInfo, signalInfo) }
    ],
    temperature: 0.15,
    max_tokens: 3200,
    response_format: { type: 'json_object' }
  }, 'LLM procedures')

  let parsed: ProcedureDraft
  try {
    parsed = mapProcedureFields(extractJsonObject(content))
  } catch {
    const repairedContent = await postChatCompletion(apiKey, baseUrl, {
      model,
      messages: [
        { role: 'system', content: buildProcedureRepairSystemPrompt(dbms) },
        {
          role: 'user',
          content: buildProcedureRepairUserPrompt(
            rawInput,
            dbms,
            summaryPayload,
            { original_response: content },
            '1. [error] The previous procedure response was not valid JSON.',
            contextInfo,
            signalInfo
          )
        }
      ],
      temperature: 0.1,
      max_tokens: 3200,
      response_format: { type: 'json_object' }
    }, 'LLM procedure repair')

    parsed = mapProcedureFields(extractJsonObject(repairedContent))
  }

  let merged = sanitizeKnowledge({
    ...summaryDraft,
    ...parsed
  }, rawInput, dbms, { useFallback: false })

  let qualityReport = evaluateKnowledgeQuality(merged)
  if (qualityReport.needsRepair) {
    const repairedContent = await postChatCompletion(apiKey, baseUrl, {
      model,
      messages: [
        { role: 'system', content: buildProcedureRepairSystemPrompt(dbms) },
        {
          role: 'user',
          content: buildProcedureRepairUserPrompt(
            rawInput,
            dbms,
            summaryPayload,
            {
              action: merged.action,
              runbook: merged.runbook,
              diagnostic_steps: merged.diagnostic_steps
            },
            formatQualityIssuesForPrompt(qualityReport),
            contextInfo,
            signalInfo
          )
        }
      ],
      temperature: 0.1,
      max_tokens: 3200,
      response_format: { type: 'json_object' }
    }, 'LLM procedure repair')

    parsed = mapProcedureFields(extractJsonObject(repairedContent))
    merged = sanitizeKnowledge({
      ...summaryDraft,
      ...parsed
    }, rawInput, dbms, { useFallback: false })
    qualityReport = evaluateKnowledgeQuality(merged)
  }

  if (qualityReport.needsRepair) {
    throw new AppError(`LLM returned low-quality procedure output: ${formatQualityIssuesForPrompt(qualityReport)}`, 502)
  }

  return {
    ...merged,
    ai_quality_score: combineQualityScore(
      typeof parsed.ai_quality_score === 'number' ? parsed.ai_quality_score : summaryDraft.ai_quality_score,
      qualityReport.score / 100
    )
  }
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
  const signalInfo = formatIncidentSignals(extractIncidentSignals(rawInput, dbms))
  const summaryDraft = await requestSummaryDraft(apiKey, baseUrl, model, rawInput, dbms, contextInfo, signalInfo)
  const fullDraft = await requestProcedureDraft(apiKey, baseUrl, model, rawInput, dbms, contextInfo, summaryDraft, signalInfo)

  return sanitizeKnowledge(fullDraft as Record<string, unknown>, rawInput, dbms, { useFallback: false })
}
