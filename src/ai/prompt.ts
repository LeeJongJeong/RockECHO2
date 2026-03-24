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

const FEW_SHOT_EXAMPLE = `
--- FEW-SHOT EXAMPLE (PostgreSQL) ---
[Input]
DB CPU 100% alert. Checked pg_stat_activity, saw many queries waiting on relation lock. 
There was an ALTER TABLE ADD COLUMN running without lock timeout. We killed the ALTER TABLE pid.
[Output JSON]
{
  "reasoning": "1. 현상 파악: PostgreSQL 서버 CPU가 100%까지 치솟고 다수의 쿼리가 대기 상태에 빠짐. 2. 원인 추론: ALTER TABLE 명령이 긴 테이블 잠금을 유발, 다른 DML 쿼리들이 블로킹되면서 커넥션과 CPU를 점유. 3. 조치 방향: 즉시 조치로 원인 세션을 강제 종료, 근본 조치로 DDL 작업 시 lock_timeout 설정 권고.",
  "title": "ALTER TABLE 유발 테이블 Lock 및 CPU 100% 스파이크",
  "symptom": "DB CPU 100% 도달, pg_stat_activity에서 쿼리 Lock 경합 관찰됨.",
  "cause": "서비스 중 lock_timeout 설정 없이 ALTER TABLE DDL을 수행하여 과도한 배타적 잠금(Exclusive Lock) 발생. 이로 인해 후속 DML 쿼리들이 적체됨.",
  "action": "[즉시 조치] pg_cancel_backend() 또는 pg_terminate_backend()를 이용해 해당 ALTER TABLE 세션을 강제 종료시켜 Lock 해소.\\n[재발 방지] 운영 환경 DDL 수행 시 트랜잭션 단위로 lock_timeout = '2s' 등 설정 의무 적용.",
  "runbook": [
    { "step": 1, "title": "Lock 트랜잭션 확인", "sql": "SELECT * FROM pg_stat_activity WHERE wait_event_type = 'Lock';" },
    { "step": 2, "title": "세션 강제 종료", "sql": "SELECT pg_terminate_backend(<pid>);" }
  ],
  "diagnostic_steps": [
    { "step": 1, "title": "활성 커넥션 및 대기 이벤트 모니터링", "sql": "SELECT count(*), wait_event FROM pg_stat_activity GROUP BY wait_event;" }
  ],
  "tags": ["postgresql", "lock", "cpu-100", "alter-table"],
  "aliases": ["디비 락", "테이블 락다운", "CPU 치솟음"],
  "version_range": "PostgreSQL 10+",
  "ai_quality_score": 0.95
}
--------------------------------`;

export function buildSystemPrompt(dbms: string): string {
  const dbmsUpper = dbms.toUpperCase()
  const guide = DBMS_GUIDES[dbms.toLowerCase()] || 'Focus on active sessions, configuration, logs, and storage or memory pressure.'

  return [
    `You are the ${dbmsUpper} incident knowledge assistant for RockECHO.`,
    'Turn raw incident notes into a structured knowledge entry.',
    'Separate observed facts from inferred causes.',
    'Return strict JSON only.',
    guide,
    FEW_SHOT_EXAMPLE
  ].join('\n')
}

export function buildUserPrompt(rawInput: string, dbms: string, contextInfo = ''): string {
  const contextStr = contextInfo ? `\n--- PAST SIMILAR INCIDENTS (USE AS REFERENCE) ---\n${contextInfo}\n----------------------------------\n` : '';
  
  return [
    `DBMS: ${dbms}`,
    'Analyze the following raw incident notes and produce a JSON object with these keys:',
    'reasoning, title, symptom, cause, action, runbook, diagnostic_steps, tags, aliases, version_range, ai_quality_score',
    'Requirements:',
    '- All textual content (title, symptom, cause, action, step titles, etc.) MUST be written in natural Korean (한국어) except for SQLs and error codes.',
    '- reasoning: MUST be the first key. Provide a step-by-step logical deduction (Chain-of-Thought) analyzing the logs to derive the cause and action. (2~3 sentences)',
    '- title: concise and searchable',
    '- symptom: observed facts only',
    '- cause: root cause or likely reason, logically deduced from the reasoning step',
    '- action: immediate mitigation plus longer-term permanent fix instructions',
    '- runbook: 1 to 5 steps with exact SQL or system commands for mitigation',
    '- diagnostic_steps: 1 to 5 non-destructive checks or views to confirm the issue',
    '- tags: 5 to 10 short English/Korean keywords (no spaces)',
    '- aliases: 2 to 5 common search variants or team jargon',
    '- version_range: e.g., "MySQL 8.0+", "PostgreSQL 14.x"',
    '- ai_quality_score: float from 0.0 to 1.0 representing confidence in your causal deduction',
    contextStr,
    'Raw input:',
    rawInput
  ].join('\n')
}
