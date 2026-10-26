import { localDay, shiftDay, type PlatformRange } from './platform-range'
export type PlatformEvent = {
  id: string
  business_id: string | null
  event_type: string
  search_query: string | null
  selected_allergens: string[] | null
  result_count: number | null
  filters_active: boolean | null
  session_id: string | null
  source: string | null
  access_point_id: string | null
  site_id: string | null
  created_at: string
}
type TermCount = { count: number; businesses: Set<string>; filtered: number }
export type RankedTerm = {
  term: string
  count: number
  previousCount: number
  changePercent: number | null
  businesses: number
  share: number
  filtered: number
}
const normalized = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
const ALLERGENS: Record<string, string> = {
  cereals_gluten: 'Gluten',
  crustaceans: 'Crustaceans',
  eggs: 'Eggs',
  fish: 'Fish',
  peanuts: 'Peanuts',
  soybeans: 'Soybeans',
  milk: 'Milk',
  nuts: 'Tree nuts',
  celery: 'Celery',
  mustard: 'Mustard',
  sesame: 'Sesame',
  sulphites: 'Sulphites',
  lupin: 'Lupin',
  molluscs: 'Molluscs',
}
const period = () => ({
  searches: 0,
  views: 0,
  filters: 0,
  downloads: 0,
  sessions: new Set<string>(),
  businesses: new Set<string>(),
  terms: new Map<string, TermCount>(),
  allergens: new Map<string, TermCount>(),
  dietary: new Map<string, TermCount>(),
  noResults: new Map<string, TermCount>(),
  sources: new Map<string, { views: number; searches: number; sessions: Set<string> }>(),
  daily: new Map<string, number>(),
})
function increment(map: Map<string, TermCount>, term: string, business: string, filtered = false) {
  const row = map.get(term) || { count: 0, businesses: new Set<string>(), filtered: 0 }
  row.count++
  row.businesses.add(business)
  if (filtered) row.filtered++
  map.set(term, row)
}
/** Consume paged events incrementally; raw events and session IDs never leave the server. */
export function platformAccumulator(
  range: PlatformRange,
  eligibleBusinesses: Set<string>,
  includeDemo: boolean,
  generatedAt: string,
) {
  const current = period(),
    previous = period()
  function add(event: PlatformEvent) {
    const business = event.business_id
    if (!business || !eligibleBusinesses.has(business)) return
    const day = localDay(new Date(event.created_at))
    if (day < range.previousStart || day > range.end) return
    const target = day >= range.start ? current : previous
    target.businesses.add(business)
    const source = ['qr', 'kiosk', 'website', 'direct'].includes(event.source || '')
      ? event.source!
      : 'unknown'
    const session = event.session_id
      ? JSON.stringify([business, source, event.access_point_id, event.site_id, event.session_id])
      : null
    const sourceRow = target.sources.get(source) || { views: 0, searches: 0, sessions: new Set<string>() }
    if (session) {
      target.sessions.add(session)
      sourceRow.sessions.add(session)
    }
    if (event.event_type === 'page_view') {
      target.views++
      sourceRow.views++
    }
    if (event.event_type === 'download') target.downloads++
    if (event.event_type === 'search') {
      target.searches++
      sourceRow.searches++
      target.daily.set(day, (target.daily.get(day) || 0) + 1)
      const term = normalized(event.search_query || '')
      if (term) {
        increment(target.terms, term, business)
        if (event.result_count === 0)
          increment(target.noResults, term, business, Boolean(event.filters_active))
      }
    }
    if (event.event_type === 'filter') {
      target.filters++
      // Count actual selected filters, rather than guessing from typed food names.
      for (const key of new Set(
        (event.selected_allergens || []).map((value) => value.replace(/^contains_/, '')),
      )) {
        if (ALLERGENS[key]) increment(target.allergens, ALLERGENS[key], business)
      }
      const dietary = new Set(
        (event.search_query || '')
          .split('|')
          .filter((value) => value.trim().startsWith('dietary:'))
          .map((value) => normalized(value.trim().slice(8)))
          .filter(Boolean),
      )
      for (const value of dietary) increment(target.dietary, value, business)
    }
    target.sources.set(source, sourceRow)
  }
  function result() {
    const rank = (
      map: Map<string, TermCount>,
      before: Map<string, TermCount>,
      denominator: number,
    ): RankedTerm[] =>
      [...map.entries()]
        .sort(([a, x], [b, y]) => y.count - x.count || a.localeCompare(b))
        .slice(0, 20)
        .map(([term, row]) => {
          const previousCount = before.get(term)?.count || 0
          return {
            term,
            count: row.count,
            previousCount,
            changePercent: previousCount
              ? Math.round(((row.count - previousCount) / previousCount) * 1000) / 10
              : null,
            businesses: row.businesses.size,
            share: denominator ? Math.round((row.count / denominator) * 1000) / 10 : 0,
            filtered: row.filtered,
          }
        })
    return {
      range,
      generatedAt,
      includeDemo,
      overview: {
        searches: current.searches,
        previousSearches: previous.searches,
        views: current.views,
        sessions: current.sessions.size,
        filters: current.filters,
        downloads: current.downloads,
        businesses: current.businesses.size,
        eligibleBusinesses: eligibleBusinesses.size,
        noResultSearches: [...current.noResults.values()].reduce((sum, row) => sum + row.count, 0),
      },
      topSearches: rank(current.terms, previous.terms, current.searches),
      topAllergens: rank(current.allergens, previous.allergens, current.filters),
      topDietary: rank(current.dietary, previous.dietary, current.filters),
      noResults: rank(current.noResults, previous.noResults, current.searches),
      daily: Array.from({ length: range.days }, (_, i) => {
        const day = shiftDay(range.start, i)
        return {
          day,
          searches: current.daily.get(day) || 0,
          previousSearches: previous.daily.get(shiftDay(day, -range.days)) || 0,
        }
      }),
      sources: [...current.sources.entries()]
        .map(([source, row]) => ({
          source,
          searches: row.searches,
          views: row.views,
          sessions: row.sessions.size,
        }))
        .sort((a, b) => b.searches - a.searches || a.source.localeCompare(b.source)),
    }
  }
  return { add, result }
}
export type PlatformInsights = ReturnType<ReturnType<typeof platformAccumulator>['result']>
export function platformSummary(report: PlatformInsights) {
  return [
    `AllyJen: most searched terms across ${report.includeDemo ? 'all businesses (including demos)' : 'non-demo businesses'}`,
    `${report.range.start} to ${report.range.end} (${report.range.timezone})`,
    ...report.topSearches
      .slice(0, 5)
      .map(
        (row, index) => `${index + 1}. ${row.term} — ${row.count} ${row.count === 1 ? 'search' : 'searches'}`,
      ),
    `Total recorded searches: ${report.overview.searches}`,
    'Based on recorded searches on AllyJen; searches are not orders or unique people.',
  ].join('\n')
}
export function platformCsv(report: PlatformInsights) {
  const cell = (value: string | number | null) => {
    let text = String(value ?? '')
    if (typeof value === 'string' && /^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`
    return `"${text.replace(/"/g, '""')}"`
  }
  const rows: (string | number | null)[][] = [
    [
      'Section',
      'Term',
      'Count',
      'Previous count',
      'Change percent',
      'Businesses',
      'Share percent',
      'Start',
      'End',
      'Timezone',
      'Includes demos',
    ],
  ]
  for (const [section, values] of [
    ['Searches', report.topSearches],
    ['Allergen filters', report.topAllergens],
    ['Dietary filters', report.topDietary],
    ['No-result searches', report.noResults],
  ] as const) {
    for (const row of values)
      rows.push([
        section,
        row.term,
        row.count,
        row.previousCount,
        row.changePercent,
        row.businesses,
        row.share,
        report.range.start,
        report.range.end,
        report.range.timezone,
        String(report.includeDemo),
      ])
  }
  return rows.map((row) => row.map(cell).join(',')).join('\r\n')
}
