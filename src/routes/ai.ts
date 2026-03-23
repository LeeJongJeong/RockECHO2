import { Hono } from 'hono'
import type { Bindings } from '../types'
import { getErrorMessage } from '../lib/errors'
import { generateKnowledgeDraft } from '../services/ai-service'

const aiRoutes = new Hono<{ Bindings: Bindings }>()

aiRoutes.post('/generate', async (c) => {
  try {
    const { incident_id, raw_input, dbms, user_id } = await c.req.json()

    if (!incident_id || !raw_input || !dbms) {
      return c.json({ error: 'incident_id, raw_input, dbms are required' }, 400)
    }

    const entry = await generateKnowledgeDraft(c.env.DB, c.env, {
      incidentId: incident_id,
      rawInput: raw_input,
      dbms,
      userId: user_id
    })

    return c.json(entry)
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500)
  }
})

export default aiRoutes
