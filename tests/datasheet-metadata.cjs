const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), ts = require('typescript')
function setup({ role = 'staff', auth = true, invalidToken = false, fail = false, membershipError = false } = {}) {
  const rows = [{ id: 'own', business_id: 'business', ingredient_id: 'ingredient', file_path: 'keep.pdf', notes: 'Before' }, { id: 'other', business_id: 'other-business' }], writes = []
  const db = { from(table) {
    const filters = []; let values
    const query = { select() { return query }, eq(key, value) { filters.push([key, value]); return query }, update(next) { values = next; return query },
      single: async () => ({ data: { business_id: 'business', role }, error: membershipError ? {} : null }),
      maybeSingle: async () => {
        assert.equal(table, 'datasheets')
        if (fail) return { error: {} }
        const row = rows.find(row => filters.every(([key, value]) => row[key] === value))
        if (row) { writes.push({ values, filters }); Object.assign(row, values) }
        return { data: row || null }
      } }
    return query
  } }
  const mocks = {
    '@/lib/auth': { getJwtSecret: () => 'fixture' }, '@/lib/supabase/server': { createServiceClient: () => db },
    'jose': { jwtVerify: async () => { if (invalidToken) throw Error('Invalid token'); return { payload: { userId: 'actor' } } } },
    'next/headers': { cookies: async () => ({ get: () => auth ? { value: 'fixture' } : undefined }) },
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
  }
  const exports = {}
  const source = ts.transpileModule(fs.readFileSync('app/api/datasheets/[id]/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  new Function('exports', 'require', source)(exports, name => { if (!mocks[name]) throw Error(name); return mocks[name] })
  return { rows, writes, patch: (body, id = 'own') => exports.PATCH({ json: async () => body }, { params: Promise.resolve({ id }) }) }
}
test('metadata updates are business scoped and preserve file, owner and association fields', async () => {
  for (const role of ['owner', 'manager', 'staff']) {
    const s = setup({ role })
    assert.equal((await s.patch({ notes: 'After', next_review_date: '2027-02-28', supplier_name: '', version: null })).status, 200)
    assert.equal(s.rows[0].notes, 'After'); assert.equal(s.rows[0].supplier_name, null)
    assert.equal(s.rows[0].ingredient_id, 'ingredient'); assert.equal(s.rows[0].file_path, 'keep.pdf')
    assert.deepEqual(s.writes[0].filters, [['id', 'own'], ['business_id', 'business']])
    assert.equal((await s.patch({ notes: 'No access' }, 'other')).status, 404)
    assert.equal((await s.patch({ notes: 'Missing' }, 'missing')).status, 404)
    assert.equal(s.writes.length, 1)
  }
})
test('authentication, current membership role and database failures fail closed', async () => {
  for (const [options, status] of [[{ auth: false }, 401], [{ invalidToken: true }, 401], [{ role: 'disabled' }, 403], [{ role: null }, 403], [{ role: 'unknown' }, 403], [{ membershipError: true }, 403], [{ fail: true }, 500]]) {
    const s = setup(options); assert.equal((await s.patch({ notes: 'No' })).status, status); assert.equal(s.writes.length, 0)
  }
})
test('metadata validation rejects ownership/file mutations, malformed fields and invalid dates', async () => {
  for (const body of [{}, null, [], { business_id: 'other' }, { file_path: 'replace' }, { ingredient_id: 'replace' }, { constructor: 'invalid' }, { notes: {} }, { notes: 'x'.repeat(10001) }, { version: 'x'.repeat(101) }, { next_review_date: '2026-02-30' }, { next_review_date: 'invalid' }]) {
    const s = setup(); assert.equal((await s.patch(body)).status, 400, JSON.stringify(body)); assert.equal(s.writes.length, 0)
  }
})
