import type { KnowledgeEntry, RunbookStep } from '../types'
import { generateFallback, getDefaultVersionRange } from './fallback'

function normalizeSteps(value: unknown, prefix: string, fallback: RunbookStep[]): RunbookStep[] {
  if (!Array.isArray(value) || value.length === 0) {
    return fallback
  }

  return value.map((step, index) => {
    const record = step as Partial<RunbookStep>
    return {
      step: typeof record.step === 'number' ? record.step : index + 1,
      title: typeof record.title === 'string' && record.title.trim() ? record.title.trim() : `${prefix} ${index + 1}`,
      sql: typeof record.sql === 'string' ? record.sql : ''
    }
  })
}

export function sanitizeKnowledge(parsed: Record<string, unknown>, rawInput: string, dbms: string): Partial<KnowledgeEntry> {
  const fallback = generateFallback(rawInput, dbms)
  const title = typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : fallback.title
  const symptom = typeof parsed.symptom === 'string' && parsed.symptom.trim().length > 10 ? parsed.symptom.trim() : rawInput
  const cause = typeof parsed.cause === 'string' && parsed.cause.trim().length > 10 ? parsed.cause.trim() : fallback.cause
  const action = typeof parsed.action === 'string' && parsed.action.trim().length > 10 ? parsed.action.trim() : fallback.action
  const runbook = normalizeSteps(parsed.runbook, 'Step', fallback.runbook || [])
  const diagnostic_steps = normalizeSteps(parsed.diagnostic_steps, 'Check', fallback.diagnostic_steps || [])
  const tags = Array.isArray(parsed.tags) && parsed.tags.length > 0
    ? parsed.tags.filter((tag): tag is string => typeof tag === 'string')
    : (fallback.tags || [])
  const aliases = Array.isArray(parsed.aliases) && parsed.aliases.length > 0
    ? parsed.aliases.filter((alias): alias is string => typeof alias === 'string')
    : (fallback.aliases || [])
  const version_range = typeof parsed.version_range === 'string' && parsed.version_range.trim()
    ? parsed.version_range.trim()
    : getDefaultVersionRange(dbms)
  const rawScore = typeof parsed.ai_quality_score === 'number' ? parsed.ai_quality_score : 0.6
  const ai_quality_score = Math.min(1, Math.max(0, rawScore))

  return {
    title,
    symptom,
    cause,
    action,
    runbook,
    diagnostic_steps,
    tags,
    aliases,
    version_range,
    ai_quality_score
  }
}
