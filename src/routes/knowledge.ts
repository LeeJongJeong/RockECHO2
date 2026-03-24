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
  updateKnowledgeFields
} from '../services/knowledge-service'

const knowledgeRoutes = new Hono<{ Bindings: Bindings }>()

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
  const updated = await updateKnowledgeFields(c.env.DB, c.req.param('id'), await c.req.json())
  return c.json(updated)
})

knowledgeRoutes.post('/:id/approve', async (c) => {
  const { user_id = 'user-003' } = await c.req.json().catch(() => ({}))
  const result = await approveKnowledgeEntry(c.env.DB, c.req.param('id'), user_id)
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

knowledgeRoutes.post('/bulk-approve', async (c) => {
  const { ids, user_id = 'user-003' } = await c.req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('ids array required', 400)
  }
  return c.json(await bulkApproveKnowledgeEntries(c.env.DB, ids, user_id))
})

export default knowledgeRoutes
