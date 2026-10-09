const assert = require('node:assert/strict')
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript')
const { z } = require('zod')
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const business = uuid(1), otherBusiness = uuid(2), actor = uuid(3), colleague = uuid(4), site = uuid(5), supplier = uuid(6)
const fields = { kind: 'ingredient', name: 'Bread', site_id: site, supplier_id: null, supplier_name: 'New supplier', notes: 'Delivery' }
const request = body => ({ json: async () => body })
const params = id => ({ params: Promise.resolve({ id }) })

function setup({ role = 'staff', token = 'valid', membership = true, dbFailure = false } = {}) {
  const rows = [], writes = []
  let concurrentEdit = false
  const db = { from(table) {
    const filters = [], orders = []
    let mutation, values, range
    const query = {
      select: () => query,
      eq(key, value) { filters.push([key, value]); return query },
      order(key, options) { orders.push([key, options]); return query },
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
      else { assert.equal(table, 'quick_add_drafts'); candidates = rows }
      if (mutation === 'insert') {
        writes.push(table)
        if (rows.some(row => row.id === values.id)) return { error: { code: '23505' } }
        const row = { ...values, status: 'draft', version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        rows.push(row)
        return { data: { ...row } }
      }
      if (mutation === 'update' && concurrentEdit) {
        const id = filters.find(([key]) => key === 'id')[1]
        rows.find(row => row.id === id).version++
        concurrentEdit = false
      }
      let matches = candidates.filter(row => filters.every(([key, value]) => row[key] === value))
      if (mutation === 'update') { writes.push(table); matches.forEach(row => Object.assign(row, values)) }
      for (const [key, options] of [...orders].reverse()) matches.sort((a, b) => String(a[key]).localeCompare(String(b[key])) * (options.ascending ? 1 : -1))
      if (range) matches = matches.slice(range[0], range[1] + 1)
      return { data: single ? matches[0] ? { ...matches[0] } : null : matches.map(row => ({ ...row })) }
    }
    return query
  } }
  const mocks = {
    'next/headers': { cookies: async () => ({ get: () => token ? { value: token } : undefined }) },
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    '@/lib/auth': { verifySessionToken: async () => { if (token !== 'valid') throw new Error('Invalid token'); return { userId: actor, role: 'owner' } } },
    '@/lib/supabase/server': { createServiceClient: () => db }, zod: { z },
  }
  function load(path) {
    const context = { exports: {}, require: name => { assert.ok(mocks[name], name); return mocks[name] }, console: { error() {} } }
    vm.createContext(context)
    vm.runInContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context)
    return context.exports
  }
  mocks['@/lib/server/quick-add'] = load('lib/server/quick-add.ts')
  return {
    collection: load('app/api/quick-add-drafts/route.ts'), item: load('app/api/quick-add-drafts/[id]/route.ts'), rows, writes,
    race: () => { concurrentEdit = true },
    seed(id, overrides = {}) { rows.push({ ...fields, id, business_id: business, created_by: actor, status: 'draft', version: 1, created_at: '2026-10-09T10:00:00Z', updated_at: '2026-10-09T10:00:00Z', ...overrides }) },
  }
}
const listRequest = offset => ({ nextUrl: new URL(`https://test/api/quick-add-drafts?offset=${offset || 0}`) })


module.exports = { setup, uuid, business, otherBusiness, actor, colleague, site, supplier, fields, request, params, listRequest }
