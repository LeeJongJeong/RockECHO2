-- RockECHO Initial Schema
-- Phase 0 MVP

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('engineer','senior_engineer','reviewer','admin')) DEFAULT 'engineer',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Incident Table
CREATE TABLE IF NOT EXISTS incident (
  id TEXT PRIMARY KEY,
  incident_number TEXT UNIQUE NOT NULL,
  dbms TEXT NOT NULL CHECK(dbms IN ('postgresql','mysql','mariadb','mongodb','redis','singlestoredb','heatwave','tarantuladb')),
  dbms_version TEXT,
  priority TEXT NOT NULL CHECK(priority IN ('p1','p2','p3')) DEFAULT 'p2',
  raw_input TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Knowledge Entry Table
CREATE TABLE IF NOT EXISTS knowledge_entry (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL,
  title TEXT NOT NULL,
  symptom TEXT,
  cause TEXT,
  cause_confidence TEXT NOT NULL CHECK(cause_confidence IN ('ai_inferred','confirmed','expert_verified')) DEFAULT 'ai_inferred',
  action TEXT,
  runbook TEXT, -- JSON string
  diagnostic_steps TEXT, -- JSON string
  tags TEXT, -- JSON array string
  aliases TEXT, -- JSON array string
  version_range TEXT,
  status TEXT NOT NULL CHECK(status IN ('raw_input','ai_generated','reviewed','approved','needs_review')) DEFAULT 'raw_input',
  ai_quality_score REAL DEFAULT 0,
  search_count INTEGER DEFAULT 0,
  approved_by TEXT,
  approved_at TEXT,
  reviewed_at TEXT,
  reject_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (incident_id) REFERENCES incident(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Search Event Table
CREATE TABLE IF NOT EXISTS search_event (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  query TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  dbms_filter TEXT DEFAULT 'all',
  priority_filter TEXT,
  status_filter TEXT DEFAULT 'approved',
  version_filter TEXT,
  result_ids TEXT, -- JSON array string
  total_results INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Search Feedback Table
CREATE TABLE IF NOT EXISTS search_feedback (
  id TEXT PRIMARY KEY,
  knowledge_entry_id TEXT NOT NULL,
  user_id TEXT,
  search_event_id TEXT,
  result_rank INTEGER,
  feedback TEXT NOT NULL CHECK(feedback IN ('helpful','not_helpful')),
  suggestion TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (knowledge_entry_id) REFERENCES knowledge_entry(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (search_event_id) REFERENCES search_event(id)
);

-- Zero Result Queries Table
CREATE TABLE IF NOT EXISTS zero_result_queries (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  dbms_filter TEXT DEFAULT 'all',
  count INTEGER DEFAULT 1,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  linked_incident_id TEXT,
  FOREIGN KEY (linked_incident_id) REFERENCES incident(id)
);

-- Activity Log Table
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  knowledge_entry_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL CHECK(action IN ('created','ai_generated','submitted','approved','rejected','edited','needs_review')),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (knowledge_entry_id) REFERENCES knowledge_entry(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_incident_dbms ON incident(dbms);
CREATE INDEX IF NOT EXISTS idx_incident_priority ON incident(priority);
CREATE INDEX IF NOT EXISTS idx_incident_created_at ON incident(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge_entry(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_dbms ON knowledge_entry(incident_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_updated ON knowledge_entry(updated_at);
CREATE INDEX IF NOT EXISTS idx_search_event_created ON search_event(created_at);
CREATE INDEX IF NOT EXISTS idx_search_event_query ON search_event(normalized_query);
CREATE INDEX IF NOT EXISTS idx_zero_result_normalized ON zero_result_queries(normalized_query);
CREATE INDEX IF NOT EXISTS idx_activity_knowledge ON activity_log(knowledge_entry_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);
