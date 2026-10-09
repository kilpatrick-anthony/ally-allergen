export type EngagementEvent = {
  id: string
  event_type: string
  source: string
  access_point_id: string | null
  site_id: string | null
  session_id: string | null
  search_query: string | null
  result_count: number | null
  filters_active: boolean | null
  created_at: string
}
export type EngagementRow = {
  id: string; name: string; source?: string; siteId?: string | null
  views: number; sessions: number; searches: number; filters: number; downloads: number
}
export type EngagementReport = {
  available: boolean
  timezone: string
  sources: EngagementRow[]
  accessPoints: EngagementRow[]
  locations: EngagementRow[]
  totals: { views: number; sessions: number; unattributedViews: number }
  journey: { opened: number; started: number; engaged: number }
  noResults: Array<{ query: string; searches: number; filtered: number; sessions: number }>
  busy: Array<{ day: number; hour: number; sessions: number }>
}
export const emptyEngagement = (timezone = 'UTC'): EngagementReport => ({
  available: false, timezone, sources: [], accessPoints: [], locations: [],
  totals: { views: 0, sessions: 0, unattributedViews: 0 },
  journey: { opened: 0, started: 0, engaged: 0 }, noResults: [], busy: [],
})

export function buildEngagement(events: EngagementEvent[], names: Record<string, string>, timezone: string): EngagementReport {
  const report = { ...emptyEngagement(timezone), available: true }
  type Bucket = EngagementRow & { sessionIds: Set<string> }
  const sources = new Map<string, Bucket>(), points = new Map<string, Bucket>(), locations = new Map<string, Bucket>()
  const sessions = new Map<string, EngagementEvent[]>()
  const noResults = new Map<string, { query: string; searches: number; filtered: number; sessionIds: Set<string> }>()
  const busy = new Map<string, { day: number; hour: number; ids: Set<string> }>()
  const dateFormat = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short', hour: '2-digit', hourCycle: 'h23' })
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const update = (map: Map<string, Bucket>, id: string, name: string, event: EngagementEvent, sessionKey: string | null) => {
    const row = map.get(id) || { id, name, source: event.source, siteId: event.site_id, views: 0, sessions: 0, searches: 0, filters: 0, downloads: 0, sessionIds: new Set<string>() }
    if (event.event_type === 'page_view') row.views++
    if (event.event_type === 'search') row.searches++
    if (event.event_type === 'filter') row.filters++
    if (event.event_type === 'download') row.downloads++
    if (sessionKey) row.sessionIds.add(sessionKey)
    map.set(id, row)
  }
  for (const event of events) {
    const key = event.session_id ? `${event.source}:${event.access_point_id || ''}:${event.site_id || ''}:${event.session_id}` : null
    update(sources, event.source, event.source, event, key)
    const pointKey = `${event.source}:${event.access_point_id || ''}:${event.site_id || ''}`
    update(points, pointKey, event.access_point_id ? names[`${event.source}:${event.access_point_id}`] || 'removedAccessPoint' : 'unassignedAccessPoint', event, key)
    update(locations, event.site_id || 'none', names[`site:${event.site_id}`] || 'unassignedLocation', event, key)
    if (key) {
      const history = sessions.get(key) || []
      history.push(event)
      sessions.set(key, history)
    }
    if (event.event_type === 'page_view') {
      report.totals.views++
      if (event.source === 'unknown') report.totals.unattributedViews++
    }
    if (event.event_type === 'search' && event.result_count === 0 && event.search_query?.trim()) {
      const query = event.search_query.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
      const row = noResults.get(query) || { query, searches: 0, filtered: 0, sessionIds: new Set<string>() }
      row.searches++
      if (event.filters_active) row.filtered++
      if (key) row.sessionIds.add(key)
      noResults.set(query, row)
    }
  }
  report.totals.sessions = sessions.size
  for (const [key, history] of sessions) {
    history.sort((a, b) => a.created_at.localeCompare(b.created_at))
    const opened = history.find(event => event.event_type === 'page_view')
    if (!opened) continue
    report.journey.opened++
    const started = history.find(event => event.event_type === 'start' && event.created_at >= opened.created_at)
    if (started) {
      report.journey.started++
      if (history.some(event => ['search', 'filter'].includes(event.event_type) && event.created_at >= started.created_at)) report.journey.engaged++
    }
    const parts = dateFormat.formatToParts(new Date(opened.created_at))
    const day = days.indexOf(parts.find(part => part.type === 'weekday')!.value)
    const hour = Number(parts.find(part => part.type === 'hour')!.value)
    const cell = busy.get(`${day}:${hour}`) || { day, hour, ids: new Set<string>() }
    cell.ids.add(key)
    busy.set(`${day}:${hour}`, cell)
  }
  const rows = (map: Map<string, Bucket>) => [...map.values()].map(({ sessionIds, ...row }) => ({ ...row, sessions: sessionIds.size })).sort((a, b) => b.sessions - a.sessions || b.views - a.views || a.name.localeCompare(b.name))
  report.sources = rows(sources)
  report.accessPoints = rows(points)
  report.locations = rows(locations)
  report.noResults = [...noResults.values()].map(({ sessionIds, ...row }) => ({ ...row, sessions: sessionIds.size })).sort((a, b) => b.searches - a.searches).slice(0, 20)
  report.busy = [...busy.values()].map(({ ids, ...cell }) => ({ ...cell, sessions: ids.size }))
  return report
}
