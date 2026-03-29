// app/api/parse-document/route.ts
// Accepts a base64-encoded PDF, DOCX, DOC, or plain-text file and uses Google Gemini
// (free tier) to extract allergen information from the text content.
//
// Required env var: GEMINI_API_KEY
// Get a free key at: https://aistudio.google.com/app/apikey

import { NextResponse } from 'next/server'
import { ALLERGEN_JSON_SCHEMA, sanitiseWarnings } from '@/lib/allergen-ai'

export const dynamic = 'force-dynamic'

// ── Prompt ────────────────────────────────────────────────────────────────────

const buildPrompt = (text: string) =>
  `You are a food safety compliance expert specialising in EU food labelling law (Regulation 1169/2011).
Analyse the ingredient document text below and extract allergen information.
Only return valid JSON — no markdown fences, no explanation text.

${ALLERGEN_JSON_SCHEMA}

Document text:
---
${text.slice(0, 12000)}
---`

// ── Text extraction helpers ───────────────────────────────────────────────────

async function extractPdf(buffer: Buffer): Promise<string> {
  // Import the internal lib path so pdf-parse's test-runner code (index.js) is
  // never executed. Also declared as serverExternalPackage so Turbopack never
  // bundles it and Node.js resolves it at runtime.
  // @ts-expect-error — subpath has no separate type declaration; types covered by @types/pdf-parse on the main export
  const mod = await import('pdf-parse/lib/pdf-parse.js')
  const pdfParse = (mod.default ?? mod) as unknown as (buf: Buffer) => Promise<{ text: string }>
  const data = await pdfParse(buffer)
  return data.text || ''
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  return result.value || ''
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Document parsing is not configured. Please add GEMINI_API_KEY to your environment. Get a free key at https://aistudio.google.com/app/apikey' },
      { status: 503 },
    )
  }

  let body: { file?: string; mimeType?: string; fileName?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { file, mimeType = '', fileName = '' } = body
  if (!file || typeof file !== 'string') {
    return NextResponse.json({ error: 'Missing file field.' }, { status: 400 })
  }

  // Strip data-URL prefix if present
  const base64 = file.includes(',') ? file.split(',')[1] : file
  const buffer = Buffer.from(base64, 'base64')

  // ── Extract text from the document ──────────────────────────────────────────
  let text = ''
  try {
    const lowerName = fileName.toLowerCase()
    const isPdf = mimeType === 'application/pdf' || lowerName.endsWith('.pdf')
    const isDocx =
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      lowerName.endsWith('.docx')
    const isDoc = mimeType === 'application/msword' || lowerName.endsWith('.doc')
    const isText =
      mimeType.startsWith('text/') ||
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.tsv')

    if (isPdf) {
      text = await extractPdf(buffer)
    } else if (isDocx || isDoc) {
      // mammoth handles both .doc and .docx reasonably well
      text = await extractDocx(buffer)
    } else if (isText) {
      text = buffer.toString('utf-8')
    } else {
      // Attempt plain-text fallback for unknown types
      text = buffer.toString('utf-8')
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to read document: ${err?.message || 'Unknown error'}` },
      { status: 422 },
    )
  }

  if (!text.trim()) {
    return NextResponse.json(
      { error: 'Could not extract any text from this document. Try a different format.' },
      { status: 422 },
    )
  }

  // ── Send extracted text to Gemini ───────────────────────────────────────────
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(text) }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 800 },
        }),
      }
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('[parse-document] Gemini error:', geminiRes.status, errText)
      return NextResponse.json(
        { error: 'Failed to analyse document. Please try again or enter details manually.' },
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
    console.error('[parse-document] Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 },
    )
  }
}
