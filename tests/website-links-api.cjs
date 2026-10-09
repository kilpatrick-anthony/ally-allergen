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
function setup({ token = 'valid', membership = true } = {}) {
  const rows = [{ id: 'other-link', business_id: 'business-b', site_id: otherSite, name: 'Other business' }]
  const db = {
    from(table) {
      const filters = []
      let inserted
      const query = {
        select() { return query },
        eq(key, value) { filters.push([key, value]); return query },
        insert(value) { inserted = value; return query },
        order() { return Promise.resolve({ data: rows.filter(row => filters.every(([key, value]) => row[key] === value)) }) },
        async single() {
          if (table === 'user_businesses') return { data: membership ? { business_id: businessId } : null }
          if (table === 'website_links' && inserted) {
            const row = { ...inserted, id: String(rows.length), site: { id: siteId, name: 'Maynooth' } }
            rows.push(row)
            return { data: row }
          }
          throw new Error('Unexpected query')
        },
        async maybeSingle() {
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
  const context = { exports: {}, require: name => { assert.ok(mocks[name], name); return mocks[name] }, console }
  vm.createContext(context)
  vm.runInContext(ts.transpileModule(fs.readFileSync('app/api/website-links/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context)
  return context.exports
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
