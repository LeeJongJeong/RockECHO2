import type { KnowledgeEntry, RunbookStep } from '../types'
import { generateFallback, getDefaultVersionRange, summarizeSymptomText } from './fallback'

type SanitizeOptions = {
  useFallback?: boolean
}

function containsHangul(value: string): boolean {
  return /[\uAC00-\uD7A3]/.test(value)
}

function containsLatinLetters(value: string): boolean {
  return /[A-Za-z]/.test(value)
}

function normalizeNarrativeText(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback
  }

  const trimmed = value.trim()
  if (trimmed.length <= 10) {
    return fallback
  }

  if (containsLatinLetters(trimmed) && !containsHangul(trimmed)) {
    return fallback
  }

  return trimmed
}

function stripListPrefix(value: string): string {
  return value.replace(/^\s*(?:\d+\s*[\.\)]|[-*])\s*/, '').trim()
}

function splitActionItems(value: string): string[] {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\[(.*?)\]\s*/g, '\n$1: ')
    .split(/\n+|(?<=[.!?])\s+|;\s+/)
    .map((item) => stripListPrefix(item))
    .filter((item) => item.length > 8)
}

function normalizeComparableText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function uniqueItems(items: string[]): string[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = normalizeComparableText(item)
    if (!key || seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function buildDetailedActionFallback(summary: string, runbook: RunbookStep[]): string[] {
  const items = summary ? [summary] : []

  if (runbook.length > 0) {
    const referencedSteps = runbook.slice(0, 2).map((step) => `${step.step}\uB2E8\uACC4`).join(', ')
    items.push(`\uB7F0\uBD81 ${referencedSteps} \uC21C\uC11C\uB85C \uC870\uCE58\uB97C \uC2E4\uD589\uD558\uACE0 \uAC01 \uB2E8\uACC4 \uACB0\uACFC\uB97C \uC989\uC2DC \uD655\uC778\uD569\uB2C8\uB2E4.`)
  }

  items.push('\uC870\uCE58 \uD6C4\uC5D0\uB294 \uAD00\uB828 \uC624\uB958 \uBA54\uC2DC\uC9C0, \uC751\uB2F5 \uC9C0\uC5F0, \uC138\uC158 \uB610\uB294 \uB9AC\uC18C\uC2A4 \uC0C1\uD0DC\uB97C \uB2E4\uC2DC \uD655\uC778\uD574 \uC7A5\uC560\uAC00 \uC2E4\uC81C\uB85C \uD574\uC18C\uB418\uC5C8\uB294\uC9C0 \uAC80\uC99D\uD569\uB2C8\uB2E4.')
  items.push('\uB3D9\uC77C \uC7A5\uC560 \uC7AC\uBC1C\uC744 \uB9C9\uAE30 \uC704\uD574 \uAD00\uB828 \uC124\uC815\uAC12, \uC6B4\uC601 \uC808\uCC28, \uBAA8\uB2C8\uD130\uB9C1 \uC784\uACC4\uCE58 \uBCC0\uACBD \uC774\uB825\uC744 \uD568\uAED8 \uC810\uAC80\uD569\uB2C8\uB2E4.')

  return uniqueItems(items)
}

function normalizeActionText(
  value: unknown,
  fallback: string,
  runbook: RunbookStep[],
  options: { allowSyntheticFallback: boolean }
): string {
  const narrative = normalizeNarrativeText(value, fallback)
  const items = uniqueItems(splitActionItems(narrative))
  let normalizedItems = items

  if (normalizedItems.length < 2 && options.allowSyntheticFallback) {
    normalizedItems = buildDetailedActionFallback(narrative, runbook)
  } else if (normalizedItems.length === 0 && narrative) {
    normalizedItems = [narrative]
  }

  normalizedItems = normalizedItems.slice(0, 5)

  while (options.allowSyntheticFallback && normalizedItems.length < 3) {
    normalizedItems.push(`\uC870\uCE58 ${normalizedItems.length + 1}\uB2E8\uACC4 \uC2E4\uD589 \uACB0\uACFC\uB97C \uD655\uC778\uD558\uACE0 \uD544\uC694\uD55C \uD6C4\uC18D \uB300\uC751\uC744 \uC774\uC5B4\uAC11\uB2C8\uB2E4.`)
  }

  return normalizedItems
    .map((item, index) => `${index + 1}. ${stripListPrefix(item)}`)
    .join('\n')
}

function isLikelyRawInputCopy(symptom: string, rawInput: string): boolean {
  const normalizedSymptom = normalizeComparableText(symptom)
  const normalizedRawInput = normalizeComparableText(rawInput)

  if (!normalizedSymptom || !normalizedRawInput) {
    return false
  }

  if (normalizedSymptom === normalizedRawInput) {
    return true
  }

  if (normalizedRawInput.includes(normalizedSymptom) && normalizedSymptom.length >= normalizedRawInput.length * 0.75) {
    return true
  }

  if (normalizedSymptom.includes(normalizedRawInput) && normalizedRawInput.length >= 20) {
    return true
  }

  const symptomLines = symptom.split(/\r?\n/).filter((line) => line.trim())
  const rawInputLines = rawInput.split(/\r?\n/).filter((line) => line.trim())
  return symptomLines.length >= 3 && rawInputLines.length >= 3 && normalizedSymptom.length >= normalizedRawInput.length * 0.6
}

function normalizeSymptomText(value: unknown, rawInput: string, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback
  }

  const trimmed = value.trim()
  if (trimmed.length <= 8) {
    return fallback
  }

  if (isLikelyRawInputCopy(trimmed, rawInput)) {
    return fallback
  }

  return trimmed
}

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

export function sanitizeKnowledge(
  parsed: Record<string, unknown>,
  rawInput: string,
  dbms: string,
  options: SanitizeOptions = {}
): Partial<KnowledgeEntry> {
  const useFallback = options.useFallback !== false
  const fallback = useFallback ? generateFallback(rawInput, dbms) : ({} as Partial<KnowledgeEntry>)
  const title = typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : fallback.title
  const symptomFallback = useFallback ? (fallback.symptom || summarizeSymptomText(rawInput)) : ''
  const symptom = normalizeSymptomText(parsed.symptom, rawInput, symptomFallback)
  const cause = normalizeNarrativeText(parsed.cause, useFallback ? (fallback.cause || '') : '')
  const runbook = normalizeSteps(parsed.runbook, '\uB2E8\uACC4', fallback.runbook || [])
  const action = normalizeActionText(parsed.action, useFallback ? (fallback.action || '') : '', runbook, {
    allowSyntheticFallback: useFallback
  })
  const diagnosticSteps = normalizeSteps(parsed.diagnostic_steps, '\uC810\uAC80', fallback.diagnostic_steps || [])
  const tags = Array.isArray(parsed.tags) && parsed.tags.length > 0
    ? parsed.tags.filter((tag): tag is string => typeof tag === 'string')
    : (fallback.tags || [])
  const aliases = Array.isArray(parsed.aliases) && parsed.aliases.length > 0
    ? parsed.aliases.filter((alias): alias is string => typeof alias === 'string')
    : (fallback.aliases || [])
  const versionRange = typeof parsed.version_range === 'string' && parsed.version_range.trim()
    ? parsed.version_range.trim()
    : (useFallback ? getDefaultVersionRange(dbms) : '')
  const rawScore = typeof parsed.ai_quality_score === 'number' ? parsed.ai_quality_score : 0.6
  const aiQualityScore = Math.min(1, Math.max(0, rawScore))

  return {
    title,
    symptom,
    cause,
    action,
    runbook,
    diagnostic_steps: diagnosticSteps,
    tags,
    aliases,
    version_range: versionRange,
    ai_quality_score: aiQualityScore
  }
}
