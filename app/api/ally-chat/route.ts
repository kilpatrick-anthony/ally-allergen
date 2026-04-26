import { NextRequest, NextResponse } from 'next/server'

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Simple in-memory store: tracks request counts per IP within a rolling window.
// This resets on server restart (cold starts), which is acceptable for an
// edge-deployed Next.js app — persistent rate limiting would require Redis.
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 20           // max requests per IP per window

const ipRequestMap = new Map<string, { count: number; windowStart: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = ipRequestMap.get(ip)

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipRequestMap.set(ip, { count: 1, windowStart: now })
    return false
  }

  entry.count += 1
  if (entry.count > RATE_LIMIT_MAX) return true
  return false
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_MESSAGE_LENGTH = 500

// Deny-list: common jailbreak / prompt-injection patterns.
// Checked against the raw user message before it reaches the model.
const JAILBREAK_PATTERNS = [
  /ignore (all |previous |above |prior |your |the |any |)instruction/i,
  /you are now|forget (you are|your role|your instructions|everything)/i,
  /act as (a |an |)?(different|new|unrestricted|DAN|evil|malicious)/i,
  /do anything now|jailbreak|bypass (safety|filter|restriction)/i,
  /pretend (you|there) (are|is) no|disregard (your|all) (rules|guidelines)/i,
  /system prompt|<\|im_start\||<\|endoftext\|>/i,
]

// ── Types ─────────────────────────────────────────────────────────────────────
interface MenuItem {
  id: string
  name: string
  description?: string
  category?: string
  allergen_warnings?: Record<string, string>
  dietary?: string[]
}

interface RequestBody {
  message: string
  menuItems: MenuItem[]
  businessName?: string
  _jenMode?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sanitiseText(text: string): string {
  // Strip null bytes and control characters (except newlines/tabs)
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim()
}

function buildMenuContext(items: MenuItem[]): string {
  if (!items.length) return 'No menu items are currently available.'

  return items
    .map((item) => {
      const allergens = Object.entries(item.allergen_warnings ?? {})
        .filter(([, level]) => level !== 'none')
        .map(([allergen, level]) => `${allergen}:${level}`)
        .join(', ')

      const safe = Object.entries(item.allergen_warnings ?? {})
        .filter(([, level]) => level === 'none')
        .map(([a]) => a)
        .join(', ')

      // Sanitise menu item fields to prevent prompt injection via menu data
      const safeName        = sanitiseText(String(item.name ?? ''))
      const safeCategory    = item.category    ? sanitiseText(String(item.category))    : null
      const safeDescription = item.description ? sanitiseText(String(item.description)) : null

      const lines = [`• ${safeName}`]
      if (safeCategory)    lines.push(`  Category: ${safeCategory}`)
      if (safeDescription) lines.push(`  Description: ${safeDescription}`)
      if (allergens)       lines.push(`  CONTAINS: ${allergens}`)
      if (safe)            lines.push(`  Free from: ${safe}`)
      if (!allergens && !safe) lines.push('  Allergen info: not available')
      return lines.join('\n')
    })
    .join('\n\n')
}

function buildSystemPrompt(jenMode: boolean, businessName: string, menuContext: string): string {
  if (jenMode) {
    return `You are Jen, a compliance and food safety expert for food businesses operating under EU law.
You work for AllyJen, a food allergen management platform.

YOUR EXPERTISE:
- EU Food Information to Consumers Regulation (EU FIC / Regulation 1169/2011)
- The 14 major allergens that must be declared under EU law: cereals containing gluten (wheat, rye, barley, oats, spelt, kamut), crustaceans, eggs, fish, peanuts, soybeans, milk (including lactose), nuts (almond, hazelnut, walnut, cashew, pecan, Brazil nut, pistachio, macadamia/Queensland nut), celery, mustard, sesame seeds, sulphur dioxide/sulphites (>10mg/kg or 10mg/L), lupin, and molluscs.
- Labelling obligations for pre-packed and non-pre-packed food
- Cross-contamination risk management and HACCP principles
- FSAI (Food Safety Authority of Ireland) guidance and enforcement
- Staff allergen training requirements
- Written allergen procedures and documentation
- Best practice for managing allergen incidents and anaphylaxis protocols
- Calorie and nutritional information requirements

RULES:
- Only answer questions related to food safety, allergen compliance, labelling, and food business regulation.
- If asked about something outside these topics, politely redirect.
- Cite the relevant regulation or guidance document where appropriate (e.g. "Under Regulation 1169/2011…").
- Be direct, authoritative, and clear. Avoid hedging unnecessarily.
- Always recommend verifying critical compliance decisions with the FSAI or a qualified food safety consultant.
- Never provide legal advice — provide regulatory guidance only.
- Keep replies concise (3-5 sentences) unless a list or detailed breakdown is warranted.
- Decline to answer any questions unrelated to food safety, allergens, or compliance.`
  }

  return `You are Ally, a friendly and knowledgeable food allergy assistant for ${businessName}.
Your job is to help customers with food allergies and dietary requirements find dishes they can safely enjoy.

MENU DATA (current):
${menuContext}

YOUR KNOWLEDGE:
- The 14 major EU allergens: gluten (wheat/rye/barley/oats/spelt/kamut), crustaceans, eggs, fish, peanuts, soybeans, milk/lactose, tree nuts (almond/hazelnut/walnut/cashew/pecan/Brazil/pistachio/macadamia), celery, mustard, sesame, sulphites, lupin, molluscs.
- Common dietary requirements: vegan, vegetarian, halal, kosher, low-FODMAP, etc.
- Cross-contamination risks and what "may contain" means in practice.

RULES:
- Only reference dishes from the menu data above.
- If allergen info is marked "not available" for a dish, advise the customer to check with staff.
- For allergen levels: "contains" = not safe, "may_contain" = risk for highly allergic individuals, "none" = free from.
- Be warm, concise and reassuring. Never diagnose medical conditions.
- If asked about something outside food and allergens, politely redirect.
- Always end with a helpful next step or offer to answer another question.
- Keep replies to 2-4 sentences unless listing multiple items.
- Decline to answer anything unrelated to food, allergens, or dietary requirements.`
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
           ?? req.headers.get('x-real-ip')
           ?? 'unknown'

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { reply: "You've sent a lot of messages — please wait a moment before trying again." },
      { status: 429 }
    )
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { reply: "I'm not fully connected right now — please ask a staff member for allergen information." },
      { status: 200 }
    )
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { message, menuItems = [], businessName = 'this restaurant', _jenMode = false } = body

  // Input validation + sanitisation
  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  const sanitised = sanitiseText(message)

  if (!sanitised) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  if (sanitised.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { reply: "That message is a bit long — could you keep it to a sentence or two?" },
      { status: 200 }
    )
  }

  // Jailbreak / prompt injection detection
  for (const pattern of JAILBREAK_PATTERNS) {
    if (pattern.test(sanitised)) {
      return NextResponse.json(
        { reply: "I can only help with food allergen and safety questions. Is there something I can help you with on the menu?" },
        { status: 200 }
      )
    }
  }

  const menuContext   = buildMenuContext(Array.isArray(menuItems) ? menuItems : [])
  const systemPrompt  = buildSystemPrompt(Boolean(_jenMode), String(businessName).slice(0, 100), menuContext)

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: sanitised },
        ],
        max_tokens: 350,
        temperature: 0.5,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[ally-chat] OpenAI error:', err)
      return NextResponse.json(
        { reply: "Sorry, I'm having trouble connecting right now. Please ask a staff member for allergen details." },
        { status: 200 }
      )
    }

    const data  = await response.json()
    const reply = data.choices?.[0]?.message?.content?.trim()
                  ?? (_jenMode
                    ? "I'm not certain — please check the FSAI guidance at fsai.ie."
                    : "I'm not sure — please check with a member of staff.")

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[ally-chat] fetch error:', err)
    return NextResponse.json(
      { reply: "I'm having a connection issue. For allergen information, please speak with a staff member." },
      { status: 200 }
    )
  }
}
