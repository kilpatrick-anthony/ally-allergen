const assert = require('node:assert/strict')
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript')
const { z } = require('zod')
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const business = uuid(1), otherBusiness = uuid(2), actor = uuid(3), colleague = uuid(4), site = uuid(5), supplier = uuid(6)
const fields = { kind: 'ingredient', name: 'Bread', category: 'Bakery', ingredient_ids: [], site_id: site, supplier_id: null, supplier_name: 'New supplier', notes: 'Delivery' }
const request = body => ({ json: async () => body })
const params = id => ({ params: Promise.resolve({ id }) })

function setup({ role = 'staff', token = 'valid', membership = true, dbFailure = false } = {}) {
  const rows = [], photos = [], history = [], writes = [], objects = new Map()
  const failures = { upload: false, remove: false, finalize: false, extraction: false }
  const gatewayRequests = []
  const hooks = { beforeUpload: null }
  let concurrentEdit = false
  const db = { from(table) {
    const filters = [], excludes = [], includes = [], orders = []
    let mutation, values, range, countOnly
    const query = {
      select: (_, options) => { countOnly = options?.head; return query },
      eq(key, value) { filters.push([key, value]); return query },
      neq(key, value) { excludes.push([key, value]); return query },
      in(key, value) { includes.push([key, value]); return query },
      order(key, options = { ascending: true }) { orders.push([key, options]); return query },
      range(start, end) { range = [start, end]; return query },
      insert(value) { mutation = 'insert'; values = value; return query },
      update(value) { mutation = 'update'; values = value; return query },
      maybeSingle: () => run(true), single: () => run(true),
      then(resolve, reject) { return run(false).then(resolve, reject) },
    }
    async function run(single) {
      if (dbFailure) return { error: { message: 'Database down' } }
      let candidates
      if (table === 'user_businesses') candidates = membership ? [{ user_id: actor, business_id: business, role }] : []
      else if (table === 'sites') candidates = [{ id: site, business_id: business }]
      else if (table === 'suppliers') candidates = [{ id: supplier, business_id: business, name: 'Existing supplier' }]
      else if (table === 'ingredients') candidates = [{ id: uuid(20), business_id: business, name: 'Bread' }, { id: uuid(21), business_id: business, name: 'Butter' }]
      else if (table === 'quick_add_history') candidates = history
      else if (table === 'quick_add_photos') candidates = photos
      else { assert.equal(table, 'quick_add_drafts'); candidates = rows }
      if (mutation === 'insert') {
        writes.push(table)
        if (candidates.some(row => row.id === values.id)) return { error: { code: '23505' } }
        const row = { state: 'pending', ...values, status: 'draft', version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        candidates.push(row)
        return { data: { ...row } }
      }
      if (mutation === 'update' && concurrentEdit) {
        const id = filters.find(([key]) => key === 'id')[1]
        rows.find(row => row.id === id).version++
        concurrentEdit = false
      }
      let matches = candidates.filter(row => filters.every(([key, value]) => row[key] === value) && excludes.every(([key, value]) => row[key] !== value) && includes.every(([key, values]) => values.includes(row[key])))
      if (table === 'quick_add_photos' && mutation === 'update' && values.state === 'ready' && failures.finalize) return { error: { message: 'Finalize failed' } }
      if (mutation === 'update') { writes.push(table); matches.forEach(row => Object.assign(row, values)) }
      for (const [key, options] of [...orders].reverse()) matches.sort((a, b) => String(a[key]).localeCompare(String(b[key])) * (options.ascending ? 1 : -1))
      if (countOnly) return { data: null, count: matches.length }
      if (range) matches = matches.slice(range[0], range[1] + 1)
      return { data: single ? matches[0] ? { ...matches[0] } : null : matches.map(row => ({ ...row })) }
    }
    return query
  } }
  db.storage = { from(bucket) {
    assert.equal(bucket, 'quick-add-photos')
    return {
      async upload(path, bytes) {
        if (hooks.beforeUpload) await hooks.beforeUpload()
        if (failures.upload) return { error: { message: 'Upload failed' } }
        if (objects.has(path)) return { error: { statusCode: '409' } }
        objects.set(path, bytes); return { data: { path } }
      },
      async download(path) { return objects.has(path) ? { data: new Blob([objects.get(path)]) } : { error: { message: 'Missing' } } },
      async remove(paths) {
        if (failures.remove) return { error: { message: 'Remove failed' } }
        paths.forEach(path => objects.delete(path)); return { data: [] }
      },
    }
  } }
  class TestResponse extends Response {
    static json(body, options) { return { body, status: options?.status || 200, headers: options?.headers } }
  }
  const mocks = {
    'next/headers': { cookies: async () => ({ get: () => token ? { value: token } : undefined }) },
    'next/server': { NextResponse: TestResponse },
    sharp: { default: require('sharp') }, 'node:crypto': require('node:crypto'), 'node:util': require('node:util'),
    '@/lib/auth': { verifySessionToken: async () => { if (token !== 'valid') throw new Error('Invalid token'); return { userId: actor, role: 'owner' } } },
    '@/lib/supabase/server': { createServiceClient: () => db }, zod: { z },
  }
  function load(path) {
    const context = { exports: {}, Buffer, Request, Response, Blob, AbortSignal, process: { env: {} },
      fetch: async (url, options) => {
        gatewayRequests.push({ url, options })
        return failures.extraction ? { ok: false, status: 502 } : { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ name: 'AI Bread', supplier_name: 'AI Bakery', description: 'Sliced bread', allergen_warnings: { cereals_gluten: 'contains', milk: 'none', fish: 'invented' }, dietary_tags: ['Vegan', 'Invented'], notes: ['Check the small print'] }) } }] }) }
      },
      require: name => { assert.ok(mocks[name], name); return mocks[name] }, console: { error() {} } }
    vm.createContext(context)
    vm.runInContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context)
    return context.exports
  }
  mocks['@/types/allergen'] = load('types/allergen.ts')
  mocks['@/lib/allergen-ai'] = load('lib/allergen-ai.ts')
  mocks['@/lib/quick-add-review'] = load('lib/quick-add-review.ts')
  mocks['@/lib/server/quick-add'] = load('lib/server/quick-add.ts')
  mocks['@/lib/server/quick-add-photos'] = load('lib/server/quick-add-photos.ts')
  mocks['@/lib/server/ai-gateway'] = load('lib/server/ai-gateway.ts')
  return {
    db, history, setRole: value => { role = value }, transition: load('app/api/quick-add-drafts/[id]/transition/route.ts'), evidence: load('app/api/quick-add-evidence/[photoId]/route.ts'),
    photoCollection: load('app/api/quick-add-drafts/[id]/photos/route.ts'),
    photoItem: load('app/api/quick-add-drafts/[id]/photos/[photoId]/route.ts'),
    photoExtract: load('app/api/quick-add-drafts/[id]/photos/[photoId]/extract/route.ts'),
    photoHelpers: mocks['@/lib/server/quick-add-photos'], photos, objects, failures, hooks, gatewayRequests,
    collection: load('app/api/quick-add-drafts/route.ts'), item: load('app/api/quick-add-drafts/[id]/route.ts'), rows, writes,
    race: () => { concurrentEdit = true },
    seed(id, overrides = {}) { rows.push({ ...fields, allergen_warnings: {}, dietary_tags: [], id, business_id: business, created_by: actor, status: 'draft', version: 1, created_at: '2026-10-09T10:00:00Z', updated_at: '2026-10-09T10:00:00Z', ...overrides }) },
  }
}
const listRequest = offset => ({ nextUrl: new URL(`https://test/api/quick-add-drafts?offset=${offset || 0}`) })


module.exports = { setup, uuid, business, otherBusiness, actor, colleague, site, supplier, fields, request, params, listRequest }
