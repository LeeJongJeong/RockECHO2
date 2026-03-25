type KnowledgeFilters = {
  status?: string
  dbms?: string
  priority?: string
  limit: number
  offset: number
}

type KnowledgeUpdateInput = {
  title?: string
  symptom?: string
  cause?: string
  causeConfidence?: string
  action?: string
  runbook?: string
  diagnosticSteps?: string
  tags?: string
  aliases?: string
  versionRange?: string
  status?: string
  rejectReason?: string | null
  updatedAt: string
}

export async function listKnowledgeEntries(db: D1Database, filters: KnowledgeFilters) {
  let query = `
    SELECT ke.*, i.incident_number, i.dbms, i.priority, i.dbms_version,
           u.name AS approver_name, uc.name AS creator_name,
           (SELECT COUNT(*) FROM search_feedback sf WHERE sf.knowledge_entry_id = ke.id AND sf.feedback = 'helpful') AS helpful_count,
           (SELECT COUNT(*) FROM search_feedback sf WHERE sf.knowledge_entry_id = ke.id AND sf.feedback = 'not_helpful') AS not_helpful_count
    FROM knowledge_entry ke
    JOIN incident i ON ke.incident_id = i.id
    LEFT JOIN users u ON ke.approved_by = u.id
    LEFT JOIN users uc ON i.created_by = uc.id
    WHERE 1=1
  `
  const params: Array<string | number> = []

  if (filters.status && filters.status !== 'all') {
    query += ' AND ke.status = ?'
    params.push(filters.status)
  }

  if (filters.dbms && filters.dbms !== 'all') {
    query += ' AND i.dbms = ?'
    params.push(filters.dbms)
  }

  if (filters.priority && filters.priority !== 'all') {
    query += ' AND i.priority = ?'
    params.push(filters.priority)
  }

  query += ' ORDER BY ke.updated_at DESC LIMIT ? OFFSET ?'
  params.push(filters.limit, filters.offset)

  return db.prepare(query).bind(...params).all()
}

export async function countKnowledgeEntries(db: D1Database, filters: Omit<KnowledgeFilters, 'limit' | 'offset'>) {
  let query = `
    SELECT COUNT(*) AS total
    FROM knowledge_entry ke
    JOIN incident i ON ke.incident_id = i.id
    WHERE 1=1
  `
  const params: string[] = []

  if (filters.status && filters.status !== 'all') {
    query += ' AND ke.status = ?'
    params.push(filters.status)
  }

  if (filters.dbms && filters.dbms !== 'all') {
    query += ' AND i.dbms = ?'
    params.push(filters.dbms)
  }

  if (filters.priority && filters.priority !== 'all') {
    query += ' AND i.priority = ?'
    params.push(filters.priority)
  }

  return db.prepare(query).bind(...params).first<{ total: number }>()
}

export async function getKnowledgeEntryById(db: D1Database, id: string) {
  return db.prepare(`
    SELECT ke.*, i.incident_number, i.dbms, i.priority, i.dbms_version, i.raw_input,
           u.name AS approver_name, uc.name AS creator_name,
           (SELECT COUNT(*) FROM search_feedback sf WHERE sf.knowledge_entry_id = ke.id AND sf.feedback = 'helpful') AS helpful_count,
           (SELECT COUNT(*) FROM search_feedback sf WHERE sf.knowledge_entry_id = ke.id AND sf.feedback = 'not_helpful') AS not_helpful_count
    FROM knowledge_entry ke
    JOIN incident i ON ke.incident_id = i.id
    LEFT JOIN users u ON ke.approved_by = u.id
    LEFT JOIN users uc ON i.created_by = uc.id
    WHERE ke.id = ?
  `).bind(id).first()
}

export async function incrementKnowledgeSearchCount(db: D1Database, id: string) {
  await db.prepare('UPDATE knowledge_entry SET search_count = search_count + 1 WHERE id = ?').bind(id).run()
}

export async function updateKnowledgeEntry(db: D1Database, id: string, updates: KnowledgeUpdateInput) {
  const clauses: string[] = ['updated_at = ?']
  const params: Array<string | number | null> = [updates.updatedAt]

  if (updates.title !== undefined) {
    clauses.push('title = ?')
    params.push(updates.title)
  }

  if (updates.symptom !== undefined) {
    clauses.push('symptom = ?')
    params.push(updates.symptom)
  }

  if (updates.cause !== undefined) {
    clauses.push('cause = ?')
    params.push(updates.cause)
  }

  if (updates.causeConfidence !== undefined) {
    clauses.push('cause_confidence = ?')
    params.push(updates.causeConfidence)
  }

  if (updates.action !== undefined) {
    clauses.push('action = ?')
    params.push(updates.action)
  }

  if (updates.runbook !== undefined) {
    clauses.push('runbook = ?')
    params.push(updates.runbook)
  }

  if (updates.diagnosticSteps !== undefined) {
    clauses.push('diagnostic_steps = ?')
    params.push(updates.diagnosticSteps)
  }

  if (updates.tags !== undefined) {
    clauses.push('tags = ?')
    params.push(updates.tags)
  }

  if (updates.aliases !== undefined) {
    clauses.push('aliases = ?')
    params.push(updates.aliases)
  }

  if (updates.versionRange !== undefined) {
    clauses.push('version_range = ?')
    params.push(updates.versionRange)
  }

  if (updates.status !== undefined) {
    clauses.push('status = ?')
    params.push(updates.status)
  }

  if (updates.rejectReason !== undefined) {
    clauses.push('reject_reason = ?')
    params.push(updates.rejectReason)
  }

  params.push(id)
  await db.prepare(`UPDATE knowledge_entry SET ${clauses.join(', ')} WHERE id = ?`).bind(...params).run()
}

export async function setKnowledgeApprovalState(
  db: D1Database,
  input: {
    id: string
    userId: string
    approvedAt: string
    reviewedAt: string
    updatedAt: string
  }
) {
  await db.prepare(`
    UPDATE knowledge_entry
    SET status = 'approved', approved_by = ?, approved_at = ?, reviewed_at = ?, updated_at = ?
    WHERE id = ?
  `).bind(input.userId, input.approvedAt, input.reviewedAt, input.updatedAt, input.id).run()
}

export async function setKnowledgeApprovedMetadata(
  db: D1Database,
  input: {
    id: string
    userId: string
    approvedAt: string
    reviewedAt: string
  }
) {
  await db.prepare(`
    UPDATE knowledge_entry
    SET approved_by = ?, approved_at = ?, reviewed_at = ?
    WHERE id = ?
  `).bind(input.userId, input.approvedAt, input.reviewedAt, input.id).run()
}

export async function setKnowledgeReviewedAt(db: D1Database, id: string, reviewedAt: string) {
  await db.prepare('UPDATE knowledge_entry SET reviewed_at = ? WHERE id = ?').bind(reviewedAt, id).run()
}

export async function getKnowledgeVersionRange(db: D1Database, id: string) {
  return db.prepare('SELECT version_range FROM knowledge_entry WHERE id = ?').bind(id).first<{ version_range: string }>()
}

export async function setKnowledgeRejectedState(
  db: D1Database,
  input: {
    id: string
    reason: string
    updatedAt: string
  }
) {
  await db.prepare(`
    UPDATE knowledge_entry SET status = 'ai_generated', reject_reason = ?, updated_at = ? WHERE id = ?
  `).bind(input.reason, input.updatedAt, input.id).run()
}

export async function insertKnowledgeEntry(
  db: D1Database,
  input: {
    id: string
    incidentId: string
    title: string
    symptom: string
    cause: string
    causeConfidence: string
    action: string
    runbook: string
    diagnosticSteps: string
    tags: string
    aliases: string
    versionRange: string
    status: string
    aiQualityScore: number
    createdAt: string
    updatedAt: string
  }
) {
  await db.prepare(`
    INSERT OR REPLACE INTO knowledge_entry (
      id, incident_id, title, symptom, cause, cause_confidence,
      action, runbook, diagnostic_steps, tags, aliases, version_range,
      status, ai_quality_score, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    input.id,
    input.incidentId,
    input.title,
    input.symptom,
    input.cause,
    input.causeConfidence,
    input.action,
    input.runbook,
    input.diagnosticSteps,
    input.tags,
    input.aliases,
    input.versionRange,
    input.status,
    input.aiQualityScore,
    input.createdAt,
    input.updatedAt
  ).run()
}

export async function insertSearchFeedback(
  db: D1Database,
  input: {
    id: string
    knowledgeEntryId: string
    userId?: string | null
    searchEventId?: string | null
    resultRank?: number | null
    feedback: string
    suggestion?: string | null
    createdAt: string
  }
) {
  await db.prepare(`
    INSERT INTO search_feedback (id, knowledge_entry_id, user_id, search_event_id, result_rank, feedback, suggestion, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    input.id,
    input.knowledgeEntryId,
    input.userId ?? null,
    input.searchEventId ?? null,
    input.resultRank ?? null,
    input.feedback,
    input.suggestion ?? null,
    input.createdAt
  ).run()
}

export async function countNotHelpfulFeedback(db: D1Database, knowledgeEntryId: string) {
  return db.prepare(`
    SELECT COUNT(*) AS cnt
    FROM search_feedback
    WHERE knowledge_entry_id = ? AND feedback = 'not_helpful'
  `).bind(knowledgeEntryId).first<{ cnt: number }>()
}

export async function markKnowledgeNeedsReview(db: D1Database, id: string, updatedAt: string) {
  await db.prepare(`
    UPDATE knowledge_entry SET status = 'needs_review', updated_at = ? WHERE id = ? AND status = 'approved'
  `).bind(updatedAt, id).run()
}

export async function deleteKnowledgeEntry(db: D1Database, id: string) {
  const entry = await db.prepare('SELECT incident_id FROM knowledge_entry WHERE id = ?').bind(id).first<{ incident_id: string }>()
  
  await db.prepare('DELETE FROM search_feedback WHERE knowledge_entry_id = ?').bind(id).run()
  await db.prepare('DELETE FROM activity_log WHERE knowledge_entry_id = ?').bind(id).run()
  await db.prepare('DELETE FROM knowledge_entry WHERE id = ?').bind(id).run()
  
  if (entry?.incident_id) {
    const others = await db.prepare('SELECT COUNT(*) as count FROM knowledge_entry WHERE incident_id = ?').bind(entry.incident_id).first<{ count: number }>()
    if (others && others.count === 0) {
      await db.prepare('DELETE FROM incident WHERE id = ?').bind(entry.incident_id).run()
    }
  }
}
