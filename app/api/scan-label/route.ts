// app/api/scan-label/route.ts
// Accepts a base64-encoded image OR document (PDF/Word) of a product label/datasheet
// and uses Vercel AI Gateway to extract allergen information.

import { NextResponse } from 'next/server'
import mammoth from 'mammoth'
import { ALLERGEN_JSON_SCHEMA, sanitiseWarnings } from '@/lib/allergen-ai'
import { AiGatewayError, analyseWithAiGateway, hasAiGatewayCredentials } from '@/lib/server/ai-gateway'

export const dynamic = 'force-dynamic'

const PROMPT_VISUAL = `You are a food safety compliance expert specialising in EU food labelling law (Regulation 1169/2011).
Analyse this food product label image and extract all relevant information.

${ALLERGEN_JSON_SCHEMA}

Only return valid JSON — no markdown fences, no explanation text.`

const PROMPT_TEXT = (text: string) => `You are a food safety compliance expert specialising in EU food labelling law (Regulation 1169/2011).
Analyse the following product datasheet text and extract all relevant allergen information.

${ALLERGEN_JSON_SCHEMA}

Only return valid JSON — no markdown fences, no explanation text.

--- DOCUMENT TEXT ---
${text.slice(0, 12000)}
--- END ---`

// ── Shared Gemini call ────────────────────────────────────────────────────────

async function extractPdf(buffer: Buffer): Promise<string> {
  // @ts-expect-error — pdf-parse exposes no types for its runtime-only subpath
  const mod = await import('pdf-parse/lib/pdf-parse.js')
  const pdfParse = (mod.default ?? mod) as unknown as (buf: Buffer) => Promise<{ text: string }>
  return (await pdfParse(buffer)).text || ''
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  if (!hasAiGatewayCredentials(req)) {
    return NextResponse.json(
      { error: 'Label scanning is not configured. Please enable Vercel AI Gateway for this deployment.' },
      { status: 503 },
    )
  }

  let body: { image?: string; document?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { image, document } = body

  try {
    let prompt: string
    let gatewayImage: { mimeType: string; base64: string } | undefined

    if (image && typeof image === 'string') {
      // ── Image path (existing) ───────────────────────────────────────────
      let mimeType = 'image/jpeg'
      let base64Data = image
      if (image.startsWith('data:')) {
        const [header, data] = image.split(',')
        mimeType = header.replace('data:', '').replace(';base64', '')
        base64Data = data
      }
      prompt = PROMPT_VISUAL
      gatewayImage = { mimeType, base64: base64Data }

    } else if (document && typeof document === 'string') {
      // ── Document path (PDF or Word) ─────────────────────────────────────
      let mimeType = 'application/pdf'
      let base64Data = document
      if (document.startsWith('data:')) {
        const [header, data] = document.split(',')
        mimeType = header.replace('data:', '').replace(';base64', '')
        base64Data = data
      }

      const isWord = mimeType.includes('wordprocessing') || mimeType.includes('msword')

      if (isWord) {
        // Extract text from Word doc using mammoth, then send as text prompt
        const buffer = Buffer.from(base64Data, 'base64')
        const { value: text } = await mammoth.extractRawText({ buffer })
        if (!text.trim()) {
          return NextResponse.json({ error: 'Could not extract text from the Word document.' }, { status: 422 })
        }
        prompt = PROMPT_TEXT(text)
      } else {
        // Extract PDF text locally so the Gateway request uses one portable API shape.
        const text = await extractPdf(Buffer.from(base64Data, 'base64'))
        if (!text.trim()) {
          return NextResponse.json({ error: 'Could not extract text from the PDF document.' }, { status: 422 })
        }
        prompt = PROMPT_TEXT(text)
      }

    } else {
      return NextResponse.json({ error: 'Missing image or document field.' }, { status: 400 })
    }

    const content = await analyseWithAiGateway({ prompt, image: gatewayImage, maxOutputTokens: 800, request: req })

    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON.' }, { status: 502 })
    }

    return NextResponse.json({
      name: typeof parsed.name === 'string' ? parsed.name.trim() : '',
      description: typeof parsed.description === 'string' ? parsed.description.trim() : '',
      allergen_warnings: sanitiseWarnings(parsed.allergen_warnings || {}),
      notes: Array.isArray(parsed.notes) ? parsed.notes.map(String) : [],
    })
  } catch (err: any) {
    if (err instanceof AiGatewayError) {
      console.error('[scan-label] AI Gateway error:', err.status)
      return NextResponse.json(
        { error: 'Failed to analyse the file. Please try again or enter details manually.' },
        { status: err.status === 429 ? 429 : 502 },
      )
    }
    console.error('[scan-label] Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 },
    )
  }
}

