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
