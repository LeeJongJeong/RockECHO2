import { Hono } from 'hono'
import { AppError } from '../lib/AppError'
import type { Bindings } from '../types'
import { getErrorMessage } from '../lib/errors'
import {
  approveKnowledgeEntry,
  bulkApproveKnowledgeEntries,
  getKnowledgeDetail,
  listKnowledgeSummaries,
  rejectKnowledgeEntry,
  submitKnowledgeFeedback,
  updateKnowledgeFields,
  deleteKnowledge
} from '../services/knowledge-service'

const knowledgeRoutes = new Hono<{ Bindings: Bindings }>()

function getAiEnv(c: any) {
  const overrideEnv = { ...c.env }
  if (c.req.header('X-AI-Base-Url')) overrideEnv.OPENAI_BASE_URL = c.req.header('X-AI-Base-Url')
  if (c.req.header('X-AI-Api-Key')) overrideEnv.OPENAI_API_KEY = c.req.header('X-AI-Api-Key')
  const embeddingModel = c.req.header('X-Embedding-Model') || ''
  return { env: overrideEnv, embeddingModel }
}

knowledgeRoutes.get('/', async (c) => {
  return c.json(await listKnowledgeSummaries(c.env.DB, c.req.query()))
})

knowledgeRoutes.get('/:id', async (c) => {
  const entry = await getKnowledgeDetail(c.env.DB, c.req.param('id'))
  if (!entry) {
    throw new AppError('Knowledge entry not found', 404)
  }
  return c.json(entry)
})

knowledgeRoutes.patch('/:id', async (c) => {
  const { env, embeddingModel } = getAiEnv(c)
  const updated = await updateKnowledgeFields(env, c.req.param('id'), await c.req.json(), embeddingModel)
  return c.json(updated)
})

knowledgeRoutes.post('/:id/approve', async (c) => {
  const { user_id = 'user-003' } = await c.req.json().catch(() => ({}))
  const { env, embeddingModel } = getAiEnv(c)
  const result = await approveKnowledgeEntry(env, c.req.param('id'), user_id, embeddingModel)
  return c.json(result)
})

knowledgeRoutes.post('/:id/reject', async (c) => {
  const { user_id = 'user-003', reason } = await c.req.json()
  if (!reason) {
    throw new AppError('Reject reason is required', 400)
  }
  return c.json(await rejectKnowledgeEntry(c.env.DB, c.req.param('id'), reason, user_id))
})

knowledgeRoutes.post('/:id/feedback', async (c) => {
  const body = await c.req.json()
  if (!body.feedback) {
    throw new AppError('feedback is required', 400)
  }
  return c.json(await submitKnowledgeFeedback(c.env.DB, c.req.param('id'), body))
})

knowledgeRoutes.delete('/:id', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  if (body.role !== 'admin') {
    throw new AppError('Admin role is required to delete knowledge entries', 403)
  }
  const { env } = getAiEnv(c)
  return c.json(await deleteKnowledge(env, c.req.param('id')))
})

knowledgeRoutes.post('/bulk-approve', async (c) => {
  const { ids, user_id = 'user-003' } = await c.req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('ids array required', 400)
  }
  const { env, embeddingModel } = getAiEnv(c)
  return c.json(await bulkApproveKnowledgeEntries(env, ids, user_id, embeddingModel))
})

export default knowledgeRoutes
