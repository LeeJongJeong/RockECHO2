import { v4 as uuidv4 } from 'uuid'
import type { Bindings, KnowledgeEntry } from '../types'
import { generateWithOpenAI } from '../ai/client'
import { generateFallback } from '../ai/fallback'
import { parseKnowledgeJsonFields, toJsonString } from '../lib/json'
import { createActivityLog } from '../repositories/activity-repository'
import { getKnowledgeEntryById, insertKnowledgeEntry } from '../repositories/knowledge-repository'
import { generateEmbedding } from '../ai/embedding'

export async function generateKnowledgeDraft(
  db: D1Database,
  env: Pick<Bindings, 'OPENAI_API_KEY' | 'OPENAI_BASE_URL' | 'VECTOR_DB' | 'DB'>,
  input: {
    incidentId: string
    rawInput: string
    dbms: string
    userId?: string
    aiModel?: string
    embeddingModel?: string
  }
) {
  const apiKey = env.OPENAI_API_KEY
  const baseUrl = env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  let contextInfo = ''

  if (apiKey && env.VECTOR_DB) {
    try {
      const textToEmbed = `Raw Input: ${input.rawInput}`
      const embedding = await generateEmbedding(apiKey, baseUrl, textToEmbed, input.embeddingModel)
      const matches = await env.VECTOR_DB.query(embedding, {
        topK: 2,
        filter: { dbms: input.dbms }
      })

      if (matches.matches.length > 0) {
        const ids = matches.matches.map(m => String(m.id))
        const entries = await Promise.all(ids.map(id => getKnowledgeEntryById(db, id)))
        
        contextInfo = entries
          .filter(Boolean)
          .map((entry: any, idx) => `[\uACFC\uAC70 \uCC38\uACE0 ${idx + 1}]\n\uC81C\uBAA9: ${entry.title}\n\uC99D\uC0C1: ${entry.symptom}\n\uC6D0\uC778: ${entry.cause}\n\uC870\uCE58: ${entry.action}\n\uB7F0\uBD81: ${entry.runbook}`)
          .join('\n\n')
      }
    } catch (err) {
      console.warn('RAG retrieval failed, proceeding without context', err)
    }
  }

  const knowledge: Partial<KnowledgeEntry> = apiKey
    ? await generateWithOpenAI(apiKey, baseUrl, input.rawInput, input.dbms, contextInfo, input.aiModel)
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
