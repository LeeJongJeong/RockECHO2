import type { RunbookStep } from '../types'

type KnowledgeJsonRecord = Record<string, unknown> & {
  runbook?: unknown
  diagnostic_steps?: unknown
  tags?: unknown
  aliases?: unknown
}

export function safeParseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  try {
    return JSON.parse(String(value)) as T
  } catch {
    return fallback
  }
}

export function parseStringArray(value: unknown): string[] {
  return safeParseJson<string[]>(value, [])
}

export function parseRunbookSteps(value: unknown): RunbookStep[] {
  return safeParseJson<RunbookStep[]>(value, [])
}

export function parseKnowledgeJsonFields<T extends KnowledgeJsonRecord>(entry: T): T & {
  runbook: RunbookStep[]
  diagnostic_steps: RunbookStep[]
  tags: string[]
  aliases: string[]
} {
  return {
    ...entry,
    runbook: parseRunbookSteps(entry.runbook),
    diagnostic_steps: parseRunbookSteps(entry.diagnostic_steps),
    tags: parseStringArray(entry.tags),
    aliases: parseStringArray(entry.aliases)
  }
}

export function parseTagsOnly<T extends Record<string, unknown> & { tags?: unknown }>(entry: T): T & {
  tags: string[]
} {
  return {
    ...entry,
    tags: parseStringArray(entry.tags)
  }
}

export function toJsonString(value: unknown): string {
  return JSON.stringify(value)
}

export function toInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}
