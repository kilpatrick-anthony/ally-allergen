// Run with: node --test tests/quick-add-datasheets.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { setup, uuid, otherBusiness, colleague, params } = require('./helpers/quick-add-harness.cjs')

const route = (id = uuid(10), datasheetId = uuid(20)) => ({ params: Promise.resolve({ id, datasheetId }) })
const pdf = () => Buffer.from('%PDF-1.7\nQuick Add datasheet\n%%EOF')
const upload = (bytes = pdf(), type = 'application/pdf', name = 'product sheet.pdf') => new Request('https://test/datasheet', {
  method: 'PUT', body: bytes, headers: { 'content-type': type, 'x-file-name': encodeURIComponent(name) },
})

test('datasheet access follows live session, role, business and draft ownership', async () => {
  for (const [options, overrides, status] of [
    [{ token: null }, {}, 401], [{ token: 'expired' }, {}, 401], [{ membership: false }, {}, 403],
    [{ role: 'removed' }, {}, 403], [{}, { business_id: otherBusiness }, 404], [{}, { created_by: colleague }, 404],
  ]) {
    const s = setup(options); s.seed(uuid(10), overrides)
    assert.equal((await s.datasheetCollection.GET({}, params(uuid(10)))).status, status)
    assert.equal((await s.datasheetItem.PUT(upload(), route())).status, status)
    assert.equal(s.datasheets.length, 0)
  }
})

test('staff can upload, list, download and remove a private optional datasheet', async () => {
  const s = setup(); s.seed(uuid(10))
  const uploaded = await s.datasheetItem.PUT(upload(), route())
  assert.equal(uploaded.status, 200)
  assert.equal(uploaded.body.datasheet.file_name, 'product sheet.pdf')
  assert.equal(s.datasheets.length, 1); assert.equal(s.objects.size, 1)
  const listed = await s.datasheetCollection.GET({}, params(uuid(10)))
  assert.equal(listed.body.datasheets.length, 1)
  assert.equal(listed.body.datasheets[0].business_id, undefined)
  const downloaded = await s.datasheetItem.GET({}, route())
  assert.equal(downloaded.status, 200)
  assert.equal(downloaded.headers.get('content-type'), 'application/pdf')
  assert.equal(Buffer.from(await downloaded.arrayBuffer()).toString(), pdf().toString())
  assert.equal((await s.datasheetItem.DELETE({}, route())).status, 200)
  assert.equal(s.objects.size, 0)
})

test('datasheet upload rejects disguised, unsupported and oversized files and locks after submission', async () => {
  const s = setup(); s.seed(uuid(10))
  assert.equal((await s.datasheetItem.PUT(upload(Buffer.from('not pdf')), route())).status, 415)
  assert.equal((await s.datasheetItem.PUT(upload(Buffer.from('text'), 'text/plain', 'notes.txt'), route())).status, 415)
  assert.equal((await s.datasheetItem.PUT(upload(Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(6 * 1024 * 1024)])), route())).status, 413)
  assert.equal(s.datasheets.length, 0)
  s.rows[0].status = 'ready_for_review'
  assert.equal((await s.datasheetItem.PUT(upload(), route())).status, 409)
})

test('approved datasheet evidence is available only within its business', async () => {
  const s = setup(); s.seed(uuid(10))
  await s.datasheetItem.PUT(upload(), route())
  const evidenceRoute = { params: Promise.resolve({ datasheetId: uuid(20) }) }
  assert.equal((await s.datasheetEvidence.GET({}, evidenceRoute)).status, 404)
  Object.assign(s.rows[0], { status: 'approved', ingredient_id: uuid(30), created_by: colleague })
  assert.equal((await s.datasheetEvidence.GET({}, evidenceRoute)).status, 200)
  s.datasheets[0].business_id = otherBusiness
  assert.equal((await s.datasheetEvidence.GET({}, evidenceRoute)).status, 404)
})
