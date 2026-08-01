// app/api/fsai-alerts/route.ts
// Server-side proxy that fetches food safety RSS feeds and returns JSON.
// Responses are cached for 5 minutes.
//
// Feeds:
//   IE  — Google News: Irish food recalls & allergen alerts (live)
//   EU  — Google News: EU-level RASFF / food safety news (live)
//   FSN — Food Safety News international feed (live)
//   FSAI — Optional: set FSAI_RSS_URL in .env.local when FSAI restore their RSS
//
// If all feeds fail the API returns static fallback entries pointing to FSAI.ie and RASFF.

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
// Next.js 16 route-level cache revalidation (5 minutes)
export const revalidate = 300

// ── Simple in-process cache (survives multiple requests within the same instance) ──
interface CacheEntry {
  data: AlertItem[]
  fetchedAt: number
}

let cache: CacheEntry | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export interface AlertItem {
  id: string
  title: string
  link: string
  date: string
  source: 'IE' | 'EU' | 'FSN' | 'FSAI' | 'UK' | 'EFSA' | 'Static'
}

// ── RSS → JSON ────────────────────────────────────────────────────────────────

function extractTag(xml: string, tag: string): string {
  // Handles both <tag>value</tag> and CDATA wrapped values
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`, 'i'))
  if (cdataMatch) return cdataMatch[1].trim()
  const plainMatch = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  return plainMatch ? plainMatch[1].trim() : ''
}

function parseRSS(xml: string, source: 'IE' | 'EU' | 'FSN' | 'FSAI' | 'UK' | 'EFSA'): AlertItem[] {
  const items: AlertItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null
  let idx = 0

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title = extractTag(block, 'title')
    const link  = extractTag(block, 'link')
    const date  = extractTag(block, 'pubDate') || extractTag(block, 'dc:date') || ''

    if (title) {
      items.push({ id: `${source}-${idx++}`, title, link, date, source })
    }
    if (items.length >= 20) break
  }

  return items
}

async function fetchFeed(url: string, source: 'IE' | 'EU' | 'FSN' | 'FSAI' | 'UK' | 'EFSA'): Promise<AlertItem[]> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'AllyJen-AllergenPlatform/1.0 (food safety compliance tool)',
      Accept: 'application/rss+xml, application/xml, text/xml',
    },
    next: { revalidate: 300 },
  })

  if (!res.ok) {
    console.warn(`[fsai-alerts] Feed ${source} returned ${res.status}`)
    return []
  }

  const xml = await res.text()
  return parseRSS(xml, source)
}

// ── Feed URLs ─────────────────────────────────────────────────────────────────

const IE_FEED_URL   = 'https://news.google.com/rss/search?q=FSAI+food+recall+OR+%22undeclared+allergen%22+OR+%22food+safety+alert%22+ireland&hl=en-IE&gl=IE&ceid=IE:en'
const EU_FEED_URL   = 'https://news.google.com/rss/search?q=RASFF+EU+food+recall+alert+allergen&hl=en&gl=EU&ceid=IE:en'
const FSN_FEED_URL  = 'https://www.foodsafetynews.com/feed/'
// FSAI do not publish a native RSS feed; we use a targeted Google News search instead
const FSAI_FEED_URL = 'https://news.google.com/rss/search?q=%22Food+Safety+Authority+of+Ireland%22+OR+%22FSAI%22+food+alert+recall+allergen&hl=en-IE&gl=IE&ceid=IE:en'
const UK_FEED_URL   = 'https://news.google.com/rss/search?q=%22Food+Standards+Agency%22+OR+%22FSA+recall%22+OR+%22Food+Alert+for+Action%22+allergen&hl=en-GB&gl=GB&ceid=GB:en'
const EFSA_FEED_URL = 'https://news.google.com/rss/search?q=%22European+Food+Safety+Authority%22+OR+EFSA+allergen+warning+food+safety&hl=en&gl=EU&ceid=EU:en'

const STATIC_FALLBACK: AlertItem[] = [
  {
    id: 'static-fsai',
    title: 'Visit FSAI.ie for the latest food safety alerts and recalls',
    link: 'https://www.fsai.ie/industry/food-safety-alerts.html',
    date: '',
    source: 'Static',
  },
  {
    id: 'static-rasff',
    title: 'EU RASFF — view the latest European food and feed safety alerts',
    link: 'https://webgate.ec.europa.eu/rasff-window/consumer/',
    date: '',
    source: 'Static',
  },
]

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // ?force=true bypasses the cache (used by the manual refresh button)
    const force = request.nextUrl.searchParams.get('force') === 'true'

    // Serve from cache if fresh and not forced
    if (!force && cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
      return NextResponse.json({ alerts: cache.data, cached: true })
    }

    const results = await Promise.allSettled([
      fetchFeed(IE_FEED_URL,   'IE'),
      fetchFeed(EU_FEED_URL,   'EU'),
      fetchFeed(FSN_FEED_URL,  'FSN'),
      fetchFeed(FSAI_FEED_URL, 'FSAI'),
      fetchFeed(UK_FEED_URL,   'UK'),
      fetchFeed(EFSA_FEED_URL, 'EFSA'),
    ])

    const ieItems   = results[0].status === 'fulfilled' ? results[0].value : []
    const euItems   = results[1].status === 'fulfilled' ? results[1].value : []
    const fsnItems  = results[2].status === 'fulfilled' ? results[2].value : []
    const fsaiItems = results[3].status === 'fulfilled' ? results[3].value : []
    const ukItems   = results[4].status === 'fulfilled' ? results[4].value : []
    const efsaItems = results[5].status === 'fulfilled' ? results[5].value : []

    // Interleave by priority: IE, FSAI, EU, EFSA, UK, FSN.
    // Cap each source so the ticker stays manageable.
    const combined: AlertItem[] = []
    const ieSlice   = ieItems.slice(0, 8)
    const fsaiSlice = fsaiItems.slice(0, 5)
    const euSlice   = euItems.slice(0, 5)
    const efsaSlice = efsaItems.slice(0, 4)
    const ukSlice   = ukItems.slice(0, 4)
    const fsnSlice  = fsnItems.slice(0, 5)
    const maxLen = Math.max(
      ieSlice.length,
      fsaiSlice.length,
      euSlice.length,
      efsaSlice.length,
      ukSlice.length,
      fsnSlice.length
    )
    for (let i = 0; i < maxLen; i++) {
      if (ieSlice[i])   combined.push(ieSlice[i])
      if (fsaiSlice[i]) combined.push(fsaiSlice[i])
      if (euSlice[i])   combined.push(euSlice[i])
      if (efsaSlice[i]) combined.push(efsaSlice[i])
      if (ukSlice[i])   combined.push(ukSlice[i])
      if (fsnSlice[i])  combined.push(fsnSlice[i])
    }

    const alerts = combined.length > 0 ? combined : STATIC_FALLBACK

    cache = { data: alerts, fetchedAt: Date.now() }
    return NextResponse.json({ alerts, cached: false })
  } catch (err: any) {
    console.error('[fsai-alerts] Unexpected error:', err)
    return NextResponse.json({ alerts: STATIC_FALLBACK, cached: false })
  }
}
