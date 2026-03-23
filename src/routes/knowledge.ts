import { Hono } from 'hono'
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
  try {
    return c.json(await listKnowledgeSummaries(c.env.DB, c.req.query()))
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500)
  }
})

knowledgeRoutes.get('/:id', async (c) => {
  try {
    const entry = await getKnowledgeDetail(c.env.DB, c.req.param('id'))
    if (!entry) {
      return c.json({ error: 'Knowledge entry not found' }, 404)
    }

    return c.json(entry)
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500)
  }
})

knowledgeRoutes.patch('/:id', async (c) => {
  try {
    const updated = await updateKnowledgeFields(c.env.DB, c.req.param('id'), await c.req.json())
    return c.json(updated)
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500)
  }
})

knowledgeRoutes.post('/:id/approve', async (c) => {
  try {
    const { user_id = 'user-003' } = await c.req.json().catch(() => ({}))
    const result = await approveKnowledgeEntry(c.env.DB, c.req.param('id'), user_id)
    return c.json(result.body, { status: result.code as 200 | 400 | 404 })
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500)
  }
})

knowledgeRoutes.post('/:id/reject', async (c) => {
  try {
    const { user_id = 'user-003', reason } = await c.req.json()
    if (!reason) {
      return c.json({ error: 'Reject reason is required' }, 400)
    }

    return c.json(await rejectKnowledgeEntry(c.env.DB, c.req.param('id'), reason, user_id))
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500)
  }
})

knowledgeRoutes.post('/:id/feedback', async (c) => {
  try {
    const body = await c.req.json()
    if (!body.feedback) {
      return c.json({ error: 'feedback is required' }, 400)
    }

    return c.json(await submitKnowledgeFeedback(c.env.DB, c.req.param('id'), body))
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500)
  }
})

knowledgeRoutes.post('/bulk-approve', async (c) => {
  try {
    const { ids, user_id = 'user-003' } = await c.req.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: 'ids array required' }, 400)
    }

    return c.json(await bulkApproveKnowledgeEntries(c.env.DB, ids, user_id))
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500)
  }
})

export default knowledgeRoutes
