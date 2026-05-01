import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/email'

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
const MAX_HISTORY_ITEMS = 24
const MAX_HISTORY_ITEM_LENGTH = 500
const ESCALATION_COOLDOWN_MS = 5 * 60 * 1000

// Simple in-memory cooldown to prevent escalation email spam per IP.
const escalationCooldownMap = new Map<string, number>()

// Detect explicit requests to speak with a real person in admin coach chat.
const HUMAN_ESCALATION_PATTERNS = [
  /speak\s+to\s+(a\s+)?(real\s+)?person/i,
  /talk\s+to\s+(a\s+)?human/i,
  /contact\s+anthony/i,
  /message\s+anthony/i,
  /dm\s+anthony/i,
  /human\s+support/i,
  /real\s+support/i,
]

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

interface ChatTurn {
  role: string
  text: string
}

interface RequestBody {
  message: string
  menuItems: MenuItem[]
  businessName?: string
  _jenMode?: boolean
  _source?: 'admin-coach' | 'kiosk' | 'unknown'
  _coach?: 'ally' | 'jen'
  pagePath?: string
  chatHistory?: ChatTurn[]
  language?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sanitiseText(text: string): string {
  // Strip null bytes and control characters (except newlines/tabs)
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim()
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function normalizeHistory(input: unknown): ChatTurn[] {
  if (!Array.isArray(input)) return []

  return input
    .filter((item): item is ChatTurn => !!item && typeof item === 'object')
    .map((item) => ({
      role: sanitiseText(String(item.role ?? 'unknown')).slice(0, 20),
      text: sanitiseText(String(item.text ?? '')).slice(0, MAX_HISTORY_ITEM_LENGTH),
    }))
    .filter((item) => item.text.length > 0)
    .slice(-MAX_HISTORY_ITEMS)
}

function shouldEscalateToHuman(message: string): boolean {
  return HUMAN_ESCALATION_PATTERNS.some((pattern) => pattern.test(message))
}

function canSendEscalationNow(ip: string): boolean {
  const now = Date.now()
  const last = escalationCooldownMap.get(ip)
  if (last && now - last < ESCALATION_COOLDOWN_MS) return false
  escalationCooldownMap.set(ip, now)
  return true
}

async function sendEscalationEmail(params: {
  to: string
  coach: 'ally' | 'jen'
  pagePath: string
  businessName: string
  latestQuestion: string
  history: ChatTurn[]
  ip: string
}) {
  const submittedAt = new Date().toLocaleString('en-IE', { timeZone: 'Europe/Dublin' })

  const textHistory = params.history.length
    ? params.history
        .map((turn, idx) => `${idx + 1}. ${turn.role.toUpperCase()}: ${turn.text}`)
        .join('\n')
    : 'No prior chat history provided.'

  const htmlHistory = params.history.length
    ? params.history
        .map(
          (turn, idx) =>
            `<li><strong>${idx + 1}. ${escapeHtml(turn.role.toUpperCase())}:</strong> ${escapeHtml(turn.text)}</li>`
        )
        .join('')
    : '<li>No prior chat history provided.</li>'

  await sendMail({
    to: params.to,
    subject: `[Coach Escalation] ${params.coach.toUpperCase()} requested human support`,
    text:
      `A user requested human support from ${params.coach.toUpperCase()} in the admin coach chat.\n\n` +
      `Latest question:\n${params.latestQuestion}\n\n` +
      `Page: ${params.pagePath}\n` +
      `Business: ${params.businessName}\n` +
      `IP: ${params.ip}\n` +
      `Submitted at: ${submittedAt}\n\n` +
      `Chat history:\n${textHistory}`,
    html: `
      <h2>Coach Escalation Request</h2>
      <p><strong>Coach:</strong> ${escapeHtml(params.coach.toUpperCase())}</p>
      <p><strong>Latest question:</strong><br>${escapeHtml(params.latestQuestion)}</p>
      <p><strong>Page:</strong> ${escapeHtml(params.pagePath)}</p>
      <p><strong>Business:</strong> ${escapeHtml(params.businessName)}</p>
      <p><strong>IP:</strong> ${escapeHtml(params.ip)}</p>
      <p><strong>Submitted at:</strong> ${escapeHtml(submittedAt)}</p>
      <h3>Chat history</h3>
      <ol>${htmlHistory}</ol>
    `,
  })
}

function buildMenuContext(items: MenuItem[]): string {
  if (!items.length) return 'No menu items are currently available.'

  // Legacy allergen key mapping: field name → display label
  const LEGACY_ALLERGEN_KEYS: Record<string, string> = {
    contains_cereals_gluten: 'cereals_gluten',
    contains_crustaceans: 'crustaceans',
    contains_eggs: 'eggs',
    contains_fish: 'fish',
    contains_peanuts: 'peanuts',
    contains_soybeans: 'soybeans',
    contains_milk: 'milk',
    contains_nuts: 'nuts',
    contains_celery: 'celery',
    contains_mustard: 'mustard',
    contains_sesame: 'sesame',
    contains_sulphites: 'sulphites',
    contains_lupin: 'lupin',
    contains_molluscs: 'molluscs',
  }

  return items
    .map((item) => {
      // Prefer new allergen_warnings; fall back to legacy boolean fields
      const warnings = item.allergen_warnings ?? {}
      const hasNewWarnings = Object.keys(warnings).length > 0

      let allergenEntries: [string, string][] = []

      if (hasNewWarnings) {
        allergenEntries = Object.entries(warnings)
      } else {
        // Build from legacy contains_* boolean fields
        for (const [legacyKey, displayKey] of Object.entries(LEGACY_ALLERGEN_KEYS)) {
          const val = (item as unknown as Record<string, unknown>)[legacyKey]
          if (val === true) allergenEntries.push([displayKey, 'contains'])
        }
      }

      const allergens = allergenEntries
        .filter(([, level]) => level !== 'none')
        .map(([allergen, level]) => `${allergen}:${level}`)
        .join(', ')

      const safe = allergenEntries
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

// Maps BCP-47 language codes to full language names for AI instruction.
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ga: 'Irish (Gaeilge)',
  pt: 'Portuguese',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
}

function buildSystemPrompt(jenMode: boolean, businessName: string, menuContext: string, language?: string): string {
  const languageInstruction = language && language !== 'en' && LANGUAGE_NAMES[language]
    ? `\n\nIMPORTANT: The user has selected ${LANGUAGE_NAMES[language]} as their language. Please respond entirely in ${LANGUAGE_NAMES[language]}.`
    : ''
  if (jenMode) {
    return `You are Jen, a compliance and food safety expert for food businesses operating under EU law.${languageInstruction}
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

  return `You are Ally, a friendly and knowledgeable food allergy assistant for ${businessName}.${languageInstruction}
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

function buildLocalFallbackReply(params: {
  message: string
  menuItems: MenuItem[]
  jenMode: boolean
}): string {
  const lower = params.message.toLowerCase()

  if (params.jenMode) {
    if (/cross.?contamination|traces|may contain/i.test(lower)) {
      return 'Cross-contamination means an allergen can transfer during storage, prep, or service even if it is not an ingredient. If your allergy is severe, ask staff to check prep steps and shared equipment before ordering.'
    }
    if (/staff|ask|safe|safest|what should i ask/i.test(lower)) {
      return 'Ask staff to confirm ingredient allergens, possible cross-contamination, and whether separate utensils or prep areas are used. For severe allergies, always request manager confirmation before placing your order.'
    }
    return 'I can help with practical allergy safety guidance even while AI is offline. For this order, confirm allergens, cross-contamination risk, and final prep method with staff before consuming.'
  }

  const allergenKeywords: Array<{ key: string; terms: string[] }> = [
    { key: 'nuts', terms: ['nut', 'nuts', 'tree nut', 'almond', 'hazelnut', 'walnut', 'cashew', 'pecan', 'pistachio', 'macadamia'] },
    { key: 'cereals_gluten', terms: ['gluten', 'wheat', 'barley', 'rye', 'oat', 'coeliac'] },
    { key: 'milk', terms: ['milk', 'dairy', 'lactose'] },
    { key: 'eggs', terms: ['egg', 'eggs'] },
    { key: 'fish', terms: ['fish'] },
    { key: 'crustaceans', terms: ['crustacean', 'prawn', 'shrimp', 'crab', 'lobster'] },
    { key: 'peanuts', terms: ['peanut', 'peanuts'] },
    { key: 'soybeans', terms: ['soy', 'soya'] },
    { key: 'sesame', terms: ['sesame'] },
    { key: 'mustard', terms: ['mustard'] },
    { key: 'celery', terms: ['celery'] },
    { key: 'sulphites', terms: ['sulphite', 'sulfite'] },
    { key: 'lupin', terms: ['lupin'] },
    { key: 'molluscs', terms: ['mollusc', 'mussels', 'oyster', 'squid'] },
  ]

  const detected = allergenKeywords.find((entry) => entry.terms.some((term) => lower.includes(term)))
  const warningsField = detected ? detected.key : null

  const safeItems = params.menuItems.filter((item) => {
    if (!warningsField) return true
    const warnings = item.allergen_warnings || {}
    const level = warnings[warningsField]
    return !level || level === 'none'
  })

  if (warningsField) {
    if (safeItems.length === 0) {
      return 'I cannot confirm a clearly safe option for that allergen from the current data. Please ask a staff member to verify ingredients and cross-contamination risk before ordering.'
    }

    const top = safeItems.slice(0, 5).map((item) => item.name).join(', ')
    return `Based on the current menu data, options that appear free from that allergen include: ${top}. Please still confirm with staff, especially for severe allergies.`
  }

  const popular = params.menuItems.slice(0, 5).map((item) => item.name)
  if (popular.length > 0) {
    return `I can still help while AI is offline. You can start with: ${popular.join(', ')}. Tell me your allergen and I will narrow this list for you.`
  }

  return 'I can help with allergen checks, but no menu items are currently available in this session. Please ask staff for the latest allergen guide.'
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

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const {
    message,
    menuItems = [],
    businessName = 'this restaurant',
    _jenMode = false,
    _source = 'unknown',
    _coach = _jenMode ? 'jen' : 'ally',
    pagePath = 'unknown',
    chatHistory = [],
    language,
  } = body

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

  // Human escalation flow for admin coach only.
  if (_source === 'admin-coach' && shouldEscalateToHuman(sanitised)) {
    const recipient = process.env.SUPER_ADMIN_EMAIL || 'anthony@allyjen.ie'
    const normalizedHistory = normalizeHistory(chatHistory)

    if (!canSendEscalationNow(ip)) {
      return NextResponse.json(
        {
          reply:
            "I can absolutely help you contact Anthony. Please send him a DM and he will get back to you soon. I already sent your recent context, so there is no need to resend it right now.",
        },
        { status: 200 }
      )
    }

    try {
      await sendEscalationEmail({
        to: recipient,
        coach: _coach,
        pagePath: sanitiseText(String(pagePath || 'unknown')).slice(0, 120),
        businessName: sanitiseText(String(businessName || 'unknown')).slice(0, 100),
        latestQuestion: sanitised,
        history: normalizedHistory.length
          ? normalizedHistory
          : [{ role: 'user', text: sanitised }],
        ip,
      })
    } catch (error) {
      console.error('[ally-chat] escalation email error:', error)
      return NextResponse.json(
        {
          reply:
            "Please send Anthony a DM and he will get back to you. I could not forward the email automatically this time.",
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        reply:
          "Of course. Please send Anthony a DM and he will get back to you shortly. I have also emailed him your question and the recent chat history automatically.",
      },
      { status: 200 }
    )
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        reply: buildLocalFallbackReply({
          message: sanitised,
          menuItems: Array.isArray(menuItems) ? menuItems : [],
          jenMode: Boolean(_jenMode),
        }),
      },
      { status: 200 }
    )
  }

  const menuContext   = buildMenuContext(Array.isArray(menuItems) ? menuItems : [])
  const sanitisedLanguage = typeof language === 'string' ? language.slice(0, 10).replace(/[^a-z-]/gi, '') : undefined
  const systemPrompt  = buildSystemPrompt(Boolean(_jenMode), String(businessName).slice(0, 100), menuContext, sanitisedLanguage)

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
