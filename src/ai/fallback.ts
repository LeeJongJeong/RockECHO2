import type { KnowledgeEntry, RunbookStep } from '../types'
import { detectPattern } from './pattern-detect'

export function getDefaultVersionRange(dbms: string): string {
  const ranges: Record<string, string> = {
    postgresql: 'PG 13-17',
    mysql: 'MySQL 5.7-8.4',
    mariadb: 'MariaDB 10.6-11.x',
    mongodb: 'MongoDB 6.0-8.0',
    redis: 'Redis 6.2-7.4',
    singlestoredb: 'SingleStoreDB 8.x',
    heatwave: 'HeatWave MySQL 8.x',
    tarantuladb: 'TarantulaDB 2.x-3.x'
  }

  return ranges[dbms] || ''
}

const SYMPTOM_HINTS = [
  'error', 'errors', 'fail', 'failed', 'failure', 'alert', 'alarm', 'timeout', 'timed out',
  'deadlock', 'lock', 'blocking', 'blocked', 'lag', 'oom', 'slow', 'latency', 'cpu', 'memory',
  'disk', 'space', 'full', 'connection', 'replication', 'stuck', 'down',
  '오류', '에러', '실패', '경고', '알림', '타임아웃', '지연', '느림', '잠금', '락', '데드락',
  '대기', '포화', '급증', '증가', '메모리', '디스크', '공간', '끊김', '중단', '불가', '응답 없음'
]

const ACTION_HINTS = [
  'action', 'mitigation', 'resolved', 'fixed', 'workaround', 'restart', 'restarted', 'cancel',
  'terminate', 'killed', 'kill ', 'applied', 'changed', 'updated', 'rollback', 'vacuum',
  'reindex', 'analyze', 'restart', 'stopped', 'started',
  '조치', '해결', '복구', '정상화', '재시작', '재기동', '중지', '시작', '수정', '변경', '적용',
  '롤백', '삭제', '실행', '재실행', '종료'
]

function normalizeCandidateText(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/^[\-\*\d\.\)\]:\[]+\s*/, '').trim()
}

function truncateSymptom(text: string, maxLength = 180): string {
  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength).trimEnd()}...`
}

function scoreSymptomLine(text: string): number {
  const lower = text.toLowerCase()
  let score = 0

  if (SYMPTOM_HINTS.some((hint) => lower.includes(hint))) {
    score += 3
  }

  if (/\d/.test(text)) {
    score += 1
  }

  if (/[A-Z_]{2,}|pg_|innodb|redis|mongo|mysql|postgres/i.test(text)) {
    score += 1
  }

  if (ACTION_HINTS.some((hint) => lower.includes(hint))) {
    score -= 2
  }

  if (/^\s*(select|show|vacuum|alter|kill|start|stop|restart|reindex|analyze|redis-cli|db\.|rs\.|config\s+set|set\s+)/i.test(text)) {
    score -= 3
  }

  return score
}

function getDefaultSymptomByType(type: string): string {
  switch (type) {
    case 'lock':
      return '잠금 경합으로 인해 세션 대기 또는 응답 지연이 관찰됩니다.'
    case 'replication':
      return '복제 지연 또는 복제 상태 불일치 징후가 관찰됩니다.'
    case 'vacuum':
      return '테이블 팽창 또는 vacuum 지연으로 보이는 증상이 관찰됩니다.'
    case 'connection':
      return '커넥션 수 증가 또는 연결 고갈 증상이 관찰됩니다.'
    case 'disk':
      return '디스크 사용량 급증 또는 공간 부족 증상이 관찰됩니다.'
    case 'memory':
      return '메모리 압박 또는 OOM 관련 증상이 관찰됩니다.'
    case 'slow_query':
      return '응답 지연 또는 성능 저하 증상이 관찰됩니다.'
    case 'crash':
      return '비정상 종료 또는 재시작 관련 증상이 관찰됩니다.'
    case 'archive':
      return '백업 또는 아카이브 실패 증상이 관찰됩니다.'
    case 'upgrade':
      return '업그레이드 또는 마이그레이션 과정의 이상 징후가 관찰됩니다.'
    case 'corruption':
      return '데이터 또는 인덱스 손상 가능성이 있는 증상이 관찰됩니다.'
    case 'auth':
      return '인증 또는 권한 관련 실패 증상이 관찰됩니다.'
    case 'high_cpu':
      return 'CPU 사용률 급증과 관련된 증상이 관찰됩니다.'
    case 'config':
      return '설정 오류로 보이는 증상이 관찰됩니다.'
    default:
      return '장애 징후가 관찰되어 추가 확인이 필요합니다.'
  }
}

export function summarizeSymptomText(rawInput: string, type = 'general'): string {
  const candidates = rawInput
    .split(/\r?\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+|;\s+/))
    .map((text, index) => ({ index, text: normalizeCandidateText(text) }))
    .filter((item) => item.text.length >= 8)
    .map((item) => ({ ...item, score: scoreSymptomLine(item.text) }))

  const selected = candidates
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 2)
    .sort((a, b) => a.index - b.index)
    .map((item) => truncateSymptom(item.text))

  if (selected.length > 0) {
    return selected.join('\n')
  }

  const fallbackCandidate = candidates.find((item) => item.score > -2)
  if (fallbackCandidate) {
    return truncateSymptom(fallbackCandidate.text)
  }

  return getDefaultSymptomByType(type)
}

function getCheckSql(dbms: string, lower: string): string {
  if (dbms === 'postgresql') {
    if (lower.includes('vacuum') || lower.includes('dead')) {
      return "SELECT relname, n_live_tup, n_dead_tup, last_autovacuum FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 10;"
    }
    if (lower.includes('lock')) {
      return "SELECT pid, state, query, now() - query_start AS duration FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC;"
    }
    return "SELECT pid, usename, state, wait_event_type, wait_event, query FROM pg_stat_activity WHERE state != 'idle';"
  }

  if (dbms === 'mysql' || dbms === 'mariadb') {
    return 'SHOW PROCESSLIST;\nSHOW ENGINE INNODB STATUS\\G'
  }

  if (dbms === 'mongodb') {
    return 'db.serverStatus();\ndb.currentOp();'
  }

  if (dbms === 'redis') {
    return 'INFO all'
  }

  return '-- Add a DBMS-specific diagnostic command here.'
}

function buildFallbackDiagnostic(dbms: string, type: string): RunbookStep[] {
  if (dbms === 'postgresql') {
    return [
      {
        step: 1,
        title: 'Inspect active sessions',
        sql: "SELECT pid, state, wait_event_type, wait_event, now() - query_start AS duration, left(query, 100) AS query_preview FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC NULLS LAST;"
      },
      {
        step: 2,
        title: 'Inspect hot tables',
        sql: 'SELECT relname, n_live_tup, n_dead_tup, last_autovacuum, last_analyze FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 10;'
      },
      {
        step: 3,
        title: 'Inspect locks or replication',
        sql: type === 'replication'
          ? 'SELECT client_addr, state, pg_size_pretty(sent_lsn - replay_lsn) AS lag FROM pg_stat_replication;'
          : 'SELECT relation::regclass AS relation_name, mode, granted, pid FROM pg_locks WHERE relation IS NOT NULL ORDER BY relation;'
      }
    ]
  }

  if (dbms === 'mysql' || dbms === 'mariadb') {
    return [
      { step: 1, title: 'Inspect process list', sql: 'SHOW FULL PROCESSLIST;' },
      { step: 2, title: 'Inspect InnoDB transactions', sql: 'SELECT trx_id, trx_state, trx_started, trx_query FROM information_schema.INNODB_TRX ORDER BY trx_started;' },
      { step: 3, title: 'Inspect replication', sql: 'SHOW SLAVE STATUS\\G' }
    ]
  }

  if (dbms === 'mongodb') {
    return [
      { step: 1, title: 'Inspect server status', sql: 'db.serverStatus({repl:1, connections:1, mem:1, metrics:1})' },
      { step: 2, title: 'Inspect replica set state', sql: 'rs.status()' },
      { step: 3, title: 'Inspect expensive operations', sql: 'db.adminCommand({currentOp: 1, active: true})' }
    ]
  }

  if (dbms === 'redis') {
    return [
      { step: 1, title: 'Inspect memory', sql: 'INFO memory' },
      { step: 2, title: 'Inspect replication', sql: 'INFO replication' },
      { step: 3, title: 'Inspect slow log', sql: 'SLOWLOG GET 10' }
    ]
  }

  return [{ step: 1, title: 'Inspect current state', sql: getCheckSql(dbms, '') }]
}

function buildFallbackRunbook(dbms: string, type: string, lower: string): RunbookStep[] {
  if (dbms === 'postgresql' && type === 'vacuum') {
    return [
      { step: 1, title: 'Find high dead tuple tables', sql: 'SELECT schemaname, relname, n_live_tup, n_dead_tup, last_autovacuum FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 20;' },
      { step: 2, title: 'Run targeted vacuum', sql: 'VACUUM (VERBOSE, ANALYZE) <schema>.<table_name>;' },
      { step: 3, title: 'Review autovacuum settings', sql: "SELECT name, setting FROM pg_settings WHERE name LIKE 'autovacuum%' ORDER BY name;" },
      { step: 4, title: 'Tune table-level settings', sql: 'ALTER TABLE <schema>.<table_name> SET (autovacuum_vacuum_scale_factor = 0.01, autovacuum_vacuum_threshold = 1000);' },
      { step: 5, title: 'Verify progress', sql: 'SELECT pid, phase, heap_blks_scanned, heap_blks_total FROM pg_stat_progress_vacuum;' }
    ]
  }

  if (dbms === 'postgresql' && type === 'replication') {
    return [
      { step: 1, title: 'Inspect replication lag', sql: 'SELECT client_addr, state, sent_lsn, replay_lsn, pg_size_pretty(sent_lsn - replay_lsn) AS lag FROM pg_stat_replication;' },
      { step: 2, title: 'Inspect wal receiver on standby', sql: 'SELECT * FROM pg_stat_wal_receiver;' },
      { step: 3, title: 'Inspect replication slots', sql: 'SELECT slot_name, active, restart_lsn, confirmed_flush_lsn FROM pg_replication_slots;' },
      { step: 4, title: 'Validate storage health', sql: "SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;" },
      { step: 5, title: 'Re-check lag after mitigation', sql: 'SELECT client_addr, state, pg_size_pretty(sent_lsn - replay_lsn) AS lag FROM pg_stat_replication;' }
    ]
  }

  if (dbms === 'postgresql' && type === 'lock') {
    return [
      { step: 1, title: 'Find long-running sessions', sql: "SELECT pid, now() - query_start AS duration, state, wait_event_type, wait_event, query FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC NULLS LAST LIMIT 20;" },
      { step: 2, title: 'Find blocking relationships', sql: 'SELECT blocked_locks.pid AS blocked_pid, blocking_locks.pid AS blocking_pid FROM pg_catalog.pg_locks blocked_locks JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.pid != blocked_locks.pid AND (blocking_locks.transactionid = blocked_locks.transactionid OR blocking_locks.relation = blocked_locks.relation) WHERE NOT blocked_locks.granted;' },
      { step: 3, title: 'Cancel the blocking backend if safe', sql: 'SELECT pg_cancel_backend(<blocking_pid>);' },
      { step: 4, title: 'Escalate to terminate only if required', sql: 'SELECT pg_terminate_backend(<blocking_pid>);' }
    ]
  }

  if (dbms === 'mysql' || dbms === 'mariadb') {
    if (type === 'lock') {
      return [
        { step: 1, title: 'Inspect InnoDB status', sql: 'SHOW ENGINE INNODB STATUS\\G' },
        { step: 2, title: 'Inspect active sessions', sql: "SELECT * FROM information_schema.PROCESSLIST WHERE COMMAND != 'Sleep' ORDER BY TIME DESC;" },
        { step: 3, title: 'Inspect lock waits', sql: 'SELECT * FROM information_schema.INNODB_LOCK_WAITS;' },
        { step: 4, title: 'Kill the blocking thread if required', sql: 'KILL <blocking_thread_id>;' }
      ]
    }

    if (type === 'replication') {
      return [
        { step: 1, title: 'Inspect slave status', sql: 'SHOW SLAVE STATUS\\G' },
        { step: 2, title: 'Inspect binary logs', sql: 'SHOW MASTER STATUS;\nSHOW BINARY LOGS;' },
        { step: 3, title: 'Inspect replication variables', sql: "SHOW VARIABLES LIKE 'binlog%';\nSHOW VARIABLES LIKE 'gtid%';" },
        { step: 4, title: 'Restart replication after mitigation', sql: 'STOP SLAVE;\nSTART SLAVE;\nSHOW SLAVE STATUS\\G' }
      ]
    }
  }

  if (dbms === 'mongodb') {
    return [
      { step: 1, title: 'Inspect server status', sql: 'db.serverStatus()' },
      { step: 2, title: 'Inspect active operations', sql: 'db.adminCommand({currentOp: 1, active: true})' },
      { step: 3, title: 'Inspect replica set', sql: 'rs.status()' },
      { step: 4, title: 'Inspect cache pressure', sql: 'db.serverStatus().wiredTiger.cache' }
    ]
  }

  if (dbms === 'redis') {
    return [
      { step: 1, title: 'Inspect overall status', sql: 'INFO all' },
      { step: 2, title: 'Inspect memory', sql: 'INFO memory\nMEMORY DOCTOR' },
      { step: 3, title: 'Inspect slow commands', sql: 'SLOWLOG GET 25' },
      { step: 4, title: 'Inspect clients', sql: 'CLIENT LIST' }
    ]
  }

  return [
    { step: 1, title: 'Inspect current state', sql: getCheckSql(dbms, lower) },
    { step: 2, title: 'Capture logs and resource indicators', sql: '-- Add DBMS-specific log and resource checks here.' },
    { step: 3, title: 'Apply a targeted mitigation', sql: '-- Add the safest mitigation step here.' }
  ]
}

export function generateFallback(rawInput: string, dbms: string): Partial<KnowledgeEntry> {
  const lower = rawInput.toLowerCase()
  const pattern = detectPattern(lower)

  return {
    title: `${dbms.toUpperCase()} ${pattern.titleSuffix}`,
    symptom: summarizeSymptomText(rawInput, pattern.type),
    cause: pattern.cause,
    action: pattern.action,
    runbook: buildFallbackRunbook(dbms, pattern.type, lower),
    diagnostic_steps: buildFallbackDiagnostic(dbms, pattern.type),
    tags: [dbms, ...pattern.tags],
    aliases: pattern.aliases,
    version_range: getDefaultVersionRange(dbms),
    ai_quality_score: 0.45
  }
}
