import { Hono } from 'hono'
import type { Bindings } from '../types'
import { getErrorMessage } from '../lib/errors'
import {
  getRecentSearches,
  getSimilarKnowledge,
  getZeroResultAnalysis,
  searchKnowledge
} from '../services/search-service'

const searchRoutes = new Hono<{ Bindings: Bindings }>()

searchRoutes.get('/', async (c) => {
  try {
    return c.json(await searchKnowledge(c.env.DB, c.req.query()))
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500)
  }
})

searchRoutes.get('/similar/:id', async (c) => {
  try {
    return c.json(await getSimilarKnowledge(c.env.DB, c.req.param('id')))
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500)
  }
})

searchRoutes.get('/zero-results', async (c) => {
  try {
    return c.json(await getZeroResultAnalysis(c.env.DB, c.req.query()))
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500)
  }
})

searchRoutes.get('/recent', async (c) => {
  try {
    return c.json(await getRecentSearches(c.env.DB, c.req.query()))
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500)
  }
})

export default searchRoutes
