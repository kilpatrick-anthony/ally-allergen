import { hasAnalyticsConsent } from '@/lib/cookie-consent'

export type AccessSource = 'website' | 'qr' | 'kiosk' | 'direct' | 'unknown'
export type AnalyticsPayload = {
  slug: string
  siteId?: string | null
  eventType: 'page_view' | 'start' | 'search' | 'filter' | 'time_on_page' | 'download' | 'qr_scan'
  searchQuery?: string
  selectedAllergens?: string[]
  downloadType?: string
  scanSource?: string
  timeOnPage?: number
  resultCount?: number
  filtersActive?: boolean
}
const SESSION_TIMEOUT = 30 * 60 * 1000
const memorySessions = new Map<string, { id: string; last: number }>()

function accessContext() {
  const params = new URLSearchParams(window.location.search)
  let paired: string | null = null
  try { paired = localStorage.getItem('ally_paired_device_id') } catch { /* Storage may be unavailable. */ }
  if (params.get('mode') === 'web') return { source: 'website', accessPointId: params.get('website_link') }
  if (params.get('qr')) return { source: 'qr', accessPointId: params.get('qr') }
  if (params.get('mode') === 'kiosk') return { source: 'kiosk', accessPointId: params.get('device') || paired }
  if (paired) return { source: 'kiosk', accessPointId: paired }
  return { source: 'direct', accessPointId: null }
}

function sessionKey(slug: string, siteId?: string | null) {
  const context = accessContext()
  return `ally_analytics_session:${slug}:${siteId || ''}:${context.source}:${context.accessPointId || ''}`
}

export function resetAnalyticsSession(slug: string, siteId?: string | null) {
  const key = sessionKey(slug, siteId)
  memorySessions.delete(key)
  try { sessionStorage.removeItem(key) } catch { /* In-memory fallback. */ }
}

export async function sendKioskAnalyticsEvent(payload: AnalyticsPayload) {
  if (!hasAnalyticsConsent()) return
  try {
    const key = sessionKey(payload.slug, payload.siteId)
    const now = Date.now()
    let session = memorySessions.get(key)
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || 'null')
      if (saved && typeof saved.id === 'string' && typeof saved.last === 'number') session = saved
    } catch { /* Use the in-memory session when storage is blocked. */ }
    const isNew = !session || now - session.last >= SESSION_TIMEOUT
    if (isNew && payload.eventType === 'time_on_page') return
    if (isNew) session = { id: crypto.randomUUID(), last: now }
    session!.last = now
    memorySessions.set(key, session!)
    try { sessionStorage.setItem(key, JSON.stringify(session)) } catch { /* In-memory fallback. */ }
    const context = { ...accessContext(), sessionId: session!.id }
    const send = (event: AnalyticsPayload) => fetch('/api/analytics/kiosk-event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...event, ...context }), keepalive: true,
    })
    // A tablet resets between customers without reloading the page.
    if (isNew && ['start', 'search', 'filter', 'download'].includes(payload.eventType)) {
      await send({ slug: payload.slug, siteId: payload.siteId, eventType: 'page_view' })
    }
    if (hasAnalyticsConsent()) await send(payload)
  } catch { /* Analytics must never block the menu. */ }
}
