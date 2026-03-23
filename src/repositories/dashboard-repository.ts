export async function countTotalIncidents(db: D1Database) {
  return db.prepare('SELECT COUNT(*) AS cnt FROM incident').first<{ cnt: number }>()
}

export async function countIncidentsSince(db: D1Database, since: string) {
  return db.prepare('SELECT COUNT(*) AS cnt FROM incident WHERE created_at >= ?').bind(since).first<{ cnt: number }>()
}

export async function countKnowledgeByStatus(db: D1Database) {
  return db.prepare(`
    SELECT status, COUNT(*) AS cnt FROM knowledge_entry GROUP BY status
  `).all<{ status: string; cnt: number }>()
}

export async function countActivitiesByActionsSince(db: D1Database, actions: string[], since: string) {
  const placeholders = actions.map(() => '?').join(', ')
  return db.prepare(`
    SELECT COUNT(*) AS cnt FROM activity_log WHERE action IN (${placeholders}) AND created_at >= ?
  `).bind(...actions, since).first<{ cnt: number }>()
}

export async function countActivitiesByActionSince(db: D1Database, action: string, since: string) {
  return db.prepare(`
    SELECT COUNT(*) AS cnt FROM activity_log WHERE action = ? AND created_at >= ?
  `).bind(action, since).first<{ cnt: number }>()
}

export async function countSearchEvents(db: D1Database) {
  return db.prepare('SELECT COUNT(*) AS cnt FROM search_event').first<{ cnt: number }>()
}

export async function countZeroResultSearchEvents(db: D1Database) {
  return db.prepare("SELECT COUNT(*) AS cnt FROM search_event WHERE total_results = 0").first<{ cnt: number }>()
}

export async function countSearchFeedbackByType(db: D1Database, feedback: string) {
  return db.prepare('SELECT COUNT(*) AS cnt FROM search_feedback WHERE feedback = ?').bind(feedback).first<{ cnt: number }>()
}

export async function countHelpfulTop3Feedback(db: D1Database) {
  return db.prepare(`
    SELECT COUNT(*) AS cnt
    FROM search_feedback
    WHERE feedback = 'helpful' AND result_rank <= 3 AND search_event_id IS NOT NULL
  `).first<{ cnt: number }>()
}

export async function countRankedFeedback(db: D1Database) {
  return db.prepare(`
    SELECT COUNT(*) AS cnt
    FROM search_feedback
    WHERE result_rank IS NOT NULL AND search_event_id IS NOT NULL
  `).first<{ cnt: number }>()
}

export async function countReviewerActivitySince(db: D1Database, since: string) {
  return db.prepare(`
    SELECT COUNT(*) AS cnt
    FROM activity_log
    WHERE action IN ('approved','rejected','needs_review') AND created_at >= ?
  `).bind(since).first<{ cnt: number }>()
}

export async function listApprovedSeedProgress(db: D1Database) {
  return db.prepare(`
    SELECT i.dbms, COUNT(*) AS cnt
    FROM knowledge_entry ke
    JOIN incident i ON ke.incident_id = i.id
    WHERE ke.status = 'approved'
    GROUP BY i.dbms
  `).all<{ dbms: string; cnt: number }>()
}

export async function listZeroResultQueriesSince(db: D1Database, since: string) {
  return db.prepare(`
    SELECT query, normalized_query, dbms_filter, count, last_seen_at
    FROM zero_result_queries
    WHERE last_seen_at >= ?
    ORDER BY count DESC
    LIMIT 10
  `).bind(since).all()
}

export async function listRecentKnowledgeEntries(db: D1Database, limit: number) {
  return db.prepare(`
    SELECT ke.id, ke.title, ke.status, ke.ai_quality_score, ke.search_count,
           ke.created_at, ke.updated_at,
           i.incident_number, i.dbms, i.priority, i.dbms_version,
           u.name AS creator_name,
           ke.tags,
           (SELECT COUNT(*) FROM search_feedback sf WHERE sf.knowledge_entry_id = ke.id AND sf.feedback = 'helpful') AS helpful_count
    FROM knowledge_entry ke
    JOIN incident i ON ke.incident_id = i.id
    LEFT JOIN users uc ON i.created_by = uc.id
    LEFT JOIN users u ON ke.approved_by = u.id
    ORDER BY ke.updated_at DESC
    LIMIT ?
  `).bind(limit).all()
}
