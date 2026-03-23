-- RockECHO Seed Data: 50 incidents
-- PostgreSQL: 20, MySQL: 15, MongoDB: 10, Redis: 5

-- Default users
INSERT OR IGNORE INTO users (id, name, email, role) VALUES
  ('user-001', 'Admin', 'admin@rockecho.io', 'admin'),
  ('user-002', 'Senior DBA Kim', 'kim.senior@rockecho.io', 'senior_engineer'),
  ('user-003', 'Reviewer Lee', 'lee.reviewer@rockecho.io', 'reviewer'),
  ('user-004', 'Engineer Park', 'park@rockecho.io', 'engineer'),
  ('user-005', 'Engineer Choi', 'choi@rockecho.io', 'engineer');

-- PostgreSQL Incidents (20 건)
INSERT OR IGNORE INTO incident (id, incident_number, dbms, dbms_version, priority, raw_input, created_by, created_at) VALUES
('inc-pg-001','INC-0001','postgresql','PostgreSQL 15','p2','테이블에 dead tuple이 쌓이면서 쿼리가 느려짐. pg_stat_user_tables에서 n_dead_tup이 수백만 건. autovacuum이 실행되지 않음','user-002','2025-01-10 09:00:00'),
('inc-pg-002','INC-0002','postgresql','PostgreSQL 14','p1','streaming replication lag이 급격히 증가. pg_stat_replication에서 sent_lsn과 replay_lsn 차이가 1GB 이상. standby 서버 디스크 거의 풀','user-002','2025-01-15 14:30:00'),
('inc-pg-003','INC-0003','postgresql','PostgreSQL 15','p2','lock wait이 연쇄 발생. pg_locks에서 다수 세션이 블로킹 상태. 특정 UPDATE 쿼리가 원인','user-004','2025-01-20 11:00:00'),
('inc-pg-004','INC-0004','postgresql','PostgreSQL 13','p1','연결 수 max_connections 초과. FATAL: sorry, too many clients already. PgBouncer 설정 필요','user-002','2025-02-01 08:00:00'),
('inc-pg-005','INC-0005','postgresql','PostgreSQL 15','p2','인덱스 팽창(index bloat). 특정 인덱스 크기가 테이블의 3배. REINDEX 필요','user-004','2025-02-05 10:00:00'),
('inc-pg-006','INC-0006','postgresql','PostgreSQL 14','p1','WAL 디스크 풀. pg_wal 디렉토리가 200GB 이상 차지. archive_cleanup_command 미설정','user-002','2025-02-10 03:00:00'),
('inc-pg-007','INC-0007','postgresql','PostgreSQL 15','p2','checkpoint 빈도 높음. log에 checkpoint occurring too frequently 반복. shared_buffers, checkpoint_completion_target 튜닝 필요','user-005','2025-02-15 13:00:00'),
('inc-pg-008','INC-0008','postgresql','PostgreSQL 13','p2','autovacuum freeze_max_age 초과 임박. age(relfrozenxid)가 2억 이상. vacuum freeze 강제 실행 필요','user-002','2025-02-20 09:00:00'),
('inc-pg-009','INC-0009','postgresql','PostgreSQL 15','p3','슬로우 쿼리 급증. pg_stat_statements에서 특정 쿼리 mean_exec_time 10초 이상. 인덱스 누락','user-005','2025-03-01 11:00:00'),
('inc-pg-010','INC-0010','postgresql','PostgreSQL 14','p2','logical replication slot이 쌓임. inactive slot으로 WAL 보존 증가. 디스크 위험','user-002','2025-03-05 14:00:00'),
('inc-pg-011','INC-0011','postgresql','PostgreSQL 15','p1','primary failover 후 split-brain 발생. 두 노드가 모두 primary로 동작. Patroni fence 실패','user-002','2025-03-10 02:00:00'),
('inc-pg-012','INC-0012','postgresql','PostgreSQL 14','p2','temp file 과다 생성. work_mem 부족으로 sort/hash join이 디스크 사용. 쿼리 성능 저하','user-004','2025-03-15 10:00:00'),
('inc-pg-013','INC-0013','postgresql','PostgreSQL 15','p3','통계 정보 오래됨. analyze 미실행으로 잘못된 실행 계획 선택. sequential scan 선호','user-005','2025-03-20 14:00:00'),
('inc-pg-014','INC-0014','postgresql','PostgreSQL 13','p2','pg_hba.conf 변경 후 연결 거부. md5 → scram-sha-256 변경으로 기존 클라이언트 인증 실패','user-004','2025-03-25 09:00:00'),
('inc-pg-015','INC-0015','postgresql','PostgreSQL 15','p2','배치 INSERT 성능 저하. 단건 INSERT 반복으로 WAL 부하. COPY 또는 batch insert 필요','user-005','2025-04-01 11:00:00'),
('inc-pg-016','INC-0016','postgresql','PostgreSQL 14','p1','hot standby 연결 불가. recovery.conf 누락 또는 primary_conninfo 오설정','user-002','2025-04-05 08:00:00'),
('inc-pg-017','INC-0017','postgresql','PostgreSQL 15','p2','JSON 필드 쿼리 성능 저하. JSONB 인덱스 미생성. GIN 인덱스 추가 필요','user-004','2025-04-10 13:00:00'),
('inc-pg-018','INC-0018','postgresql','PostgreSQL 13','p3','pg_dump 실행 중 서비스 성능 저하. --jobs 옵션 과다 사용. 백업 시간대 조정 필요','user-005','2025-04-15 02:00:00'),
('inc-pg-019','INC-0019','postgresql','PostgreSQL 15','p2','extension 설치 후 DB 재시작 불가. shared_preload_libraries 미추가','user-004','2025-04-20 10:00:00'),
('inc-pg-020','INC-0020','postgresql','PostgreSQL 14','p2','테이블 파티션 쿼리 성능 저하. constraint exclusion 미작동. 파티션 키 조건 누락','user-002','2025-04-25 14:00:00');

-- MySQL Incidents (15 건)
INSERT OR IGNORE INTO incident (id, incident_number, dbms, dbms_version, priority, raw_input, created_by, created_at) VALUES
('inc-my-001','INC-0021','mysql','MySQL 8.0','p2','InnoDB dead lock 발생. SHOW ENGINE INNODB STATUS에서 deadlock found. 트랜잭션 순서 충돌','user-004','2025-01-12 10:00:00'),
('inc-my-002','INC-0022','mysql','MySQL 8.0','p1','replication 중단. Slave SQL thread error. Got a packet bigger than max_allowed_packet','user-002','2025-01-18 15:00:00'),
('inc-my-003','INC-0023','mysql','MySQL 5.7','p2','slow query 급증. innodb_buffer_pool_size 부족. buffer pool hit ratio 90% 이하','user-005','2025-01-25 09:00:00'),
('inc-my-004','INC-0024','mysql','MySQL 8.0','p1','binlog 디스크 풀. expire_logs_days 미설정. 수동 purge 필요','user-002','2025-02-02 04:00:00'),
('inc-my-005','INC-0025','mysql','MySQL 8.0','p2','ALTER TABLE 중 테이블 잠금. Online DDL 옵션 미사용. ALGORITHM=INPLACE 필요','user-004','2025-02-08 11:00:00'),
('inc-my-006','INC-0026','mysql','MySQL 5.7','p2','innodb_buffer_pool 오염. 대용량 full scan 후 hot data 축출. innodb_old_blocks_time 조정','user-005','2025-02-14 14:00:00'),
('inc-my-007','INC-0027','mysql','MySQL 8.0','p3','statistics 부정확. innodb_stats_persistent_sample_pages 기본값 너무 작음. 쿼리 플랜 오류','user-005','2025-02-20 10:00:00'),
('inc-my-008','INC-0028','mysql','MySQL 8.0','p2','connection pool 고갈. max_connections 초과. Too many connections 에러','user-004','2025-02-25 08:00:00'),
('inc-my-009','INC-0029','mysql','MySQL 8.0','p1','GTID 기반 replication 깨짐. Retrieved_Gtid_Set과 Executed_Gtid_Set 불일치','user-002','2025-03-03 02:00:00'),
('inc-my-010','INC-0030','mysql','MySQL 5.7','p2','파티션 테이블 prune 미작동. WHERE 조건에 파티션 컬럼 미포함으로 full scan','user-004','2025-03-08 11:00:00'),
('inc-my-011','INC-0031','mysql','MySQL 8.0','p2','undo tablespace 증가. 장시간 트랜잭션으로 rollback segment 비대. history list length 증가','user-005','2025-03-15 14:00:00'),
('inc-my-012','INC-0032','mysql','MySQL 8.0','p3','group by 쿼리 성능 저하. filesort 발생. covering index 미생성','user-004','2025-03-22 10:00:00'),
('inc-my-013','INC-0033','mysql','MySQL 8.0','p2','SSL 인증서 만료로 replication 중단. master_ssl_verify_server_cert 확인 필요','user-002','2025-03-28 09:00:00'),
('inc-my-014','INC-0034','mysql','MySQL 8.0','p1','crash recovery 중 InnoDB 테이블스페이스 손상. innodb_force_recovery 옵션 필요','user-002','2025-04-03 01:00:00'),
('inc-my-015','INC-0035','mysql','MySQL 8.0','p2','read replica 지연. long-running query on master가 replication 지연 유발. parallel replication 설정 필요','user-005','2025-04-10 13:00:00');

-- MongoDB Incidents (10 건)
INSERT OR IGNORE INTO incident (id, incident_number, dbms, dbms_version, priority, raw_input, created_by, created_at) VALUES
('inc-mg-001','INC-0036','mongodb','MongoDB 6.0','p2','wiredTiger cache 사용률 95% 초과. cacheSizeGB 증가 또는 불필요 데이터 삭제 필요','user-004','2025-01-14 10:00:00'),
('inc-mg-002','INC-0037','mongodb','MongoDB 6.0','p1','replica set primary 선출 실패. 3노드 중 2노드 다운. 과반수 확보 불가','user-002','2025-01-22 03:00:00'),
('inc-mg-003','INC-0038','mongodb','MongoDB 5.0','p2','컬렉션 스캔 속도 저하. find() 쿼리에 인덱스 미사용. explain() 결과 COLLSCAN','user-005','2025-02-03 11:00:00'),
('inc-mg-004','INC-0039','mongodb','MongoDB 6.0','p2','oplog window 너무 짧음. 초당 write 많음. oplogSizeMB 증가 필요. secondary 동기화 실패 위험','user-002','2025-02-12 14:00:00'),
('inc-mg-005','INC-0040','mongodb','MongoDB 6.0','p3','인덱스 과다 생성으로 write 성능 저하. 사용되지 않는 인덱스 제거 필요. $indexStats 확인','user-005','2025-02-18 10:00:00'),
('inc-mg-006','INC-0041','mongodb','MongoDB 5.0','p2','chunk migration으로 인한 성능 저하. sharded cluster에서 balancer 동작 중. 밸런서 일정 조정','user-004','2025-02-25 13:00:00'),
('inc-mg-007','INC-0042','mongodb','MongoDB 6.0','p2','대용량 aggregation 파이프라인 메모리 초과. allowDiskUse: true 미설정. 16MB 제한 초과','user-005','2025-03-05 11:00:00'),
('inc-mg-008','INC-0043','mongodb','MongoDB 6.0','p1','mongos 연결 불가. config server replica set 문제. CSRS 장애','user-002','2025-03-12 02:00:00'),
('inc-mg-009','INC-0044','mongodb','MongoDB 5.0','p3','TTL 인덱스 미작동. expireAfterSeconds 설정 확인. background delete 지연','user-004','2025-03-20 10:00:00'),
('inc-mg-010','INC-0045','mongodb','MongoDB 6.0','p2','write concern 설정 미흡으로 데이터 손실. w:1 설정으로 primary crash 시 미복제 데이터 손실','user-002','2025-03-28 14:00:00');

-- Redis Incidents (5 건)
INSERT OR IGNORE INTO incident (id, incident_number, dbms, dbms_version, priority, raw_input, created_by, created_at) VALUES
('inc-rd-001','INC-0046','redis','Redis 7.2','p1','maxmemory 도달로 신규 write 실패. OOM command not allowed. allkeys-lru 정책으로 변경 필요','user-004','2025-01-16 08:00:00'),
('inc-rd-002','INC-0047','redis','Redis 7.0','p2','BGSAVE 실패. fork() 불가. vm.overcommit_memory = 0으로 설정. sysctl 변경 필요','user-005','2025-02-06 10:00:00'),
('inc-rd-003','INC-0048','redis','Redis 7.2','p1','Sentinel failover 미작동. quorum 설정 오류. 3 sentinel 중 2 down. 리더 선출 불가','user-002','2025-02-22 03:00:00'),
('inc-rd-004','INC-0049','redis','Redis 7.0','p2','cluster node 간 연결 끊김. CLUSTER NODES에서 fail 상태. meet 재실행 필요','user-004','2025-03-10 11:00:00'),
('inc-rd-005','INC-0050','redis','Redis 7.2','p3','keyspace notification 미작동. notify-keyspace-events 설정 누락. KEA 값으로 설정 필요','user-005','2025-04-02 14:00:00');

-- Knowledge Entries (approved) for seed incidents
INSERT OR IGNORE INTO knowledge_entry (id, incident_id, title, symptom, cause, cause_confidence, action, runbook, diagnostic_steps, tags, aliases, version_range, status, ai_quality_score, search_count, approved_by, approved_at, reviewed_at, created_at, updated_at) VALUES

-- PG-001: Dead Tuple Bloat
('ke-pg-001','inc-pg-001','PostgreSQL Dead Tuple Bloat로 인한 쿼리 성능 저하',
'테이블에 dead tuple이 수백만 건 누적되어 sequential scan 속도 저하. pg_stat_user_tables.n_dead_tup 급증.',
'DELETE/UPDATE 후 VACUUM이 적시에 실행되지 않아 dead tuple 누적. autovacuum cost_delay 설정이 너무 높거나 autovacuum이 비활성화된 경우 발생.',
'expert_verified',
'1. VACUUM (VERBOSE, ANALYZE) 즉시 실행. 2. autovacuum_vacuum_scale_factor 및 autovacuum_vacuum_threshold 튜닝. 3. 테이블별 autovacuum 파라미터 개별 설정 검토.',
'[{"step":1,"title":"Dead Tuple 현황 확인","sql":"SELECT schemaname, relname, n_live_tup, n_dead_tup, last_vacuum, last_autovacuum FROM pg_stat_user_tables WHERE n_dead_tup > 100000 ORDER BY n_dead_tup DESC;"},{"step":2,"title":"VACUUM 즉시 실행","sql":"VACUUM (VERBOSE, ANALYZE) <table_name>;"},{"step":3,"title":"Autovacuum 파라미터 조정","sql":"ALTER TABLE <table_name> SET (autovacuum_vacuum_scale_factor = 0.01, autovacuum_vacuum_threshold = 1000);"},{"step":4,"title":"실행 결과 확인","sql":"SELECT relname, last_vacuum, last_autovacuum, n_dead_tup FROM pg_stat_user_tables WHERE relname = ''<table_name>'';"}]',
'[{"step":1,"title":"Dead Tuple 상위 테이블 확인","sql":"SELECT relname, n_dead_tup, n_live_tup, round(n_dead_tup::numeric/nullif(n_live_tup+n_dead_tup,0)*100,2) AS dead_ratio FROM pg_stat_user_tables WHERE n_dead_tup > 10000 ORDER BY n_dead_tup DESC LIMIT 20;"},{"step":2,"title":"Autovacuum 설정 확인","sql":"SELECT name, setting FROM pg_settings WHERE name LIKE ''%autovacuum%'' ORDER BY name;"},{"step":3,"title":"현재 Autovacuum 실행 중인 프로세스","sql":"SELECT pid, query, now() - pg_stat_activity.query_start AS duration FROM pg_stat_activity WHERE query ILIKE ''%autovacuum%'';"}]',
'["dead_tuple","vacuum","autovacuum","bloat","postgresql","성능저하"]',
'["dead tuple bloat","테이블 팽창","vacuum 안됨","n_dead_tup 높음","autovacuum 미작동"]',
'PG 12-16','approved',0.92,15,'user-003','2025-01-11 10:00:00','2025-01-11 09:30:00','2025-01-10 09:30:00','2025-01-11 10:00:00'),

-- PG-002: Replication Lag
('ke-pg-002','inc-pg-002','PostgreSQL Streaming Replication Lag 급증 및 디스크 부족',
'pg_stat_replication의 sent_lsn과 replay_lsn 차이가 1GB 이상으로 증가. standby 서버 디스크 사용률 95% 초과.',
'Standby 서버의 디스크 I/O 병목 또는 용량 부족으로 WAL 적용이 지연됨. 대용량 배치 작업 후 주로 발생.',
'expert_verified',
'1. Standby 디스크 공간 확보 (불필요 파일 삭제, 로그 정리). 2. wal_receiver_status_interval 및 wal_apply_delay 확인. 3. 네트워크 대역폭 및 I/O 성능 점검. 4. max_wal_size 조정 검토.',
'[{"step":1,"title":"Replication Lag 현황 확인","sql":"SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn, (sent_lsn - replay_lsn) AS replication_delay FROM pg_stat_replication;"},{"step":2,"title":"Standby 서버 디스크 확인","sql":"SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;"},{"step":3,"title":"WAL 디렉토리 크기 확인","sql":"-- On OS level\\ndu -sh $PGDATA/pg_wal/"},{"step":4,"title":"Replication Slot 확인","sql":"SELECT slot_name, active, restart_lsn, confirmed_flush_lsn FROM pg_replication_slots;"}]',
'[{"step":1,"title":"Replication 상태 전체 확인","sql":"SELECT * FROM pg_stat_replication;"},{"step":2,"title":"WAL Sender 상태","sql":"SELECT pid, usename, application_name, client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn FROM pg_stat_replication;"},{"step":3,"title":"Standby에서 수신 상태 확인","sql":"SELECT * FROM pg_stat_wal_receiver;"}]',
'["replication","lag","streaming_replication","wal","standby","postgresql","disk_full"]',
'["replication lag","복제 지연","standby 지연","sent_lsn replay_lsn 차이","WAL 적용 지연"]',
'PG 12-16','approved',0.95,22,'user-003','2025-01-16 10:00:00','2025-01-16 09:30:00','2025-01-15 15:00:00','2025-01-16 10:00:00'),

-- PG-003: Lock Wait
('ke-pg-003','inc-pg-003','PostgreSQL 연쇄 Lock Wait으로 인한 세션 블로킹',
'pg_locks에서 다수 세션이 relation 또는 row lock 대기 상태. 특정 UPDATE/DELETE 쿼리가 장시간 lock 보유.',
'장시간 실행되는 UPDATE 트랜잭션이 row-level lock을 보유한 채 다른 쿼리를 블로킹. 트랜잭션 내 불필요한 sleep 또는 외부 API 호출 포함된 경우 악화.',
'expert_verified',
'1. 블로킹 쿼리 즉시 종료 (pg_terminate_backend). 2. lock_timeout 파라미터 설정. 3. 쿼리 내 트랜잭션 범위 최소화. 4. deadlock_timeout 조정.',
'[{"step":1,"title":"블로킹 세션 확인","sql":"SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state FROM pg_stat_activity WHERE state != ''idle'' ORDER BY duration DESC LIMIT 20;"},{"step":2,"title":"Lock 대기 관계 파악","sql":"SELECT blocked_locks.pid AS blocked_pid, blocked_activity.usename, blocking_locks.pid AS blocking_pid, blocking_activity.query AS blocking_statement FROM pg_catalog.pg_locks blocked_locks JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype AND blocking_locks.pid != blocked_locks.pid AND blocking_locks.granted JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid WHERE NOT blocked_locks.granted;"},{"step":3,"title":"블로킹 프로세스 종료","sql":"SELECT pg_terminate_backend(<blocking_pid>);"},{"step":4,"title":"Lock Timeout 설정","sql":"ALTER SYSTEM SET lock_timeout = ''30s''; SELECT pg_reload_conf();"}]',
'[{"step":1,"title":"현재 Lock 현황","sql":"SELECT relation::regclass, mode, granted, pid FROM pg_locks WHERE relation IS NOT NULL ORDER BY relation;"},{"step":2,"title":"장시간 실행 쿼리","sql":"SELECT pid, usename, now() - query_start AS runtime, state, query FROM pg_stat_activity WHERE state = ''active'' AND now() - query_start > interval ''30 seconds'' ORDER BY runtime DESC;"}]',
'["lock","lock_wait","blocking","pg_locks","deadlock","postgresql","성능저하"]',
'["lock wait","잠금 대기","세션 블로킹","락 대기","deadlock detected","pg_locks"]',
'PG 10-16','approved',0.90,18,'user-003','2025-01-21 10:00:00','2025-01-21 09:30:00','2025-01-20 11:30:00','2025-01-21 10:00:00'),

-- PG-004: max_connections 초과
('ke-pg-004','inc-pg-004','PostgreSQL max_connections 초과 - too many clients',
'FATAL: sorry, too many clients already 에러 발생. 애플리케이션 서버에서 연결 실패. max_connections 기본값(100) 도달.',
'애플리케이션에서 Connection Pool을 사용하지 않거나 Pool 크기가 max_connections에 비해 과다하게 설정됨.',
'expert_verified',
'1. PgBouncer 또는 pgpool-II connection pooler 즉시 설치 및 설정. 2. 불필요한 idle 연결 종료. 3. 애플리케이션 connection pool 크기 조정.',
'[{"step":1,"title":"현재 연결 수 확인","sql":"SELECT count(*) AS total, count(*) FILTER (WHERE state = ''active'') AS active, count(*) FILTER (WHERE state = ''idle'') AS idle FROM pg_stat_activity;"},{"step":2,"title":"DB별 연결 현황","sql":"SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname ORDER BY count DESC;"},{"step":3,"title":"오래된 idle 연결 종료","sql":"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = ''idle'' AND state_change < NOW() - INTERVAL ''10 minutes'';"},{"step":4,"title":"max_connections 확인","sql":"SHOW max_connections;"}]',
'[{"step":1,"title":"연결 한도 대비 현황","sql":"SELECT max_conn, used, res_for_super, max_conn - used - res_for_super AS available FROM (SELECT count(*) used FROM pg_stat_activity) t1, (SELECT setting::int max_conn FROM pg_settings WHERE name=''max_connections'') t2, (SELECT setting::int res_for_super FROM pg_settings WHERE name=''superuser_reserved_connections'') t3;"}]',
'["max_connections","connection","pgbouncer","connection_pool","postgresql","연결초과"]',
'["too many clients","max connections 초과","연결 초과","connection pool","pgbouncer 필요"]',
'PG 10-16','approved',0.88,30,'user-003','2025-02-02 10:00:00','2025-02-02 09:30:00','2025-02-01 08:30:00','2025-02-02 10:00:00'),

-- PG-006: WAL 디스크 풀
('ke-pg-006','inc-pg-006','PostgreSQL WAL 디렉토리 디스크 풀',
'pg_wal 디렉토리가 200GB 이상을 차지하며 디스크 여유 공간이 5% 미만으로 감소.',
'archive_cleanup_command 미설정 또는 WAL archiving 실패로 pg_wal 파일이 삭제되지 않고 누적. Replication slot이 있는 경우 slot이 WAL 보존을 강제함.',
'expert_verified',
'1. pg_archivecleanup 수동 실행. 2. 비활성 replication slot 확인 및 삭제. 3. archive_cleanup_command 설정. 4. min_wal_size, max_wal_size 조정.',
'[{"step":1,"title":"WAL 디렉토리 크기 확인","sql":"-- OS level: du -sh $PGDATA/pg_wal"},{"step":2,"title":"Replication Slot 확인","sql":"SELECT slot_name, active, restart_lsn FROM pg_replication_slots ORDER BY restart_lsn;"},{"step":3,"title":"비활성 Slot 삭제","sql":"SELECT pg_drop_replication_slot(''<slot_name>'');"},{"step":4,"title":"WAL 설정 확인","sql":"SHOW archive_mode; SHOW archive_command; SHOW max_wal_size;"}]',
'[{"step":1,"title":"WAL 관련 설정 전체 확인","sql":"SELECT name, setting FROM pg_settings WHERE name IN (''archive_mode'',''archive_command'',''max_wal_size'',''min_wal_size'',''wal_keep_size'');"},{"step":2,"title":"Slot 현황 및 지연량","sql":"SELECT slot_name, slot_type, active, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS replication_lag FROM pg_replication_slots;"}]',
'["wal","disk_full","archive","replication_slot","postgresql","디스크"]',
'["WAL 디스크 풀","pg_wal 가득","archive 미설정","replication slot 쌓임","WAL 누적"]',
'PG 10-16','approved',0.91,12,'user-003','2025-02-11 10:00:00','2025-02-11 09:30:00','2025-02-10 03:30:00','2025-02-11 10:00:00'),

-- MY-001: InnoDB Deadlock
('ke-my-001','inc-my-001','MySQL InnoDB Deadlock 발생',
'SHOW ENGINE INNODB STATUS에서 LATEST DETECTED DEADLOCK 섹션에 deadlock found when trying to get lock 에러 발생.',
'두 트랜잭션이 서로 다른 순서로 행 잠금을 획득하려 할 때 교착 상태 발생. 인덱스 범위 잠금이 원인인 경우 많음.',
'expert_verified',
'1. SHOW ENGINE INNODB STATUS로 deadlock 트랜잭션 확인. 2. 트랜잭션 내 잠금 획득 순서 통일. 3. innodb_deadlock_detect = ON 확인. 4. 짧은 트랜잭션으로 분리.',
'[{"step":1,"title":"Deadlock 상태 확인","sql":"SHOW ENGINE INNODB STATUS\\G"},{"step":2,"title":"현재 Lock 대기 확인","sql":"SELECT r.trx_id waiting_trx_id, r.trx_mysql_thread_id waiting_thread, r.trx_query waiting_query, b.trx_id blocking_trx_id, b.trx_mysql_thread_id blocking_thread, b.trx_query blocking_query FROM information_schema.innodb_lock_waits w INNER JOIN information_schema.innodb_trx b ON b.trx_id = w.blocking_trx_id INNER JOIN information_schema.innodb_trx r ON r.trx_id = w.requesting_trx_id;"},{"step":3,"title":"블로킹 프로세스 종료","sql":"KILL <blocking_thread_id>;"}]',
'[{"step":1,"title":"InnoDB 트랜잭션 현황","sql":"SELECT trx_id, trx_state, trx_started, trx_query FROM information_schema.innodb_trx ORDER BY trx_started;"},{"step":2,"title":"Lock 대기 현황","sql":"SELECT * FROM performance_schema.data_lock_waits\\G"}]',
'["deadlock","innodb","lock","mysql","트랜잭션","잠금"]',
'["deadlock detected","InnoDB deadlock","교착상태","lock timeout exceeded","innodb lock wait"]',
'MySQL 5.7-8.0','approved',0.89,25,'user-003','2025-01-13 10:00:00','2025-01-13 09:30:00','2025-01-12 10:30:00','2025-01-13 10:00:00'),

-- MY-002: Replication Packet 오류
('ke-my-002','inc-my-002','MySQL Replication max_allowed_packet 초과로 중단',
'Slave SQL thread가 Got a packet bigger than max_allowed_packet bytes 에러로 중단. Seconds_Behind_Master가 NULL.',
'대용량 BLOB/TEXT 데이터 또는 대형 트랜잭션이 max_allowed_packet 제한을 초과하여 binlog 전송 실패.',
'expert_verified',
'1. Master와 Slave 모두 max_allowed_packet 값 증가 (예: 256M). 2. my.cnf [mysqld], [mysqldump], [mysql] 섹션 모두 설정. 3. Slave SQL thread 재시작.',
'[{"step":1,"title":"현재 설정 확인","sql":"SHOW VARIABLES LIKE ''max_allowed_packet'';"},{"step":2,"title":"Slave 상태 확인","sql":"SHOW SLAVE STATUS\\G"},{"step":3,"title":"Master에서 설정 변경","sql":"SET GLOBAL max_allowed_packet = 256*1024*1024;"},{"step":4,"title":"Slave 재시작","sql":"STOP SLAVE; START SLAVE; SHOW SLAVE STATUS\\G"}]',
'[{"step":1,"title":"Replication 상태 전체","sql":"SHOW SLAVE STATUS\\G"},{"step":2,"title":"패킷 크기 관련 설정","sql":"SHOW VARIABLES LIKE ''%packet%'';"}]',
'["replication","max_allowed_packet","slave","mysql","복제중단","binlog"]',
'["max_allowed_packet","replication 중단","slave sql thread error","복제 패킷 오류"]',
'MySQL 5.7-8.0','approved',0.87,8,'user-003','2025-01-19 10:00:00','2025-01-19 09:30:00','2025-01-18 15:30:00','2025-01-19 10:00:00'),

-- MY-004: Binlog 디스크 풀
('ke-my-004','inc-my-004','MySQL Binlog 과다 누적으로 디스크 풀',
'MySQL 데이터 디렉토리의 binlog 파일이 수백 GB 누적. 디스크 사용률 98% 이상.',
'binlog_expire_logs_seconds (또는 expire_logs_days) 미설정 또는 너무 긴 보존 기간으로 오래된 binlog 파일 미삭제.',
'expert_verified',
'1. PURGE BINARY LOGS 즉시 실행으로 공간 확보. 2. binlog_expire_logs_seconds 설정 (예: 7일 = 604800). 3. 향후 모니터링 알람 설정.',
'[{"step":1,"title":"현재 Binlog 목록","sql":"SHOW BINARY LOGS;"},{"step":2,"title":"Binlog 설정 확인","sql":"SHOW VARIABLES LIKE ''%expire%''; SHOW VARIABLES LIKE ''%binlog%'';"},{"step":3,"title":"특정 날짜 이전 Binlog 삭제","sql":"PURGE BINARY LOGS BEFORE ''2025-01-01 00:00:00'';"},{"step":4,"title":"자동 만료 설정","sql":"SET GLOBAL binlog_expire_logs_seconds = 604800;"}]',
'[{"step":1,"title":"Binlog 파일 크기 합산","sql":"SELECT SUM(file_size)/1024/1024/1024 AS total_gb FROM information_schema.FILES WHERE file_type = ''REDO LOG'';"},{"step":2,"title":"Binary Log 상태","sql":"SHOW MASTER STATUS\\G"}]',
'["binlog","disk_full","expire_logs","mysql","디스크","binary_log"]',
'["binlog 디스크 풀","binary log 누적","expire_logs_days","PURGE BINARY LOGS","binlog 정리"]',
'MySQL 5.7-8.0','approved',0.93,20,'user-003','2025-02-03 10:00:00','2025-02-03 09:30:00','2025-02-02 04:30:00','2025-02-03 10:00:00'),

-- MY-009: GTID Replication 깨짐
('ke-my-009','inc-my-009','MySQL GTID 기반 Replication 불일치',
'SHOW SLAVE STATUS에서 Retrieved_Gtid_Set과 Executed_Gtid_Set이 불일치. Slave SQL thread 중단.',
'Master에서 non-GTID 트랜잭션 실행, 수동 데이터 변경, 또는 Slave에서 직접 DML 실행으로 GTID 불일치 발생.',
'expert_verified',
'1. GTID 불일치 원인 파악. 2. RESET MASTER / RESET SLAVE 후 재동기화. 3. 또는 특정 GTID skip 처리. 4. enforce_gtid_consistency 설정 확인.',
'[{"step":1,"title":"GTID 불일치 확인","sql":"SHOW SLAVE STATUS\\G -- Retrieved_Gtid_Set vs Executed_Gtid_Set 비교"},{"step":2,"title":"특정 GTID 건너뛰기","sql":"STOP SLAVE; SET GTID_NEXT=''<master_uuid>:<transaction_id>''; BEGIN; COMMIT; SET GTID_NEXT=''AUTOMATIC''; START SLAVE;"},{"step":3,"title":"전체 재동기화 (필요시)","sql":"STOP SLAVE; RESET SLAVE ALL; -- mysqldump로 재동기화 후 START SLAVE;"},{"step":4,"title":"GTID 설정 확인","sql":"SHOW VARIABLES LIKE ''%gtid%'';"}]',
'[{"step":1,"title":"Slave 전체 상태","sql":"SHOW SLAVE STATUS\\G"},{"step":2,"title":"GTID 관련 변수","sql":"SHOW VARIABLES LIKE ''gtid_mode''; SHOW VARIABLES LIKE ''enforce_gtid_consistency'';"}]',
'["gtid","replication","slave","mysql","복제불일치","GTID_SET"]',
'["GTID 불일치","gtid replication 깨짐","Retrieved_Gtid_Set","Executed_Gtid_Set","gtid skip"]',
'MySQL 5.7-8.0','approved',0.91,14,'user-003','2025-03-04 10:00:00','2025-03-04 09:30:00','2025-03-03 02:30:00','2025-03-04 10:00:00'),

-- MG-001: WiredTiger Cache
('ke-mg-001','inc-mg-001','MongoDB WiredTiger Cache 사용률 급증',
'mongostat 및 serverStatus에서 wiredTiger.cache.bytes in cache 값이 cacheSizeGB의 95% 이상 도달. 쿼리 지연 및 disk spill 발생.',
'메모리 부족으로 인해 WiredTiger 캐시가 자주 eviction 발생. 대용량 aggregation 또는 collection scan이 캐시를 오염시키는 경우 많음.',
'expert_verified',
'1. wiredTigerCacheSizeGB 값 증가 (전체 메모리의 50% 목표). 2. 불필요한 index 제거. 3. 대용량 쿼리는 allowDiskUse: true 사용. 4. 캐시 오염 유발 쿼리 최적화.',
'[{"step":1,"title":"캐시 현황 확인","sql":"db.serverStatus().wiredTiger.cache"},{"step":2,"title":"전체 통계 확인","sql":"db.runCommand({serverStatus: 1})"},{"step":3,"title":"캐시 크기 조정 (mongod.conf)","sql":"# storage:\\n#   wiredTiger:\\n#     engineConfig:\\n#       cacheSizeGB: <size>"},{"step":4,"title":"현재 캐시 크기 확인","sql":"db.adminCommand({getCmdLineOpts: 1})"}]',
'[{"step":1,"title":"Cache 사용률","sql":"var s = db.serverStatus(); print(''Cache Used: '' + s.wiredTiger.cache[''bytes currently in the cache''] / 1024/1024/1024 + '' GB'');"},{"step":2,"title":"Eviction 통계","sql":"db.serverStatus().wiredTiger.cache[''pages evicted by application threads'']"}]',
'["wiredtiger","cache","mongodb","메모리","성능저하","eviction"]',
'["wiredTiger cache full","캐시 사용률 높음","mongodb 메모리 부족","cache eviction","cacheSizeGB"]',
'MongoDB 4.4-7.0','approved',0.88,16,'user-003','2025-01-15 10:00:00','2025-01-15 09:30:00','2025-01-14 10:30:00','2025-01-15 10:00:00'),

-- MG-002: Replica Set Primary 선출 실패
('ke-mg-002','inc-mg-002','MongoDB Replica Set Primary 선출 실패',
'3노드 replica set에서 2노드 장애로 primary 선출 불가. rs.status()에서 모든 노드가 SECONDARY 또는 UNKNOWN 상태.',
'과반수(majority) 노드 확보 실패로 election 진행 불가. 3노드 중 2노드 다운 시 quorum 부족.',
'expert_verified',
'1. 장애 노드 즉시 복구 시도. 2. 복구 불가능 시 남은 노드에서 rs.reconfig()로 임시 구성 변경. 3. force 옵션 사용 시 주의 필요.',
'[{"step":1,"title":"Replica Set 상태 확인","sql":"rs.status()"},{"step":2,"title":"강제 재구성 (1노드 생존 시)","sql":"cfg = rs.conf(); cfg.members = [cfg.members[0]]; rs.reconfig(cfg, {force: true})"},{"step":3,"title":"노드 추가","sql":"rs.add(''<host>:<port>'')"},{"step":4,"title":"Oplog 확인","sql":"rs.printReplicationInfo()"}]',
'[{"step":1,"title":"RS 상태","sql":"rs.status()"},{"step":2,"title":"RS 구성","sql":"rs.conf()"},{"step":3,"title":"Oplog 크기 및 시간","sql":"rs.printReplicationInfo(); rs.printSlaveReplicationInfo()"}]',
'["replica_set","election","primary","mongodb","장애","quorum"]',
'["primary 선출 실패","replica set election","no primary","quorum 부족","rs.status"]',
'MongoDB 4.4-7.0','approved',0.94,11,'user-003','2025-01-23 10:00:00','2025-01-23 09:30:00','2025-01-22 03:30:00','2025-01-23 10:00:00'),

-- RD-001: maxmemory
('ke-rd-001','inc-rd-001','Redis maxmemory 도달로 OOM 에러',
'OOM command not allowed when used memory > maxmemory 에러 발생. 신규 SET 명령어 모두 실패.',
'maxmemory 설정이 너무 낮거나 eviction policy가 noeviction으로 설정되어 메모리 한계 초과 시 쓰기 불가.',
'expert_verified',
'1. 즉시 불필요한 키 삭제 (SCAN + DEL). 2. maxmemory-policy를 allkeys-lru 또는 volatile-lru로 변경. 3. maxmemory 값 증가. 4. TTL 없는 키 검토.',
'[{"step":1,"title":"메모리 현황 확인","sql":"INFO memory"},{"step":2,"title":"현재 eviction 정책 확인","sql":"CONFIG GET maxmemory-policy"},{"step":3,"title":"Eviction 정책 변경","sql":"CONFIG SET maxmemory-policy allkeys-lru"},{"step":4,"title":"maxmemory 증가","sql":"CONFIG SET maxmemory 4gb"},{"step":5,"title":"큰 키 확인","sql":"redis-cli --bigkeys"}]',
'[{"step":1,"title":"메모리 통계","sql":"INFO memory"},{"step":2,"title":"키 개수","sql":"DBSIZE"},{"step":3,"title":"Eviction 관련 설정","sql":"CONFIG GET maxmemory*"}]',
'["maxmemory","oom","eviction","redis","메모리","allkeys-lru"]',
'["OOM command not allowed","maxmemory 초과","redis 메모리 부족","eviction policy","allkeys-lru 설정"]',
'Redis 6.0-7.2','approved',0.92,28,'user-003','2025-01-17 10:00:00','2025-01-17 09:30:00','2025-01-16 08:30:00','2025-01-17 10:00:00'),

-- RD-003: Sentinel Failover
('ke-rd-003','inc-rd-003','Redis Sentinel Failover 미작동',
'Master Redis 장애 발생 시 Sentinel이 자동 failover를 수행하지 않음. Sentinel 로그에 election quorum 부족 메시지.',
'3개 Sentinel 중 2개가 다운된 상태에서 quorum 설정값(2) 미달로 failover 결정 불가. 또는 Sentinel 설정의 quorum 값이 잘못됨.',
'expert_verified',
'1. Sentinel 프로세스 상태 확인 및 재시작. 2. sentinel.conf의 sentinel monitor 라인의 quorum 값 검토. 3. 최소 3개 Sentinel 운영 필수. 4. 네트워크 격리 여부 확인.',
'[{"step":1,"title":"Sentinel 상태 확인","sql":"redis-cli -p 26379 INFO sentinel"},{"step":2,"title":"Master 상태 확인","sql":"redis-cli -p 26379 SENTINEL masters"},{"step":3,"title":"Sentinel 연결 확인","sql":"redis-cli -p 26379 SENTINEL sentinels mymaster"},{"step":4,"title":"수동 Failover","sql":"redis-cli -p 26379 SENTINEL failover mymaster"}]',
'[{"step":1,"title":"Sentinel 전체 정보","sql":"redis-cli -p 26379 INFO sentinel"},{"step":2,"title":"Quorum 확인","sql":"redis-cli -p 26379 SENTINEL ckquorum mymaster"}]',
'["sentinel","failover","redis","quorum","고가용성","HA"]',
'["sentinel failover 안됨","Redis sentinel 문제","quorum 부족","자동 failover 실패","sentinel 설정"]',
'Redis 6.0-7.2','approved',0.90,9,'user-003','2025-02-23 10:00:00','2025-02-23 09:30:00','2025-02-22 03:30:00','2025-02-23 10:00:00');

-- Activity Logs
INSERT OR IGNORE INTO activity_log (id, knowledge_entry_id, user_id, action, note, created_at) VALUES
('al-001','ke-pg-001','user-002','created',NULL,'2025-01-10 09:30:00'),
('al-002','ke-pg-001','user-001','ai_generated','AI가 Knowledge 초안 자동 생성','2025-01-10 09:35:00'),
('al-003','ke-pg-001','user-002','submitted','검토 요청','2025-01-11 09:00:00'),
('al-004','ke-pg-001','user-003','approved',NULL,'2025-01-11 10:00:00'),
('al-005','ke-pg-002','user-002','created',NULL,'2025-01-15 15:00:00'),
('al-006','ke-pg-002','user-001','ai_generated','AI가 Knowledge 초안 자동 생성','2025-01-15 15:05:00'),
('al-007','ke-pg-002','user-002','submitted','검토 요청','2025-01-16 09:00:00'),
('al-008','ke-pg-002','user-003','approved',NULL,'2025-01-16 10:00:00'),
('al-009','ke-pg-003','user-004','created',NULL,'2025-01-20 11:30:00'),
('al-010','ke-pg-003','user-001','ai_generated','AI가 Knowledge 초안 자동 생성','2025-01-20 11:35:00'),
('al-011','ke-pg-003','user-004','submitted','검토 요청','2025-01-21 09:00:00'),
('al-012','ke-pg-003','user-003','approved',NULL,'2025-01-21 10:00:00');

-- Search Events (샘플)
INSERT OR IGNORE INTO search_event (id, user_id, query, normalized_query, dbms_filter, status_filter, result_ids, total_results, created_at) VALUES
('se-001','user-004','dead tuple bloat','dead tuple bloat','all','approved','["ke-pg-001"]',1,'2025-02-01 10:00:00'),
('se-002','user-005','replication lag','replication lag','postgresql','approved','["ke-pg-002"]',1,'2025-02-02 11:00:00'),
('se-003','user-004','deadlock','deadlock','mysql','approved','["ke-my-001"]',1,'2025-02-03 09:00:00'),
('se-004','user-005','connection exhausted','connection exhausted','all','approved','["ke-pg-004"]',1,'2025-02-05 14:00:00'),
('se-005','user-004','redis oom','redis oom','redis','approved','["ke-rd-001"]',1,'2025-02-06 10:00:00');

-- Zero Result Queries (샘플)
INSERT OR IGNORE INTO zero_result_queries (id, query, normalized_query, dbms_filter, count, last_seen_at) VALUES
('zr-001','pg_stat_bgwriter 이상','pg_stat_bgwriter 이상','postgresql',3,'2025-03-01 10:00:00'),
('zr-002','SingleStore 메모리 부족','singlestore 메모리 부족','singlestoredb',2,'2025-03-05 14:00:00'),
('zr-003','HeatWave cluster 오류','heatwave cluster 오류','heatwave',1,'2025-03-10 11:00:00'),
('zr-004','TarantulaDB snapshot 실패','tarantuladb snapshot 실패','tarantuladb',1,'2025-03-15 09:00:00');

-- Search Feedback (샘플)
INSERT OR IGNORE INTO search_feedback (id, knowledge_entry_id, user_id, search_event_id, result_rank, feedback, created_at) VALUES
('sf-001','ke-pg-001','user-004','se-001',1,'helpful','2025-02-01 10:05:00'),
('sf-002','ke-pg-002','user-005','se-002',1,'helpful','2025-02-02 11:10:00'),
('sf-003','ke-my-001','user-004','se-003',1,'helpful','2025-02-03 09:10:00'),
('sf-004','ke-pg-004','user-005','se-004',1,'helpful','2025-02-05 14:05:00'),
('sf-005','ke-rd-001','user-004','se-005',1,'helpful','2025-02-06 10:10:00');
