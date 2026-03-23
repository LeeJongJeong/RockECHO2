import type { KnowledgeEntry } from '../types'
import { generateFallback } from './fallback'
import { buildSystemPrompt, buildUserPrompt } from './prompt'
import { sanitizeKnowledge } from './sanitize'

export async function generateWithOpenAI(
  apiKey: string,
  baseUrl: string,
  rawInput: string,
  dbms: string
): Promise<Partial<KnowledgeEntry>> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: buildSystemPrompt(dbms) },
        { role: 'user', content: buildUserPrompt(rawInput, dbms) }
      ],
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    if (response.status === 401 || response.status === 403) {
      return generateFallback(rawInput, dbms)
    }

    throw new Error(`OpenAI API error: ${response.status} ${errorText}`)
  }

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  const content = data.choices?.[0]?.message?.content || '{}'

  try {
    const parsed = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()) as Record<string, unknown>
    return sanitizeKnowledge(parsed, rawInput, dbms)
  } catch {
    return generateFallback(rawInput, dbms)
  }
}
