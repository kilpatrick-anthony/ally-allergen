const AI_GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions'

export const AI_GATEWAY_MODEL = process.env.AI_GATEWAY_MODEL || 'google/gemini-2.5-flash'

export class AiGatewayError extends Error {
  constructor(public readonly status: number, message = 'AI Gateway request failed') {
    super(message)
    this.name = 'AiGatewayError'
  }
}

type AnalyseOptions = {
  prompt: string
  image?: { mimeType: string; base64: string }
  file?: { filename: string; mimeType: 'application/pdf'; base64: string }
  maxOutputTokens?: number
  request?: Request
}

function gatewayToken(request?: Request) {
  return process.env.AI_GATEWAY_API_KEY
    || request?.headers?.get('x-vercel-oidc-token')
    || process.env.VERCEL_OIDC_TOKEN
}

export function hasAiGatewayCredentials(request?: Request) {
  return Boolean(gatewayToken(request))
}

export async function analyseWithAiGateway({ prompt, image, file, maxOutputTokens = 1000, request }: AnalyseOptions) {
  const token = gatewayToken(request)
  if (!token) throw new AiGatewayError(503, 'AI Gateway is not configured')

  const content = file
    ? [
        { type: 'text', text: prompt },
        { type: 'file', file: { filename: file.filename, file_data: `data:${file.mimeType};base64,${file.base64}` } },
      ]
    : image
    ? [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.base64}` } },
      ]
    : prompt

  const response = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      model: AI_GATEWAY_MODEL,
      messages: [{ role: 'user', content }],
      response_format: { type: 'json_object' },
      max_tokens: maxOutputTokens,
    }),
  })

  if (!response.ok) throw new AiGatewayError(response.status)
  const payload = await response.json()
  const result = payload?.choices?.[0]?.message?.content
  if (typeof result !== 'string' || !result.trim()) throw new AiGatewayError(502, 'AI Gateway returned an empty response')
  return result
}
