import { detectPattern } from './pattern-detect'

export type IncidentSignals = {
  suspectedType: string
  keyErrors: string[]
  keyMetrics: string[]
  mentionedObjects: string[]
  mentionedCommands: string[]
  likelyFocus: string[]
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function truncate(value: string, maxLength = 180): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3).trimEnd()}...` : value
}

function pickLines(rawInput: string, regex: RegExp, limit = 4): string[] {
  return rawInput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && regex.test(line))
    .slice(0, limit)
    .map((line) => truncate(line))
}

function extractMetrics(rawInput: string): string[] {
  const matches = rawInput.match(/\b\d+(?:\.\d+)?\s*(?:ms|s|sec|secs|seconds|minutes|min|hours|%|gb|mb|kb|tb|connections?|sessions?|clients?)\b/gi) || []
  return unique(matches).slice(0, 6)
}

function extractObjects(rawInput: string): string[] {
  const patterns = [
    /\b(?:ALTER|UPDATE|INSERT\s+INTO|DELETE\s+FROM|FROM|JOIN|TABLE|INDEX)\s+([A-Za-z0-9_."`-]+)/gi,
    /\b(?:max_connections|shared_buffers|checkpoint_completion_target|work_mem|innodb_buffer_pool_size|maxmemory|archive_command|wal_level|gtid_mode|sync_binlog)\b/gi,
    /\b(?:pg_stat_activity|pg_locks|pg_stat_replication|SHOW\s+FULL\s+PROCESSLIST|SHOW\s+ENGINE\s+INNODB\s+STATUS|db\.serverStatus|INFO\s+memory)\b/gi
  ]

  const collected: string[] = []
  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(rawInput)) !== null) {
      const value = match[1] || match[0]
      collected.push(String(value))
      if (collected.length >= 10) {
        return unique(collected).slice(0, 10)
      }
    }
  }

  return unique(collected).slice(0, 10)
}

function extractCommands(rawInput: string): string[] {
  return rawInput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^(select|show|with|explain|info|db\.|rs\.|redis-cli|config\s+set|set\s+global|kill|vacuum|reindex|analyze|stop|start)/i.test(line))
    .slice(0, 6)
    .map((line) => truncate(line))
}

function deriveLikelyFocus(type: string, dbms: string): string[] {
  const common = [
    'Use concrete object names, configuration names, session identifiers, and error codes when present.',
    'Prefer exact read-only inspection commands before proposing mitigation.'
  ]

  switch (type) {
    case 'lock':
      return [
        ...common,
        `Focus on blocking relationships, long-running sessions, and lock wait indicators for ${dbms}.`,
        'Diagnostic steps should identify both blocked and blocking sessions before any cancel or terminate action.'
      ]
    case 'replication':
      return [
        ...common,
        `Focus on lag, slot or relay state, WAL/binlog flow, and replica health for ${dbms}.`,
        'Runbook should verify lag again after mitigation.'
      ]
    case 'vacuum':
      return [
        ...common,
        'Focus on dead tuple growth, autovacuum behavior, and table-level maintenance pressure.',
        'Runbook should include verification of progress or tuple reduction after maintenance.'
      ]
    case 'connection':
      return [
        ...common,
        'Focus on active vs idle sessions, pool exhaustion, and connection limits.',
        'Runbook should reduce impact safely before changing global limits.'
      ]
    case 'disk':
      return [
        ...common,
        'Focus on space consumers, log/archive accumulation, and the fastest safe reclaim options.',
        'Runbook should verify free space after mitigation.'
      ]
    case 'memory':
      return [
        ...common,
        'Focus on memory pressure indicators, expensive operations, and settings that amplify memory usage.',
        'Runbook should verify usage or eviction pressure after the change.'
      ]
    case 'slow_query':
      return [
        ...common,
        'Focus on the exact expensive query, execution plan, and missing index or stale statistics indicators.',
        'Runbook should include a post-change verification query or plan check.'
      ]
    default:
      return common
  }
}

export function extractIncidentSignals(rawInput: string, dbms: string): IncidentSignals {
  const lower = rawInput.toLowerCase()
  const pattern = detectPattern(lower)

  return {
    suspectedType: pattern.type,
    keyErrors: pickLines(rawInput, /(error|fatal|failed|exception|denied|timeout|too many|deadlock|lock wait|oom|full|corrupt|checksum|replication|lag)/i, 5),
    keyMetrics: extractMetrics(rawInput),
    mentionedObjects: extractObjects(rawInput),
    mentionedCommands: extractCommands(rawInput),
    likelyFocus: deriveLikelyFocus(pattern.type, dbms)
  }
}

export function formatIncidentSignals(signals: IncidentSignals): string {
  const sections = [
    `Suspected incident family: ${signals.suspectedType}`,
    `Key error lines: ${signals.keyErrors.length ? signals.keyErrors.join(' | ') : 'none'}`,
    `Observed metrics: ${signals.keyMetrics.length ? signals.keyMetrics.join(' | ') : 'none'}`,
    `Mentioned objects or settings: ${signals.mentionedObjects.length ? signals.mentionedObjects.join(' | ') : 'none'}`,
    `Mentioned commands: ${signals.mentionedCommands.length ? signals.mentionedCommands.join(' | ') : 'none'}`,
    `Likely focus: ${signals.likelyFocus.join(' | ')}`
  ]

  return sections.join('\n')
}
