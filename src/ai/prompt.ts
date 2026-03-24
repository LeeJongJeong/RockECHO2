const DBMS_GUIDES: Record<string, string> = {
  postgresql: 'pg_stat_activity, pg_stat_user_tables, pg_locks, pg_stat_replication 및 WAL 보관 주기에 집중하여 원인을 분석하세요.',
  mysql: 'processlist, InnoDB 상태, 복제(replication) 상태 및 버퍼 풀 트래픽에 집중하여 원인을 분석하세요.',
  mariadb: 'InnoDB 상태, Galera 헬스 체크, 복제 지연(lag) 지표에 집중하여 원인을 분석하세요.',
  mongodb: 'serverStatus, currentOp, 레플리카 셋 상태, 캐시 압박(cache pressure) 및 인덱스 사용량에 집중하여 원인을 분석하세요.',
  redis: 'INFO memory, 복제 상태, 클라이언트 커넥션 압박, 영속성(persistence) 및 eviction 정책에 집중하여 원인을 분석하세요.',
  singlestoredb: '분산 쿼리 헬스, 메모리 한도 및 leaf/aggregator 노드 상태에 집중하여 원인을 분석하세요.',
  heatwave: '클러스터 부하 상태, 오프로드 가능 여부 및 노드 준비 상태에 집중하여 원인을 분석하세요.',
  tarantuladb: 'box.info, box.stat, 파이버(fiber) 상태, 복제 및 스냅샷 상태에 집중하여 원인을 분석하세요.'
}

const FEW_SHOT_EXAMPLE = `
--- FEW-SHOT EXAMPLE (PostgreSQL) ---
[Input]
DB CPU 100% alert. Checked pg_stat_activity, saw many queries waiting on relation lock. 
There was an ALTER TABLE ADD COLUMN running without lock timeout. We killed the ALTER TABLE pid.
[Output JSON]
{
  "추론과정": "1. 현상 파악: PostgreSQL 서버 CPU가 100%까지 치솟고 다수의 쿼리가 대기 상태에 빠짐. 2. 원인 추론: ALTER TABLE 명령이 긴 테이블 잠금을 유발, 다른 DML 쿼리들이 블로킹되면서 커넥션과 CPU를 점유. 3. 조치 방향: 즉시 조치로 원인 세션을 강제 종료, 근본 조치로 DDL 작업 시 lock_timeout 설정 권고.",
  "제목": "ALTER TABLE 유발 테이블 Lock 및 CPU 100% 스파이크",
  "증상": "DB CPU 100% 도달, pg_stat_activity에서 쿼리 Lock 경합 관찰됨.",
  "원인": "서비스 중 lock_timeout 설정 없이 ALTER TABLE DDL을 수행하여 과도한 배타적 잠금(Exclusive Lock) 발생. 이로 인해 후속 DML 쿼리들이 적체됨.",
  "조치": "[즉시 조치] pg_cancel_backend() 또는 pg_terminate_backend()를 이용해 해당 ALTER TABLE 세션을 강제 종료시켜 Lock 해소.\\n[재발 방지] 운영 환경 DDL 수행 시 트랜잭션 단위로 lock_timeout = '2s' 등 설정 의무 적용.",
  "런북": [
    { "step": 1, "title": "Lock 트랜잭션 확인", "sql": "SELECT * FROM pg_stat_activity WHERE wait_event_type = 'Lock';" },
    { "step": 2, "title": "세션 강제 종료", "sql": "SELECT pg_terminate_backend(<pid>);" }
  ],
  "진단단계": [
    { "step": 1, "title": "활성 커넥션 및 대기 이벤트 모니터링", "sql": "SELECT count(*), wait_event FROM pg_stat_activity GROUP BY wait_event;" }
  ],
  "태그": ["postgresql", "lock", "cpu-100", "alter-table"],
  "유사검색어": ["디비 락", "테이블 락다운", "CPU 치솟음"],
  "적용버전": "PostgreSQL 10+",
  "신뢰도": 0.95
}
--------------------------------`;

export function buildSystemPrompt(dbms: string): string {
  const dbmsUpper = dbms.toUpperCase()
  const guide = DBMS_GUIDES[dbms.toLowerCase()] || `${dbmsUpper}의 활성 세션, 설정 지표, 로그, 스토리지 및 메모리 압박 상태에 집중하여 분석하세요.`

  return [
    `당신은 RockECHO의 ${dbmsUpper} 장애 지식 분석 AI 어시스턴트입니다.`,
    '가공되지 않은 장애 기록을 분석하여 완벽하게 구조화된 지식 엔트리로 변환해야 합니다.',
    '관찰된 사실(symptom)과 논리적으로 추론된 원인(cause)을 명확하게 분리하십시오.',
    '응답은 반드시 마크다운 코드가 없는 순수 JSON 객체 형태로만 반환해야 합니다.',
    '모든 텍스트 설명은 영어 텍스트가 섞이지 않은 자연스러운 한국어(Korean)여야 합니다.',
    guide,
    FEW_SHOT_EXAMPLE
  ].join('\n')
}

export function buildUserPrompt(rawInput: string, dbms: string, contextInfo = ''): string {
  const contextStr = contextInfo ? `\n--- 과거 유사 장애 사례 (분석 참고용) ---\n${contextInfo}\n----------------------------------\n` : '';
  
  return [
    `DBMS: ${dbms}`,
    '다음 장애 기록 요약을 분석하여 아래에 나열된 JSON 키를 가진 구조화된 객체를 반환하세요:',
    'JSON 필수 키 목록: 추론과정, 제목, 증상, 원인, 조치, 런북, 진단단계, 태그, 유사검색어, 적용버전, 신뢰도',
    '필수 요구사항 (CRITICAL):',
    '- SQL 쿼리문이나 오류 코드를 제외한 모든 텍스트는 절대로 영어를 쓰지 말고 오직 자연스러운 한국어(Korean)로만 작성해야 합니다.',
    '- 추론과정: 가장 먼저 작성해야 하는 키입니다. 로그와 증상을 바탕으로 원인과 조치를 도출하는 논리적 사고 과정(Chain-of-Thought)을 2~3문장의 한국어로 적으세요.',
    '- 제목: 간결하고 검색하기 쉬운 요약 제목 (한국어)',
    '- 증상: 장애 당시 발생한 객관적 사실 및 징후 (한국어)',
    '- 원인: 추론과정 단계에서 도출해낸 근본 원인. (한국어 기재 필수)',
    '- 조치: 즉각적인 조치 및 향후 재발 방지를 위한 영구적 해결 방안 지시사항. (한국어 기재 필수)',
    '- 런북: 조치를 위해 실행해야 할 정확한 SQL이나 시스템 명령어 묶음 (1~5개 단계)',
    '- 진단단계: 문제를 확인하기 위해 조치 전 수행할 조회성 SQL 묶음 (1~5개 단계)',
    '- 태그: 5~10개의 짧은 영문/한글 키워드 배열 (띄어쓰기 없이)',
    '- 유사검색어: 팀 내에서 흔히 부르는 기타 동의어나 검색어 배열 (2~5개)',
    '- 적용버전: 예: "MySQL 8.0+", "PostgreSQL 14.x"',
    '- 신뢰도: 0.0에서 1.0 사이의 숫자. AI가 자신의 추론에 대해 가지는 신뢰도.',
    contextStr,
    '--- 원문 (Raw input) ---',
    rawInput,
    '------------------------',
    'CRITICAL FINAL WARNING:',
    '결과물 JSON의 모든 Key(키)는 반드시 위에서 요청한 한글 키워드("원인", "조치" 등)로 작성해야 합니다. 또한 Value(값) 역시 원문에 영어가 많더라도 무조건 한국어로 번역해서 출력하세요.'
  ].join('\n')
}
