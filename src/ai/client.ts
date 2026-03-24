import { AppError } from '../lib/AppError'
import type { KnowledgeEntry } from '../types'
import { generateFallback } from './fallback'
import { buildSystemPrompt, buildUserPrompt } from './prompt'
import { sanitizeKnowledge } from './sanitize'

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, options);
      if (response.ok || [400, 401, 403, 404].includes(response.status)) {
        return response;
      }
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`Retryable status: ${response.status}`);
      }
      return response;
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        throw error;
      }
      const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

export async function generateWithOpenAI(
  apiKey: string,
  baseUrl: string,
  rawInput: string,
  dbms: string,
  contextInfo = '',
  modelName = ''
): Promise<Partial<KnowledgeEntry>> {
    const model = modelName || 'gpt-4o-mini';
    let response: Response;
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
      });
    } catch (error) {
      throw new AppError(`OpenAI API retry failed: ${(error as Error).message}`, 503);
    }

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401 || response.status === 403) {
        return generateFallback(rawInput, dbms);
      }
      throw new AppError(`OpenAI API error: ${response.status} ${errorText}`, 502);
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
