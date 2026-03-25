import { v4 as uuidv4 } from 'uuid'
import type { Bindings, KnowledgeEntry } from '../types'
import { generateWithOpenAI } from '../ai/client'
import { generateFallback } from '../ai/fallback'
import { sanitizeKnowledge } from '../ai/sanitize'
import { parseKnowledgeJsonFields, toJsonString } from '../lib/json'
import { createActivityLog } from '../repositories/activity-repository'
import { getKnowledgeEntryById, insertKnowledgeEntry } from '../repositories/knowledge-repository'
import { generateEmbedding } from '../ai/embedding'

function formatContextSnippet(entry: Record<string, unknown>, idx: number): string {
  const parsed = parseKnowledgeJsonFields(entry)
  const runbookPreview = (parsed.runbook || [])
    .slice(0, 3)
    .map((step) => `${step.step}. ${step.title}\nSQL: ${step.sql}`)
    .join(' | ')
  const diagnosticPreview = (parsed.diagnostic_steps || [])
    .slice(0, 3)
    .map((step) => `${step.step}. ${step.title}\nSQL: ${step.sql}`)
    .join(' | ')

  return [
    `[Approved Reference ${idx + 1}]`,
    `Title: ${parsed.title || ''}`,
    `Symptom: ${parsed.symptom || ''}`,
    `Cause: ${parsed.cause || ''}`,
    `Action: ${parsed.action || ''}`,
    `Runbook Preview: ${runbookPreview || 'none'}`,
    `Diagnostic Preview: ${diagnosticPreview || 'none'}`,
    `Version Range: ${parsed.version_range || ''}`
  ].join('\n')
}

async function loadApprovedReferenceContext(
  db: D1Database,
  env: Pick<Bindings, 'OPENAI_API_KEY' | 'OPENAI_BASE_URL' | 'VECTOR_DB'>,
  rawInput: string,
  dbms: string,
  embeddingModel = ''
) {
  const apiKey = env.OPENAI_API_KEY?.trim() || ''
  const baseUrl = env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1'
  let entries: Array<Record<string, unknown>> = []

  if (apiKey && env.VECTOR_DB) {
    try {
      const embedding = await generateEmbedding(apiKey, baseUrl, `Raw Input: ${rawInput}`, embeddingModel)
      const matches = await env.VECTOR_DB.query(embedding, {
        topK: 3,
        filter: { dbms }
      })

      if (matches.matches.length > 0) {
        const ids = matches.matches.map((match) => String(match.id))
        const fetched = await Promise.all(ids.map((id) => getKnowledgeEntryById(db, id)))
        entries = fetched.filter((entry): entry is Record<string, unknown> => Boolean(entry))
      }
    } catch (err) {
      console.warn('Vector retrieval failed, falling back to DBMS-matched references', err)
    }
  }

  if (entries.length === 0) {
    const fallbackRows = await db.prepare(`
      SELECT ke.*, i.incident_number, i.dbms, i.priority, i.dbms_version, i.raw_input
      FROM knowledge_entry ke
      JOIN incident i ON ke.incident_id = i.id
      WHERE ke.status = 'approved' AND i.dbms = ?
      ORDER BY ke.search_count DESC, ke.updated_at DESC
      LIMIT 3
    `).bind(dbms).all<Record<string, unknown>>()

    entries = fallbackRows.results || []
  }

  return entries
    .slice(0, 3)
    .map((entry, idx) => formatContextSnippet(entry, idx))
    .join('\n\n')
}

export async function generateKnowledgeDraft(
  db: D1Database,
  env: Pick<Bindings, 'OPENAI_API_KEY' | 'OPENAI_BASE_URL' | 'VECTOR_DB' | 'DB'>,
  input: {
    incidentId: string
    rawInput: string
    errorLog?: string
    dbms: string
    userId?: string
    aiModel?: string
    embeddingModel?: string
  }
) {
  const apiKey = env.OPENAI_API_KEY?.trim() || ''
  const baseUrl = env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1'
  const hasLlmConnection = Boolean(apiKey || env.OPENAI_BASE_URL?.trim())
  const contextInfo = await loadApprovedReferenceContext(db, env, input.rawInput, input.dbms, input.embeddingModel)

  const knowledge: Partial<KnowledgeEntry> = hasLlmConnection
    ? await generateWithOpenAI(apiKey || 'ollama-dummy-key', baseUrl, input.rawInput, input.errorLog, input.dbms, contextInfo, input.aiModel)
    : sanitizeKnowledge(generateFallback(input.rawInput, input.dbms), input.rawInput, input.dbms)

  const stub = await db.prepare("SELECT id FROM knowledge_entry WHERE incident_id = ? AND status = 'raw_input'").bind(input.incidentId).first<{ id: string }>()
  const id = stub?.id || uuidv4()
  const now = new Date().toISOString()

  await insertKnowledgeEntry(db, {
    id,
    incidentId: input.incidentId,
    title: knowledge.title || 'AI Generated Knowledge',
    symptom: knowledge.symptom || '',
    cause: knowledge.cause || '',
    causeConfidence: 'ai_inferred',
    action: knowledge.action || '',
    runbook: toJsonString(knowledge.runbook || []),
    diagnosticSteps: toJsonString(knowledge.diagnostic_steps || []),
    tags: toJsonString(knowledge.tags || []),
    aliases: toJsonString(knowledge.aliases || []),
    versionRange: knowledge.version_range || '',
    errorLog: input.errorLog || '',
    status: 'ai_generated',
    aiQualityScore: knowledge.ai_quality_score || 0.6,
    createdAt: now,
    updatedAt: now
  })

  await createActivityLog(db, {
    id: uuidv4(),
    knowledgeEntryId: id,
    userId: input.userId || 'user-001',
    action: 'ai_generated',
    note: 'AI generated knowledge draft',
    createdAt: now
  })

  const entry = await getKnowledgeEntryById(db, id)
  if (entry) {
    return parseKnowledgeJsonFields(entry as Record<string, unknown>)
  }

  return { id, ...knowledge, status: 'ai_generated' }
}
