const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
function load(file, mocks = {}, cache = new Map()) {
  file = path.resolve(file)
  if (cache.has(file)) return cache.get(file)
  const exports = {}; cache.set(file, exports)
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
  new Function('exports', 'require', source)(exports, name => {
    if (mocks[name]) return mocks[name]
    if (name.startsWith('@/') || name.startsWith('.')) return load(name.startsWith('@/') ? `${name.slice(2)}.ts` : path.resolve(path.dirname(file), `${name}.ts`), mocks, cache)
    return require(name)
  })
  return exports
}
const reminders = load('lib/item-reminders.ts')
test('reminders use last save and clamp month-end dates, including leap years', () => {
  for (const [start, months, expected] of [
    ['2026-08-31T12:30:00Z', 6, '2027-02-28T12:30:00.000Z'],
    ['2023-08-31T12:30:00Z', 6, '2024-02-29T12:30:00.000Z'],
    ['2026-01-31T12:30:00Z', 3, '2026-04-30T12:30:00.000Z'],
    ['2026-01-22T12:30:00Z', 9, '2026-10-22T12:30:00.000Z'],
    ['2026-01-22T12:30:00Z', 12, '2027-01-22T12:30:00.000Z'],
  ]) assert.equal(reminders.reminderDueAt({ created_at: '2000-01-01', updated_at: start, preferred_review_months: months }).toISOString(), expected)
  assert.equal(reminders.reminderDueAt({ updated_at: 'invalid' }), null)
})

const copies = load('lib/server/duplicate-datasheets.ts')
function dbFixture({ sourceBusiness = 'business', error = null } = {}) {
  const writes = [], reads = []
  const sheet = { id: 'source-sheet', file_name: 'Rio spec.pdf', file_path: 'https://storage.example/spec.pdf', file_size: 123, file_type: 'application/pdf', supplier_name: 'Rio supplier', version: '2', notes: '[MENU_ITEM_REF:11111111-1111-4111-8111-111111111111] Supplier specification', status: 'active' }
  const db = { from(table) {
    const filters = []; let payload
    const query = { select() { return query }, eq(key,value) { filters.push([key,value]); return query }, or(value) { filters.push(['or',value]); return query }, insert(value) { payload = value; return query }, maybeSingle() { return Promise.resolve({ data: filters.some(([key,value]) => key === 'business_id' && value === sourceBusiness) ? { id: 'source' } : null }) }, then(resolve,reject) {
      if (payload) { writes.push({ table,payload }); return Promise.resolve({ error }).then(resolve,reject) }
      reads.push({ table,filters }); return Promise.resolve({ data: [sheet], error: null }).then(resolve,reject)
    } }; return query
  } }
  return { db, writes, reads }
}
for (const entity of ['ingredient', 'menu_item']) test(`${entity}: duplicate copies datasheet links and supplier metadata into independent records`, async () => {
  const fixture = dbFixture()
  const sheets = await copies.sourceDatasheets(fixture.db, 'business', entity, '11111111-1111-4111-8111-111111111111')
  await copies.copyDatasheets(fixture.db, 'business', entity, 'new-item', 'staff-user', sheets)
  const row = fixture.writes[0].payload[0]
  assert.equal(row[`${entity}_id`], 'new-item')
  assert.equal(row.file_path, sheets[0].file_path)
  assert.equal(row.supplier_name, 'Rio supplier'); assert.equal(row.version, '2')
  assert.equal(row.notes, 'Supplier specification'); assert.equal(row.created_by, 'staff-user')
  assert.equal(row.id, undefined); assert.equal(row.last_reviewed_at, undefined)
  assert.ok(fixture.reads[0].filters.some(([key,value]) => key === 'business_id' && value === 'business'))
  if (entity === 'menu_item') assert.match(fixture.reads[0].filters.find(([key]) => key === 'or')[1], /MENU_ITEM_REF/)
})
test('datasheet duplication rejects other businesses and propagates copy failures', async () => {
  const foreign = dbFixture({ sourceBusiness: 'other-business' })
  await assert.rejects(copies.sourceDatasheets(foreign.db, 'business', 'ingredient', '11111111-1111-4111-8111-111111111111'), /unavailable/)
  assert.equal(foreign.reads.length, 0); assert.equal(foreign.writes.length, 0)
  const broken = dbFixture({ error: { message: 'write failure' } })
  await assert.rejects(copies.copyDatasheets(broken.db, 'business', 'ingredient', 'new-item', 'staff-user', [{}]), /Could not copy/)
})

test('generated allergen PDF includes bought-in supplier and brand without adding them to recipes', async () => {
  const { generateAllergenTablePDF } = load('lib/pdf/allergenTablePDF.ts', {
    './pdfBranding': { hexToRgb: () => [0,56,66], fetchAllyJenLogoDataUrl: async () => null, drawPageFooters: async () => {} },
  })
  const result = await generateAllergenTablePDF({ business: { name: 'Rio' }, items: [
    { id: 'pack', name: 'Bought yoghurt', category: 'Products', item_type: 'packaged_product', supplier_name: 'Rio Supplier', manufacturer: 'Rio Brand' },
    { id: 'recipe', name: 'Prepared bowl', category: 'Bowls', item_type: 'prepared', supplier_name: 'Hidden Supplier', manufacturer: 'Hidden Brand', ingredient_names: ['Yoghurt','Berries'] },
  ], outputMode: 'base64' })
  const parsed = await require('pdf-parse')(Buffer.from(result, 'base64'))
  assert.match(parsed.text, /Supplier: Rio Supplier/); assert.match(parsed.text, /Brand: Rio Brand/)
  assert.match(parsed.text, /Ingredients: Yoghurt, Berries/)
  assert.doesNotMatch(parsed.text, /Hidden Supplier|Hidden Brand/)
})

test('all workflow messages are available in all supported languages', () => {
  const { workflowTranslations } = load('lib/workflow-translations.ts')
  for (const values of Object.values(workflowTranslations)) assert.deepEqual(Object.keys(values), Object.keys(workflowTranslations.en))
})
