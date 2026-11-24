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
  for (const detail of ['Supplier: Rio Supplier', 'Brand: Rio Brand', 'Ingredients: Yoghurt, Berries']) {
    assert.equal(parsed.text.split(detail).length - 1, 1, detail)
  }
})

test('the guide wraps long item details across A4 pages without repeating or dropping text', async () => {
  const { generateAllergenTablePDF } = load('lib/pdf/allergenTablePDF.ts', {
    './pdfBranding': { hexToRgb: () => [0,56,66], fetchAllyJenLogoDataUrl: async () => null, drawPageFooters: async () => {} },
  })
  const { ALLERGEN_LIST } = load('types/allergen.ts')
  const warnings = Object.fromEntries(ALLERGEN_LIST.map(({ id }) => [id, 'none']))
  const { eggs: _eggs, ...missingEggs } = warnings
  const supplier = Array.from({ length: 65 }, (_, index) => `Regional Produce Office ${String(index + 1).padStart(2, '0')}`).join(' ')
  const name = 'Baked seasonal chocolate cake with a very long name for the printed menu'
  const fillers = Array.from({ length: 24 }, (_, index) => ({
    id: `dish-${index}`, name: `Prepared dish ${index + 1}`, category: 'Lunch', allergen_warnings: warnings,
  }))
  const output = await generateAllergenTablePDF({
    business: { name: 'Rio' }, outputMode: 'base64',
    items: [
      { id: 'starter', name: 'Appetiser', category: 'Lunch', allergen_warnings: warnings },
      { id: 'cake', name, category: 'Lunch', item_type: 'packaged_product', supplier_name: supplier, manufacturer: 'Valley Bakes',
        allergen_warnings: { ...missingEggs, milk: 'contains', nuts: 'traces' } },
      ...fillers,
    ],
  })
  const bytes = Buffer.from(output, 'base64')
  const { numpages, text } = await require('pdf-parse')(bytes)
  assert.ok(numpages >= 3)
  assert.ok((text.match(/\?/g)?.length ?? 0) >= 2, 'each fragment of the long row shows the missing-answer marker')
  assert.equal(text.split('\n').filter(line => line === 'Item').length, numpages)
  for (const label of ['Gluten', 'Crustaceans']) {
    assert.equal(text.split(label).length - 1, numpages, label)
  }

  // Repeated headers can occur between continuation lines of the supplier name.
  const extracted = text.replace(/\s+/g, ' ')
  const markers = ['Appetiser', name, 'Supplier: Regional Produce Office 01', 'Regional Produce Office 65',
    'Brand: Valley Bakes', 'Contains: Milk', 'May contain: Tree Nuts', 'Prepared dish 24']
  let previous = -1
  for (const marker of markers) {
    const index = extracted.indexOf(marker)
    assert.ok(index > previous, marker)
    assert.equal(extracted.lastIndexOf(marker), index, marker)
    previous = index
  }

  const { PDFDocument } = require('pdf-lib')
  const pdf = await PDFDocument.load(bytes)
  assert.equal(pdf.getPageCount(), numpages)
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize()
    assert.ok(Math.abs(width - 841.89) < 0.1 && Math.abs(height - 595.28) < 0.1)
  }
})

test('the Menu Items Report leaves space for the legend and keeps the footer logo clear', async () => {
  const { jsPDF } = require('jspdf')
  const { autoTable } = require('jspdf-autotable')
  const branding = load('lib/pdf/pdfBranding.ts')
  const bundledLogo = `data:image/png;base64,${fs.readFileSync('public/allyjen-logo.png').toString('base64')}`
  const rowGaps = []
  let legendRight = 0
  let footerLogo
  let output

  const { generateMenuItemsReportPDF } = load('lib/pdf/menuItemsReportPDF.ts', {
    './pdfBranding': { ...branding, fetchAllyJenLogoDataUrl: async () => bundledLogo },
    jspdf: function () {
      const doc = new jsPDF()
      const { text, addImage } = doc
      doc.text = (value, x, ...args) => {
        if (value === 'Not present') legendRight = x + doc.getTextWidth(value)
        return text.call(doc, value, x, ...args)
      }
      doc.addImage = (image, format, x, y, width, height) => {
        if (y > doc.internal.pageSize.getHeight() / 2) footerLogo = { x, width, height }
        return addImage.call(doc, image, format, x, y, width, height)
      }
      doc.save = () => { output = Buffer.from(doc.output('arraybuffer')) }
      return doc
    },
    'jspdf-autotable': (doc, options) => autoTable(doc, {
      ...options,
      didDrawPage: ({ cursor }) => {
        const legendTop = doc.internal.pageSize.getHeight() - 28
        rowGaps.push(legendTop - cursor.y)
      },
    }),
  })

  await generateMenuItemsReportPDF({
    business: { id: 'fixture', name: 'AllyJen Footer Check' },
    menuItems: Array.from({ length: 49 }, (_, i) => ({
      name: `Menu item ${i + 1}`, category: 'Lunch', description: 'Prepared for the lunch menu', is_active: true,
    })),
  })

  const { numpages, text } = await require('pdf-parse')(output)
  assert.equal(numpages, 2)
  assert.equal(rowGaps.length, numpages)
  assert.ok(rowGaps.every(gap => gap >= 3.99), `Table to legend gaps in mm: ${rowGaps.join(', ')}`)
  assert.ok(rowGaps.some(gap => gap < 8), 'fixture fills at least one page nearly to the footer')
  assert.ok(footerLogo && footerLogo.x > legendRight)
  assert.equal(footerLogo.width, footerLogo.height)
  for (const label of ['Contains (high severity)', 'May contain / Traces / Cross-contamination', 'Not present', 'Page 1 of 2', 'Page 2 of 2']) {
    assert.ok(text.includes(label), label)
  }
})

test('all workflow messages are available in all supported languages', () => {
  const { workflowTranslations } = load('lib/workflow-translations.ts')
  for (const values of Object.values(workflowTranslations)) assert.deepEqual(Object.keys(values), Object.keys(workflowTranslations.en))
})
