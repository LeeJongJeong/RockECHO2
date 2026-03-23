import { Hono } from 'hono'
import type { Bindings } from '../types'

const healthRoutes = new Hono<{ Bindings: Bindings }>()

healthRoutes.get('/', (c) => c.json({
  status: 'ok',
  app: 'RockECHO',
  version: '1.0.0'
}))

healthRoutes.get('/ai-test', async (c) => {
  if (c.env.DEV_DIAGNOSTICS !== 'true') {
    return c.json({ error: 'Not found' }, 404)
  }

  const apiKey = c.env.OPENAI_API_KEY
  const baseUrl = c.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'

  if (!apiKey) {
    return c.json({ error: 'OPENAI_API_KEY not set' }, 400)
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [{ role: 'user', content: 'Say OK' }],
        max_tokens: 5
      })
    })

    return c.json({
      status: response.status,
      ok: response.ok
    })
  } catch (error) {
    return c.json({ error: String(error) }, 500)
  }
})

export default healthRoutes
