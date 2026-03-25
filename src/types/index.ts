// RockECHO Type Definitions

export type DBMS = 'postgresql' | 'mysql' | 'mariadb' | 'mongodb' | 'redis' | 'singlestoredb' | 'heatwave' | 'tarantuladb';
export type Priority = 'p1' | 'p2' | 'p3';
export type KnowledgeStatus = 'raw_input' | 'ai_generated' | 'reviewed' | 'approved' | 'needs_review';
export type CauseConfidence = 'ai_inferred' | 'confirmed' | 'expert_verified';
export type UserRole = 'engineer' | 'senior_engineer' | 'reviewer' | 'admin';
export type FeedbackType = 'helpful' | 'not_helpful';
export type ActivityAction = 'created' | 'ai_generated' | 'submitted' | 'approved' | 'rejected' | 'edited' | 'needs_review';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  created_at: string;
}

export interface Incident {
  id: string;
  incident_number: string;
  dbms: DBMS;
  dbms_version?: string;
  priority: Priority;
  raw_input: string;
  created_by: string;
  created_at: string;
  creator_name?: string;
}

export interface RunbookStep {
  step: number;
  title: string;
  sql: string;
}

export interface QualityIssue {
  code: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface KnowledgeQualityReport {
  score: number;
  issues: QualityIssue[];
  needsRepair: boolean;
}

export interface KnowledgeEntry {
  id: string;
  incident_id: string;
  title: string;
  symptom?: string;
  cause?: string;
  cause_confidence: CauseConfidence;
  action?: string;
  runbook?: RunbookStep[];
  diagnostic_steps?: RunbookStep[];
  tags?: string[];
  aliases?: string[];
  version_range?: string;
  error_log?: string;
  status: KnowledgeStatus;
  ai_quality_score: number;
  search_count: number;
  approved_by?: string;
  approved_at?: string;
  reviewed_at?: string;
  reject_reason?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  incident_number?: string;
  dbms?: DBMS;
  priority?: Priority;
  dbms_version?: string;
  approver_name?: string;
  creator_name?: string;
  // Search relevance
  relevance_score?: number;
  helpful_count?: number;
  not_helpful_count?: number;
  quality_report?: KnowledgeQualityReport;
}

export interface SearchEvent {
  id: string;
  user_id?: string;
  query: string;
  normalized_query: string;
  dbms_filter?: string;
  priority_filter?: string;
  status_filter?: string;
  version_filter?: string;
  result_ids?: string[];
  total_results: number;
  created_at: string;
}

export interface SearchFeedback {
  id: string;
  knowledge_entry_id: string;
  user_id?: string;
  search_event_id?: string;
  result_rank?: number;
  feedback: FeedbackType;
  suggestion?: string;
  created_at: string;
}

export interface ZeroResultQuery {
  id: string;
  query: string;
  normalized_query: string;
  dbms_filter?: string;
  count: number;
  last_seen_at: string;
  linked_incident_id?: string;
}

export interface ActivityLog {
  id: string;
  knowledge_entry_id: string;
  user_id?: string;
  action: ActivityAction;
  note?: string;
  created_at: string;
  user_name?: string;
}

export interface Bindings {
  DB: D1Database;
  VECTOR_DB: VectorizeIndex;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  DEV_DIAGNOSTICS?: string;
}

export interface DashboardStats {
  total_incidents: number;
  this_week_incidents: number;
  approved_count: number;
  ai_generated_count: number;
  reviewed_count: number;
  needs_review_count: number;
  search_accuracy_top3: number;
  ai_approval_rate: number;
  zero_result_rate: number;
  thumbs_down_rate: number;
  search_usefulness: number;
  seed_progress: Record<DBMS, number>;
}
