import { v4 as uuidv4 } from 'uuid'
import type { Bindings, KnowledgeEntry } from '../types'
import { generateWithOpenAI } from '../ai/client'
import { generateFallback } from '../ai/fallback'
import { parseKnowledgeJsonFields, toJsonString } from '../lib/json'
import { createActivityLog } from '../repositories/activity-repository'
import { getKnowledgeEntryById, insertKnowledgeEntry } from '../repositories/knowledge-repository'

export async function generateKnowledgeDraft(
  db: D1Database,
  env: Pick<Bindings, 'OPENAI_API_KEY' | 'OPENAI_BASE_URL'>,
  input: {
    incidentId: string
    rawInput: string
    dbms: string
    userId?: string
  }
) {
  const apiKey = env.OPENAI_API_KEY
  const baseUrl = env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  const knowledge: Partial<KnowledgeEntry> = apiKey
    ? await generateWithOpenAI(apiKey, baseUrl, input.rawInput, input.dbms)
    : generateFallback(input.rawInput, input.dbms)

  const id = uuidv4()
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
