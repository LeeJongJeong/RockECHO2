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
      '잠금 경합 또는 데드락',
      '동시 실행 중인 트랜잭션이 같은 행이나 테이블 자원을 두고 경합하는 상태로 보입니다. 일반적으로 잠금 획득 순서 불일치, 과도하게 넓은 트랜잭션 범위, 보조 인덱스 부족이 주요 원인입니다.',
      '우선 어떤 세션이 다른 세션을 막고 있는지 확인하고, 안전한 경우에만 해당 세션을 취소하거나 종료해야 합니다. 이후 트랜잭션 범위를 줄이고 필요한 인덱스를 보강해 잠금 유지 시간을 낮추는 방향으로 조치하세요.',
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
      '복제 지연',
      '복제 지연은 보통 디스크 I/O 포화, 네트워크 지연, 또는 주 서버에서 WAL/binlog가 급격히 증가하는 상황에서 발생합니다.',
      '주 서버와 복제 서버의 상태, 스토리지 지연, 네트워크 상태를 함께 점검하세요. 필요하면 순간 부하를 낮추고 replication slot 또는 relay log 상태가 정상인지 확인해야 합니다.',
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
      'Dead Tuple 또는 Vacuum 문제',
      'dead tuple 이 누적되는 이유는 대개 autovacuum 설정이 약하거나, 장시간 트랜잭션에 의해 막혀 있거나, 변경량을 따라가지 못하기 때문입니다.',
      '안전한 시점에 대상 테이블 위주로 vacuum 을 수행하고 autovacuum 설정을 점검하세요. 변경이 많은 테이블은 임계치와 scale factor 를 더 공격적으로 조정하는 것이 좋습니다.',
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
      '커넥션 고갈',
      '클라이언트 풀 크기가 과도하거나 유휴 세션이 누적되었거나, 커넥션 풀링이 제대로 적용되지 않아 DB 세션이 고갈되는 상황으로 보입니다.',
      '활성 세션과 유휴 세션 비율을 확인하고 오래된 연결은 신중하게 정리하세요. 동시에 애플리케이션 풀 크기를 조정하거나 별도 pooler 도입을 검토해야 합니다.',
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
      '디스크 공간 부족',
      '스토리지가 가득 찬 이유로는 WAL/binlog 증가, 백업 파일 적체, 임시 파일 누적, 과도한 보관 정책이 가장 유력합니다.',
      '먼저 공간을 많이 차지하는 대상을 식별한 뒤 안전하게 여유 공간을 확보하세요. 이후 보관 기간과 모니터링 임계치를 함께 조정해 재발을 막아야 합니다.',
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
      '메모리 압박 또는 OOM',
      '메모리를 많이 쓰는 쿼리나 과도한 DB 메모리 설정 때문에 사용 가능한 RAM 이 고갈되는 상황으로 보입니다.',
      '현재 메모리 압박 상태를 점검하고 메모리를 크게 쓰는 세션이나 정렬 작업을 확인하세요. 필요하면 쿼리당 메모리 사용량이나 shared buffer 계열 설정을 낮춰야 합니다.',
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
      '느린 쿼리 또는 성능 저하',
      '실행 계획이 비효율적인 이유로는 인덱스 부족, 통계 정보 노후화, 과도한 정렬 또는 조인 비용이 가장 흔합니다.',
      '가장 느린 쿼리를 먼저 확보하고 실행 계획을 확인하세요. 그 뒤 인덱스를 보강하거나 조정하고 통계를 갱신한 후 실제 응답 시간이 개선되는지 검증해야 합니다.',
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
      '비정상 종료 또는 예기치 않은 재시작',
      '서버가 종료된 배경에는 설정 오류, 메모리 고갈, 스토리지 장애, 프로세스 수준의 크래시가 있을 가능성이 높습니다.',
      '먼저 DB 로그와 OS 로그를 함께 확인하고 스토리지와 메모리 상태를 점검하세요. 근본 원인을 파악한 뒤에만 재시작하는 것이 안전합니다.',
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
      '아카이브 또는 백업 실패',
      '백업이나 아카이브 작업은 대상 스토리지 문제, 권한 오류, archive command 이상 때문에 실패하는 경우가 많습니다.',
      'archive command 와 저장 대상의 상태를 먼저 검증하고 용량 문제를 해소하세요. 그 다음 새로운 백업 산출물이 정상 생성되는지 확인해야 합니다.',
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
      '업그레이드 또는 마이그레이션 문제',
      '제거된 파라미터, 호환되지 않는 기능, 검증되지 않은 마이그레이션 단계 때문에 업그레이드가 막히는 상황으로 보입니다.',
      '릴리즈 노트와 deprecated 설정을 확인하고 구성 호환성을 검증하세요. 실패한 단계를 스테이징에서 재현해 보는 것이 안전합니다.',
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
      '데이터 또는 인덱스 손상',
      '스토리지 장애나 쓰기 경로 중단으로 인해 테이블 또는 인덱스 데이터가 손상되었을 가능성이 있습니다.',
      '우선 증거와 백업을 확보하고 영향 범위를 분리해 확인하세요. 그 후에만 복구나 재구성을 진행하는 것이 안전합니다.',
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
      '인증 또는 권한 오류',
      '필요한 권한이 부족하거나 인증 방식이 현재 클라이언트 설정과 맞지 않아 접속이 실패하는 상황으로 보입니다.',
      '권한 부여 상태, 호스트 기반 접근 제어, 인증 플러그인 또는 비밀번호 방식이 맞는지 확인한 뒤 같은 접속 경로로 다시 검증하세요.',
      ['auth', 'permission', 'grant', 'privilege', 'authentication'],
      ['access denied', 'permission denied', 'authentication failed', 'grant required']
    )
  }

  if (lower.includes('cpu') || lower.includes('load')) {
    return buildPattern(
      'high_cpu',
      'CPU 사용률 급증',
      'CPU 는 대개 비용이 큰 쿼리, 좋지 않은 실행 계획, 반복적으로 집중되는 작업 때문에 과도하게 사용됩니다.',
      '어떤 쿼리나 작업이 CPU 를 가장 많이 쓰는지 먼저 확인하세요. 이후 가장 뜨거운 쿼리를 안정화하고 실행 계획이나 인덱스 변경이 실제 부하 감소로 이어지는지 검증해야 합니다.',
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
      '설정 오류',
      '현재 설정값이 잘못되었거나 더 이상 지원되지 않거나, 현재 런타임 조건에서 안전하지 않은 값일 가능성이 큽니다.',
      '로그에서 정확한 파라미터를 찾고 문제가 되는 값을 되돌리거나 비활성화하세요. 이후 대상 버전 기준으로 설정 호환성을 다시 검증해야 합니다.',
      ['config', 'parameter', 'configuration', 'startup_failure'],
      ['config error', 'invalid parameter', 'unknown variable', 'bad configuration']
    )
  }

  return buildPattern(
    'general',
    '추가 장애 분석 필요',
    '현재 raw input 만으로는 하나의 장애 유형으로 명확히 분류하기 어렵습니다. 근본 원인을 신뢰도 있게 특정하려면 더 많은 로그와 실행 문맥이 필요합니다.',
    '가장 최근 오류 메시지, 자원 지표, 장애 직전 변경 이력을 먼저 수집하세요. 확인된 사실이 쌓인 뒤 초안을 갱신하는 것이 좋습니다.',
    ['general', 'analysis_needed', 'incident'],
    ['incident', 'unknown issue', 'needs analysis']
  )
}
