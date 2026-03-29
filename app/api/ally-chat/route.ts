import { NextRequest, NextResponse } from 'next/server'

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

      const lines = [`• ${item.name}`]
      if (item.category) lines.push(`  Category: ${item.category}`)
      if (item.description) lines.push(`  Description: ${item.description}`)
      if (allergens) lines.push(`  CONTAINS: ${allergens}`)
      if (safe) lines.push(`  Free from: ${safe}`)
      if (!allergens && !safe) lines.push('  Allergen info: not available')
      return lines.join('\n')
    })
    .join('\n\n')
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        reply:
          "I'm Ally! I'm not fully connected right now — please ask a staff member for allergen information.",
      },
      { status: 200 }
    )
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { message, menuItems = [], businessName = 'this restaurant' } = body

  if (!message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  const menuContext = buildMenuContext(menuItems)

  const systemPrompt = `You are Ally, a friendly and knowledgeable food safety assistant for ${businessName}.
Your job is to help customers with food allergies and dietary requirements find dishes they can safely enjoy.

MENU DATA (current):
${menuContext}

RULES:
- Only reference dishes from the menu data above.
- If allergen info is marked "not available" for a dish, advise the customer to check with staff.
- For allergen levels: "contains" = not safe, "may_contain" = risk for highly allergic individuals, "none" = free from.
- Be warm, concise and reassuring. Never diagnose medical conditions.
- If asked about something outside food/allergens, politely redirect.
- Always end with a helpful next step or offer to answer another question.
- Keep replies to 2-4 sentences unless listing multiple items.`

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
          { role: 'user', content: message.trim() },
        ],
        max_tokens: 300,
        temperature: 0.6,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[ally-chat] OpenAI error:', err)
      return NextResponse.json(
        {
          reply:
            "Sorry, I'm having trouble connecting right now. Please ask a staff member for allergen details.",
        },
        { status: 200 }
      )
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content?.trim() ?? "I'm not sure — please check with a member of staff."

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[ally-chat] fetch error:', err)
    return NextResponse.json(
      {
        reply:
          "I'm having a connection issue. For allergen information, please speak with a staff member.",
      },
      { status: 200 }
    )
  }
}
