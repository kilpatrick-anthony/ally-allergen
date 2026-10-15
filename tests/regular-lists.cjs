const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')

function setup({ role = 'owner', authenticated = true, membership = true, failWrite = false, failRead = false, fetch = global.fetch } = {}) {
  const rows = [{ id: 'own', business_id: 'business', name: 'Milk', status: 'review', allergen_warnings: {}, supplier_profiles: {}, notes: 'Keep evidence' }, { id: 'other', business_id: 'other-business', name: 'Other', status: 'active' }]
  const writes = [], audits = [], cache = new Map()
  const db = { from(table) {
    let mutation, values; const filters = []
    const query = {
      select() { return query }, eq(key, value) { filters.push([key, value]); return query },
      update(value) { mutation = 'update'; values = value; return query },
      delete() { mutation = 'delete'; return query },
      single() { return run(true) }, maybeSingle() { return run(true) },
      then(resolve, reject) { return run(false).then(resolve, reject) },
    }
    async function run(single) {
      if (table === 'user_businesses') return { data: membership ? { business_id: 'business', role } : null }
      assert.equal(table, 'ingredients')
      if (failRead && !mutation) return { error: { message: 'Database unavailable' } }
      const matching = rows.filter(row => filters.every(([key, value]) => row[key] === value))
      if (mutation) {
        if (failWrite) return { error: { message: 'Write rejected' } }
        writes.push({ mutation, values, filters })
        if (mutation === 'update') matching.forEach(row => Object.assign(row, values))
        else matching.forEach(row => rows.splice(rows.indexOf(row), 1))
      }
      return { data: single ? matching[0] || null : matching }
    }
    return query
  } }
  const mocks = {
    '@/lib/auth': { getJwtSecret: () => 'fixture' },
    '@/lib/supabase/server': { createServiceClient: () => db },
    'jose': { jwtVerify: async () => ({ payload: { userId: 'actor' } }) },
    'next/headers': { cookies: async () => ({ get: () => authenticated ? { value: 'fixture' } : undefined }) },
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
    '@/lib/audit': { recordAuditLog: async (_, entry) => audits.push(entry), diffRecordFields: () => [], INGREDIENT_AUDIT_FIELDS: [] },
    '@/lib/server/ingredient-supplier-variants': {},
  }
  function load(name) {
    if (mocks[name]) return mocks[name]
    const file = path.resolve(name.startsWith('@/') ? name.slice(2) + '.ts' : name)
    if (cache.has(file)) return cache.get(file)
    const exports = {}; cache.set(file, exports)
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
    new Function('exports', 'require', 'fetch', source)(exports, load, fetch)
    return exports
  }
  const request = (method, id = 'own', body = { status: 'archived' }) => load('app/api/ingredients/[id]/route.ts')[method]({ json: async () => body }, { params: Promise.resolve({ id }) })
  return { load, request, rows, writes, audits }
}

for (const role of ['owner', 'manager']) {
  test(`${role} archives an incomplete ingredient without replacing assessment or evidence`, async () => {
    const s = setup({ role }), original = structuredClone(s.rows[0])
    assert.equal((await s.request('PATCH')).status, 200)
    assert.equal(s.rows[0].status, 'archived')
    assert.deepEqual(s.rows[0].allergen_warnings, original.allergen_warnings)
    assert.deepEqual(s.rows[0].supplier_profiles, original.supplier_profiles)
    assert.equal(s.rows[0].notes, original.notes)
    assert.deepEqual(Object.keys(s.writes[0].values).sort(), ['status', 'updated_at'])
    assert.equal(s.audits.length, 1)
    assert.equal((await s.request('PATCH')).status, 200)
    assert.equal(s.writes.length, 1, 'archive retry is idempotent')
    assert.equal(s.audits.length, 1)
  })
}
for (const method of ['PATCH', 'DELETE']) {
  test(`${method} enforces authentication and live owner/manager membership`, async () => {
    for (const [options, expected] of [[{ authenticated: false }, 401], [{ membership: false }, method === 'PATCH' ? 403 : 404], [{ role: 'staff' }, 403], [{ role: null }, 403], [{ role: 'disabled' }, 403]]) {
      const s = setup(options)
      assert.equal((await s.request(method)).status, expected)
      assert.equal(s.writes.length, 0)
    }
  })
  test(`${method} refuses missing and cross-business records without writes`, async () => {
    for (const id of ['missing', 'other']) {
      const s = setup()
      assert.equal((await s.request(method, id)).status, 404)
      assert.equal(s.writes.length, 0)
      assert.equal(s.rows.length, 2)
    }
  })
  test(`${method} does not claim success on database failures`, async () => {
    for (const options of [{ failWrite: true }, { failRead: true }]) {
      const s = setup(options)
      assert.equal((await s.request(method)).status, 500)
      assert.equal(s.writes.length, 0)
      assert.equal(s.audits.length, 0)
    }
  })
}
test('archive endpoint cannot activate an item or smuggle safety edits', async () => {
  for (const body of [null, {}, { status: 'active' }, { status: 'archived', allergen_warnings: {} }]) {
    const s = setup()
    assert.equal((await s.request('PATCH', 'own', body)).status, 400)
    assert.equal(s.writes.length, 0)
  }
})
test('delete removes only the requested business record and records the action', async () => {
  const s = setup()
  assert.equal((await s.request('DELETE')).status, 200)
  assert.deepEqual(s.rows.map(row => row.id), ['other'])
  assert.equal(s.audits[0].action, 'deleted')
})
test('allergen filters use stable IDs and preserve old numbered links', () => {
  const { normalizeAllergenFilter } = setup().load('@/lib/regular-list-actions')
  for (const [input, expected] of [['milk', 'milk'], ['7. Milk', 'milk'], ['8. Nuts', 'nuts'], ['1. Cereals containing gluten', 'cereals_gluten'], [null, 'all'], ['invalid', 'all']]) assert.equal(normalizeAllergenFilter(input), expected)
})
test('date ordering uses full timestamps and keeps missing/invalid dates last in both directions', () => {
  const { compareDateAdded } = setup().load('@/lib/regular-list-actions')
  const dates = [null, '2026-10-15T18:00:00Z', 'bad date', '2026-02-03T12:00:00Z', '2026-10-15T08:00:00Z']
  assert.deepEqual([...dates].sort((a, b) => compareDateAdded(a, b, 'asc')).slice(0, 3), ['2026-02-03T12:00:00Z', '2026-10-15T08:00:00Z', '2026-10-15T18:00:00Z'])
  assert.deepEqual([...dates].sort((a, b) => compareDateAdded(a, b, 'desc')).slice(0, 3), ['2026-10-15T18:00:00Z', '2026-10-15T08:00:00Z', '2026-02-03T12:00:00Z'])
})
for (const action of ['archive', 'delete']) {
  test(`bulk ${action} preserves successful results and isolates denied/network failures`, async () => {
    const calls = [], api = setup({ fetch: async (url, options) => {
      calls.push([url, options])
      if (url.endsWith('network')) throw new Error('Offline')
      if (url.endsWith('denied')) return new Response('', { status: 403 })
      return new Response('', { status: 200 })
    } }).load('@/lib/regular-list-actions')
    assert.deepEqual(await api.runIngredientBulkAction(['good', 'denied', 'network', 'good'], action), { succeeded: ['good'], failed: ['denied', 'network'] })
    assert.equal(calls.length, 3)
    assert.ok(calls.every(([, options]) => options.method === (action === 'archive' ? 'PATCH' : 'DELETE')))
    if (action === 'archive') assert.deepEqual(JSON.parse(calls[0][1].body), { status: 'archived' })
  })
}
test('bulk requests have bounded concurrency', async () => {
  let active = 0, maximum = 0
  const api = setup({ fetch: async () => { active++; maximum = Math.max(maximum, active); await new Promise(resolve => setImmediate(resolve)); active--; return new Response('', { status: 200 }) } }).load('@/lib/regular-list-actions')
  const result = await api.runIngredientBulkAction(Array.from({ length: 13 }, (_, index) => String(index)), 'archive')
  assert.equal(maximum, 4); assert.equal(result.succeeded.length, 13)
})
test('list messages are present in all six languages', () => {
  const catalog = require('./helpers/translation-catalog.cjs')
  for (const language of ['ga', 'pt', 'fr', 'es', 'de']) assert.deepEqual(Object.keys(catalog[language].regularLists), Object.keys(catalog.en.regularLists))
})
