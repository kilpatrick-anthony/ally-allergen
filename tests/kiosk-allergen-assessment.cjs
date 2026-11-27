const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const { z } = require('zod')

function loader(mocks = {}) {
  const cache = new Map()
  function loadFile(file) {
    if (cache.has(file)) return cache.get(file)
    const exports = {}
    cache.set(file, exports)
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText
    new Function('exports', 'require', 'localStorage', 'window', 'document', 'fetch', 'FileReader', source)(
      exports,
      name => Object.hasOwn(mocks, name) ? mocks[name] : name.startsWith('@/') ? loadFile(name.slice(2) + '.ts') : require(name),
      mocks.localStorage, mocks.window, mocks.document, mocks.fetch, mocks.FileReader,
    )
    return exports
  }
  return loadFile
}

const load = loader()
const { ALLERGEN_LIST } = load('types/allergen.ts')
const {
  evaluateAllergen, evaluateAllergenSelections, mergeAllergenAssessments,
  ingredientAssessmentWarnings, retainRecordedAllergenWarnings,
} = load('lib/allergen-assessment.ts')

const complete = Object.fromEntries(ALLERGEN_LIST.map(({ id }) => [id, 'none']))
const { eggs: _eggs, ...withoutEggs } = complete
const milk = { allergen: 'milk' }
const eggs = { allergen: 'eggs' }

test('requires an explicit assessment and keeps declarations and precautionary warnings', () => {
  assert.deepEqual(evaluateAllergen({ milk: 'none' }, milk), { status: 'clear' })
  for (const level of ['contains', 'may_contain', 'traces', 'not_suitable', 'cross_contamination']) {
    assert.deepEqual(evaluateAllergen({ milk: level }, milk), { status: 'warning', level })
  }
  for (const warnings of [null, {}, { milk: null }, { milk: 'unknown' }]) {
    assert.deepEqual(evaluateAllergen(warnings, milk), { status: 'incomplete' })
  }
  assert.deepEqual(evaluateAllergen({}, milk, { contains_milk: true }), { status: 'warning', level: 'contains' })
  assert.deepEqual(evaluateAllergen({ milk: 'none' }, milk, { contains_milk: true }), { status: 'warning', level: 'contains' })
  assert.deepEqual(evaluateAllergen({}, milk, { contains_milk: false }), { status: 'incomplete' })
  assert.deepEqual(evaluateAllergen({ milk: 'none' }, milk, { contains_milk: false }), { status: 'clear' })
})

test('distinguishes ambiguous merged none from source-verified answers and requires all selected allergens', () => {
  const ambiguous = { ...withoutEggs, assessment_incomplete: true }
  assert.equal(evaluateAllergen(ambiguous, milk).status, 'incomplete')
  assert.equal(evaluateAllergen({ ...complete, assessment_incomplete: true, milk: 'contains' }, milk).status, 'warning')
  const scoped = mergeAllergenAssessments([withoutEggs, complete])
  assert.equal(scoped.assessment_incomplete, true)
  assert.equal(scoped.eggs, 'none')
  assert.deepEqual(evaluateAllergenSelections(scoped, [milk]), { matches: true, incomplete: false })
  assert.deepEqual(evaluateAllergenSelections(scoped, [milk, eggs]), { matches: false, incomplete: true })
  assert.deepEqual(evaluateAllergenSelections(scoped, []), { matches: true, incomplete: false })
  assert.deepEqual(evaluateAllergenSelections({ ...complete, eggs: 'traces' }, [milk, eggs]), { matches: false, incomplete: false })
  assert.equal(evaluateAllergen(mergeAllergenAssessments([]), milk).status, 'incomplete')
})

for (const [allergen, selected, other] of [
  ['nuts', 'almonds', 'pecans'],
  ['cereals_gluten', 'wheat', 'rye'],
]) {
  test(`${allergen}: recognizes modern, legacy and ambiguous subtype detail`, () => {
    const selection = { allergen, subtype: selected }
    const broad = { allergen }
    const map = `${allergen}_levels`
    const list = `${allergen}_types`
    const legacyFlag = `contains_${allergen}`
    const detailed = { ...complete, [allergen]: 'contains', [map]: { [other]: 'contains' } }
    assert.equal(evaluateAllergen(detailed, selection).status, 'clear')
    assert.equal(evaluateAllergen(detailed, broad).status, 'warning')
    const oldRollup = { ingredient_names: ['Stock'] }
    assert.equal(evaluateAllergen(detailed, selection, oldRollup).status, 'incomplete')
    assert.equal(evaluateAllergen(mergeAllergenAssessments([detailed]), selection, oldRollup).status, 'clear')
    assert.equal(evaluateAllergen({ [allergen]: 'none' }, selection).status, 'clear')
    assert.equal(evaluateAllergen({ [allergen]: 'contains', [map]: { [selected]: 'contains' } }, selection).status, 'warning')
    assert.equal(evaluateAllergen({ [allergen]: 'contains', [map]: {} }, selection).status, 'incomplete')
    assert.equal(evaluateAllergen({ [allergen]: 'none', [map]: null }, selection).status, 'incomplete')
    assert.equal(evaluateAllergen({ [allergen]: 'contains', [map]: { [other]: 'traces', [selected]: 'none' } }, selection).status, 'incomplete')
    assert.equal(evaluateAllergen({ [allergen]: 'contains', [map]: { [other]: 'contains', [selected]: null } }, selection).status, 'incomplete')
    assert.equal(evaluateAllergen({ [allergen]: 'contains' }, selection).status, 'incomplete')
    assert.equal(evaluateAllergen({ [allergen]: 'contains', [list]: [other] }, selection).status, 'clear')
    assert.deepEqual(evaluateAllergen({ [allergen]: 'traces', [list]: [selected] }, selection), { status: 'warning', level: 'traces' })
    assert.equal(evaluateAllergen({ [allergen]: 'contains' }, selection, { [map]: { [other]: 'contains' } }).status, 'clear')
    assert.equal(evaluateAllergen({}, selection, { [legacyFlag]: true }).status, 'incomplete')
    const mixed = mergeAllergenAssessments([detailed, { ...complete, [allergen]: 'contains' }])
    assert.equal(evaluateAllergen(mixed, selection).status, 'incomplete')
    assert.equal(evaluateAllergen(mixed, { allergen, subtype: other }).status, 'warning')
    const scoped = mergeAllergenAssessments([detailed, withoutEggs])
    assert.equal(evaluateAllergen(scoped, selection).status, 'clear')
    assert.equal(evaluateAllergen(scoped, eggs).status, 'incomplete')
  })
}

test('recipe assessment follows the actual selected ingredients after a removal or swap', () => {
  const defaults = [complete, { ...complete, milk: 'contains' }]
  assert.equal(evaluateAllergen(mergeAllergenAssessments(defaults), milk).status, 'warning')
  assert.equal(evaluateAllergen(mergeAllergenAssessments(defaults.slice(0, 1)), milk).status, 'clear')
  assert.equal(evaluateAllergen(mergeAllergenAssessments([complete, { ...complete, milk: 'traces' }]), milk).level, 'traces')
})

test('linked supplier data can explain a legacy aggregate flag and preserve other answers', () => {
  const base = { ...complete, assessment_incomplete: true }
  const source = { status: 'active', allergen_warnings: base, supplier_profiles: {
    first: { allergen_warnings: withoutEggs, assessment_status: 'needs_review' },
    second: { allergen_warnings: complete },
  } }
  const derived = ingredientAssessmentWarnings(source)
  assert.equal(evaluateAllergen(derived, milk).status, 'clear')
  assert.equal(evaluateAllergen(derived, eggs).status, 'incomplete')
  assert.equal(evaluateAllergen(ingredientAssessmentWarnings({ ...source, status: 'archived' }), milk).status, 'incomplete')
  assert.equal(evaluateAllergen(ingredientAssessmentWarnings({ ...source, supplier_profiles: {} }), milk).status, 'incomplete')
  const withLegacyWarning = retainRecordedAllergenWarnings(derived, { milk: 'traces' })
  assert.deepEqual(evaluateAllergen(withLegacyWarning, milk), { status: 'warning', level: 'traces' })
  assert.equal(evaluateAllergen(withLegacyWarning, eggs).status, 'incomplete')
})

function kioskRoute({ publication = null } = {}) {
  const location = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const stock = { id: 'stock', business_id: 'business', name: 'Stock', status: 'active', allergen_warnings: withoutEggs }
  const menu = [{
    id: 'soup', allergen_warnings: { ...complete, assessment_incomplete: true }, recipe: [{ ingredient: stock }],
  }, {
    id: 'bread', allergen_warnings: {}, contains_milk: true, recipe: [],
  }, {
    id: 'unavailable', allergen_warnings: complete, recipe: [{ ingredient: null }],
  }]
  const rows = {
    businesses: [{ id: 'business', slug: 'cafe' }],
    sites: [{ id: location, name: 'Dublin', jurisdiction: 'IE' }],
    menu_items: menu,
    ingredients: [stock],
    suppliers: [],
  }
  const supabase = { from(table) {
    const query = {
      select: () => query, eq: () => query, neq: () => query, in: () => query, or: () => query, order: () => query,
      single: async () => ({ data: rows[table][0] }),
      maybeSingle: async () => ({ data: rows[table][0] }),
      then: resolve => Promise.resolve({ data: rows[table] }).then(resolve),
    }
    return query
  } }
  const route = loader({
    'next/server': { NextResponse: Response },
    '@/lib/server/location-allergens': { getGuidePublication: async () => publication },
    '@/lib/supabase/server': { createServiceClient: () => supabase },
  })('app/api/kiosk/data/route.ts')
  return route.GET(new Request(`https://example.test/api/kiosk/data?target=cafe&site_id=${location}`))
}

test('Irish live guide uses linked source assessments and serves published snapshots as stored', async () => {
  const live = await (await kioskRoute()).json()
  const [soup, bread, unavailable] = live.menuItems
  assert.equal(soup.recipe, undefined)
  assert.equal(evaluateAllergen(unavailable.allergen_warnings, milk).status, 'incomplete')
  assert.deepEqual(soup.ingredient_names, ['Stock'])
  assert.equal(evaluateAllergen(soup.allergen_warnings, milk, soup).status, 'clear')
  assert.equal(evaluateAllergen(soup.allergen_warnings, eggs, soup).status, 'incomplete')
  assert.equal(evaluateAllergen(bread.allergen_warnings, milk, bread).status, 'warning')
  const items = [{ ...soup, allergen_warnings: complete }]
  const published = await (await kioskRoute({ publication: { id: 'approved', items } })).json()
  assert.deepEqual(published.menuItems, items)
})

async function offlineKiosk(cached, siteId) {
  const slots = []
  const effects = []
  let index = 0
  const react = {
    useState(initial) {
      const slot = index++
      if (!Object.hasOwn(slots, slot)) slots[slot] = initial
      return [slots[slot], next => { slots[slot] = next }]
    },
    useRef(initial) {
      const slot = index++
      return slots[slot] ??= { current: initial }
    },
    useCallback: fn => fn,
    useEffect: fn => { effects.push(fn) },
  }
  const keys = []
  const { useOfflineKioskData } = loader({
    react, localStorage: { getItem: key => { keys.push(key); return cached } },
    fetch: async () => Response.json({ error: 'Offline' }, { status: 503 }),
  })('lib/hooks/useOfflineKioskData.ts')
  useOfflineKioskData('cafe', siteId)
  effects[0]()
  await new Promise(resolve => setImmediate(resolve))
  index = 0
  return { ...useOfflineKioskData('cafe', siteId), keys }
}

test('offline hook loads scoped and ambiguous assessments from its existing cache', async () => {
  const fresh = await (await kioskRoute()).json()
  const cached = JSON.stringify({
    ...fresh,
    menuItems: [
      ...fresh.menuItems,
      { id: 'old', allergen_warnings: { ...complete, assessment_incomplete: true } },
      { id: 'old-recipe', ingredient_names: ['Stock'], allergen_warnings: complete },
    ],
    lastUpdated: Date.now(),
  })
  const offline = await offlineKiosk(cached)
  assert.equal(offline.isOffline, true)
  assert.equal(offline.isStale, true)
  const soup = offline.menuItems[0]
  const [old, oldRecipe] = offline.menuItems.slice(-2)
  assert.equal(evaluateAllergenSelections(soup.allergen_warnings, [milk], soup).matches, true)
  assert.equal(evaluateAllergenSelections(soup.allergen_warnings, [milk, eggs], soup).incomplete, true)
  assert.equal(evaluateAllergenSelections(old.allergen_warnings, [milk], old).incomplete, true)
  assert.equal(evaluateAllergenSelections(oldRecipe.allergen_warnings, [milk], oldRecipe).incomplete, true)
})

test('offline location uses the approved bowl snapshot and its location-specific cache entry', async () => {
  const siteId = 'fixture-location'
  const { defaultBowlChoices, evaluateBowl } = load('lib/bowl-selection.ts')
  const fixture = { id: 'acai', name: 'Fixture açaí', warnings: { ...complete, milk: 'may_contain' }, dietary: [] }
  const bowl = { fixed: [], groups: [{ name: 'Base', kind: 'required', options: [fixture], defaults: [fixture.id] }], sourceVersion: 'approved-source' }
  const cached = JSON.stringify({
    business: { location: { id: siteId, publicationId: 'approved' } },
    menuItems: [{ id: 'standard', bowl }, { id: 'lemonade' }],
    ingredients: [],
    lastUpdated: Date.now(),
  })
  const offline = await offlineKiosk(cached, siteId)
  assert.deepEqual(offline.keys, [`kiosk_data_v2_cafe:${siteId}`])
  assert.equal(offline.isOffline, true)
  assert.equal(offline.business.location.publicationId, 'approved')
  assert.equal(offline.menuItems[0].bowl.sourceVersion, 'approved-source')
  assert.equal(offline.menuItems[1].bowl, undefined)
  const { groups, fixed } = offline.menuItems[0].bowl
  assert.equal(evaluateBowl(groups, defaultBowlChoices(groups), [milk], fixed).assessments[0].warnings[0].level, 'may_contain')
})

test('location review identifies dish, ingredient and supplier answers and blocks publication', async () => {
  const fingerprint = 'a'.repeat(32)
  const params = { params: Promise.resolve({ slug: 'dublin' }) }
  const writes = []
  const stock = {
    id: 'stock', name: 'Stock', status: 'active', allergen_warnings: complete,
    supplier_profiles: {
      current: { supplier_name: 'Supplier', brand: 'Brand', allergen_warnings: withoutEggs, assessment_status: 'needs_review' },
      other: { supplier_name: 'Other', allergen_warnings: { ...complete, nuts_levels: { almonds: 'traces' } } },
    },
  }
  const soup = { id: 'soup', name: 'Soup', ingredient_assessments: [stock] }
  const cake = { id: 'cake', name: 'Cake', ingredient_assessments: [], allergen_warnings: withoutEggs }
  const candidate = { fingerprint, items: [soup, cake] }
  const route = loader({
    'next/server': { NextResponse: Response },
    '@/lib/server/location-allergens': {
      locationAllergenContext: async () => ({
        site: { id: 'site', jurisdiction: 'IE' },
        role: 'manager',
        supabase: { rpc: async (name, args) => {
          if (name === 'review_site_allergens') return { data: candidate }
          writes.push(args)
          return { data: 'publication' }
        } },
      }),
      getGuidePublication: async () => null,
      locationAllergenFailure: error => { throw error },
      sourceFingerprint: z.string(),
    },
  })('app/api/sites/[slug]/allergens/route.ts')
  const review = await (await route.GET(new Request('https://example.test'), params)).json()
  assert.deepEqual(review.incomplete[0], {
    id: 'soup', name: 'Soup', problems: [
      { ingredientId: 'stock', ingredientName: 'Stock', variant: 'Supplier · Brand', allergen: 'eggs', kind: 'missing' },
      { ingredientId: 'stock', ingredientName: 'Stock', variant: 'Other', allergen: 'nuts', kind: 'inconsistent_subtypes' },
    ],
  })
  assert.deepEqual(review.incomplete[1], { id: 'cake', name: 'Cake', problems: [{ allergen: 'eggs', kind: 'missing' }] })
  const publish = () => route.POST(new Request('https://example.test', {
    method: 'POST', body: JSON.stringify({ fingerprint, reviewed: true }),
  }), params)
  assert.equal((await publish()).status, 409)
  assert.equal(writes.length, 0)
  cake.allergen_warnings = complete
  stock.supplier_profiles.current.allergen_warnings = complete
  stock.supplier_profiles.other.allergen_warnings = complete
  assert.equal((await publish()).status, 200)
  assert.equal(writes[0].p_items[0].ingredient_assessments, undefined)
  assert.equal(writes[0].p_items[0].allergen_warnings.assessment_incomplete, undefined)
})

test('incomplete kiosk messages are available in all six languages', () => {
  const { kioskPortalTranslations } = load('lib/kiosk-portal-translations.ts')
  for (const { kioskPortal } of Object.values(kioskPortalTranslations)) {
    assert.ok(kioskPortal.incompleteCell)
    assert.ok(kioskPortal.incompleteFilterNotice)
    assert.ok(kioskPortal.incompleteItemNotice)
    assert.match(kioskPortal.incompleteNamedItemNotice, /\{allergens\}/)
  }
})

test('downloadable guide identifies incomplete allergens and embeds the bundled AllyJen logo in its footer', async () => {
  const branding = loader({
    fetch: async url => {
      assert.equal(url, '/allyjen-logo.png')
      return new Response(fs.readFileSync('public/allyjen-logo.png'), { headers: { 'Content-Type': 'image/png' } })
    },
    FileReader: class {
      async readAsDataURL(blob) {
        this.result = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`
        this.onloadend()
      }
    },
  })('lib/pdf/pdfBranding.ts')
  const { generateAllergenTablePDF } = loader({
    './menuItemSource': load('lib/pdf/menuItemSource.ts'),
    './pdfBranding': branding,
  })('lib/pdf/allergenTablePDF.ts')
  const output = await generateAllergenTablePDF({
    business: { name: 'Café' }, outputMode: 'base64',
    items: [
      { id: 'soup', name: 'Soup', itemType: 'menu_item', category: 'Lunch', allergen_warnings: withoutEggs },
      { id: 'cake', name: 'Cake', itemType: 'menu_item', category: 'Lunch', allergen_warnings: { ...complete, nuts: 'traces' } },
    ],
  })
  const bytes = Buffer.from(output, 'base64')
  const { PDFDocument, PDFName, PDFDict, PDFNumber } = require('pdf-lib')
  const pdf = await PDFDocument.load(bytes)
  const [page] = pdf.getPages()
  const images = page.node.Resources().lookup(PDFName.of('XObject'), PDFDict)
  const [[imageName, imageRef]] = images.entries()
  const { dict: image } = pdf.context.lookup(imageRef)
  assert.equal(image.lookup(PDFName.of('Width'), PDFNumber).asNumber(), 512)
  assert.equal(image.lookup(PDFName.of('Height'), PDFNumber).asNumber(), 512)
  assert.equal(page.node.Contents().getContentsString().split(`${imageName} Do`).length - 1, 2, 'header and footer both draw the logo')

  const { text } = await require('pdf-parse')(bytes)
  assert.match(text, /Incomplete allergen information\s*\(Eggs\).*Check\s+with staff/)
  assert.match(text, /Incomplete allergen information\s*\(Tree Nuts\)/)
  assert.ok(text.includes('?'))

  const lines = text.trim().split('\n')
  const extracted = lines.join(' ').replace(/\s+/g, ' ')
  for (const heading of ['Allergen Information', 'Item']) {
    assert.equal(lines.filter(line => line === heading).length, 1, heading)
  }
  // pdf-parse joins rotated labels whose baselines share the same Y coordinate.
  for (const label of ['Gluten', 'Crustaceans']) {
    assert.equal(text.split(label).length - 1, 1, label)
  }
  const expected = [
    'Cake May contain: Tree Nuts Incomplete allergen information (Tree Nuts). Check with staff.',
    'Soup Incomplete allergen information (Eggs). Check with staff. ?',
  ]
  assert.ok(extracted.includes(expected.join(' ')), extracted)
  assert.equal(extracted.match(/\b(?:Cake|Soup)\b/g)?.length, 2)
  assert.doesNotMatch(text, /\u0000/)
})

test('bowl defaults, removals and swaps preserve warnings from the remaining ingredients', () => {
  const { defaultBowlChoices, evaluateBowl } = load('lib/bowl-selection.ts')
  const base = { id: 'base', name: 'Base', warnings: complete, dietary: ['Vegan', 'Vegetarian'] }
  const nutWarnings = { ...complete, nuts: 'contains', nuts_levels: { almonds: 'contains' } }
  const granola = { ...base, id: 'granola', name: 'Granola', warnings: nutWarnings }
  const flakes = { ...base, id: 'flakes', name: 'Flakes', warnings: nutWarnings }
  const crumble = { ...base, id: 'crumble', warnings: withoutEggs, dietary: [] }
  const drizzle = { ...base, id: 'drizzle', warnings: { ...complete, milk: 'may_contain' }, dietary: ['Vegetarian'] }
  const groups = [
    { name: 'Base', kind: 'required', defaults: ['base'], options: [base] },
    { name: 'Toppings', kind: 'multiple', defaults: ['granola'], options: [granola, flakes, crumble] },
    { name: 'Drizzle', kind: 'optional', defaults: [], options: [drizzle] },
  ]
  const defaults = defaultBowlChoices(groups)
  const allergens = [{ allergen: 'nuts', subtype: 'almonds' }, eggs, milk]
  assert.deepEqual(evaluateBowl(groups, defaults, allergens).assessments[0].warnings.map(row => row.ingredient.id), ['granola'])
  const swapped = evaluateBowl(groups, { ...defaults, Toppings: ['flakes', 'crumble'], Drizzle: ['drizzle'] }, allergens)
  assert.deepEqual(swapped.assessments[0].warnings.map(row => row.ingredient.id), ['flakes'])
  assert.deepEqual(swapped.assessments[1].incomplete.map(row => row.id), ['crumble'])
  assert.equal(swapped.assessments[2].warnings[0].level, 'may_contain')
  assert.deepEqual(swapped.dietary, [])
  const cleared = evaluateBowl(groups, { ...defaults, Toppings: [], Drizzle: ['drizzle'] }, allergens)
  assert.ok(!cleared.assessments[0].warnings.length && !cleared.assessments[1].incomplete.length)
  assert.deepEqual(cleared.dietary, ['Vegetarian'])
  for (const choices of [{ ...defaults, Base: [] }, { ...defaults, Toppings: ['unknown'] }]) {
    const invalid = evaluateBowl(groups, choices, allergens)
    assert.equal(invalid.ready, false)
    assert.deepEqual(invalid.dietary, [])
  }
})

test('fictional bowl checks the full saved recipe, all choices and distinct supplier findings', () => {
  const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const [base, swap, topping, flakes, drizzle, berries] = [1, 2, 3, 4, 5, 6].map(id)
  const { reviewBowlSource, validateBowlSource } = load('lib/server/bowl-guide.ts')
  const { defaultBowlChoices, evaluateBowl } = load('lib/bowl-selection.ts')
  const certifications = ['Vegan', 'Vegetarian', 'Gluten-Free']
  const sourceIngredient = (id, name, warnings, variants = [], labels = certifications) =>
    ({ id, name, status: 'active', allergen_warnings: { ...complete, ...warnings }, certifications: labels, variants })
  const source = {
    configuration: {
      fixed: [berries],
      groups: [
        { name: 'Base', kind: 'required', options: [base, swap], defaults: [base] },
        { name: 'Toppings', kind: 'multiple', options: [topping, flakes], defaults: [topping, flakes] },
        { name: 'Drizzle', kind: 'optional', options: [drizzle], defaults: [] },
      ],
    },
    recipe: [base, topping, flakes, berries],
    ingredients: [
      sourceIngredient(base, 'Fixture açaí', {}),
      sourceIngredient(swap, 'Fixture oat base', { cereals_gluten: 'contains', cereals_gluten_levels: { oats: 'contains' } }),
      sourceIngredient(topping, 'Fixture almond granola', { nuts: 'contains', nuts_levels: { almonds: 'contains' } }),
      sourceIngredient(flakes, 'Fixture almond flakes', { nuts: 'contains', nuts_levels: { almonds: 'contains' } }, [{
        supplier: 'Fixture supplier', status: 'assessed', certifications,
        warnings: { ...complete, nuts: 'may_contain', nuts_levels: { almonds: 'may_contain' } },
      }]),
      sourceIngredient(drizzle, 'Fixture chocolate drizzle', { milk: 'contains' }, [], ['Vegetarian']),
      sourceIngredient(berries, 'Fixture fixed berries', {}),
    ],
  }
  assert.match(validateBowlSource({ ...source, recipe: [...source.recipe, id(900)] }).error, /standard recipe/)
  assert.match(validateBowlSource({ ...source, ingredients: source.ingredients.slice(1) }).error, /available/)
  const { bowl, problems } = reviewBowlSource(source)
  assert.deepEqual(problems, [])
  const defaults = defaultBowlChoices(bowl.groups)
  const allergens = [{ allergen: 'nuts', subtype: 'almonds' }, { allergen: 'cereals_gluten', subtype: 'oats' }, milk]
  const run = changes => evaluateBowl(bowl.groups, { ...defaults, ...changes }, allergens, bowl.fixed)
  assert.deepEqual(new Set(run().selected.map(row => row.id)), new Set(source.recipe))
  assert.deepEqual(run().dietary, certifications)
  assert.deepEqual(run({ Toppings: [flakes] }).assessments[0].warnings.map(row => [row.ingredient.id, row.level]),
    [[flakes, 'contains'], [flakes, 'may_contain']])
  assert.equal(run({ Base: [swap] }).assessments[1].warnings[0].ingredient.id, swap)
  assert.ok(!run({ Base: [swap] }).dietary.includes('Gluten-Free'))
  assert.equal(run({ Drizzle: [drizzle] }).assessments[2].warnings[0].ingredient.id, drizzle)
  assert.deepEqual(run({ Drizzle: [drizzle] }).dietary, ['Vegetarian'])
  const incompleteSource = structuredClone(source)
  delete incompleteSource.ingredients[3].variants[0].warnings.eggs
  const incomplete = reviewBowlSource(incompleteSource)
  assert.ok(incomplete.problems.some(problem => problem.ingredientId === flakes && problem.allergen === 'eggs'))
  assert.notEqual(incomplete.bowl.sourceVersion, bowl.sourceVersion)
  assert.deepEqual(evaluateBowl(incomplete.bowl.groups, defaults, [eggs], bowl.fixed).assessments[0].incomplete.map(row => row.id), [flakes])
})

test('a fixed base and 28 ordered, optional toppings retain all source warnings', () => {
  const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const { reviewBowlSource, validateBowlSource } = load('lib/server/bowl-guide.ts')
  const { defaultBowlChoices, evaluateBowl } = load('lib/bowl-selection.ts')
  const sourceIngredient = (id, name, warnings = {}, variants = []) =>
    ({ id, name, status: 'active', allergen_warnings: { ...complete, ...warnings }, certifications: [], variants })
  const optionIds = Array.from({ length: 28 }, (_, index) => id(index + 1))
  const [spread, whey] = optionIds
  const almonds = optionIds.at(-1)
  const base = id(100), backup = id(101)
  const group = {
    name: 'Toppings | Unlimited', kind: 'multiple', defaults: [],
    options: [
      { id: spread, label: 'Fixture chocolate cream', additionalIngredientIds: [backup] },
      { id: whey, label: 'Fixture whey (dry scoop)', additionalIngredientIds: [] },
      ...optionIds.slice(2),
    ],
  }
  const source = {
    configuration: { fixed: [base], groups: [group] },
    recipe: [base],
    ingredients: [
      sourceIngredient(base, 'Fixture Açaí'),
      sourceIngredient(backup, 'Fixture backup spread', { soybeans: 'contains' }),
      ...optionIds.map((id, index) => {
        if (id === spread) return sourceIngredient(id, 'Fixture spread', { milk: 'contains' })
        if (id !== almonds) return sourceIngredient(id, `Fixture topping ${index + 1}`)
        const nuts = { nuts: 'contains', nuts_levels: { almonds: 'contains' } }
        return sourceIngredient(id, 'Fixture almonds', nuts, [
          { supplier: 'Fixture A', status: 'assessed', warnings: { ...complete, ...nuts, peanuts: 'may_contain' } },
          { supplier: 'Fixture B', status: 'assessed', warnings: { ...complete, ...nuts, sesame: 'may_contain' } },
        ])
      }),
    ],
  }
  const { bowl, problems } = reviewBowlSource(source)
  assert.deepEqual(problems, [])
  assert.deepEqual(bowl.groups[0].options.map(option => option.id), optionIds)
  assert.equal(bowl.groups[0].options[1].name, 'Fixture whey (dry scoop)')
  assert.deepEqual(bowl.groups[0].options[0].linkedIngredients.map(row => row.id), [spread, backup])
  const allergens = [milk, { allergen: 'soybeans' }, { allergen: 'nuts', subtype: 'almonds' },
    { allergen: 'peanuts' }, { allergen: 'sesame' }]
  const run = choices => evaluateBowl(bowl.groups, choices, allergens, bowl.fixed)
  assert.deepEqual(run(defaultBowlChoices(bowl.groups)).selected.map(row => row.id), [base])
  assert.deepEqual(run({ [group.name]: [spread, almonds] }).assessments.map(row => row.warnings.map(warning =>
    [warning.ingredient.id, warning.level])), [
    [[spread, 'contains']], [[spread, 'contains']], [[almonds, 'contains']],
    [[almonds, 'may_contain']], [[almonds, 'may_contain']],
  ])
  assert.equal(run({ [group.name]: optionIds }).ready, true)
  assert.equal(run({ [group.name]: optionIds }).selected.length, 29)
  assert.match(validateBowlSource({ ...source, ingredients: source.ingredients.filter(row => row.id !== backup) }).error,
    /available/)
  const pending = structuredClone(source)
  pending.ingredients[1].variants = [{ supplier: 'Fixture backup', status: 'needs_review', warnings: complete }]
  assert.ok(reviewBowlSource(pending).problems.some(problem => problem.ingredientId === backup))
  const defaulted = structuredClone(source)
  defaulted.configuration.groups[0].defaults.push(spread)
  assert.match(validateBowlSource(defaulted).error, /standard recipe/)
  defaulted.recipe.push(spread, backup)
  assert.ok(validateBowlSource(defaulted).config)
})
