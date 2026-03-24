import { AppError } from '../lib/AppError'
import type { KnowledgeEntry } from '../types'
import { generateFallback } from './fallback'
import { buildSystemPrompt, buildUserPrompt } from './prompt'
import { sanitizeKnowledge } from './sanitize'

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  let attempt = 0

  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, options)
      if (response.ok || [400, 401, 403, 404].includes(response.status)) {
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
    const response = await fetchWithRetry(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
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
      })
    })

    if (!response.ok) {
      return {}
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = data.choices?.[0]?.message?.content || '{}'
    const localized = extractJsonObject(content)

    return {
      cause: typeof localized.cause === 'string' && localized.cause.trim() ? localized.cause.trim() : cause,
      action: typeof localized.action === 'string' && localized.action.trim() ? localized.action.trim() : action
    }
  } catch {
    return {}
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
  let response: Response

  try {
    response = await fetchWithRetry(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: buildSystemPrompt(dbms) },
          { role: 'user', content: buildUserPrompt(rawInput, dbms, contextInfo) }
        ],
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      })
    })
  } catch (error) {
    throw new AppError(`OpenAI API retry failed: ${(error as Error).message}`, 503)
  }

  if (!response.ok) {
    const errorText = await response.text()
    if (response.status === 401 || response.status === 403) {
      return generateFallback(rawInput, dbms)
    }

    throw new AppError(`OpenAI API error: ${response.status} ${errorText}`, 502)
  }

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  const content = data.choices?.[0]?.message?.content || '{}'

  try {
    const rawParsed = extractJsonObject(content)
    const parsed = {
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

    const localized = await localizeNarrativeFields(apiKey, baseUrl, model, rawInput, dbms, parsed)

    return sanitizeKnowledge({ ...parsed, ...localized }, rawInput, dbms)
  } catch {
    return generateFallback(rawInput, dbms)
  }
}
