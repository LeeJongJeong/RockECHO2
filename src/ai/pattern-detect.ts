export interface IncidentPattern {
  type: string
  titleSuffix: string
  cause: string
  action: string
  tags: string[]
  aliases: string[]
}

function buildPattern(
  type: string,
  titleSuffix: string,
  cause: string,
  action: string,
  tags: string[],
  aliases: string[]
): IncidentPattern {
  return { type, titleSuffix, cause, action, tags, aliases }
}

export function detectPattern(lower: string): IncidentPattern {
  if (
    lower.includes('deadlock') ||
    lower.includes('lock wait') ||
    lower.includes('blocking') ||
    (lower.includes('lock') && !lower.includes('unlock') && !lower.includes('vacuum'))
  ) {
    return buildPattern(
      'lock',
      'Lock Contention / Deadlock',
      'Concurrent transactions are likely contending on the same rows or relations. Typical roots are inconsistent lock ordering, wide transaction scope, or missing supporting indexes.',
      'Identify the blocking session, terminate or cancel only when safe, reduce transaction scope, and add or adjust indexes to reduce lock duration.',
      ['lock', 'deadlock', 'blocking', 'lock_wait', 'transaction'],
      ['deadlock detected', 'lock wait', 'blocking session', 'lock timeout exceeded']
    )
  }

  if (
    lower.includes('replication') ||
    lower.includes('lag') ||
    lower.includes('standby') ||
    lower.includes('replica') ||
    lower.includes('slave')
  ) {
    return buildPattern(
      'replication',
      'Replication Lag',
      'Replication is likely delayed by IO saturation, network latency, or bursts of WAL/binlog generation on the primary.',
      'Check primary and replica health, storage latency, and network conditions. Reduce burst load if needed and verify replication slots or relay logs are healthy.',
      ['replication', 'lag', 'standby', 'replica', 'wal', 'binlog'],
      ['replication lag', 'standby lag', 'replica delay', 'seconds_behind_master']
    )
  }

  if (
    (lower.includes('dead') && !lower.includes('deadlock')) ||
    lower.includes('vacuum') ||
    lower.includes('bloat') ||
    lower.includes('n_dead_tup')
  ) {
    return buildPattern(
      'vacuum',
      'Dead Tuple / Vacuum Issue',
      'Dead tuples are likely accumulating because autovacuum is under-tuned, blocked by long transactions, or simply not keeping up with churn.',
      'Run a targeted vacuum when safe, inspect autovacuum settings, and adjust per-table thresholds or scale factors for high-churn tables.',
      ['dead_tuple', 'vacuum', 'bloat', 'autovacuum', 'n_dead_tup'],
      ['dead tuple', 'vacuum not running', 'table bloat', 'autovacuum issue']
    )
  }

  if (
    lower.includes('too many') ||
    lower.includes('connection') ||
    lower.includes('max_connections')
  ) {
    return buildPattern(
      'connection',
      'Connection Exhaustion',
      'The service is likely exhausting DB sessions due to oversized client pools, leaked idle sessions, or absent connection pooling.',
      'Check active versus idle sessions, terminate stale connections carefully, and tune the client pool or introduce a pooler.',
      ['connection', 'pool', 'max_connections', 'too_many_clients', 'idle'],
      ['too many clients', 'too many connections', 'connection pool', 'max connections exceeded']
    )
  }

  if (
    lower.includes('disk') ||
    lower.includes('space') ||
    lower.includes('full') ||
    lower.includes('no space')
  ) {
    return buildPattern(
      'disk',
      'Disk Full',
      'Storage is likely saturated by WAL/binlog growth, backups, temp files, or unbounded retention.',
      'Find the largest consumers first, free space safely, then tighten retention and monitoring thresholds.',
      ['disk', 'storage', 'disk_full', 'wal', 'binlog'],
      ['disk full', 'no space left on device', 'storage full', 'wal growth']
    )
  }

  if (
    lower.includes('memory') ||
    lower.includes('oom') ||
    lower.includes('out of memory')
  ) {
    return buildPattern(
      'memory',
      'Memory Pressure / OOM',
      'A memory-intensive query or oversized DB memory setting is likely exhausting available RAM.',
      'Check current memory pressure, identify large sessions or sorts, and reduce per-query memory or shared buffers where needed.',
      ['memory', 'oom', 'out_of_memory', 'buffer_pool', 'shared_buffers'],
      ['oom', 'out of memory', 'memory exhausted', 'cannot allocate memory']
    )
  }

  if (
    lower.includes('slow') ||
    lower.includes('timeout') ||
    lower.includes('explain') ||
    lower.includes('seq scan') ||
    lower.includes('performance')
  ) {
    return buildPattern(
      'slow_query',
      'Slow Query / Performance Degradation',
      'The execution plan is likely inefficient because of missing indexes, stale statistics, or an unexpectedly heavy sort/join path.',
      'Capture the worst query, inspect the plan, add or adjust indexes, refresh statistics, and validate the runtime improvement.',
      ['slow_query', 'performance', 'index', 'plan', 'timeout'],
      ['slow query', 'query timeout', 'sequential scan', 'bad plan']
    )
  }

  if (
    lower.includes('crash') ||
    lower.includes('restart') ||
    lower.includes('shutdown') ||
    lower.includes('abort')
  ) {
    return buildPattern(
      'crash',
      'Crash / Unexpected Restart',
      'The server likely terminated due to configuration errors, memory exhaustion, storage faults, or process-level crashes.',
      'Review DB and OS logs first, verify storage and memory health, then restart only after the underlying cause is understood.',
      ['crash', 'restart', 'recovery', 'shutdown', 'abort'],
      ['server crash', 'unexpected restart', 'aborted process', 'recovery mode']
    )
  }

  if (
    lower.includes('archive') ||
    lower.includes('backup') ||
    lower.includes('pitr')
  ) {
    return buildPattern(
      'archive',
      'Archive / Backup Failure',
      'Backup or archive processing is likely failing due to destination issues, permissions, or a broken archive command.',
      'Validate the archive command and storage target, clear capacity issues, then confirm new backup artifacts are being produced.',
      ['archive', 'backup', 'pitr', 'archive_command', 'retention'],
      ['archive failed', 'backup failed', 'pitr issue', 'archive command failed']
    )
  }

  if (
    lower.includes('upgrade') ||
    lower.includes('migration') ||
    lower.includes('version')
  ) {
    return buildPattern(
      'upgrade',
      'Upgrade / Migration Issue',
      'A removed parameter, incompatible feature, or unverified migration step is likely blocking the upgrade.',
      'Check release notes and deprecated settings, validate configuration compatibility, and rehearse the failing step in staging.',
      ['upgrade', 'migration', 'compatibility', 'version', 'deprecated'],
      ['upgrade failed', 'migration failed', 'deprecated setting', 'unknown variable']
    )
  }

  if (
    lower.includes('corrupt') ||
    lower.includes('checksum') ||
    lower.includes('invalid page')
  ) {
    return buildPattern(
      'corruption',
      'Data / Index Corruption',
      'A storage fault or interrupted write path may have corrupted table or index data.',
      'Preserve evidence first, capture backups, isolate the affected object, and repair or rebuild only after confirming the blast radius.',
      ['corruption', 'checksum', 'recovery', 'index_rebuild', 'storage_fault'],
      ['table corruption', 'index corruption', 'checksum mismatch', 'invalid page']
    )
  }

  if (
    lower.includes('auth') ||
    lower.includes('permission') ||
    lower.includes('privilege') ||
    lower.includes('access denied') ||
    lower.includes('authentication')
  ) {
    return buildPattern(
      'auth',
      'Authentication / Permission Error',
      'The principal likely lacks required grants or the authentication method no longer matches the client configuration.',
      'Check grants, host-based access rules, and the authentication plugin or password mechanism, then retry with the same client path.',
      ['auth', 'permission', 'grant', 'privilege', 'authentication'],
      ['access denied', 'permission denied', 'authentication failed', 'grant required']
    )
  }

  if (lower.includes('cpu') || lower.includes('load')) {
    return buildPattern(
      'high_cpu',
      'High CPU',
      'CPU is likely dominated by expensive queries, poor plans, or repeated hot operations.',
      'Identify the top CPU consumers, stabilize the hottest queries, and validate plan or index changes against load reduction.',
      ['cpu', 'load', 'high_cpu', 'performance'],
      ['high cpu', 'cpu spike', 'load average', 'cpu saturation']
    )
  }

  if (
    lower.includes('config') ||
    lower.includes('parameter') ||
    lower.includes('conf')
  ) {
    return buildPattern(
      'config',
      'Configuration Error',
      'A configuration value is likely invalid, deprecated, or unsafe for the current runtime conditions.',
      'Find the exact parameter in logs, roll back or comment out the bad value, then validate the config against the target version.',
      ['config', 'parameter', 'configuration', 'startup_failure'],
      ['config error', 'invalid parameter', 'unknown variable', 'bad configuration']
    )
  }

  return buildPattern(
    'general',
    'Incident Analysis Needed',
    'The raw input does not map cleanly to a single incident class. More log detail or runtime context is needed to identify the root cause confidently.',
    'Collect the latest error messages, resource indicators, and the change history immediately before the incident, then update the draft with confirmed findings.',
    ['general', 'analysis_needed', 'incident'],
    ['incident', 'unknown issue', 'needs analysis']
  )
}
