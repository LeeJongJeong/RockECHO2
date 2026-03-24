import { AppError } from '../lib/AppError'

export async function generateEmbedding(
  apiKey: string,
  baseUrl: string,
  text: string,
  modelName = ''
): Promise<number[]> {
  const model = modelName || 'text-embedding-3-small';
  const response = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      input: text
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new AppError(`OpenAI Embedding API error: ${response.status} ${errorText}`, 502)
  }

  const data = await response.json() as { data: Array<{ embedding: number[] }> }
  return data.data[0].embedding
}
