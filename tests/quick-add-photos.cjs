const { test } = require('node:test')
const assert = require('node:assert/strict')
const sharp = require('sharp')
const { setup, uuid, otherBusiness, colleague, params } = require('./helpers/quick-add-harness.cjs')
const route = (id = uuid(10), photoId = uuid(20)) => ({ params: Promise.resolve({ id, photoId }) })
const fixture = () => sharp({ create: { width: 40, height: 20, channels: 3, background: '#aabbcc' } }).png().toBuffer()
const upload = bytes => new Request('https://test/photo', { method: 'PUT', body: bytes })

test('photo reads, uploads and removals require live session, role, business and draft ownership', async () => {
  const bytes = await fixture()
  for (const [options, overrides, status] of [
    [{ token: null }, {}, 401], [{ token: 'expired' }, {}, 401], [{ membership: false }, {}, 403],
    [{ role: 'removed' }, {}, 403], [{}, { business_id: otherBusiness }, 404], [{}, { created_by: colleague }, 404],
  ]) {
    const s = setup(options); s.seed(uuid(10), overrides)
    assert.equal((await s.photoCollection.GET({}, params(uuid(10)))).status, status)
    assert.equal((await s.photoItem.GET({}, route())).status, status)
    assert.equal((await s.photoItem.PUT(upload(bytes), route())).status, status)
    assert.equal((await s.photoItem.DELETE({}, route())).status, status)
    assert.equal(s.photos.length, 0); assert.equal(s.objects.size, 0)
  }
})

test('staff upload private evidence; retries are idempotent; content and draft IDs cannot be replaced', async () => {
  const s = setup(); s.seed(uuid(10)); s.seed(uuid(11))
  const bytes = await fixture()
  assert.equal((await s.photoItem.PUT(upload(bytes), route())).status, 200)
  assert.equal((await s.photoItem.PUT(upload(bytes), route())).status, 200)
  assert.equal(s.photos.length, 1); assert.equal(s.objects.size, 1)
  const other = await sharp(bytes).jpeg().toBuffer()
  assert.equal((await s.photoItem.PUT(upload(other), route())).status, 409)
  assert.equal((await s.photoItem.PUT(upload(bytes), route(uuid(11)))).status, 409)
  const list = await s.photoCollection.GET({}, params(uuid(10)))
  assert.equal(list.body.photos[0].state, 'ready')
  assert.equal(list.body.photos[0].business_id, undefined)
  const downloaded = await s.photoItem.GET({}, route())
  assert.equal(downloaded.headers.get('cache-control'), 'private, no-store')
  assert.equal(downloaded.headers.get('content-type'), 'image/jpeg')
  assert.equal((await sharp(Buffer.from(await downloaded.arrayBuffer())).metadata()).format, 'jpeg')
})

test('owners and managers manage colleague photos but cannot cross businesses', async () => {
  for (const role of ['owner', 'manager']) {
    const s = setup({ role }); s.seed(uuid(10), { created_by: colleague }); s.seed(uuid(11), { business_id: otherBusiness })
    assert.equal((await s.photoItem.PUT(upload(await fixture()), route())).status, 200)
    assert.equal((await s.photoItem.GET({}, route())).status, 200)
    assert.equal((await s.photoItem.GET({}, route(uuid(11)))).status, 404)
    assert.equal((await s.photoItem.DELETE({}, route())).status, 200)
  }
})

test('failed upload and failed finalization resume with the same ID and preserve the text draft', async () => {
  for (const failure of ['upload', 'finalize']) {
    const s = setup(); s.seed(uuid(10)); s.failures[failure] = true
    const bytes = await fixture()
    assert.equal((await s.photoItem.PUT(upload(bytes), route())).status, 503)
    assert.equal(s.rows[0].name, 'Bread'); assert.equal(s.photos[0].state, 'pending')
    assert.equal((await s.photoItem.GET({}, route())).status, 404)
    s.failures[failure] = false
    assert.equal((await s.photoItem.PUT(upload(bytes), route())).status, 200)
    assert.equal(s.photos.length, 1); assert.equal(s.photos[0].state, 'ready')
  }
})

test('removal revokes access even when storage cleanup fails and cannot be undone by upload retry', async () => {
  const s = setup(); s.seed(uuid(10)); const bytes = await fixture()
  await s.photoItem.PUT(upload(bytes), route())
  s.failures.remove = true
  assert.equal((await s.photoItem.DELETE({}, route())).status, 503)
  assert.equal((await s.photoItem.GET({}, route())).status, 404)
  assert.equal((await s.photoCollection.GET({}, params(uuid(10)))).body.photos.length, 0)
  assert.equal((await s.photoItem.PUT(upload(bytes), route())).status, 409)
  s.failures.remove = false
  assert.equal((await s.photoItem.DELETE({}, route())).status, 200)
  assert.equal((await s.photoItem.DELETE({}, route())).status, 200)
  assert.equal(s.objects.size, 0)
})

test('invalid bytes, disguised SVG, oversized input and malformed IDs do not reach storage', async () => {
  const s = setup(); s.seed(uuid(10))
  for (const [bytes, status] of [[Buffer.from('not an image'), 400], [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'), 415], [Buffer.alloc(4 * 1024 * 1024 + 1), 413]]) {
    assert.equal((await s.photoItem.PUT(upload(bytes), route())).status, status)
  }
  assert.equal((await s.photoItem.PUT(upload(await fixture()), route('bad'))).status, 400)
  assert.equal(s.photos.length, 0); assert.equal(s.objects.size, 0)
})

test('camera orientation is applied and metadata is stripped; future reviewed drafts reject photo mutations', async () => {
  const s = setup(); s.seed(uuid(10))
  const bytes = await sharp(await fixture()).jpeg().withMetadata({ orientation: 6 }).toBuffer()
  const { bytes: normalized } = await s.photoHelpers.normalizePhoto(bytes)
  const metadata = await sharp(normalized).metadata()
  assert.equal(metadata.width, 20); assert.equal(metadata.height, 40)
  assert.equal(metadata.exif, undefined); assert.equal(metadata.orientation, undefined)
  s.rows[0].status = 'ready_for_review'
  assert.equal((await s.photoItem.PUT(upload(bytes), route())).status, 409)
  assert.equal((await s.photoItem.DELETE({}, route())).status, 409)
})


test('concurrent upload retries converge and removal during upload cannot revive evidence', async () => {
  const s = setup(); s.seed(uuid(10)); const bytes = await fixture()
  const results = await Promise.all([s.photoItem.PUT(upload(bytes), route()), s.photoItem.PUT(upload(bytes), route())])
  assert.ok(results.every(result => result.status === 200))
  assert.equal(s.photos.length, 1); assert.equal(s.objects.size, 1)
  s.hooks.beforeUpload = async () => {
    s.hooks.beforeUpload = null
    assert.equal((await s.photoItem.DELETE({}, route(uuid(10), uuid(21)))).status, 200)
  }
  assert.equal((await s.photoItem.PUT(upload(bytes), route(uuid(10), uuid(21)))).status, 409)
  assert.equal((await s.photoItem.GET({}, route(uuid(10), uuid(21)))).status, 404)
  assert.equal(s.objects.size, 1)
})

test('approved evidence is business-accessible while unapproved and cross-business photos stay private', async () => {
  const s=setup();s.seed(uuid(10))
  await s.photoItem.PUT(upload(await fixture()),route())
  const evidenceRoute={params:Promise.resolve({photoId:uuid(20)})}
  assert.equal((await s.evidence.GET({},evidenceRoute)).status,404)
  Object.assign(s.rows[0],{status:'approved',ingredient_id:uuid(30),created_by:colleague})
  assert.equal((await s.photoItem.GET({},route())).status,404)
  const result=await s.evidence.GET({},evidenceRoute)
  assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'private, no-store')
  s.photos[0].business_id=otherBusiness
  assert.equal((await s.evidence.GET({},evidenceRoute)).status,404)
})

test('photo extraction requires draft access and returns review-only sanitised suggestions', async () => {
  const s = setup(); s.seed(uuid(10))
  await s.photoItem.PUT(upload(await fixture()), route())
  const extractionRequest = new Request('https://test/extract', { method: 'POST', headers: { 'x-vercel-oidc-token': 'test-token' } })
  const result = await s.photoExtract.POST(extractionRequest, route())
  assert.equal(result.status, 200)
  assert.equal(result.body.suggestions.name, 'AI Bakery Bread')
  assert.equal(result.body.suggestions.supplier_name, '')
  assert.equal(JSON.stringify(result.body.suggestions.allergen_warnings), JSON.stringify({ cereals_gluten: 'contains', nuts: 'may_contain', cereals_gluten_levels: { wheat: 'contains' }, nuts_levels: { hazelnuts: 'may_contain' } }))
  assert.equal(JSON.stringify(result.body.suggestions.dietary_tags), JSON.stringify(['Vegan']))
  assert.equal(s.rows[0].name, 'Bread')
  assert.equal(result.headers['Cache-Control'], 'private, no-store')
  assert.equal(s.gatewayRequests[0].url, 'https://ai-gateway.vercel.sh/v1/chat/completions')
  assert.equal(s.gatewayRequests[0].options.headers.Authorization, 'Bearer test-token')
  const gatewayBody = JSON.parse(s.gatewayRequests[0].options.body)
  assert.equal(gatewayBody.model, 'google/gemini-2.5-flash')
  assert.match(gatewayBody.messages[0].content[1].image_url.url, /^data:image\/jpeg;base64,/)

  const missingCredential = setup(); missingCredential.seed(uuid(10))
  await missingCredential.photoItem.PUT(upload(await fixture()), route())
  assert.equal((await missingCredential.photoExtract.POST(new Request('https://test/extract', { method: 'POST' }), route())).status, 503)
  assert.equal(missingCredential.gatewayRequests.length, 0)

  const foreign = setup(); foreign.seed(uuid(10), { business_id: otherBusiness })
  assert.equal((await foreign.photoExtract.POST(extractionRequest, route())).status, 404)
  s.rows[0].status = 'ready_for_review'
  assert.equal((await s.photoExtract.POST(extractionRequest, route())).status, 409)
})


test('staged photo scanning authenticates and normalizes evidence without creating a draft or storing files', async () => {
  const bytes = await fixture()
  const s = setup()
  const result = await s.stagedPhotoExtract.POST(new Request('https://test/extract', { method: 'POST', body: bytes, headers: { 'x-vercel-oidc-token': 'fixture-token' } }))
  assert.equal(result.status, 200)
  assert.equal(result.headers['Cache-Control'], 'private, no-store')
  assert.equal(result.body.suggestions.name, 'AI Bakery Bread')
  assert.equal(result.body.suggestions.allergen_warnings.milk, undefined)
  assert.equal(s.rows.length, 0); assert.equal(s.photos.length, 0); assert.equal(s.objects.size, 0); assert.equal(s.writes.length, 0)
  const request = JSON.parse(s.gatewayRequests[0].options.body)
  assert.equal(request.reasoning_effort, 'low')
  const image = request.messages[0].content[1].image_url.url
  assert.match(image, /^data:image\/jpeg;base64,/)
  const metadata = await sharp(Buffer.from(image.split(',')[1], 'base64')).metadata()
  assert.equal(metadata.format, 'jpeg')
  assert.equal(metadata.exif, undefined)
})

test('staged photo scanning rejects expired sessions, removed roles, oversized and disguised images before inference', async () => {
  const bytes = await fixture()
  const request = (data = bytes, headers = {}) => new Request('https://test/extract', { method: 'POST', body: data, headers: { 'x-vercel-oidc-token': 'fixture-token', ...headers } })
  for (const [options, status] of [[{ token: null }, 401], [{ token: 'expired' }, 401], [{ role: 'removed' }, 403], [{ membership: false }, 403]]) {
    const s = setup(options)
    assert.equal((await s.stagedPhotoExtract.POST(request())).status, status)
    assert.equal(s.gatewayRequests.length, 0)
  }
  const s = setup()
  assert.equal((await s.stagedPhotoExtract.POST(request(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/></svg>')))).status, 415)
  assert.equal((await s.stagedPhotoExtract.POST(request(bytes, { 'content-length': String(5 * 1024 * 1024) }))).status, 413)
  assert.equal((await s.stagedPhotoExtract.POST(request(bytes, { 'x-vercel-oidc-token': '' }))).status, 503)
  assert.equal(s.gatewayRequests.length, 0)
})

test('staged photo scan failures and truncated output leave capture empty and can be retried', async () => {
  const bytes = await fixture(), s = setup()
  const request = () => new Request('https://test/extract', { method: 'POST', body: bytes, headers: { 'x-vercel-oidc-token': 'fixture-token' } })
  s.failures.extraction = true
  assert.equal((await s.stagedPhotoExtract.POST(request())).status, 502)
  s.failures.extraction = false; s.failures.gatewayFinishReason = 'length'
  assert.equal((await s.stagedPhotoExtract.POST(request())).status, 502)
  assert.equal(s.rows.length, 0); assert.equal(s.objects.size, 0)
  s.failures.gatewayFinishReason = 'stop'
  assert.equal((await s.stagedPhotoExtract.POST(request())).status, 200)
})
