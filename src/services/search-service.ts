import { v4 as uuidv4 } from 'uuid'
import { parseKnowledgeJsonFields, parseStringArray, safeParseJson, toInt } from '../lib/json'
import {
  countZeroResultQueriesSince,
  getExistingZeroResultQuery,
  getKnowledgeWithDbms,
  getSimilarKnowledgeCandidates,
  insertSearchEvent,
  insertZeroResultQuery,
  listRecentSearchQueries,
  listZeroResultQueries,
  searchKnowledgeRows,
  updateZeroResultQuery
} from '../repositories/search-repository'

function computeRelevance(query: string, entry: Record<string, unknown>): number {
  const normalized = query.toLowerCase().trim()
  if (!normalized) {
    return 0
  }

  const words = normalized.split(/[\s,]+/).filter((word) => word.length > 1)
  if (words.length === 0) {
    return 0
  }

  const titleText = String(entry.title || '').toLowerCase()
  const aliasText = parseStringArray(entry.aliases).join(' ').toLowerCase()
  const fullText = [
    titleText,
    String(entry.symptom || '').toLowerCase(),
    String(entry.cause || '').toLowerCase(),
    String(entry.action || '').toLowerCase(),
    parseStringArray(entry.tags).join(' ').toLowerCase(),
    aliasText
  ].join(' ')

  let score = 0
  let matched = 0

  for (const word of words) {
    if (!fullText.includes(word)) {
      continue
    }

    matched += 1
    if (titleText.includes(word)) {
      score += 0.3
    } else if (aliasText.includes(word)) {
      score += 0.2
    } else {
      score += 0.1
    }
  }

  if (matched === 0) {
    return 0
  }

  const base = Math.min(1, score / words.length + (matched / words.length) * 0.3)
  if (fullText.includes(normalized)) {
    return Math.min(1, base + 0.25)
  }

  return Math.min(1, base)
}

export async function searchKnowledge(
  db: D1Database,
  query: {
    q?: string
    dbms?: string
    priority?: string
    status?: string
    version?: string
    limit?: string
    offset?: string
    user_id?: string
  }
) {
  const q = query.q || ''
  const normalizedQuery = q.toLowerCase().trim()
  const dbms = query.dbms || 'all'
  const status = query.status || 'approved'
  const limit = toInt(query.limit, 20)
  const offset = toInt(query.offset, 0)

  const rows = await searchKnowledgeRows(db, {
    normalizedQuery,
    dbms,
    priority: query.priority,
    status,
    version: query.version
  })

  let scored = rows.results.map((entry) => {
    const raw = entry as Record<string, unknown> & { id: string }
    const parsed = parseKnowledgeJsonFields(raw)
    return {
      ...raw,
      ...parsed,
      relevance_score: normalizedQuery ? computeRelevance(normalizedQuery, raw) : 1
    }
  })

  if (normalizedQuery) {
    scored = scored.sort((left, right) => right.relevance_score - left.relevance_score)
  }

  const total = scored.length
  const items = scored.slice(offset, offset + limit)
  const resultIds = scored.map((entry) => String(entry.id))
  const eventId = uuidv4()
  const now = new Date().toISOString()

  await insertSearchEvent(db, {
    id: eventId,
    userId: query.user_id || null,
    query: q,
    normalizedQuery,
    dbmsFilter: dbms,
    priorityFilter: query.priority || null,
    statusFilter: status,
    versionFilter: query.version || null,
    resultIds: JSON.stringify(resultIds.slice(0, 20)),
    totalResults: total,
    createdAt: now
  })

  if (total === 0 && normalizedQuery) {
    const existing = await getExistingZeroResultQuery(db, normalizedQuery, dbms)
    if (existing) {
      await updateZeroResultQuery(db, {
        id: existing.id,
        query: q,
        lastSeenAt: now
      })
    } else {
      await insertZeroResultQuery(db, {
        id: uuidv4(),
        query: q,
        normalizedQuery,
        dbmsFilter: dbms,
        lastSeenAt: now
      })
    }
  }

  return {
    items,
    total,
    limit,
    offset,
    search_event_id: eventId,
    query: q
  }
}

export async function getSimilarKnowledge(db: D1Database, id: string) {
  const current = await getKnowledgeWithDbms(db, id)
  if (!current) {
    return { items: [] }
  }

  const currentTags = parseStringArray((current as Record<string, unknown>).tags)
  const currentTitle = String((current as Record<string, unknown>).title || '').toLowerCase()
  const candidates = await getSimilarKnowledgeCandidates(db, id, String((current as Record<string, unknown>).dbms))

  const items = candidates.results
    .map((entry) => {
      const entryRecord = entry as Record<string, unknown>
      const entryTags = parseStringArray(entryRecord.tags)
      const tagOverlap = currentTags.filter((tag) => entryTags.includes(tag)).length
      const titleSimilarity = computeRelevance(currentTitle, entryRecord)
      return {
        ...entryRecord,
        tags: entryTags,
        aliases: safeParseJson(entryRecord.aliases, [] as string[]),
        similarity_score: Math.min(1, tagOverlap * 0.15 + titleSimilarity * 0.85)
      }
    })
    .filter((entry) => entry.similarity_score > 0.1)
    .sort((left, right) => right.similarity_score - left.similarity_score)
    .slice(0, 3)

  return { items }
}

export async function getZeroResultAnalysis(
  db: D1Database,
  query: { dbms?: string; limit?: string }
) {
  const dbms = query.dbms || 'all'
  const limit = toInt(query.limit, 20)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const [items, thisWeek] = await Promise.all([
    listZeroResultQueries(db, dbms, limit),
    countZeroResultQueriesSince(db, weekAgo)
  ])

  return {
    items: items.results,
    this_week_count: thisWeek?.cnt || 0
  }
}

export async function getRecentSearches(db: D1Database, query: { user_id?: string; limit?: string }) {
  const limit = toInt(query.limit, 10)
  const results = await listRecentSearchQueries(db, query.user_id, limit)
  return { items: results.results }
}
