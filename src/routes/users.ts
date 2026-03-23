import { Hono } from 'hono'
import type { Bindings } from '../types'
import { getErrorMessage } from '../lib/errors'
import { getUserDetail, listAllUsers } from '../services/users-service'

const usersRoutes = new Hono<{ Bindings: Bindings }>()

usersRoutes.get('/', async (c) => {
  try {
    return c.json(await listAllUsers(c.env.DB))
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500)
  }
})

usersRoutes.get('/:id', async (c) => {
  try {
    const user = await getUserDetail(c.env.DB, c.req.param('id'))
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json(user)
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500)
  }
})

export default usersRoutes
