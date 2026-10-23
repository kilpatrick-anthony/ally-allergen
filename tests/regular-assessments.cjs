const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')

function setup({ source = {}, authenticated = true, existingMenuActive = false, role = 'staff', duplicateSheets = [], copyError = null } = {}) {
  const writes = [], audit = [], cache = new Map()
  const complete = Object.fromEntries(['cereals_gluten','crustaceans','eggs','fish','peanuts','soybeans','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs'].map(key => [key, 'none']))
  const ingredient = { id: 'ingredient', name: 'Ingredient', business_id: 'business', status: 'active', allergen_warnings: complete, supplier_profiles: {}, certifications: [], ...source }
  const db = { from(table) {
    let payload, mutation
    const query = {
      or() { return query }, select() { return query }, eq() { return query }, in() { return query }, order() { return query },
      insert(value) { mutation = 'insert'; payload = value; return query },
      update(value) { mutation = 'update'; payload = value; return query },
      delete() { mutation = 'delete'; return query },
      single() { return run(true) }, maybeSingle() { return run(true) },
      then(resolve, reject) { return run(false).then(resolve, reject) },
    }
    async function run(single) {
      if (mutation) {
        writes.push({ table, mutation, payload })
        return { data: single ? { id: 'saved', ...payload } : [], error: table === 'datasheets' && mutation === 'insert' ? copyError : null }
      }
      const rows = table === 'user_businesses' ? [{ business_id: 'business', role }]
        : table === 'ingredients' ? [ingredient]
        : table === 'datasheets' ? duplicateSheets
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
    'jose': { jwtVerify: async () => ({ payload: { userId: 'actor', role, email: 'actor@example.invalid' } }) },
    'next/headers': { cookies: async () => ({ get: () => authenticated ? { value: 'fixture' } : undefined }) },
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
    '@/lib/audit': { recordAuditLog: async (_db, event) => { audit.push(event) }, diffRecordFields: () => [], INGREDIENT_AUDIT_FIELDS: [], MENU_ITEM_AUDIT_FIELDS: [] },
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
  return { load, save, writes, complete, audit }
}

for (const method of ['POST', 'PUT']) {
  test(`${method}: ingredients reject incomplete, invalid and contradictory assessments before writing`, async () => {
    for (const warnings of [{}, { milk: 'contains' }, { ...setup().complete, milk: 'invented' }, { ...setup().complete, cereals_gluten_levels: { wheat: 'contains' } }]) {
      const s = setup()
      const response = await s.save('ingredient', method, { name: 'Milk', allergen_warnings: warnings })
      assert.equal(response.status, 400); assert.equal(response.body.errorCode, 'completeIngredient'); assert.equal(s.writes.length, 0)
    }
  })
  test(`${method}: ingredients save without supplier review when all allergen fields are complete`, async () => {
    const s = setup()
    const response = await s.save('ingredient', method, { name: 'Milk', allergen_warnings: s.complete, suppliers: ['Supplier'], supplier_profiles: { supplier: { supplier_name: 'Supplier', allergen_warnings: s.complete, certifications: [], assessment_status: 'needs_review' } } })
    assert.equal(response.status, 200); assert.ok(s.writes.some(write => write.table === 'ingredients'))
  })
  test(`${method}: complete ingredient assessment saves`, async () => {
    const s = setup()
    const response = await s.save('ingredient', method, { name: 'Milk', allergen_warnings: s.complete })
    assert.equal(response.status, 200); assert.ok(s.writes.some(write => write.table === 'ingredients'))
  })
  test(`${method}: saves reject incomplete menus rather than storing drafts`, async () => {
    for (const status of [undefined, 'draft']) {
      const s = setup()
      const response = await s.save('menu', method, { name: 'Work in progress', status, allergen_warnings: {} })
      assert.equal(response.status, 400)
      assert.equal(s.writes.length, 0)
    }
  })
  test(`${method}: complete menu saves go live even for legacy draft requests`, async () => {
    for (const status of [undefined, 'draft']) {
      const s = setup()
      const response = await s.save('menu', method, { name: 'Recipe', description: 'Recipe', status, ingredients: ['ingredient'] })
      assert.equal(response.status, 200)
      assert.equal(s.writes.find(write => write.table === 'menu_items').payload.is_active, true)
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
  test(`${method}: bought-in saves need source details and no label review`, async () => {
    const s = setup()
    const fields = { name: 'Product', description: 'Product', item_type: 'packaged_product', status: 'active', allergen_warnings: s.complete, supplier_id: 'supplier', ingredient_declaration: 'Water', label_verified_at: '2026-10-15T12:00:00Z' }
    for (const missing of ['supplier_id', 'ingredient_declaration']) {
      const response = await s.save('menu', method, { ...fields, [missing]: null })
      assert.equal(response.status, 400); assert.equal(s.writes.length, 0)
    }
    assert.equal((await s.save('menu', method, { ...fields, label_verified_at: null })).status, 200)
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

test('ingredient edits go live regardless of their old review state', async () => {
  for (const status of [undefined, 'active']) {
    const s = setup({ source: { status: 'review' } })
    assert.equal((await s.save('ingredient', 'PUT', { name: 'Ingredient', allergen_warnings: s.complete, status })).status, 200)
    assert.equal(s.writes.find(write => write.table === 'ingredients').payload.status, 'active')
  }
})

for (const entity of ['ingredient', 'menu']) test(`${entity}: duplicate attaches source documents and rolls back a failed copy`, async () => {
  for (const fail of [false, true]) {
    const s = setup({ duplicateSheets: [{file_name:'Spec.pdf',file_path:'https://example.invalid/spec.pdf',supplier_name:'Rio Supplier'}], copyError: fail ? {message:'Storage metadata unavailable'} : null })
    const response = await s.save(entity, 'POST', { name:'Copy', description:'Copy', allergen_warnings:s.complete, ingredients:['ingredient'], duplicate_from_id:'11111111-1111-4111-8111-111111111111' })
    assert.equal(response.status, fail ? 500 : 200)
    const copied = s.writes.find(write=>write.table==='datasheets'&&write.mutation==='insert')
    assert.ok(copied);assert.equal(copied.payload[0].supplier_name,'Rio Supplier')
    const table = entity==='ingredient' ? 'ingredients' : 'menu_items'
    assert.equal(s.writes.some(write=>write.table===table&&write.mutation==='delete'),fail)
    assert.equal(s.audit.length,fail ? 0 : 1)
    if (!fail) assert.equal(s.audit[0].userId,'actor')
  }
})
for (const role of ['owner','manager','staff']) test(`${role}: live saves record the actor in the audit trail`, async () => {
  const s=setup({role})
  assert.equal((await s.save('ingredient','POST',{name:'Saved',allergen_warnings:s.complete})).status,200)
  assert.equal(s.audit[0].userId,'actor');assert.equal(s.audit[0].action,'created')
})

for (const entity of ['ingredient','menu']) for (const method of ['POST','PUT']) test(`${method} ${entity}: saves retain parent and subcategory, reject a child without its parent`,async()=>{
 const s=setup()
 const body=entity==='ingredient'?{name:'Oat milk',allergen_warnings:s.complete}:{name:'Oat drink',description:'Example',ingredients:['ingredient']}
 const response=await s.save(entity,method,{...body,category:' Drinks ',subcategory:' Milks '})
 assert.equal(response.status,200)
 const saved=s.writes.find(write=>write.table===(entity==='ingredient'?'ingredients':'menu_items')).payload
 assert.equal(saved.category,'Drinks');assert.equal(saved.subcategory,'Milks')
 const invalid=setup();const rejected=await invalid.save(entity,method,{...body,category:'',subcategory:'Milks'})
 assert.equal(rejected.status,400);assert.equal(invalid.writes.length,0)
})
