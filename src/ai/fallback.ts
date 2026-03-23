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

function buildSymptomText(rawInput: string, type: string): string {
  const prefix = type === 'general' ? '[Raw Input]\n' : '[Observed Symptoms]\n'
  return `${prefix}${rawInput}`
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
    symptom: buildSymptomText(rawInput, pattern.type),
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
