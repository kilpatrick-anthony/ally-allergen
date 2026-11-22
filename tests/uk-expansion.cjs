const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const { PDFDocument, PDFName } = require('pdf-lib')
const { completeReview, uuid } = require('./helpers/quick-add-review-db.cjs')

function loader(mocks = {}) {
  const cache = new Map()
  function load(path) {
    if (cache.has(path)) return cache.get(path)
    const exports = {}
    const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText
    new Function('exports', 'require', 'fetch', source)(exports, name => {
      if (Object.hasOwn(mocks, name)) return mocks[name]
      return name.startsWith('@/') ? load(name.slice(2) + '.ts') : require(name)
    }, mocks.fetch || fetch)
    cache.set(path, exports)
    return exports
  }
  return load
}

const load = loader()
const sameCafe = { packer: 'same_business', place: 'same_site', enclosed: 'yes', timing: 'before_choice', sales: 'in_person' }

test('UK classification covers same-café PPDS, loose, remote-only, mobile and separate review', () => {
  const { classifyPpds } = load('lib/ppds.ts')
  assert.equal(classifyPpds(sameCafe), 'ppds')
  assert.equal(classifyPpds({ ...sameCafe, place: 'mobile_or_temporary' }), 'ppds')
  assert.equal(classifyPpds({ ...sameCafe, timing: 'after_choice' }), 'loose')
  assert.equal(classifyPpds({ ...sameCafe, enclosed: 'no' }), 'loose')
  assert.equal(classifyPpds({ ...sameCafe, sales: 'remote_only' }), 'distance')
  assert.equal(classifyPpds({ ...sameCafe, sales: 'both' }), 'ppds')
  assert.equal(classifyPpds({ ...sameCafe, packer: 'other_business' }), 'review')
  assert.equal(classifyPpds({ ...sameCafe, place: 'different_fixed_site' }), 'review')
  assert.equal(classifyPpds({ ...sameCafe, enclosed: 'uncertain' }), 'review')
})

test('public rates use fixed amounts; contact sends server-derived market, currency and plan through both channels', async () => {
  const { publicPrice, isPublicMarket, PUBLIC_MARKETS } = load('lib/public-pricing.ts')
  assert.deepEqual(['qr_lite', 'starter', 'pro', 'kiosk'].map(plan => publicPrice(plan, 'ireland')), ['€99', '€19.99', '€59.99', '€299'])
  assert.deepEqual(['qr_lite', 'starter', 'pro', 'kiosk'].map(plan => publicPrice(plan, 'uk')), ['£83', '£17', '£50', '£250'])
  assert.equal(PUBLIC_MARKETS.ireland.label, 'Ireland/EU €')
  assert.equal(isPublicMarket('constructor'), false)

  const mails = [], forms = []
  const route = loader({
    'next/server': { NextResponse: Response },
    '@/lib/email': { sendMail: async email => { mails.push(email) } },
    fetch: async (_url, options) => {
      forms.push(JSON.parse(options.body))
      return Response.json({ status: 'accepted' })
    },
  })('app/api/contact/route.ts')
  const body = { name: 'Pat Tester', company: 'Example Café', email: 'pat@example.com', privacyAccepted: true, pricingMarket: 'uk', enquiryType: 'starter', message: 'A quote please.' }
  const post = fields => route.POST(new Request('https://example.test/api/contact', { method: 'POST', body: JSON.stringify(fields) }))
  assert.equal((await post(body)).status, 200)
  for (const payload of [mails[0].html, mails[0].text, mails[1].html, forms[0].fields.find(field => field.name === 'message').value]) {
    assert.match(payload, /UK \(GBP\)/)
    assert.match(payload, /Self-Managed — £17\/month/)
  }
  assert.equal((await post({ ...body, pricingMarket: 'ireland' })).status, 200)
  assert.match(mails[2].text, /Pricing market: Ireland\/EU \(EUR\)/)
  assert.equal((await post({ ...body, pricingMarket: 'IE', enquiryType: 'invented' })).status, 400)
  const { pricingMarket, enquiryType, ...legacy } = body
  assert.equal((await post(legacy)).status, 200)
  assert.doesNotMatch(mails[4].text, /GBP/)
})

function labelFixture() {
  const warnings = {
    ...completeReview().allergen_warnings,
    cereals_gluten: 'contains', cereals_gluten_levels: { wheat: 'contains' }, milk: 'contains', sesame: 'may_contain',
  }
  const source = {
    item: { id: uuid(40), name: 'Cheese sandwich', allergen_warnings: warnings },
    recipeLinkCount: 1, directSupplier: null,
    ingredients: [{ ingredient: { id: uuid(41), name: 'Bread and cheese base', status: 'active', allergen_warnings: warnings }, link: {} }],
    variants: [{ variant: { id: uuid(42), ingredient_id: uuid(41), allergen_warnings: warnings, assessment_status: 'assessed' },
      supplier: { id: uuid(43), name: 'Example Supplier' } }],
    specifications: [{ id: uuid(44), ingredient_id: uuid(41), supplier_name: 'Example Supplier', file_name: 'Specification.pdf',
      file_path: '/api/evidence', version: 'v2', next_review_date: '2099-01-01', status: 'active' }],
  }
  const input = {
    foodName: 'Cheese sandwich', ingredients: 'Bread (wheat flour, water), cheddar (milk, salt), wheat crumb, milk powder',
    precaution: 'May contain sesame', areaCm2: 80, widthMm: 64, heightMm: 40, recipeVerified: true, templateSuitable: true,
    specifications: [{ sourceId: uuid(41), documentId: uuid(44), variantId: uuid(42) }],
  }
  return { input, source }
}

test('approved in-store sandwich declaration has repeated allergen emphasis, separate precaution and actual PDF dimensions', async () => {
  const { buildPpdsLabel } = load('lib/server/ppds-labels.ts')
  const { input, source } = labelFixture()
  const { doc, label, xHeight, minimumXHeight } = buildPpdsLabel(source, input)
  assert.deepEqual(label.rendered.ingredients.filter(run => run.bold).map(run => run.text), ['wheat', 'milk', 'wheat', 'milk'])
  assert.equal(label.rendered.ingredients.map(run => run.text).join(''), input.ingredients)
  assert.equal(label.rendered.precaution, 'May contain sesame')
  assert.equal(minimumXHeight, 1.2)
  assert.ok(xHeight >= minimumXHeight)
  assert.equal(buildPpdsLabel(source, { ...input, areaCm2: 64 }).minimumXHeight, 0.9)
  const pdf = await PDFDocument.load(doc.output('arraybuffer'))
  const page = pdf.getPage(0)
  const { width, height } = page.getSize()
  assert.ok(Math.abs(width * 25.4 / 72 - 64) < 0.001)
  assert.ok(Math.abs(height * 25.4 / 72 - 40) < 0.001)
  const preferences = pdf.catalog.getOrCreateViewerPreferences()
  assert.equal(preferences.dict.get(PDFName.of('PrintScaling')).toString(), '/None')
  if (process.env.PPDS_SAMPLE_PATH) fs.writeFileSync(process.env.PPDS_SAMPLE_PATH, Buffer.from(doc.output('arraybuffer')))
})

test('PPDS blocks missing, mismatched, unverified or expired specifications and overflowing declarations', () => {
  const { buildPpdsLabel } = load('lib/server/ppds-labels.ts')
  const { input, source } = labelFixture()
  assert.throws(() => buildPpdsLabel(source, { ...input, specifications: [] }), /current specification/)
  assert.throws(() => buildPpdsLabel({ ...source, specifications: [{ ...source.specifications[0], next_review_date: '2000-01-01' }] }, input), /review date/)
  assert.throws(() => buildPpdsLabel({ ...source, specifications: [{ ...source.specifications[0], supplier_name: 'Another vendor' }] }, input), /matching specification/)
  assert.throws(() => buildPpdsLabel({ ...source, ingredients: [] }, input), /recipe ingredients/)
  assert.throws(() => buildPpdsLabel(source, { ...input, ingredients: 'Bread, milk' }), /Name wheat/)
  assert.throws(() => buildPpdsLabel(source, { ...input, ingredients: 'Wheat and milk; may contain sesame' }), /its own field/)
  assert.throws(() => buildPpdsLabel(source, { ...input, widthMm: 28, heightMm: 15 }), /overflows|too wide/)
})

test('Irish ingredient labels can preview and approve without UK PPDS answers', async () => {
  const { input, source } = labelFixture()
  const fingerprint = 'a'.repeat(32)
  const revisionId = uuid(45)
  const saved = []
  const query = {
    select() { return this },
    eq() { return this },
    order() { return this },
    limit: async () => ({ data: [], error: null }),
  }
  const actor = {
    site: { id: uuid(46), jurisdiction: 'IE' },
    businessId: uuid(47), userId: uuid(48), role: 'manager',
    supabase: {
      rpc: async (name, args) => {
        if (name === 'review_site_ppds_source') return { data: { source, fingerprint }, error: null }
        saved.push(args)
        return { data: revisionId, error: null }
      },
      from: () => query,
    },
  }
  const route = loader({
    'next/server': { NextResponse: Response },
    '@/lib/server/quick-add': { QuickAddError: class QuickAddError extends Error {} },
    '@/lib/server/location-allergens': {
      locationAllergenContext: async () => actor,
      locationAllergenFailure: error => Response.json({ error: error.message }, { status: 500 }),
      sourceFingerprint: require('zod').z.string().regex(/^[0-9a-f]{32}$/),
    },
  })('app/api/sites/[slug]/ppds/route.ts')
  const post = intent => route.POST(new Request('https://example.test/api/sites/dublin/ppds', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId: uuid(40), expected: fingerprint, previous: null, intent, label: input }),
  }), { params: Promise.resolve({ slug: 'dublin' }) })

  const preview = await post('preview')
  assert.equal(preview.status, 200)
  assert.equal(saved.length, 0)
  const approved = await post('approve')
  assert.equal(approved.status, 200)
  assert.equal(saved[0].p_classification, 'ingredient_label')
  assert.deepEqual(saved[0].p_answers, {})
  assert.ok(saved[0].p_label)
})

test('label review reads the current revision first and loads history separately', async () => {
  const fingerprint = 'b'.repeat(32)
  const selectedColumns = []
  const query = {
    select(columns) { selectedColumns.push(columns); return this },
    eq() { return this },
    order() { return this },
    limit: async () => ({ data: [], error: null }),
  }
  const source = {
    item: { id: uuid(50), name: 'Oat bar', allergen_warnings: {} },
    directSupplier: null,
    recipeLinkCount: 0,
    ingredients: [],
    variants: [],
    specifications: [],
  }
  const actor = {
    site: { id: uuid(51), jurisdiction: 'IE' },
    businessId: uuid(52), userId: uuid(53), role: 'manager',
    supabase: {
      rpc: async () => ({ data: { source, fingerprint }, error: null }),
      from: () => query,
    },
  }
  const route = loader({
    'next/server': { NextResponse: Response },
    '@/lib/server/quick-add': { QuickAddError: class QuickAddError extends Error {} },
    '@/lib/server/location-allergens': {
      locationAllergenContext: async () => actor,
      locationAllergenFailure: error => Response.json({ error: error.message }, { status: 500 }),
      sourceFingerprint: require('zod').z.string().regex(/^[0-9a-f]{32}$/),
    },
  })('app/api/sites/[slug]/ppds/route.ts')
  const params = { params: Promise.resolve({ slug: 'dublin' }) }

  const review = await route.GET(new Request(`https://example.test/api/sites/dublin/ppds?item=${uuid(50)}`), params)
  assert.equal(review.status, 200)
  const reviewData = await review.json()
  assert.deepEqual(reviewData.history, [])
  assert.equal(reviewData.canApprove, true)
  assert.deepEqual(selectedColumns, ['id,classification,answers,label,source_fingerprint,source,recorded_at,recorded_by'])

  const history = await route.GET(new Request(`https://example.test/api/sites/dublin/ppds?item=${uuid(50)}&history=true`), params)
  assert.equal(history.status, 200)
  assert.deepEqual((await history.json()).history, [])
  assert.deepEqual(selectedColumns[1], 'id,classification,label,source,recorded_at,recorded_by')
})

module.exports = { loader, labelFixture }
