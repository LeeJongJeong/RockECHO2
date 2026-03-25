import { Hono } from 'hono'
import type { Bindings } from '../types'
import { getErrorMessage } from '../lib/errors'
import {
  createIncidentWithDraft,
  getIncidentDetail,
  listIncidentSummaries,
  updateIncidentFields
} from '../services/incident-service'

const incidentRoutes = new Hono<{ Bindings: Bindings }>()

incidentRoutes.get('/', async (c) => {
  try {
    return c.json(await listIncidentSummaries(c.env.DB, c.req.query()))
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500)
  }
})

incidentRoutes.get('/:id', async (c) => {
  try {
    const incident = await getIncidentDetail(c.env.DB, c.req.param('id'))
    if (!incident) {
      return c.json({ error: 'Incident not found' }, 404)
    }

    return c.json(incident)
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500)
  }
})

incidentRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const { dbms, dbms_version, priority, raw_input, error_log, created_by = 'user-004' } = body

    if (!dbms || !raw_input) {
      return c.json({ error: 'dbms and raw_input are required' }, 400)
    }

    const created = await createIncidentWithDraft(c.env.DB, {
      dbms,
      dbmsVersion: dbms_version,
      priority,
      rawInput: raw_input,
      errorLog: error_log,
      createdBy: created_by
    })

    return c.json(created, 201)
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500)
  }
})

incidentRoutes.patch('/:id', async (c) => {
  try {
    const body = await c.req.json()
    const updated = await updateIncidentFields(c.env.DB, c.req.param('id'), {
      dbmsVersion: body.dbms_version,
      priority: body.priority
    })

    if (!updated) {
      return c.json({ error: 'No fields to update' }, 400)
    }

    return c.json(updated)
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500)
  }
})

export default incidentRoutes
