import { Hono } from 'hono'
import type { Bindings } from '../types'
import { getErrorMessage } from '../lib/errors'
import { getAuditLog, getDashboardStats, getRecentKnowledge } from '../services/dashboard-service'

const dashboardRoutes = new Hono<{ Bindings: Bindings }>()

dashboardRoutes.get('/stats', async (c) => {
  try {
    return c.json(await getDashboardStats(c.env.DB))
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500)
  }
})

dashboardRoutes.get('/recent', async (c) => {
  try {
    return c.json(await getRecentKnowledge(c.env.DB, c.req.query()))
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500)
  }
})

dashboardRoutes.get('/audit-log', async (c) => {
  try {
    return c.json(await getAuditLog(c.env.DB, c.req.query()))
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500)
  }
})

export default dashboardRoutes
