const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')

function setup({ source = {}, authenticated = true, existingMenuActive = false } = {}) {
  const writes = [], cache = new Map()
  const complete = Object.fromEntries(['cereals_gluten','crustaceans','eggs','fish','peanuts','soybeans','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs'].map(key => [key, 'none']))
  const ingredient = { id: 'ingredient', name: 'Ingredient', business_id: 'business', status: 'active', allergen_warnings: complete, supplier_profiles: {}, certifications: [], ...source }
  const db = { from(table) {
    let payload, mutation
    const query = {
      select() { return query }, eq() { return query }, in() { return query }, order() { return query },
      insert(value) { mutation = 'insert'; payload = value; return query },
      update(value) { mutation = 'update'; payload = value; return query },
      delete() { mutation = 'delete'; return query },
      single() { return run(true) }, maybeSingle() { return run(true) },
      then(resolve, reject) { return run(false).then(resolve, reject) },
    }
    async function run(single) {
      if (mutation) {
        writes.push({ table, mutation, payload })
        return { data: single ? { id: 'saved', ...payload } : [] }
      }
      const rows = table === 'user_businesses' ? [{ business_id: 'business' }]
        : table === 'ingredients' ? [ingredient]
        : table === 'suppliers' ? [{ id: 'supplier' }]
        : table === 'menu_items' ? [{ id: 'item', name: 'Menu', is_active: existingMenuActive }]
        : []
      return { data: single ? rows[0] || null : rows }
    }
    return query
  } }
  const mocks = {
    '@/lib/auth': { getJwtSecret: () => 'fixture' },
    '@/lib/supabase/server': { createServiceClient: () => db },
    'jose': { jwtVerify: async () => ({ payload: { userId: 'actor' } }) },
    'next/headers': { cookies: async () => ({ get: () => authenticated ? { value: 'fixture' } : undefined }) },
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
    '@/lib/audit': { recordAuditLog: async () => {}, diffRecordFields: () => [], INGREDIENT_AUDIT_FIELDS: [], MENU_ITEM_AUDIT_FIELDS: [] },
    '@/lib/server/ingredient-supplier-variants': { ensureSupplierRecords: async () => { writes.push({ table: 'suppliers', mutation: 'ensure' }); return new Map() }, syncIngredientSupplierVariants: async () => {} },
  }
  function load(name) {
    if (mocks[name]) return mocks[name]
    const file = path.resolve(name.startsWith('@/') ? name.slice(2) + '.ts' : name)
    if (cache.has(file)) return cache.get(file)
    const exports = {}; cache.set(file, exports)
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
    new Function('exports', 'require', source)(exports, load)
    return exports
  }
  async function save(entity, method, body) {
    const collection = entity === 'ingredient' ? 'ingredients' : 'menu-items'
    const route = load(`app/api/${collection}/${method === 'PUT' ? '[id]/' : ''}route.ts`)
    return route[method]({ json: async () => body }, { params: Promise.resolve({ id: 'item' }) })
  }
  return { load, save, writes, complete }
}

for (const method of ['POST', 'PUT']) {
  test(`${method}: ingredients reject incomplete, invalid and contradictory assessments before writing`, async () => {
    for (const warnings of [{}, { milk: 'contains' }, { ...setup().complete, milk: 'invented' }, { ...setup().complete, cereals_gluten_levels: { wheat: 'contains' } }]) {
      const s = setup()
      const response = await s.save('ingredient', method, { name: 'Milk', allergen_warnings: warnings })
      assert.equal(response.status, 400); assert.equal(response.body.errorCode, 'completeIngredient'); assert.equal(s.writes.length, 0)
    }
  })
  test(`${method}: ingredients require explicit supplier review even with fourteen answers`, async () => {
    const s = setup()
    const response = await s.save('ingredient', method, { name: 'Milk', allergen_warnings: s.complete, suppliers: ['Supplier'], supplier_profiles: { supplier: { supplier_name: 'Supplier', allergen_warnings: s.complete, certifications: [], assessment_status: 'needs_review' } } })
    assert.equal(response.status, 400); assert.equal(s.writes.length, 0)
  })
  test(`${method}: complete ingredient assessment saves`, async () => {
    const s = setup()
    const response = await s.save('ingredient', method, { name: 'Milk', allergen_warnings: s.complete })
    assert.equal(response.status, 200); assert.ok(s.writes.some(write => write.table === 'ingredients'))
  })
  test(`${method}: incomplete menu draft stays inactive, including omitted status`, async () => {
    for (const status of [undefined, 'draft']) {
      const s = setup()
      const response = await s.save('menu', method, { name: 'Work in progress', status, allergen_warnings: {} })
      assert.equal(response.status, 200)
      assert.equal(s.writes.find(write => write.table === 'menu_items').payload.is_active, false)
    }
  })
  test(`${method}: direct activation rejects missing recipe, unassessed or inactive ingredients`, async () => {
    for (const source of [{ allergen_warnings: {} }, { status: 'review' }, { supplier_profiles: [] }, { supplier_profiles: { supplier: { assessment_status: 'needs_review' } } }]) {
      const s = setup({ source })
      const response = await s.save('menu', method, { name: 'Recipe', description: 'Recipe', ingredients: ['ingredient'], status: 'active', allergen_warnings: s.complete })
      assert.equal(response.status, 400); assert.equal(response.body.errorCode, 'completeMenu'); assert.equal(s.writes.length, 0)
    }
    const s = setup()
    const response = await s.save('menu', method, { name: 'No recipe', description: 'Empty', is_active: true, allergen_warnings: s.complete })
    assert.equal(response.status, 400); assert.equal(s.writes.length, 0)
  })
  test(`${method}: active recipe derives its assessment from ingredients`, async () => {
    const s = setup()
    const response = await s.save('menu', method, { name: 'Recipe', description: 'Recipe', ingredients: ['ingredient'], status: 'active', allergen_warnings: {} })
    assert.equal(response.status, 200)
    assert.equal(s.writes.find(write => write.table === 'menu_items').payload.is_active, true)
  })
  test(`${method}: bought-in activation needs supplier, declaration and checked label`, async () => {
    const s = setup()
    const fields = { name: 'Product', description: 'Product', item_type: 'packaged_product', status: 'active', allergen_warnings: s.complete, supplier_id: 'supplier', ingredient_declaration: 'Water', label_verified_at: '2026-10-15T12:00:00Z' }
    for (const missing of ['supplier_id', 'ingredient_declaration', 'label_verified_at']) {
      const response = await s.save('menu', method, { ...fields, [missing]: null })
      assert.equal(response.status, 400); assert.equal(s.writes.length, 0)
    }
    assert.equal((await s.save('menu', method, fields)).status, 200)
  })
  test(`${method}: unauthenticated writes remain rejected`, async () => {
    const s = setup({ authenticated: false })
    for (const entity of ['ingredient', 'menu']) assert.equal((await s.save(entity, method, { name: 'Entry' })).status, 401)
    assert.equal(s.writes.length, 0)
  })
}

test('derived previews keep known warnings and signal missing source assessments', () => {
  const s = setup(), api = s.load('@/lib/allergen-assessment')
  const result = api.mergeAllergenAssessments([{ milk: 'contains' }, s.complete])
  assert.equal(result.milk, 'contains'); assert.equal(result.assessment_incomplete, true)
  assert.equal(api.isAllergenAssessmentComplete(result), false)
  assert.equal(api.unansweredAllergenCount({}), 14)
  assert.equal(api.isAllergenAssessmentComplete(api.mergeAllergenAssessments([s.complete])), true)
})

test('assessment messages exist in all six languages', () => {
  const catalog = require('./helpers/translation-catalog.cjs')
  const keys = Object.keys(catalog.en.regularAssessment)
  for (const language of ['en', 'ga', 'pt', 'fr', 'es', 'de']) assert.deepEqual(Object.keys(catalog[language].regularAssessment), keys)
})


test('menu edits preserve an omitted active status and still enforce activation checks', async () => {
  const valid = setup({ existingMenuActive: true })
  assert.equal((await valid.save('menu', 'PUT', { name: 'Recipe', description: 'Recipe', ingredients: ['ingredient'] })).status, 200)
  assert.equal(valid.writes.find(write => write.table === 'menu_items').payload.is_active, true)
  const incomplete = setup({ existingMenuActive: true })
  assert.equal((await incomplete.save('menu', 'PUT', { name: 'Recipe', allergen_warnings: {} })).status, 400)
  assert.equal(incomplete.writes.length, 0)
})

test('ingredient edits persist an explicit valid status and retain status when omitted', async () => {
  for (const status of [undefined, 'active']) {
    const s = setup({ source: { status: 'review' } })
    assert.equal((await s.save('ingredient', 'PUT', { name: 'Ingredient', allergen_warnings: s.complete, status })).status, 200)
    assert.equal(s.writes.find(write => write.table === 'ingredients').payload.status, status || 'review')
  }
})
