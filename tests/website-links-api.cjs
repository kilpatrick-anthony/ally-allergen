// Run with: node --test tests/website-links-api.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const { z } = require('zod')

const siteId = '00000000-0000-4000-8000-000000000001'
const otherSite = '00000000-0000-4000-8000-000000000002'
const businessId = 'business-a'
function setup({ token = 'valid', membership = true, role = 'admin', deleteFails = false } = {}) {
  const rows = [{ id: '00000000-0000-4000-8000-000000000099', business_id: 'business-b', site_id: otherSite, name: 'Other business' }]
  const db = {
    from(table) {
      const filters = []
      let inserted
      let deleting = false
      const query = {
        select() { return query },
        delete() { deleting = true; return query },
        eq(key, value) { filters.push([key, value]); return query },
        insert(value) { inserted = value; return query },
        order() { return Promise.resolve({ data: rows.filter(row => filters.every(([key, value]) => row[key] === value)) }) },
        async single() {
          if (table === 'user_businesses') return { data: membership ? { business_id: businessId, role } : null }
          if (table === 'website_links' && inserted) {
            const row = { ...inserted, id: `00000000-0000-4000-8000-${String(rows.length).padStart(12, '0')}`, site: { id: siteId, name: 'Maynooth' } }
            rows.push(row)
            return { data: row }
          }
          throw new Error('Unexpected query')
        },
        async maybeSingle() {
          if (table === 'website_links' && deleting) {
            if (deleteFails) return { error: new Error('Database unavailable') }
            const index = rows.findIndex(row => filters.every(([key, value]) => row[key] === value))
            return { data: index < 0 ? null : rows.splice(index, 1)[0] }
          }
          assert.equal(table, 'sites')
          const site = { id: siteId, business_id: businessId }
          return { data: filters.every(([key, value]) => site[key] === value) ? site : null }
        },
      }
      return query
    },
  }
  const mocks = {
    'next/headers': { cookies: async () => ({ get: () => token ? { value: token } : undefined }) },
    jose: { jwtVerify: async () => { if (token === 'invalid') throw new Error('Invalid JWT'); return { payload: { userId: 'user-a' } } } },
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    zod: { z },
    '@/lib/auth': { getJwtSecret: () => 'test' },
    '@/lib/supabase/server': { createServiceClient: () => db },
  }
  const api = {}
  for (const path of ['app/api/website-links/route.ts', 'app/api/website-links/[id]/route.ts']) {
    const context = { exports: {}, require: name => { assert.ok(mocks[name], name); return mocks[name] }, console: { error() {} } }
    vm.createContext(context)
    vm.runInContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText, context)
    Object.assign(api, context.exports)
  }
  return api
}
const request = body => ({ json: async () => body })

test('creates multiple durable links for one site and lists only the signed-in business', async () => {
  const api = setup()
  const first = await api.POST(request({ name: ' Main website ', site_id: siteId, business_id: 'business-b' }))
  const second = await api.POST(request({ name: 'Footer', site_id: siteId, placement: ' Bottom navigation ' }))
  assert.equal(first.status, 201)
  assert.equal(second.status, 201)
  assert.equal(first.body.link.name, 'Main website')
  assert.equal(first.body.link.business_id, businessId)
  assert.equal(second.body.link.placement, 'Bottom navigation')
  assert.notEqual(first.body.link.id, second.body.link.id)
  const loaded = await api.GET()
  assert.equal(loaded.body.links.length, 2)
  assert.ok(loaded.body.links.every(link => link.business_id === businessId))
})

test('rejects missing/invalid authentication and missing membership', async () => {
  for (const options of [{ token: null }, { token: 'invalid' }, { membership: false }]) {
    const api = setup(options)
    assert.equal((await api.GET()).status, 401)
    assert.equal((await api.POST(request({ name: 'Test', site_id: siteId }))).status, 401)
  }
})

test('rejects another business location and invalid form input', async () => {
  const api = setup()
  assert.equal((await api.POST(request({ name: 'Test', site_id: otherSite }))).status, 404)
  for (const body of [null, {}, { name: ' ', site_id: siteId }, { name: 'x'.repeat(101), site_id: siteId },
    { name: 'Test', site_id: 'bad' }, { name: 'Test', site_id: siteId, placement: 'x'.repeat(201) }]) {
    assert.equal((await api.POST(request(body))).status, 400)
  }
  assert.equal((await api.POST({ json: async () => { throw new Error('Malformed JSON') } })).status, 400)
})

const deleteParams = id => ({ params: Promise.resolve({ id }) })

test('deletes a saved link without removing other links at the same site', async () => {
  const api = setup()
  const first = await api.POST(request({ name: 'Main website', site_id: siteId }))
  const second = await api.POST(request({ name: 'Footer', site_id: siteId }))
  assert.equal((await api.DELETE({}, deleteParams(first.body.link.id))).status, 200)
  const loaded = await api.GET()
  assert.equal(loaded.body.links.length, 1)
  assert.equal(loaded.body.links[0].id, second.body.link.id)
  assert.equal((await api.DELETE({}, deleteParams(first.body.link.id))).status, 404)
})

test('delete rejects unauthenticated requests, staff, invalid IDs and other businesses', async () => {
  for (const options of [{ token: null }, { token: 'invalid' }, { membership: false }]) {
    assert.equal((await setup(options).DELETE({}, deleteParams(siteId))).status, 401)
  }
  assert.equal((await setup({ role: 'staff' }).DELETE({}, deleteParams(siteId))).status, 403)
  const api = setup()
  assert.equal((await api.DELETE({}, deleteParams('invalid'))).status, 400)
  assert.equal((await api.DELETE({}, deleteParams('00000000-0000-4000-8000-000000000099'))).status, 404)
})

test('delete reports database failures and retains the saved link', async () => {
  const api = setup({ deleteFails: true })
  const created = await api.POST(request({ name: 'Main website', site_id: siteId }))
  assert.equal((await api.DELETE({}, deleteParams(created.body.link.id))).status, 500)
  assert.equal((await api.GET()).body.links.length, 1)
})
