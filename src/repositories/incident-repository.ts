type IncidentFilters = {
  dbms?: string
  priority?: string
  limit: number
  offset: number
}

export async function listIncidents(db: D1Database, filters: IncidentFilters) {
  let query = `
    SELECT i.*, u.name AS creator_name
    FROM incident i
    LEFT JOIN users u ON i.created_by = u.id
    WHERE 1=1
  `
  const params: Array<string | number> = []

  if (filters.dbms && filters.dbms !== 'all') {
    query += ' AND i.dbms = ?'
    params.push(filters.dbms)
  }

  if (filters.priority && filters.priority !== 'all') {
    query += ' AND i.priority = ?'
    params.push(filters.priority)
  }

  query += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?'
  params.push(filters.limit, filters.offset)

  return db.prepare(query).bind(...params).all()
}

export async function countIncidents(db: D1Database, filters: Omit<IncidentFilters, 'limit' | 'offset'>) {
  let query = 'SELECT COUNT(*) AS total FROM incident WHERE 1=1'
  const params: string[] = []

  if (filters.dbms && filters.dbms !== 'all') {
    query += ' AND dbms = ?'
    params.push(filters.dbms)
  }

  if (filters.priority && filters.priority !== 'all') {
    query += ' AND priority = ?'
    params.push(filters.priority)
  }

  return db.prepare(query).bind(...params).first<{ total: number }>()
}

export async function getIncidentById(db: D1Database, id: string) {
  return db.prepare(`
    SELECT i.*, u.name AS creator_name
    FROM incident i
    LEFT JOIN users u ON i.created_by = u.id
    WHERE i.id = ?
  `).bind(id).first()
}

export async function listKnowledgeByIncidentId(db: D1Database, incidentId: string) {
  return db.prepare(`
    SELECT ke.*, u.name AS approver_name
    FROM knowledge_entry ke
    LEFT JOIN users u ON ke.approved_by = u.id
    WHERE ke.incident_id = ?
    ORDER BY ke.created_at DESC
  `).bind(incidentId).all()
}

export async function countAllIncidents(db: D1Database) {
  return db.prepare('SELECT COUNT(*) AS cnt FROM incident').first<{ cnt: number }>()
}

export async function insertIncident(
  db: D1Database,
  input: {
    id: string
    incidentNumber: string
    dbms: string
    dbmsVersion: string
    priority: string
    rawInput: string
    createdBy: string
    createdAt: string
  }
) {
  await db.prepare(`
    INSERT INTO incident (id, incident_number, dbms, dbms_version, priority, raw_input, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    input.id,
    input.incidentNumber,
    input.dbms,
    input.dbmsVersion,
    input.priority,
    input.rawInput,
    input.createdBy,
    input.createdAt
  ).run()
}

export async function insertDraftKnowledgeEntry(
  db: D1Database,
  input: {
    id: string
    incidentId: string
    title: string
    createdAt: string
    updatedAt: string
  }
) {
  await db.prepare(`
    INSERT INTO knowledge_entry (id, incident_id, title, status, created_at, updated_at)
    VALUES (?, ?, ?, 'raw_input', ?, ?)
  `).bind(input.id, input.incidentId, input.title, input.createdAt, input.updatedAt).run()
}

export async function updateIncident(
  db: D1Database,
  id: string,
  updates: {
    dbmsVersion?: string | null
    priority?: string | null
  }
) {
  const clauses: string[] = []
  const params: Array<string | null> = []

  if (updates.dbmsVersion !== undefined) {
    clauses.push('dbms_version = ?')
    params.push(updates.dbmsVersion)
  }

  if (updates.priority !== undefined) {
    clauses.push('priority = ?')
    params.push(updates.priority)
  }

  if (clauses.length === 0) {
    return
  }

  params.push(id)
  await db.prepare(`UPDATE incident SET ${clauses.join(', ')} WHERE id = ?`).bind(...params).run()
}
