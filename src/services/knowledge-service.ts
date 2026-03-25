import { v4 as uuidv4 } from 'uuid'
import { AppError } from '../lib/AppError'
import { generateEmbedding } from '../ai/embedding'
import { evaluateKnowledgeQuality } from '../ai/quality'
import type { Bindings } from '../types'
import { parseKnowledgeJsonFields, toInt, toJsonString } from '../lib/json'
import { createActivityLog, listActivityLogsByKnowledgeEntryId } from '../repositories/activity-repository'
import {
  countKnowledgeEntries,
  countNotHelpfulFeedback,
  getKnowledgeEntryById,
  getKnowledgeVersionRange,
  incrementKnowledgeSearchCount,
  insertSearchFeedback,
  listKnowledgeEntries,
  markKnowledgeNeedsReview,
  setKnowledgeApprovalState,
  setKnowledgeApprovedMetadata,
  setKnowledgeRejectedState,
  setKnowledgeReviewedAt,
  updateKnowledgeEntry,
  deleteKnowledgeEntry
} from '../repositories/knowledge-repository'

export async function listKnowledgeSummaries(
  db: D1Database,
  query: { status?: string; dbms?: string; priority?: string; limit?: string; offset?: string }
) {
  const limit = toInt(query.limit, 20)
  const offset = toInt(query.offset, 0)

  const [items, total] = await Promise.all([
    listKnowledgeEntries(db, {
      status: query.status,
      dbms: query.dbms,
      priority: query.priority,
      limit,
      offset
    }),
    countKnowledgeEntries(db, {
      status: query.status,
      dbms: query.dbms,
      priority: query.priority
    })
  ])

  return {
    items: items.results.map((entry) => {
      const parsed = parseKnowledgeJsonFields(entry as Record<string, unknown>)
      return {
        ...parsed,
        quality_report: evaluateKnowledgeQuality(parsed)
      }
    }),
    total: total?.total || 0,
    limit,
    offset
  }
}

export async function getKnowledgeDetail(db: D1Database, id: string) {
  const entry = await getKnowledgeEntryById(db, id)
  if (!entry) {
    return null
  }

  await incrementKnowledgeSearchCount(db, id)
  const activityLogs = await listActivityLogsByKnowledgeEntryId(db, id)
  const parsed = parseKnowledgeJsonFields(entry as Record<string, unknown>)

  return {
    ...parsed,
    quality_report: evaluateKnowledgeQuality(parsed),
    activity_logs: activityLogs.results
  }
}

export async function updateKnowledgeFields(
  env: Pick<Bindings, 'DB' | 'VECTOR_DB' | 'OPENAI_API_KEY' | 'OPENAI_BASE_URL'>,
  id: string,
  body: {
    title?: string
    symptom?: string
    cause?: string
    cause_confidence?: string
    action?: string
    runbook?: unknown
    diagnostic_steps?: unknown
    tags?: unknown
    aliases?: unknown
    error_log?: string
    version_range?: string
    status?: string
    reject_reason?: string
    user_id?: string
  },
  embeddingModel = ''
) {
  const db = env.DB
  const now = new Date().toISOString()

  await updateKnowledgeEntry(db, id, {
    title: body.title,
    symptom: body.symptom,
    cause: body.cause,
    causeConfidence: body.cause_confidence,
    action: body.action,
    runbook: body.runbook !== undefined ? toJsonString(body.runbook) : undefined,
    diagnosticSteps: body.diagnostic_steps !== undefined ? toJsonString(body.diagnostic_steps) : undefined,
    tags: body.tags !== undefined ? toJsonString(body.tags) : undefined,
    aliases: body.aliases !== undefined ? toJsonString(body.aliases) : undefined,
    errorLog: body.error_log,
    versionRange: body.version_range,
    status: body.status,
    rejectReason: body.reject_reason,
    updatedAt: now
  })

  if (body.status) {
    const userId = body.user_id || 'user-003'
    let action = 'edited'

    if (body.status === 'approved') {
      action = 'approved'
    } else if (body.status === 'reviewed') {
      action = 'submitted'
    } else if (body.status === 'ai_generated' && body.reject_reason) {
      action = 'rejected'
    } else if (body.status === 'needs_review') {
      action = 'needs_review'
    }

    await createActivityLog(db, {
      id: uuidv4(),
      knowledgeEntryId: id,
      userId,
      action,
      note: body.reject_reason || null,
      createdAt: now
    })

    if (body.status === 'approved') {
      await setKnowledgeApprovedMetadata(db, {
        id,
        userId,
        approvedAt: now,
        reviewedAt: now
      })
    }

    if (body.status === 'reviewed') {
      await setKnowledgeReviewedAt(db, id, now)
    }
  }

  const updated = await getKnowledgeEntryById(db, id)
  
  if (body.status === 'approved' && env.OPENAI_API_KEY && updated) {
    try {
      const textToEmbed = `Title: ${updated.title}\nSymptom: ${updated.symptom}\nCause: ${updated.cause}\nAction: ${updated.action}`
      const embedding = await generateEmbedding(env.OPENAI_API_KEY, env.OPENAI_BASE_URL || 'https://api.openai.com/v1', textToEmbed, embeddingModel)
      await env.VECTOR_DB.upsert([{ id, values: embedding, metadata: { dbms: String(updated.dbms || 'unknown') } }])
    } catch (err) {
      console.warn('Vectorization failed during update (DB saved successfully):', err)
    }
  }

  return updated ? parseKnowledgeJsonFields(updated as Record<string, unknown>) : null
}

export async function approveKnowledgeEntry(
  env: Pick<Bindings, 'DB' | 'VECTOR_DB' | 'OPENAI_API_KEY' | 'OPENAI_BASE_URL'>,
  id: string,
  userId = 'user-003',
  embeddingModel = ''
) {
  const db = env.DB
  const now = new Date().toISOString()
  const entry = await getKnowledgeVersionRange(db, id)

  if (!entry) {
    throw new AppError('Not found', 404)
  }

  if (!entry.version_range) {
    throw new AppError('version_range is required before approval', 400)
  }

  await setKnowledgeApprovalState(db, {
    id,
    userId,
    approvedAt: now,
    reviewedAt: now,
    updatedAt: now
  })

  await createActivityLog(db, {
    id: uuidv4(),
    knowledgeEntryId: id,
    userId,
    action: 'approved',
    createdAt: now
  })

  const fullEntry = await getKnowledgeEntryById(db, id)
  if (env.OPENAI_API_KEY && fullEntry) {
    try {
      const textToEmbed = `Title: ${fullEntry.title}\nSymptom: ${fullEntry.symptom}\nCause: ${fullEntry.cause}\nAction: ${fullEntry.action}`
      const embedding = await generateEmbedding(env.OPENAI_API_KEY, env.OPENAI_BASE_URL || 'https://api.openai.com/v1', textToEmbed, embeddingModel)
      await env.VECTOR_DB.upsert([{ id, values: embedding, metadata: { dbms: String(fullEntry.dbms || 'unknown') } }])
    } catch (err) {
      console.warn('Vectorization failed during approval (DB saved successfully):', err)
    }
  }

  return { success: true, status: 'approved' }
}

export async function rejectKnowledgeEntry(db: D1Database, id: string, reason: string, userId = 'user-003') {
  const now = new Date().toISOString()

  await setKnowledgeRejectedState(db, {
    id,
    reason,
    updatedAt: now
  })

  await createActivityLog(db, {
    id: uuidv4(),
    knowledgeEntryId: id,
    userId,
    action: 'rejected',
    note: reason,
    createdAt: now
  })

  return { success: true, status: 'ai_generated' }
}

export async function submitKnowledgeFeedback(
  db: D1Database,
  id: string,
  input: {
    user_id?: string
    search_event_id?: string
    result_rank?: number
    feedback: string
    suggestion?: string
  }
) {
  const feedbackId = uuidv4()
  const now = new Date().toISOString()

  await insertSearchFeedback(db, {
    id: feedbackId,
    knowledgeEntryId: id,
    userId: input.user_id || null,
    searchEventId: input.search_event_id || null,
    resultRank: input.result_rank || null,
    feedback: input.feedback,
    suggestion: input.suggestion || null,
    createdAt: now
  })

  const notHelpful = await countNotHelpfulFeedback(db, id)
  if ((notHelpful?.cnt || 0) >= 5) {
    await markKnowledgeNeedsReview(db, id, now)
  }

  return { success: true, id: feedbackId }
}

export async function bulkApproveKnowledgeEntries(
  env: Pick<Bindings, 'DB' | 'VECTOR_DB' | 'OPENAI_API_KEY' | 'OPENAI_BASE_URL'>,
  ids: string[],
  userId = 'user-003',
  embeddingModel = ''
) {
  const db = env.DB
  const now = new Date().toISOString()
  const results: Array<{ id: string; success: boolean; error?: string }> = []

  for (const id of ids) {
    const entry = await getKnowledgeVersionRange(db, id)
    if (!entry?.version_range) {
      results.push({ id, success: false, error: 'version_range missing' })
      continue
    }

    await setKnowledgeApprovalState(db, {
      id,
      userId,
      approvedAt: now,
      reviewedAt: now,
      updatedAt: now
    })

    await createActivityLog(db, {
      id: uuidv4(),
      knowledgeEntryId: id,
      userId,
      action: 'approved',
      note: '일괄 승인',
      createdAt: now
    })

    const fullEntry = await getKnowledgeEntryById(db, id)
    if (env.OPENAI_API_KEY && fullEntry) {
      try {
        const textToEmbed = `Title: ${fullEntry.title}\nSymptom: ${fullEntry.symptom}\nCause: ${fullEntry.cause}\nAction: ${fullEntry.action}`
        const embedding = await generateEmbedding(env.OPENAI_API_KEY, env.OPENAI_BASE_URL || 'https://api.openai.com/v1', textToEmbed, embeddingModel)
        await env.VECTOR_DB.upsert([{ id, values: embedding, metadata: { dbms: String(fullEntry.dbms || 'unknown') } }])
      } catch (err) {
        console.warn('Vectorization failed during bulk approval (DB saved successfully):', err)
      }
    }

    results.push({ id, success: true })
  }

  return { results }
}

export async function deleteKnowledge(
  env: Pick<Bindings, 'DB' | 'VECTOR_DB'>,
  id: string
) {
  const db = env.DB
  
  await deleteKnowledgeEntry(db, id)
  
  if (env.VECTOR_DB) {
    try {
      await env.VECTOR_DB.deleteByIds([id])
    } catch (err) {
      console.warn('Vectorize deletion failed or skipped:', err)
    }
  }
  
  return { success: true }
}
