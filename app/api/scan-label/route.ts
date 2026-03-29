// app/api/scan-label/route.ts
// Accepts a base64-encoded image of a food product label and uses GPT-4o vision
// to extract allergen information. Returns structured JSON that matches AllergenWarnings.
//
// Required env var: OPENAI_API_KEY

import { NextResponse } from 'next/server'
import type { AllergenWarnings } from '@/types/allergen'

export const dynamic = 'force-dynamic'

// ── Prompt ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a food safety compliance expert specialising in EU food labelling law (Regulation 1169/2011).
When shown an image of a food product label, extract allergen information and return it as structured JSON.
Be conservative: if you are uncertain whether an allergen is present, err on the side of caution and note it.
Only return valid JSON — no markdown, no explanation text.`

const USER_PROMPT = `Analyse this food product label image and extract all relevant information.

Return a JSON object with EXACTLY these fields:

{
  "name": "Product or ingredient name from the label",
  "description": "One-sentence description of the product (leave empty string if unclear)",
  "allergen_warnings": {
    "cereals_gluten": "none|contains|may_contain|traces|cross_contamination",
    "crustaceans": "none|contains|may_contain|traces|cross_contamination",
    "eggs": "none|contains|may_contain|traces|cross_contamination",
    "fish": "none|contains|may_contain|traces|cross_contamination",
    "peanuts": "none|contains|may_contain|traces|cross_contamination",
    "soybeans": "none|contains|may_contain|traces|cross_contamination",
    "milk": "none|contains|may_contain|traces|cross_contamination",
    "nuts": "none|contains|may_contain|traces|cross_contamination",
    "celery": "none|contains|may_contain|traces|cross_contamination",
    "mustard": "none|contains|may_contain|traces|cross_contamination",
    "sesame": "none|contains|may_contain|traces|cross_contamination",
    "sulphites": "none|contains|may_contain|traces|cross_contamination",
    "lupin": "none|contains|may_contain|traces|cross_contamination",
    "molluscs": "none|contains|may_contain|traces|cross_contamination"
  },
  "notes": ["Any caveats, e.g. 'label text partially obscured', 'multiple products visible'"]
}

Rules for allergen levels:
- "contains"            → listed under "Contains:" or identifiable as a core ingredient
- "may_contain"         → listed under "May contain:" 
- "traces"              → listed as "may contain traces of"
- "cross_contamination" → produced in/on shared equipment or facility that handles the allergen
- "none"                → allergen not mentioned anywhere

All 14 keys in allergen_warnings must always be present.`

// ── Validation ────────────────────────────────────────────────────────────────

const VALID_ALLERGEN_IDS = [
  'cereals_gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans',
  'milk', 'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs',
] as const

const VALID_LEVELS = ['none', 'contains', 'may_contain', 'traces', 'not_suitable', 'cross_contamination']

function buildDefaultWarnings(): AllergenWarnings {
  return Object.fromEntries(VALID_ALLERGEN_IDS.map(id => [id, 'none'])) as unknown as AllergenWarnings
}

function sanitiseWarnings(raw: Record<string, string>): AllergenWarnings {
  const result = buildDefaultWarnings()
  for (const id of VALID_ALLERGEN_IDS) {
    const val = raw[id]
    if (val && VALID_LEVELS.includes(val)) {
      result[id] = val as any
    }
  }
  return result
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Label scanning is not configured. Please add OPENAI_API_KEY to your environment.' },
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
  const isDataUrl = image.startsWith('data:image/')
  if (!isDataUrl && !/^[A-Za-z0-9+/=]+$/.test(image.slice(0, 100))) {
    return NextResponse.json({ error: 'Image must be base64 encoded.' }, { status: 400 })
  }

  const imageUrl = isDataUrl ? image : `data:image/jpeg;base64,${image}`

  try {
    const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 800,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: USER_PROMPT },
              { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    if (!openAiRes.ok) {
      const errText = await openAiRes.text()
      console.error('[scan-label] OpenAI error:', openAiRes.status, errText)
      return NextResponse.json(
        { error: 'Failed to analyse image. Please try again or enter details manually.' },
        { status: 502 },
      )
    }

    const openAiData = await openAiRes.json()
    const content = openAiData.choices?.[0]?.message?.content
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
