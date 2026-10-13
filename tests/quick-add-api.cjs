// Run with: node --test tests/quick-add-api.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { setup, uuid, business, otherBusiness, actor, colleague, site, supplier, fields, request, params, listRequest } = require('./helpers/quick-add-harness.cjs')

test('captures a minimal ingredient or product without creating inventory or suppliers', async () => {
  for (const kind of ['ingredient', 'packaged_product']) {
    const s = setup()
    const result = await s.collection.POST(request({ ...fields, id: uuid(10), kind, name: '  Bread  ', site_id: null, supplier_name: '', notes: '' }))
    assert.equal(result.status, 201)
    assert.equal(result.body.draft.name, 'Bread')
    assert.equal(result.body.draft.category, 'Bakery')
    assert.equal(result.body.draft.status, 'draft')
    assert.equal(s.rows[0].business_id, business)
    assert.equal(s.rows[0].created_by, actor)
    assert.deepEqual(s.writes, ['quick_add_drafts'])
  }
})

test('requires a valid session and live business role despite a cached owner claim', async () => {
  for (const [options, status] of [[{ token: null }, 401], [{ token: 'expired' }, 401], [{ membership: false }, 403], [{ role: 'removed' }, 403]]) {
    const s = setup(options)
    assert.equal((await s.collection.GET(listRequest())).status, status)
    assert.equal((await s.collection.POST(request({ ...fields, id: uuid(10) }))).status, status)
    assert.equal((await s.item.GET({}, params(uuid(10)))).status, status)
    assert.equal((await s.item.PATCH(request({ ...fields, version: 1 }), params(uuid(10)))).status, status)
  }
})

test('validates inputs and rejects client attempts to set ownership, approval state or invalid assessments', async () => {
  const s = setup()
  const valid = { ...fields, id: uuid(10) }
  for (const input of [null, {}, { ...valid, name: ' ' }, { ...valid, name: 'x'.repeat(201) }, { ...valid, category: 'x'.repeat(201) }, { ...valid, notes: 'x'.repeat(2001) }, { ...valid, id: 'bad' }, { ...valid, business_id: otherBusiness }, { ...valid, created_by: colleague }, { ...valid, status: 'approved' }, { ...valid, allergen_warnings: { milk: 'unsafe-value' } }, { ...valid, allergen_warnings: { invented: 'none' } }, { ...valid, dietary_tags: ['Invented'] }, { ...valid, dietary_checked: true }]) {
    assert.equal((await s.collection.POST(request(input))).status, 400)
  }
  assert.equal(s.rows.length, 0)
})

test('validates location and supplier ownership and stores the selected supplier name', async () => {
  const s = setup()
  assert.equal((await s.collection.POST(request({ ...fields, id: uuid(10), site_id: uuid(99) }))).status, 400)
  assert.equal((await s.collection.POST(request({ ...fields, id: uuid(10), supplier_id: uuid(99) }))).status, 400)
  const result = await s.collection.POST(request({ ...fields, id: uuid(10), supplier_id: supplier, supplier_name: 'Forged name' }))
  assert.equal(result.body.draft.supplier_name, 'Existing supplier')
})

test('retries and concurrent creates produce one draft; reusing an ID with changed fields conflicts', async () => {
  const s = setup(), payload = { ...fields, id: uuid(10) }
  const results = await Promise.all([s.collection.POST(request(payload)), s.collection.POST(request(payload))])
  assert.ok(results.every(result => [200, 201].includes(result.status)))
  assert.equal(s.rows.length, 1)
  assert.equal((await s.collection.POST(request(payload))).status, 200)
  assert.equal((await s.collection.POST(request({ ...payload, name: 'Different product' }))).status, 409)
  assert.equal(s.rows[0].name, 'Bread')
  s.seed(uuid(11), { business_id: otherBusiness })
  assert.equal((await s.collection.POST(request({ ...payload, id: uuid(11) }))).status, 409)
})

test('staff cannot list, read or update another staff member or business draft', async () => {
  const s = setup()
  s.seed(uuid(10)); s.seed(uuid(11), { created_by: colleague }); s.seed(uuid(12), { business_id: otherBusiness })
  assert.equal((await s.collection.GET(listRequest())).body.drafts.length, 1)
  for (const id of [uuid(11), uuid(12)]) {
    assert.equal((await s.item.GET({}, params(id))).status, 404)
    assert.equal((await s.item.PATCH(request({ ...fields, version: 1 }), params(id))).status, 404)
  }
})

test('deleting a capture respects ownership, allows every approval status and removes stored label photos', async () => {
  const s = setup()
  s.seed(uuid(10))
  s.seed(uuid(11), { created_by: colleague })
  s.seed(uuid(12), { status: 'ready_for_review' })
  s.seed(uuid(13), { status: 'approved', ingredient_id: uuid(20) })
  s.photos.push({ id: uuid(30), draft_id: uuid(10), business_id: business, state: 'ready' })
  s.objects.set(`${business}/${uuid(10)}/${uuid(30)}.jpg`, Buffer.from('label'))
  assert.equal((await s.item.DELETE({}, params(uuid(11)))).status, 404)
  assert.equal((await s.item.DELETE({}, params(uuid(12)))).status, 200)
  assert.equal((await s.item.DELETE({}, params(uuid(13)))).status, 200)
  assert.equal((await s.item.DELETE({}, params(uuid(10)))).status, 200)
  assert.equal(s.rows.some(row => [uuid(10), uuid(12), uuid(13)].includes(row.id)), false)
  assert.equal(s.objects.size, 0)
})

test('owners and managers can edit colleague drafts but never other businesses', async () => {
  for (const role of ['owner', 'manager']) {
    const s = setup({ role })
    s.seed(uuid(10), { created_by: colleague }); s.seed(uuid(11), { business_id: otherBusiness })
    assert.equal((await s.collection.GET(listRequest())).body.drafts.length, 1)
    const result = await s.item.PATCH(request({ ...fields, name: 'Updated', version: 1 }), params(uuid(10)))
    assert.equal(result.status, 200)
    assert.equal(result.body.draft.version, 2)
    assert.equal(result.body.draft.created_by, colleague)
    assert.equal(s.rows[0].updated_by, actor)
    assert.equal((await s.item.PATCH(request({ ...fields, version: 1 }), params(uuid(11)))).status, 404)
  }
})

test('stale versions and racing editors cannot overwrite a draft', async () => {
  const s = setup()
  s.seed(uuid(10))
  s.race()
  const result = await s.item.PATCH(request({ ...fields, name: 'Lost update', version: 1 }), params(uuid(10)))
  assert.equal(result.status, 409)
  assert.equal(s.rows[0].name, 'Bread')
  assert.equal((await s.item.PATCH(request({ ...fields, version: 1 }), params(uuid(10)))).status, 409)
  s.rows[0].status = 'ready_for_review'
  assert.equal((await s.item.PATCH(request({ ...fields, version: 2 }), params(uuid(10)))).status, 409)
})

test('pages a business draft list without silently dropping additional records', async () => {
  const s = setup()
  for (let i = 10; i < 65; i++) s.seed(uuid(i))
  const first = await s.collection.GET(listRequest())
  const second = await s.collection.GET(listRequest(first.body.nextOffset))
  assert.equal(first.body.drafts.length, 50)
  assert.equal(second.body.drafts.length, 5)
  assert.equal(second.body.nextOffset, null)
  assert.equal(new Set([...first.body.drafts, ...second.body.drafts].map(row => row.id)).size, 55)
  assert.equal((await s.collection.GET(listRequest(-1))).status, 400)
})

test('invalid IDs and database errors produce controlled responses', async () => {
  assert.equal((await setup().item.GET({}, params('bad'))).status, 400)
  assert.equal((await setup({ dbFailure: true }).collection.GET(listRequest())).status, 503)
})

test('review transition API rejects staff approval, forged actor fields and cross-business access before RPC', async () => {
  const payload = { request_id: uuid(50), action: 'submit', version: 1 }
  for (const action of ['approve', 'review', 'return']) {
    const s = setup(); s.seed(uuid(10))
    const review = require('./helpers/quick-add-review-db.cjs').completeReview()
    const response = await s.transition.POST(request({ ...payload, action, ...(action === 'review' ? { review } : {}), ...(action === 'return' ? { note: 'Fix this' } : {}) }), params(uuid(10)))
    assert.equal(response.status,403)
  }
  const s = setup({ role: 'manager' }); s.seed(uuid(10)); s.seed(uuid(11), { business_id: otherBusiness })
  let calls = 0; s.db.rpc = async () => { calls++; return {} }
  assert.equal((await s.transition.POST(request({ ...payload, actor_id: colleague }),params(uuid(10)))).status,400)
  assert.equal((await s.transition.POST(request(payload),params(uuid(11)))).status,404)
  assert.equal(calls,0)
})

test('review RPC uses the verified actor, returns controlled validation errors and exposes live permissions', async () => {
  const s = setup({ role:'manager' }); s.seed(uuid(10))
  const response = await s.item.GET({},params(uuid(10)))
  assert.equal(response.body.permissions.canReview,true)
  assert.equal(response.body.permissions.isCreator,true)
  s.db.rpc = async (name,args) => {
    assert.equal(name,'transition_quick_add');assert.equal(args.p_actor,actor);assert.equal(args.p_business,business)
    return { error:{message:'missingAllergens'} }
  }
  const result = await s.transition.POST(request({request_id:uuid(50),action:'approve',version:1}),params(uuid(10)))
  assert.equal(result.status,400);assert.equal(result.body.error,'missingAllergens')
})

test('review queue filters states and includes only accessible captures', async () => {
  const s=setup();s.seed(uuid(10));s.seed(uuid(11),{status:'ready_for_review'});s.seed(uuid(12),{status:'ready_for_review',created_by:colleague})
  const result=await s.collection.GET({nextUrl:new URL('https://test/api/quick-add-drafts?status=ready_for_review')})
  assert.equal(result.body.drafts.length,1);assert.equal(result.body.drafts[0].id,uuid(11))
  assert.equal((await s.collection.GET({nextUrl:new URL('https://test/api/quick-add-drafts?status=invalid')})).status,400)
})


test('captures optional allergens and tags, replays JSON values and preserves them for older edit clients', async () => {
  const s=setup()
  const capture={...fields,id:uuid(10),allergen_warnings:{milk:'contains',nuts:'may_contain',nuts_levels:{almonds:'may_contain'}},dietary_tags:['Vegetarian','Organic']}
  const created=await s.collection.POST(request(capture));assert.equal(created.status,201)
  assert.equal(created.body.draft.allergen_warnings.milk,'contains');assert.equal(created.body.draft.allergen_warnings.eggs,undefined)
  assert.deepEqual(Array.from(created.body.draft.dietary_tags),['Organic','Vegetarian'])
  assert.equal((await s.collection.POST(request({...capture,allergen_warnings:{nuts_levels:{almonds:'may_contain'},nuts:'may_contain',milk:'contains'},dietary_tags:['Organic','Vegetarian']}))).status,200)
  assert.equal((await s.collection.POST(request({...capture,dietary_tags:[]}))).status,409)
  const edited=await s.item.PATCH(request({...fields,version:1,name:'Updated'}),params(uuid(10)))
  assert.equal(edited.status,200);assert.equal(edited.body.draft.allergen_warnings.milk,'contains');assert.equal(edited.body.draft.dietary_tags.length,2)
  const cleared=await s.item.PATCH(request({...fields,version:2,allergen_warnings:{},dietary_tags:[]}),params(uuid(10)))
  assert.equal(cleared.status,200);assert.equal(Object.keys(cleared.body.draft.allergen_warnings).length,0);assert.equal(cleared.body.draft.dietary_tags.length,0)
  assert.equal(s.writes.every(table=>table==='quick_add_drafts'),true)
})

test('captures category and preserves it when an older edit client omits the field', async () => {
  const s = setup()
  const created = await s.collection.POST(request({ ...fields, id: uuid(10), category: 'Bakery' }))
  assert.equal(created.status, 201)
  assert.equal(created.body.draft.category, 'Bakery')
  const { category: _category, ...olderFields } = fields
  const edited = await s.item.PATCH(request({ ...olderFields, name: 'Updated bread', version: 1 }), params(uuid(10)))
  assert.equal(edited.status, 200)
  assert.equal(edited.body.draft.category, 'Bakery')
})

test('captures a prepared recipe only with ingredients owned by the business', async () => {
  const s = setup()
  const prepared = { ...fields, id: uuid(10), kind: 'prepared_item', supplier_id: null, supplier_name: '', ingredient_ids: [uuid(20), uuid(21)] }
  const created = await s.collection.POST(request(prepared))
  assert.equal(created.status, 201)
  assert.deepEqual(Array.from(created.body.draft.ingredient_ids), [uuid(20), uuid(21)])
  assert.equal((await s.collection.POST(request({ ...prepared, id: uuid(11), ingredient_ids: [uuid(22)] }))).status, 400)
  assert.equal((await s.collection.POST(request({ ...prepared, id: uuid(12), ingredient_ids: Array(101).fill(uuid(20)) }))).status, 400)
})

test('prepared approval uses the dedicated atomic promotion function', async () => {
  const s = setup({ role: 'manager' })
  s.seed(uuid(10), { kind: 'prepared_item', status: 'ready_for_review', ingredient_ids: [uuid(20)] })
  s.db.rpc = async (name, args) => {
    assert.equal(name, 'approve_quick_add_prepared')
    assert.equal(args.p_actor, actor)
    return {}
  }
  assert.equal((await s.transition.POST(request({ request_id: uuid(50), action: 'approve', version: 1 }), params(uuid(10)))).status, 200)
})

test('dashboard counts include all pending captures and preserve live ownership boundaries', async () => {
  const s = setup()
  for (let i = 0; i < 65; i++) s.rows.push({ id: uuid(100+i), business_id: business, created_by: actor, status: 'draft' })
  s.rows.push({ id: uuid(200), business_id: business, created_by: colleague, status: 'ready_for_review' },
    { id: uuid(201), business_id: otherBusiness, created_by: actor, status: 'draft' },
    { id: uuid(202), business_id: business, created_by: actor, status: 'approved' })
  const query = { nextUrl: new URL('https://example.invalid/api/quick-add-drafts?summary=true') }
  assert.deepEqual(JSON.parse(JSON.stringify((await s.collection.GET(query)).body)), { drafts: 65, reviews: 0 })
  s.setRole('manager')
  assert.deepEqual(JSON.parse(JSON.stringify((await s.collection.GET(query)).body)), { drafts: 65, reviews: 1 })
  s.setRole('removed')
  assert.equal((await s.collection.GET(query)).status, 403)
  assert.equal((await setup({ token: null }).collection.GET(query)).status, 401)
  assert.equal((await setup({ dbFailure: true }).collection.GET(query)).status, 503)
})

test('barcode lookup is authenticated, validates input and maps only positive product claims', async () => {
  const s = setup()
  const result = await s.productBarcode.GET({ nextUrl: new URL('https://test/api/product-barcode?barcode=3017624010701') })
  assert.equal(result.status, 200)
  assert.equal(result.body.suggestions.name, 'Example Brand Chocolate Biscuits')
  assert.equal(result.body.suggestions.category, 'Biscuits')
  assert.equal(result.body.suggestions.supplier_name, '')
  assert.equal(result.body.suggestions.allergen_warnings.cereals_gluten, 'contains')
  assert.equal(result.body.suggestions.allergen_warnings.cereals_gluten_levels.wheat, 'contains')
  assert.equal(result.body.suggestions.allergen_warnings.nuts_levels.hazelnuts, 'contains')
  assert.equal(result.body.suggestions.allergen_warnings.sesame, 'may_contain')
  assert.equal(result.body.suggestions.allergen_warnings.eggs, undefined)
  assert.deepEqual(Array.from(result.body.suggestions.dietary_tags), ['Vegetarian', 'Fair Trade'])
  const request = s.gatewayRequests.at(-1)
  assert.match(String(request.url), /api\/v3\/product\/3017624010701/)
  assert.match(request.options.headers['User-Agent'], /^AllyJen\//)
  assert.equal(request.options.cache, 'no-store')

  assert.equal((await s.productBarcode.GET({ nextUrl: new URL('https://test/api/product-barcode?barcode=123') })).status, 400)
  assert.equal((await setup({ token: null }).productBarcode.GET({ nextUrl: new URL('https://test/api/product-barcode?barcode=3017624010701') })).status, 401)
})

test('barcode lookup distinguishes missing products from provider failures', async () => {
  const missing = setup(); missing.failures.barcodeMissing = true
  const url = new URL('https://test/api/product-barcode?barcode=3017624010701')
  const notFound = await missing.productBarcode.GET({ nextUrl: url })
  assert.equal(notFound.status, 404); assert.equal(notFound.body.error, 'barcodeNotFound')
  const failed = setup(); failed.failures.barcode = true
  const unavailable = await failed.productBarcode.GET({ nextUrl: url })
  assert.equal(unavailable.status, 503); assert.equal(unavailable.body.error, 'barcodeUnavailable')
})
