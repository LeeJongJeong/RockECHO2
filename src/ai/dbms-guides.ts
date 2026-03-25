export type DbmsGuide = {
  summaryFocus: string[]
  diagnosticFocus: string[]
  runbookFocus: string[]
  safetyRules: string[]
  readOnlyExamples: string[]
  mitigationExamples: string[]
  verificationExamples: string[]
}

const GENERIC_GUIDE: DbmsGuide = {
  summaryFocus: [
    'Extract the observable symptom first, then infer the most likely root cause from the raw notes.',
    'Prefer concrete resource, lock, replication, storage, or connection indicators over vague summaries.'
  ],
  diagnosticFocus: [
    'Start with broad health checks before narrowing into the most likely subsystem.',
    'Keep diagnostic steps read-only and explain the purpose in the step title.'
  ],
  runbookFocus: [
    'Start with a pre-check, continue with the smallest safe mitigation, and finish with verification.',
    'Include exact commands or SQL that an operator can run immediately.'
  ],
  safetyRules: [
    'Do not use destructive commands in diagnostic steps.',
    'For runbook steps, confirm current impact before restart, kill, failover, or configuration changes.'
  ],
  readOnlyExamples: [
    'SELECT * FROM <status_view>;',
    'SHOW STATUS;',
    'INFO all'
  ],
  mitigationExamples: [
    'Cancel the blocking session only after identifying the blocker.',
    'Adjust one configuration at a time and record the before and after state.'
  ],
  verificationExamples: [
    'Re-run the same status query after mitigation.',
    'Confirm that latency, lag, lock wait, or error count returned to normal.'
  ]
}

const DBMS_GUIDES: Record<string, DbmsGuide> = {
  postgresql: {
    summaryFocus: [
      'Focus on pg_stat_activity, pg_locks, pg_stat_replication, WAL growth, autovacuum, and storage pressure.',
      'Distinguish between user-visible symptoms and the exact backend state that likely caused them.'
    ],
    diagnosticFocus: [
      'Use read-only inspection on pg_stat_activity, pg_locks, pg_stat_replication, pg_stat_bgwriter, and pg_stat_user_tables.',
      'For lock or wait incidents, show both blocked and blocking sessions before any cancel or terminate action.'
    ],
    runbookFocus: [
      'Use pg_cancel_backend before pg_terminate_backend when possible.',
      'For storage or vacuum issues, include progress verification queries after each mitigation.'
    ],
    safetyRules: [
      'Do not suggest VACUUM FULL, REINDEX, or terminate backend before a pre-check step.',
      'Any WAL or replication mitigation must include lag verification after the change.'
    ],
    readOnlyExamples: [
      "SELECT pid, state, wait_event_type, wait_event, now() - query_start AS duration, query FROM pg_stat_activity WHERE state <> 'idle' ORDER BY duration DESC;",
      'SELECT relation::regclass AS relation_name, mode, granted, pid FROM pg_locks WHERE relation IS NOT NULL ORDER BY relation_name;',
      'SELECT client_addr, state, sync_state, pg_size_pretty(sent_lsn - replay_lsn) AS lag FROM pg_stat_replication;'
    ],
    mitigationExamples: [
      'SELECT pg_cancel_backend(<blocking_pid>);',
      'VACUUM (VERBOSE, ANALYZE) <schema>.<table_name>;',
      'SELECT pg_terminate_backend(<blocking_pid>);'
    ],
    verificationExamples: [
      "SELECT count(*) FROM pg_stat_activity WHERE wait_event_type = 'Lock';",
      'SELECT client_addr, state, pg_size_pretty(sent_lsn - replay_lsn) AS lag FROM pg_stat_replication;',
      'SELECT phase, heap_blks_scanned, heap_blks_total FROM pg_stat_progress_vacuum;'
    ]
  },
  mysql: {
    summaryFocus: [
      'Focus on processlist, InnoDB transaction state, replication, buffer pool pressure, and disk or connection exhaustion.',
      'Separate lock wait symptoms from replication breakage, slow query pressure, and storage saturation.'
    ],
    diagnosticFocus: [
      'Use SHOW FULL PROCESSLIST, SHOW ENGINE INNODB STATUS, replication status, and status variables before mitigation.',
      'For replication incidents, inspect both replication status and related binary log or GTID state.'
    ],
    runbookFocus: [
      'Start with session or replication state verification, then apply the smallest mitigation, then verify recovery.',
      'If a blocking session must be killed, identify it explicitly before KILL.'
    ],
    safetyRules: [
      'Do not place KILL, STOP SLAVE, START SLAVE, RESET, or configuration changes in diagnostic steps.',
      'For replication incidents, avoid destructive reset commands unless the summary explicitly supports them.'
    ],
    readOnlyExamples: [
      'SHOW FULL PROCESSLIST;',
      'SHOW ENGINE INNODB STATUS\\G',
      'SHOW SLAVE STATUS\\G'
    ],
    mitigationExamples: [
      'KILL <blocking_thread_id>;',
      'STOP SLAVE;\nSTART SLAVE;\nSHOW SLAVE STATUS\\G',
      "SET GLOBAL max_connections = <value>;"
    ],
    verificationExamples: [
      'SHOW FULL PROCESSLIST;',
      'SHOW GLOBAL STATUS LIKE \'Threads_running\';',
      'SHOW SLAVE STATUS\\G'
    ]
  },
  mariadb: {
    summaryFocus: [
      'Focus on InnoDB state, Galera health, replication lag, and cluster node behavior.',
      'Separate cluster or replication symptoms from ordinary query or lock pressure.'
    ],
    diagnosticFocus: [
      'Use read-only cluster and transaction inspection before any node-level change.',
      'Confirm whether the issue is local node pressure or cluster-wide instability.'
    ],
    runbookFocus: [
      'For Galera issues, inspect wsrep status before restart or desync actions.',
      'Finish with cluster health verification, not just local query recovery.'
    ],
    safetyRules: [
      'Do not include node restart or desync actions without a pre-check step.',
      'Keep diagnostic steps read-only.'
    ],
    readOnlyExamples: [
      "SHOW STATUS LIKE 'wsrep%';",
      'SHOW FULL PROCESSLIST;',
      'SHOW ENGINE INNODB STATUS\\G'
    ],
    mitigationExamples: [
      'SET GLOBAL wsrep_desync = ON;',
      'KILL <blocking_thread_id>;',
      'STOP SLAVE;\nSTART SLAVE;'
    ],
    verificationExamples: [
      "SHOW STATUS LIKE 'wsrep_cluster_status';",
      "SHOW STATUS LIKE 'wsrep_local_state_comment';",
      'SHOW FULL PROCESSLIST;'
    ]
  },
  mongodb: {
    summaryFocus: [
      'Focus on serverStatus, currentOp, replica set state, cache pressure, balancer activity, and slow aggregation behavior.',
      'Call out whether the problem is query, replication, sharding, or resource pressure.'
    ],
    diagnosticFocus: [
      'Use db.serverStatus(), currentOp, rs.status(), and collection or index inspection before mitigation.',
      'Prefer read-only admin commands and observation of active operations.'
    ],
    runbookFocus: [
      'If changing balancer, write concern, or cache settings, include before and after checks.',
      'End with replica set or cluster state validation.'
    ],
    safetyRules: [
      'Do not place stepDown, restart, balancer changes, or parameter changes in diagnostic steps.',
      'For replica set issues, verify quorum and node health before failover-oriented actions.'
    ],
    readOnlyExamples: [
      'db.serverStatus()',
      'db.adminCommand({ currentOp: 1, active: true })',
      'rs.status()'
    ],
    mitigationExamples: [
      'sh.stopBalancer()',
      'db.adminCommand({ setParameter: 1, internalQueryExecMaxBlockingSortBytes: <bytes> })',
      'rs.stepDown(<seconds>)'
    ],
    verificationExamples: [
      'rs.status()',
      'db.serverStatus().wiredTiger.cache',
      'db.currentOp()'
    ]
  },
  redis: {
    summaryFocus: [
      'Focus on memory pressure, replication state, slow commands, blocked clients, persistence failures, and cluster or sentinel health.',
      'Distinguish command latency, write rejection, failover failure, and replication drift.'
    ],
    diagnosticFocus: [
      'Use INFO, SLOWLOG, CLIENT LIST, and cluster or sentinel inspection before mitigation.',
      'Keep diagnostic steps read-only and ordered from broad health to the suspected bottleneck.'
    ],
    runbookFocus: [
      'For memory or persistence incidents, inspect current usage before eviction or configuration changes.',
      'Always finish with INFO-based verification of the recovered state.'
    ],
    safetyRules: [
      'Do not place CONFIG SET, FAILOVER, FLUSH*, or restart actions in diagnostic steps.',
      'For memory incidents, confirm policy and current usage before changing maxmemory or eviction settings.'
    ],
    readOnlyExamples: [
      'INFO memory',
      'INFO replication',
      'SLOWLOG GET 25'
    ],
    mitigationExamples: [
      'CONFIG SET maxmemory <bytes>',
      'CONFIG SET maxmemory-policy allkeys-lru',
      'CLIENT KILL <ip:port>'
    ],
    verificationExamples: [
      'INFO memory',
      'INFO replication',
      'LATENCY LATEST'
    ]
  }
}

export function getDbmsGuide(dbms: string): DbmsGuide {
  return DBMS_GUIDES[dbms.toLowerCase()] || GENERIC_GUIDE
}
