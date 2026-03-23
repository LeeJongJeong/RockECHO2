import { v4 as uuidv4 } from 'uuid'
import { parseKnowledgeJsonFields, toInt } from '../lib/json'
import {
  countAllIncidents,
  countIncidents,
  getIncidentById,
  insertDraftKnowledgeEntry,
  insertIncident,
  listIncidents,
  listKnowledgeByIncidentId,
  updateIncident
} from '../repositories/incident-repository'
import { createActivityLog } from '../repositories/activity-repository'

export async function listIncidentSummaries(
  db: D1Database,
  query: { dbms?: string; priority?: string; limit?: string; offset?: string }
) {
  const limit = toInt(query.limit, 20)
  const offset = toInt(query.offset, 0)

  const [items, total] = await Promise.all([
    listIncidents(db, { dbms: query.dbms, priority: query.priority, limit, offset }),
    countIncidents(db, { dbms: query.dbms, priority: query.priority })
  ])

  return {
    items: items.results,
    total: total?.total || 0,
    limit,
    offset
  }
}

export async function getIncidentDetail(db: D1Database, id: string) {
  const incident = await getIncidentById(db, id)
  if (!incident) {
    return null
  }

  const knowledge = await listKnowledgeByIncidentId(db, id)
  return {
    ...incident,
    knowledge_entries: knowledge.results.map((entry) => parseKnowledgeJsonFields(entry as Record<string, unknown>))
  }
}

export async function createIncidentWithDraft(
  db: D1Database,
  input: {
    dbms: string
    dbmsVersion?: string
    priority?: string
    rawInput: string
    createdBy?: string
  }
) {
  const id = uuidv4()
  const knowledgeEntryId = uuidv4()
  const activityId = uuidv4()
  const now = new Date().toISOString()
  const countResult = await countAllIncidents(db)
  const nextCount = (countResult?.cnt || 0) + 1
  const incidentNumber = `INC-${String(nextCount).padStart(4, '0')}`
  const createdBy = input.createdBy || 'user-004'

  await insertIncident(db, {
    id,
    incidentNumber,
    dbms: input.dbms,
    dbmsVersion: input.dbmsVersion || '',
    priority: input.priority || 'p2',
    rawInput: input.rawInput,
    createdBy,
    createdAt: now
  })

  await insertDraftKnowledgeEntry(db, {
    id: knowledgeEntryId,
    incidentId: id,
    title: `[Draft] ${input.dbms.toUpperCase()} 장애 - ${incidentNumber}`,
    createdAt: now,
    updatedAt: now
  })

  await createActivityLog(db, {
    id: activityId,
    knowledgeEntryId,
    userId: createdBy,
    action: 'created',
    createdAt: now
  })

  return {
    id,
    incident_number: incidentNumber,
    knowledge_entry_id: knowledgeEntryId
  }
}

export async function updateIncidentFields(
  db: D1Database,
  id: string,
  updates: {
    dbmsVersion?: string | null
    priority?: string | null
  }
) {
  await updateIncident(db, id, updates)
  return getIncidentById(db, id)
}
