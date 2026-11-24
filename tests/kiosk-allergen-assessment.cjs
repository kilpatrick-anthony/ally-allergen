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
    new Function('exports', 'require', 'localStorage', 'window', 'document', 'fetch', source)(
      exports,
      name => Object.hasOwn(mocks, name) ? mocks[name] : name.startsWith('@/') ? loadFile(name.slice(2) + '.ts') : require(name),
      mocks.localStorage, mocks.window, mocks.document, mocks.fetch,
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
  const { useOfflineKioskData } = loader({
    react, localStorage: { getItem: () => cached },
    fetch: async () => Response.json({ error: 'Offline' }, { status: 503 }),
  })('lib/hooks/useOfflineKioskData.ts')
  useOfflineKioskData('cafe')
  effects[0]()
  await new Promise(resolve => setImmediate(resolve))
  index = 0
  const offline = useOfflineKioskData('cafe')
  assert.equal(offline.isOffline, true)
  assert.equal(offline.isStale, true)
  const soup = offline.menuItems[0]
  const [old, oldRecipe] = offline.menuItems.slice(-2)
  assert.equal(evaluateAllergenSelections(soup.allergen_warnings, [milk], soup).matches, true)
  assert.equal(evaluateAllergenSelections(soup.allergen_warnings, [milk, eggs], soup).incomplete, true)
  assert.equal(evaluateAllergenSelections(old.allergen_warnings, [milk], old).incomplete, true)
  assert.equal(evaluateAllergenSelections(oldRecipe.allergen_warnings, [milk], oldRecipe).incomplete, true)
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

test('downloadable guide identifies the particular allergen with incomplete information', async () => {
  const { generateAllergenTablePDF } = loader({
    './menuItemSource': load('lib/pdf/menuItemSource.ts'),
    './pdfBranding': { hexToRgb: () => [0, 56, 66], fetchAllyJenLogoDataUrl: async () => null, drawPageFooters: async () => {} },
  })('lib/pdf/allergenTablePDF.ts')
  const output = await generateAllergenTablePDF({
    business: { name: 'Café' }, outputMode: 'base64',
    items: [
      { id: 'soup', name: 'Soup', itemType: 'menu_item', category: 'Lunch', allergen_warnings: withoutEggs },
      { id: 'cake', name: 'Cake', itemType: 'menu_item', category: 'Lunch', allergen_warnings: { ...complete, nuts: 'traces' } },
    ],
  })
  const { text } = await require('pdf-parse')(Buffer.from(output, 'base64'))
  assert.match(text, /Incomplete allergen information\s*\(Eggs\).*Check\s+with staff/)
  assert.match(text, /Incomplete allergen information\s*\(Tree Nuts\)/)
  assert.ok(text.includes('?'))
})
