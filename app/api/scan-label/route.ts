// app/api/scan-label/route.ts
// Accepts a base64-encoded image of a food product label and uses Google Gemini
// (free tier) to extract allergen information.
//
// Required env var: GEMINI_API_KEY
// Get a free key at: https://aistudio.google.com/app/apikey

import { NextResponse } from 'next/server'
import type { AllergenWarnings } from '@/types/allergen'
import { ALLERGEN_JSON_SCHEMA, sanitiseWarnings } from '@/lib/allergen-ai'

export const dynamic = 'force-dynamic'

const PROMPT = `You are a food safety compliance expert specialising in EU food labelling law (Regulation 1169/2011).
Analyse this food product label image and extract all relevant information.

${ALLERGEN_JSON_SCHEMA}

Only return valid JSON — no markdown fences, no explanation text.`

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Label scanning is not configured. Please add GEMINI_API_KEY to your environment. Get a free key at https://aistudio.google.com/app/apikey' },
      { status: 503 },
    )
  }

  let body: { image?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { image } = body
  if (!image || typeof image !== 'string') {
    return NextResponse.json({ error: 'Missing image field.' }, { status: 400 })
  }

  // Accept both bare base64 and data-URL formats
  let mimeType = 'image/jpeg'
  let base64Data = image
  if (image.startsWith('data:')) {
    const [header, data] = image.split(',')
    mimeType = header.replace('data:', '').replace(';base64', '')
    base64Data = data
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType, data: base64Data } },
            ],
          }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 800 },
        }),
      }
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('[scan-label] Gemini error:', geminiRes.status, errText)
      return NextResponse.json(
        { error: 'Failed to analyse image. Please try again or enter details manually.' },
        { status: 502 },
      )
    }

    const geminiData = await geminiRes.json()
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) {
      return NextResponse.json({ error: 'Empty response from AI.' }, { status: 502 })
    }

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
    console.error('[scan-label] Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 },
    )
  }
}
