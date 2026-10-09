// Run with: node --test tests/engagement-analytics.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript')
function load(path, globals = {}, imports = {}) {
  const context = { exports: {}, require: name => { assert.ok(imports[name], name); return imports[name] }, ...globals }
  vm.createContext(context)
  vm.runInContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context)
  return context.exports
}
const { buildEngagement } = load('lib/analytics/engagement.ts')
function event(type, overrides = {}) {
  return { id: 'event', event_type: type, source: 'website', access_point_id: 'link', site_id: 'site', session_id: 'session', search_query: null, result_count: null, filters_active: null, created_at: '2026-10-05T10:00:00Z', ...overrides }
}
test('separates repeated views from sessions, preserves historic activity and requires ordered journey steps', () => {
  const report = buildEngagement([
    event('page_view'), event('page_view'), event('start', { created_at: '2026-10-05T10:01:00Z' }),
    event('search', { created_at: '2026-10-05T10:02:00Z', search_query: '  Berry Bowl ', result_count: 0, filters_active: true }),
    event('search', { created_at: '2026-10-05T10:03:00Z', search_query: 'berry bowl', result_count: 0, filters_active: false }),
    event('page_view', { source: 'unknown', session_id: null, access_point_id: null }),
    event('page_view', { source: 'qr', session_id: 'qr-session', access_point_id: 'code', site_id: 'site2' }),
    event('search', { source: 'qr', session_id: 'qr-session', access_point_id: 'code', site_id: 'site2' }),
    event('start', { source: 'qr', session_id: 'qr-session', access_point_id: 'code', site_id: 'site2', created_at: '2026-10-05T10:04:00Z' }),
  ], { 'website:link': 'Website header', 'site:site': 'Maynooth', 'site:site2': 'Dublin' }, 'Europe/Dublin')
  assert.equal(report.totals.views, 4)
  assert.equal(report.totals.sessions, 2)
  assert.equal(report.totals.unattributedViews, 1)
  assert.equal(report.journey.opened, 2)
  assert.equal(report.journey.started, 2)
  assert.equal(report.journey.engaged, 1)
  assert.equal(report.noResults[0].searches, 2)
  assert.equal(report.noResults[0].filtered, 1)
  assert.equal(report.noResults[0].sessions, 1)
  assert.equal(report.accessPoints.find(p => p.source === 'website').name, 'Website header')
  assert.equal(report.accessPoints.find(p => p.source === 'qr').name, 'removedAccessPoint')
  assert.equal(report.busy[0].hour, 11)
  assert.equal(report.busy[0].sessions, 2)
})
test('excludes journeys opened outside the range and does not label legacy searches as zero results', () => {
  const report = buildEngagement([event('start'), event('search', { search_query: 'berry', result_count: null })], {}, 'UTC')
  assert.equal(report.totals.sessions, 1)
  assert.equal(report.journey.opened, 0)
  assert.equal(report.journey.started, 0)
  assert.equal(report.noResults.length, 0)
  assert.equal(report.busy.length, 0)
})
function client(query = '', paired = null) {
  let consent = true, now = 1000, sequence = 0
  const sent = [], stored = new Map()
  const RealDate = Date
  const api = load('lib/analytics/client.ts', {
    URLSearchParams, window: { location: { search: query } },
    localStorage: { getItem: () => paired },
    sessionStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) },
    crypto: { randomUUID: () => `session-${++sequence}` },
    Date: class extends RealDate { static now() { return now } },
    fetch: async (_url, options) => { sent.push(JSON.parse(options.body)); return { ok: true } },
  }, { '@/lib/cookie-consent': { hasAnalyticsConsent: () => consent } })
  return { ...api, sent, stored, consent: value => consent = value, advance: value => now += value }
}
test('website consent, session reuse, inactivity expiry and kiosk resets', async () => {
  const c = client('?mode=web&website_link=website-id&qr=ignored', 'paired-tablet')
  const payload = { slug: 'business', siteId: 'site', eventType: 'page_view' }
  c.consent(false); await c.sendKioskAnalyticsEvent(payload)
  assert.equal(c.sent.length, 0); assert.equal(c.stored.size, 0)
  c.consent(true)
  await c.sendKioskAnalyticsEvent(payload); await c.sendKioskAnalyticsEvent(payload)
  assert.equal(c.sent[0].sessionId, c.sent[1].sessionId)
  assert.equal(c.sent[0].source, 'website'); assert.equal(c.sent[0].accessPointId, 'website-id')
  c.advance(30 * 60 * 1000)
  await c.sendKioskAnalyticsEvent({ ...payload, eventType: 'search', searchQuery: 'missing', resultCount: 0, filtersActive: true })
  assert.equal(c.sent[2].eventType, 'page_view'); assert.equal(c.sent[3].resultCount, 0)
  assert.notEqual(c.sent[0].sessionId, c.sent[3].sessionId)
  c.resetAnalyticsSession('business', 'site')
  await c.sendKioskAnalyticsEvent({ ...payload, eventType: 'start' })
  assert.equal(c.sent[4].eventType, 'page_view'); assert.equal(c.sent[5].eventType, 'start')
  assert.notEqual(c.sent[3].sessionId, c.sent[5].sessionId)
})
test('attributes QR, paired and explicit devices without guessing that every direct link is a kiosk', async () => {
  for (const [query, paired, source, id] of [['?qr=qr-id', 'tablet', 'qr', 'qr-id'], ['', 'tablet', 'kiosk', 'tablet'], ['?mode=kiosk&device=tablet-id', null, 'kiosk', 'tablet-id'], ['?mode=kiosk&device=tablet-id', 'old-tablet', 'kiosk', 'tablet-id'], ['', null, 'direct', null]]) {
    const c = client(query, paired)
    await c.sendKioskAnalyticsEvent({ slug: 'business', eventType: 'page_view' })
    assert.equal(c.sent[0].source, source); assert.equal(c.sent[0].accessPointId, id)
  }
  const c = client('?qr=qr-id')
  await c.sendKioskAnalyticsEvent({ slug: 'business', eventType: 'qr_scan' })
  await c.sendKioskAnalyticsEvent({ slug: 'business', eventType: 'page_view' })
  assert.equal(c.sent.filter(e => e.eventType === 'page_view').length, 1)
})

test('event API validates business/site ownership and forwards search result metadata', async () => {
  const business = '00000000-0000-4000-8000-000000000001', site = '00000000-0000-4000-8000-000000000002', access = '00000000-0000-4000-8000-000000000003', session = '00000000-0000-4000-8000-000000000004'
  const inserted = []
  const db = { from(table) {
    const filters = []
    const row = table === 'businesses' ? { id: business, slug: 'business' } : { id: table === 'sites' ? site : access, business_id: business, site_id: site }
    const result = () => ({ data: filters.every(([key, value]) => row[key] === value) ? row : null })
    const query = { select: () => query, eq: (key, value) => { filters.push([key, value]); return query }, single: async () => result(), maybeSingle: async () => result(), insert: async data => { inserted.push(data); return {} } }
    return query
  } }
  const api = load('app/api/analytics/kiosk-event/route.ts', { console }, { 'next/server': { NextResponse: { json: (body, opts) => ({ body, status: opts?.status || 200 }) } }, '@/lib/supabase/server': { createServiceClient: () => db } })
  const payload = { slug: 'business', siteId: site, source: 'website', accessPointId: access, sessionId: session, eventType: 'search', searchQuery: 'berry', resultCount: 0, filtersActive: true }
  const send = body => api.POST({ json: async () => body })
  assert.equal((await send(payload)).status, 200)
  assert.equal(inserted[0].access_point_id, access); assert.equal(inserted[0].session_id, session); assert.equal(inserted[0].result_count, 0)
  assert.equal((await send({ ...payload, siteId: access })).status, 404)
  assert.equal(inserted.length, 1)
  await send({ ...payload, accessPointId: session })
  assert.equal(inserted[1].access_point_id, null)
  await send({ slug: 'business', eventType: 'page_view' })
  assert.equal(inserted[2].source, 'unknown'); assert.equal(inserted[2].session_id, null)
  await send({ ...payload, resultCount: 2147483648 })
  assert.equal(inserted[3].result_count, null)
})

test('loads every event page and scopes event and name queries to the business', async () => {
  const queries = []
  const events = Array.from({ length: 1001 }, (_, i) => event('page_view', { id: String(i) }))
  const db = { from(table) {
    const call = { table, filters: [], range: null }
    queries.push(call)
    const query = {
      select: () => query, order: () => query,
      eq: (key, value) => { call.filters.push([key, value]); return query },
      gte: () => query, lt: () => query, in: () => query,
      range: (start, end) => { call.range = [start, end]; return query },
      then(resolve, reject) {
        const data = table === 'kiosk_analytics_events'
          ? events.slice(call.range[0], call.range[1] + 1)
          : table === 'sites' ? [{ id: 'site', name: 'Dublin' }] : [{ id: 'link', name: 'Header' }]
        return Promise.resolve({ data }).then(resolve, reject)
      },
    }
    return query
  } }
  const { loadEngagement } = load('lib/analytics/load-engagement.ts', { console }, {
    './engagement': load('lib/analytics/engagement.ts'),
  })
  const report = await loadEngagement(db, 'business', 'site', new Date('2026-10-01'), new Date('2026-10-09'), 'UTC')
  assert.equal(report.available, true)
  assert.equal(report.totals.views, 1001)
  assert.equal(report.totals.sessions, 1)
  assert.equal(report.accessPoints[0].name, 'Header')
  assert.equal(report.locations[0].name, 'Dublin')
  assert.equal(queries.filter(q => q.table === 'kiosk_analytics_events').length, 2)
  for (const query of queries) {
    assert.ok(query.filters.some(([key, value]) => key === 'business_id' && value === 'business'))
    if (query.table === 'kiosk_analytics_events') assert.ok(query.filters.some(([key, value]) => key === 'site_id' && value === 'site'))
  }
})

test('returns an unavailable report instead of partial totals if an event page fails', async () => {
  const { loadEngagement } = load('lib/analytics/load-engagement.ts', { console: { warn() {} } }, {
    './engagement': load('lib/analytics/engagement.ts'),
  })
  const query = {
    select: () => query, eq: () => query, gte: () => query, lt: () => query, order: () => query,
    range: async offset => offset === 0
      ? { data: Array.from({ length: 1000 }, () => event('page_view')) }
      : { error: new Error('Database unavailable') },
  }
  const report = await loadEngagement({ from: () => query }, 'business', null, new Date('2026-10-01'), new Date('2026-10-09'), 'UTC')
  assert.equal(report.available, false)
  assert.equal(report.totals.views, 0)
})
