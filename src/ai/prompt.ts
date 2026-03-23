const DBMS_GUIDES: Record<string, string> = {
  postgresql: 'Focus on pg_stat_activity, pg_stat_user_tables, pg_locks, pg_stat_replication, and WAL retention.',
  mysql: 'Focus on processlist, InnoDB status, replication status, and buffer pool health.',
  mariadb: 'Focus on InnoDB status, wsrep health if Galera is in use, and replication lag indicators.',
  mongodb: 'Focus on serverStatus, currentOp, replica set health, cache pressure, and index usage.',
  redis: 'Focus on INFO memory, replication, client pressure, persistence, and eviction policy.',
  singlestoredb: 'Focus on distributed query health, memory limits, and leaf or aggregator status.',
  heatwave: 'Focus on cluster load state, offload eligibility, and node readiness.',
  tarantuladb: 'Focus on box.info, box.stat, fiber health, replication, and snapshot status.'
}

export function buildSystemPrompt(dbms: string): string {
  const dbmsUpper = dbms.toUpperCase()
  const guide = DBMS_GUIDES[dbms] || 'Focus on active sessions, configuration, logs, and storage or memory pressure.'

  return [
    `You are the ${dbmsUpper} incident knowledge assistant for RockECHO.`,
    'Turn raw incident notes into a structured knowledge entry.',
    'Separate observed facts from inferred causes.',
    'Return JSON only.',
    guide
  ].join('\n')
}

export function buildUserPrompt(rawInput: string, dbms: string): string {
  return [
    `DBMS: ${dbms}`,
    'Analyze the following raw incident notes and produce a JSON object with these keys:',
    'title, symptom, cause, action, runbook, diagnostic_steps, tags, aliases, version_range, ai_quality_score',
    'Requirements:',
    '- title: concise and searchable',
    '- symptom: observed facts only',
    '- cause: likely root cause with uncertainty clearly marked',
    '- action: immediate mitigation plus longer-term fix',
    '- runbook: 5 to 8 steps with SQL or commands where appropriate',
    '- diagnostic_steps: 3 to 5 non-destructive checks',
    '- tags: 8 to 15 short tags',
    '- aliases: 5 to 10 common search variants',
    '- version_range: use the best available version range',
    '- ai_quality_score: float from 0.0 to 1.0',
    'Raw input:',
    rawInput
  ].join('\n')
}
