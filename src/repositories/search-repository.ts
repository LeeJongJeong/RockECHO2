type SearchFilters = {
  normalizedQuery: string
  dbms: string
  priority?: string
  status: string
  version?: string
}

export async function searchKnowledgeRows(db: D1Database, filters: SearchFilters) {
  let sql = `
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

  if (filters.status === 'approved') {
    sql += " AND ke.status = 'approved'"
  } else if (filters.status !== 'all') {
    sql += ' AND ke.status = ?'
    params.push(filters.status)
  }

  if (filters.dbms !== 'all') {
    sql += ' AND i.dbms = ?'
    params.push(filters.dbms)
  }

  if (filters.priority && filters.priority !== 'all') {
    sql += ' AND i.priority = ?'
    params.push(filters.priority)
  }

  if (filters.version) {
    sql += ' AND ke.version_range LIKE ?'
    params.push(`%${filters.version}%`)
  }

  if (filters.normalizedQuery) {
    const searchTerms = filters.normalizedQuery.split(/\s+/).filter((term) => term.length > 1)
    if (searchTerms.length > 0) {
      const searchConditions = searchTerms.map(() =>
        `(LOWER(ke.title) LIKE ? OR LOWER(ke.symptom) LIKE ? OR LOWER(ke.cause) LIKE ? OR LOWER(ke.action) LIKE ? OR LOWER(ke.tags) LIKE ? OR LOWER(ke.aliases) LIKE ?)`
      ).join(' AND ')
      sql += ` AND (${searchConditions})`

      for (const term of searchTerms) {
        const like = `%${term}%`
        params.push(like, like, like, like, like, like)
      }
    }
  }

  sql += ' ORDER BY ke.updated_at DESC'
  return db.prepare(sql).bind(...params).all()
}

export async function insertSearchEvent(
  db: D1Database,
  input: {
    id: string
    userId?: string | null
    query: string
    normalizedQuery: string
    dbmsFilter: string
    priorityFilter?: string | null
    statusFilter: string
    versionFilter?: string | null
    resultIds: string
    totalResults: number
    createdAt: string
  }
) {
  await db.prepare(`
    INSERT INTO search_event (id, user_id, query, normalized_query, dbms_filter, priority_filter, status_filter, version_filter, result_ids, total_results, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    input.id,
    input.userId ?? null,
    input.query,
    input.normalizedQuery,
    input.dbmsFilter,
    input.priorityFilter ?? null,
    input.statusFilter,
    input.versionFilter ?? null,
    input.resultIds,
    input.totalResults,
    input.createdAt
  ).run()
}

export async function getExistingZeroResultQuery(db: D1Database, normalizedQuery: string, dbmsFilter: string) {
  return db.prepare(`
    SELECT id, count FROM zero_result_queries WHERE normalized_query = ? AND dbms_filter = ?
  `).bind(normalizedQuery, dbmsFilter).first<{ id: string; count: number }>()
}

export async function updateZeroResultQuery(
  db: D1Database,
  input: {
    id: string
    query: string
    lastSeenAt: string
  }
) {
  await db.prepare(`
    UPDATE zero_result_queries SET count = count + 1, last_seen_at = ?, query = ? WHERE id = ?
  `).bind(input.lastSeenAt, input.query, input.id).run()
}

export async function insertZeroResultQuery(
  db: D1Database,
  input: {
    id: string
    query: string
    normalizedQuery: string
    dbmsFilter: string
    lastSeenAt: string
  }
) {
  await db.prepare(`
    INSERT INTO zero_result_queries (id, query, normalized_query, dbms_filter, count, last_seen_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `).bind(input.id, input.query, input.normalizedQuery, input.dbmsFilter, input.lastSeenAt).run()
}

export async function getKnowledgeWithDbms(db: D1Database, id: string) {
  return db.prepare(`
    SELECT ke.*, i.dbms
    FROM knowledge_entry ke
    JOIN incident i ON ke.incident_id = i.id
    WHERE ke.id = ?
  `).bind(id).first()
}

export async function getSimilarKnowledgeCandidates(db: D1Database, id: string, dbms: string) {
  return db.prepare(`
    SELECT ke.*, i.incident_number, i.dbms, i.priority, i.dbms_version
    FROM knowledge_entry ke
    JOIN incident i ON ke.incident_id = i.id
    WHERE ke.status = 'approved' AND ke.id != ? AND i.dbms = ?
    LIMIT 20
  `).bind(id, dbms).all()
}

export async function listZeroResultQueries(db: D1Database, dbms: string, limit: number) {
  let sql = 'SELECT * FROM zero_result_queries WHERE 1=1'
  const params: Array<string | number> = []

  if (dbms !== 'all') {
    sql += ' AND dbms_filter = ?'
    params.push(dbms)
  }

  sql += ' ORDER BY count DESC, last_seen_at DESC LIMIT ?'
  params.push(limit)

  return db.prepare(sql).bind(...params).all()
}

export async function countZeroResultQueriesSince(db: D1Database, since: string) {
  return db.prepare(`
    SELECT COUNT(*) AS cnt FROM zero_result_queries WHERE last_seen_at >= ?
  `).bind(since).first<{ cnt: number }>()
}

export async function listRecentSearchQueries(db: D1Database, userId: string | undefined, limit: number) {
  let sql = `
    SELECT DISTINCT query, normalized_query, MAX(created_at) AS last_used
    FROM search_event
    WHERE query != ''
  `
  const params: Array<string | number> = []

  if (userId) {
    sql += ' AND user_id = ?'
    params.push(userId)
  }

  sql += ' GROUP BY normalized_query ORDER BY last_used DESC LIMIT ?'
  params.push(limit)

  return db.prepare(sql).bind(...params).all()
}
