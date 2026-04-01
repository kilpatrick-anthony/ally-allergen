// app/api/scan-label/route.ts
// Accepts a base64-encoded image OR document (PDF/Word) of a product label/datasheet
// and uses Google Gemini to extract allergen information.
//
// Required env var: GEMINI_API_KEY
// Get a free key at: https://aistudio.google.com/app/apikey

import { NextResponse } from 'next/server'
import mammoth from 'mammoth'
import type { AllergenWarnings } from '@/types/allergen'
import { ALLERGEN_JSON_SCHEMA, sanitiseWarnings } from '@/lib/allergen-ai'

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

async function callGemini(apiKey: string, parts: any[]): Promise<any> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 800 },
      }),
    }
  )
  return { res, data: res.ok ? await res.json() : null, errText: res.ok ? null : await res.text() }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Label scanning is not configured. Please add GEMINI_API_KEY to your environment. Get a free key at https://aistudio.google.com/app/apikey' },
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
    let parts: any[]

    if (image && typeof image === 'string') {
      // ── Image path (existing) ───────────────────────────────────────────
      let mimeType = 'image/jpeg'
      let base64Data = image
      if (image.startsWith('data:')) {
        const [header, data] = image.split(',')
        mimeType = header.replace('data:', '').replace(';base64', '')
        base64Data = data
      }
      parts = [
        { text: PROMPT_VISUAL },
        { inline_data: { mime_type: mimeType, data: base64Data } },
      ]

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
        parts = [{ text: PROMPT_TEXT(text) }]
      } else {
        // PDF — Gemini supports it natively as inline data
        parts = [
          { text: PROMPT_VISUAL },
          { inline_data: { mime_type: 'application/pdf', data: base64Data } },
        ]
      }

    } else {
      return NextResponse.json({ error: 'Missing image or document field.' }, { status: 400 })
    }

    const { res: geminiRes, data: geminiData, errText } = await callGemini(apiKey, parts)

    if (!geminiRes.ok) {
      console.error('[scan-label] Gemini error:', geminiRes.status, errText)
      return NextResponse.json(
        { error: 'Failed to analyse the file. Please try again or enter details manually.' },
        { status: 502 },
      )
    }

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

