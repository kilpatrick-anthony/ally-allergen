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

function multipleVariantLabelFixture() {
  const { input, source } = labelFixture()
  const secondVariant = {
    ...source.variants[0].variant, id: uuid(60),
    allergen_warnings: { ...completeReview().allergen_warnings, eggs: 'contains' },
  }
  source.variants.push({ variant: secondVariant, supplier: { id: uuid(61), name: 'Second Supplier' } })
  source.specifications.push({
    ...source.specifications[0], id: uuid(62), supplier_name: 'Second Supplier', file_name: 'Second specification.pdf',
  })
  input.ingredients += ', egg'
  input.specifications.push({ sourceId: secondVariant.ingredient_id, documentId: uuid(62), variantId: secondVariant.id })
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

test('blank label dimensions use 50 × 30 mm and preserve the 20 × 15 mm minimum', () => {
  const { ppdsLabelLayoutInput, ppdsLabelInput } = load('lib/ppds.ts')
  const { input } = labelFixture()
  const { widthMm, heightMm, specifications, recipeVerified, templateSuitable, ...layout } = input
  assert.deepEqual(ppdsLabelLayoutInput.parse(layout), { ...layout, widthMm: 50, heightMm: 30 })
  assert.deepEqual(ppdsLabelInput.parse({ ...input, widthMm: undefined, heightMm: undefined }), { ...input, widthMm: 50, heightMm: 30 })
  assert.equal(ppdsLabelLayoutInput.safeParse({ ...layout, widthMm: 20, heightMm: 15 }).success, true)
  assert.equal(ppdsLabelLayoutInput.safeParse({ ...layout, heightMm: 14 }).success, false)
  assert.equal(ppdsLabelInput.safeParse({ ...input, areaCm2: undefined }).success, false)
})

test('a coconut milk variant identifies soy and the declaration emphasises it without treating coconut milk as dairy', () => {
  const { labelIngredients, missingDeclaredAllergens, specificAllergens } = load('lib/ppds.ts')
  const { ppdsReviewSources } = load('lib/server/ppds-labels.ts')
  const { source } = labelFixture()
  source.ingredients[0].ingredient.name = 'Coconut Milk'
  const warnings = { ...completeReview().allergen_warnings, soybeans: 'contains' }
  source.variants[0].variant.allergen_warnings = warnings
  const variantNames = ppdsReviewSources(source)[0].variants[0].containedAllergens
  assert.deepEqual(variantNames, ['soybeans'])
  assert.deepEqual(missingDeclaredAllergens('Coconut milk, matcha', variantNames), ['soybeans'])
  assert.deepEqual(missingDeclaredAllergens('Coconut milk (soya lecithin), matcha', variantNames), [])
  const declaration = 'Coconut milk (soya lecithin), matcha'
  assert.deepEqual(labelIngredients(declaration, specificAllergens(warnings)).filter(run => run.bold).map(run => run.text), ['soya'])
  assert.throws(() => labelIngredients('Coconut milk, goat milk', specificAllergens(warnings)), /Name soybeans/)
  assert.throws(() => labelIngredients('Coconut milk (soy), goat milk', specificAllergens(warnings)), /Check the declaration for milk/)
  assert.throws(() => labelIngredients(declaration, specificAllergens({ ...warnings, milk: 'contains' })), /Name milk/)
  assert.deepEqual(labelIngredients(declaration + ', skimmed milk', specificAllergens({ ...warnings, milk: 'contains' }))
    .filter(run => run.bold).map(run => run.text), ['soya', 'milk'])
})

test('one label validates and highlights allergens from all selected variants of one ingredient', () => {
  const { buildPpdsLabel, ppdsReviewSources } = load('lib/server/ppds-labels.ts')
  const { input, source } = multipleVariantLabelFixture()
  const [first, second] = input.specifications
  assert.deepEqual(ppdsReviewSources(source)[0].variants.map(variant => variant.documentIds), [[first.documentId], [second.documentId]])
  const { label } = buildPpdsLabel(source, input)
  assert.deepEqual(label.input.specifications, [first, second])
  assert.deepEqual(label.rendered.ingredients.filter(run => run.bold).map(run => run.text), ['wheat', 'milk', 'wheat', 'milk', 'egg'])
  assert.throws(() => buildPpdsLabel(source, { ...input, ingredients: input.ingredients.replace(', egg', '') }), /Name eggs/)
  assert.throws(() => buildPpdsLabel(source, { ...input, specifications: [first, first] }), /one current specification per supplier variant/)
  assert.throws(() => buildPpdsLabel(source, {
    ...input, specifications: [first, { ...second, documentId: first.documentId }],
  }), /matching specification/)
  const expired = { ...source, specifications: [source.specifications[0], { ...source.specifications[1], next_review_date: '2000-01-01' }] }
  assert.throws(() => buildPpdsLabel(expired, input), /review date/)
})

test('a single allergen name cannot substitute for the ingredients list of a multi-ingredient recipe', () => {
  const { buildPpdsLabel } = load('lib/server/ppds-labels.ts')
  const { input, source } = labelFixture()
  const neutralWarnings = completeReview().allergen_warnings
  const coconut = source.ingredients[0].ingredient
  const matcha = { ...coconut, id: uuid(65), name: 'Matcha', allergen_warnings: neutralWarnings }
  source.ingredients.push({ ingredient: matcha, link: {} })
  source.recipeLinkCount = 2
  source.variants[0].variant.allergen_warnings = { ...neutralWarnings, soybeans: 'contains' }
  source.specifications.push({ ...source.specifications[0], id: uuid(66), ingredient_id: matcha.id })
  input.specifications.push({ sourceId: matcha.id, documentId: uuid(66), variantId: null })
  input.precaution = ''
  assert.throws(() => buildPpdsLabel(source, { ...input, ingredients: 'soybeans' }), /Enter the full recipe/)
  assert.throws(() => buildPpdsLabel(source, { ...input, ingredients: 'Soybeans.' }), /Enter the full recipe/)
  assert.throws(() => buildPpdsLabel(source, { ...input, ingredients: 'Coconut milk, matcha. Contains: soybeans' }), /within the ingredients list/)
  const { label } = buildPpdsLabel(source, { ...input, ingredients: 'Coconut milk (soya lecithin), matcha' })
  assert.deepEqual(label.rendered.ingredients.filter(run => run.bold).map(run => run.text), ['soya'])
})

test('the allergen-only label uses the selected variants without ingredient text or datasheet dates', async () => {
  const { buildLooseFoodAllergenLabel } = load('lib/server/ppds-labels.ts')
  const { makeLooseFoodAllergenLabelPdf } = load('lib/pdf/loose-food-allergen-label.ts')
  const { source, input } = multipleVariantLabelFixture()
  source.item.name = 'Matcha Latte (w/Coconut Milk)'
  source.item.ingredient_declaration = null
  source.specifications = []
  source.variants[0].variant.allergen_warnings = {
    ...completeReview().allergen_warnings, soybeans: 'contains', sesame: 'may_contain',
  }
  const [first, second] = input.specifications.map(({ sourceId, variantId }) => ({ sourceId, variantId }))
  const label = buildLooseFoodAllergenLabel(source, [first])
  assert.deepEqual(label.contains, ['soybeans'])
  assert.deepEqual(label.precautions, ['May contain sesame seeds'])
  assert.deepEqual(buildLooseFoodAllergenLabel(source, [first, second]).contains, ['soybeans', 'eggs'])
  const file = Buffer.from(makeLooseFoodAllergenLabelPdf(label).output('arraybuffer'))
  assert.ok(file.toString().includes('Contains soybeans'))
  assert.ok(file.toString().includes('For food served loose or prepared to order'))
  const pdf = await PDFDocument.load(file)
  assert.equal(pdf.getPageCount(), 1)
  assert.ok(Math.abs(pdf.getPage(0).getWidth() * 25.4 / 72 - 80) < 0.001)
  assert.throws(() => buildLooseFoodAllergenLabel(source, []), /Select the supplier variants/)
  assert.throws(() => buildLooseFoodAllergenLabel(source, [{ ...first, sourceId: uuid(75) }]), /from this recipe/)
  source.variants[0].variant.assessment_status = 'needs_review'
  assert.throws(() => buildLooseFoodAllergenLabel(source, [first]), /Complete the selected variant assessments/)
  source.variants[0].variant.assessment_status = 'assessed'
  source.variants[0].variant.allergen_warnings.nuts = 'contains'
  assert.throws(() => buildLooseFoodAllergenLabel(source, [first]), /specific cereal or tree nut/)
  source.item.item_type = 'packaged_product'
  assert.throws(() => buildLooseFoodAllergenLabel(source, [second]), /food served loose/)
})

test('a recipe label only requires allergen assessments for its selected sources', () => {
  const { buildPpdsLabel } = load('lib/server/ppds-labels.ts')
  const { input, source } = multipleVariantLabelFixture()
  source.item.allergen_warnings = { assessment_incomplete: true }
  source.ingredients[0].ingredient.allergen_warnings = { assessment_incomplete: true }
  source.variants[1].variant.assessment_status = 'needs_review'

  const [verified, awaitingReview] = input.specifications
  const verifiedRecipe = { ...input, ingredients: input.ingredients.replace(', egg', ''), specifications: [verified] }
  assert.doesNotThrow(() => buildPpdsLabel(source, verifiedRecipe))
  assert.throws(() => buildPpdsLabel(source, { ...input, specifications: [verified, awaitingReview] }), /assessed supplier variant/)

  source.variants = []
  assert.throws(() => buildPpdsLabel(source, { ...verifiedRecipe, specifications: [{ ...verified, variantId: null }] }), /Complete the allergen assessment/)
})

test('bought-in products still require an assessment for the product itself', () => {
  const { buildPpdsLabel } = load('lib/server/ppds-labels.ts')
  const { input, source } = labelFixture()
  const product = {
    ...source,
    item: { ...source.item, ingredient_declaration: input.ingredients },
    directSupplier: source.variants[0].supplier,
    recipeLinkCount: 0,
    ingredients: [],
    variants: [],
    specifications: [{ ...source.specifications[0], ingredient_id: null, menu_item_id: source.item.id }],
  }
  const label = { ...input, specifications: [{ sourceId: product.item.id, documentId: product.specifications[0].id, variantId: null }] }
  assert.doesNotThrow(() => buildPpdsLabel(product, label))
  product.item.allergen_warnings = { assessment_incomplete: true }
  assert.throws(() => buildPpdsLabel(product, label), /Complete the bought-in product’s allergen assessment/)
})

test('Irish ingredient labels can preview and approve without UK PPDS answers', async () => {
  const { input, source } = multipleVariantLabelFixture()
  const fingerprint = 'a'.repeat(32)
  const revisionId = uuid(45)
  const saved = []
  let current
  const query = {
    select() { return this },
    eq() { return this },
    order() { return this },
    limit: async () => ({ data: current ? [current] : [], error: null }),
  }
  const actor = {
    site: { id: uuid(46), jurisdiction: 'IE' },
    businessId: uuid(47), userId: uuid(48), role: 'manager',
    supabase: {
      rpc: async (name, args) => {
        if (name === 'review_site_ppds_source') return { data: { source, fingerprint }, error: null }
        saved.push(args)
        current = { id: revisionId, source_fingerprint: fingerprint, label: args.p_label, classification: args.p_classification }
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
  const post = (intent, fields = { label: input }) => route.POST(new Request('https://example.test/api/sites/dublin/ppds', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId: uuid(40), expected: fingerprint, previous: null, intent, ...fields }),
  }), { params: Promise.resolve({ slug: 'dublin' }) })

  const { foodName, ingredients, precaution, areaCm2, widthMm, heightMm } = input
  const layout = { foodName, ingredients, precaution, areaCm2, widthMm, heightMm }
  const loose = confirmedLooseFood => route.POST(new Request('https://example.test/api/sites/dublin/ppds', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itemId: uuid(40), expected: fingerprint, intent: 'download-loose-label', confirmedLooseFood,
      selections: input.specifications.map(({ sourceId, variantId }) => ({ sourceId, variantId })),
    }),
  }), { params: Promise.resolve({ slug: 'dublin' }) })
  assert.equal((await loose(false)).status, 400)
  const looseDownload = await loose(true)
  assert.equal(looseDownload.status, 200)
  assert.equal(looseDownload.headers.get('content-type'), 'application/pdf')
  assert.equal(saved.length, 0)
  const reviewDate = source.specifications[1].next_review_date
  source.specifications[1].next_review_date = null
  const draft = await post('preview-layout', { layout })
  assert.equal(draft.status, 200)
  assert.deepEqual((await draft.json()).label.ingredients, [{ text: ingredients, bold: false }])
  const emptyDraft = await post('preview-layout', { layout: { ...layout, ingredients: '' } })
  assert.equal(emptyDraft.status, 200)
  const selections = input.specifications.slice(0, 1).map(({ sourceId, variantId }) => ({ sourceId, variantId }))
  const draftWithSources = await post('preview-layout', { layout, selections })
  assert.equal(draftWithSources.status, 200)
  assert.deepEqual((await draftWithSources.json()).label.ingredients.filter(run => run.bold).map(run => run.text),
    ['wheat', 'milk', 'wheat', 'milk'])
  assert.equal((await post('preview-layout', { layout: { ...layout, widthMm: 25, heightMm: 15 } })).status, 409)
  assert.equal((await post('approve', { layout })).status, 400)
  assert.equal((await post('approve')).status, 409)
  assert.equal(saved.length, 0)
  source.specifications[1].next_review_date = reviewDate

  const preview = await post('preview')
  assert.equal(preview.status, 200)
  assert.equal(saved.length, 0)
  const approved = await post('approve')
  assert.equal(approved.status, 200)
  assert.equal(saved[0].p_classification, 'ingredient_label')
  assert.deepEqual(saved[0].p_answers, {})
  assert.deepEqual(saved[0].p_label.input.specifications, input.specifications)

  const print = () => route.GET(new Request(`https://example.test/api/sites/dublin/ppds?item=${uuid(40)}&print=${revisionId}`), {
    params: Promise.resolve({ slug: 'dublin' }),
  })
  const download = await print()
  assert.equal(download.status, 200)
  assert.equal(download.headers.get('content-type'), 'application/pdf')
  assert.equal((await PDFDocument.load(await download.arrayBuffer())).getPageCount(), 1)
  source.specifications[1].next_review_date = '2000-01-01'
  assert.equal((await print()).status, 409)
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
