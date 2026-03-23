export async function createActivityLog(
  db: D1Database,
  input: {
    id: string
    knowledgeEntryId: string
    userId?: string | null
    action: string
    note?: string | null
    createdAt: string
  }
): Promise<void> {
  await db.prepare(`
    INSERT INTO activity_log (id, knowledge_entry_id, user_id, action, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    input.id,
    input.knowledgeEntryId,
    input.userId ?? null,
    input.action,
    input.note ?? null,
    input.createdAt
  ).run()
}

export async function listActivityLogsByKnowledgeEntryId(db: D1Database, knowledgeEntryId: string) {
  return db.prepare(`
    SELECT al.*, u.name AS user_name
    FROM activity_log al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.knowledge_entry_id = ?
    ORDER BY al.created_at ASC
  `).bind(knowledgeEntryId).all()
}

export async function listAuditLogs(db: D1Database, limit: number, offset: number) {
  return db.prepare(`
    SELECT al.*, u.name AS user_name, ke.title AS knowledge_title
    FROM activity_log al
    LEFT JOIN users u ON al.user_id = u.id
    LEFT JOIN knowledge_entry ke ON al.knowledge_entry_id = ke.id
    ORDER BY al.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all()
}

export async function countActivityLogs(db: D1Database) {
  return db.prepare('SELECT COUNT(*) AS cnt FROM activity_log').first<{ cnt: number }>()
}
