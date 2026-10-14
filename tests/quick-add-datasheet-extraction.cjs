const { test } = require('node:test')
const assert = require('node:assert/strict')
const { setup, uuid, otherBusiness, colleague } = require('./helpers/quick-add-harness.cjs')
const route = (id = uuid(10), datasheetId = uuid(20)) => ({ params: Promise.resolve({ id, datasheetId }) })
const extractionRequest = () => new Request('https://test/extract', { method: 'POST', headers: { 'x-vercel-oidc-token': 'test-token' } })
const pdf = Buffer.from('%PDF-1.7\nDatasheet\n%%EOF')
const upload = (bytes = pdf, mimeType = 'application/pdf', filename = 'product.pdf') => new Request('https://test/upload', { method: 'PUT', headers: { 'content-type': mimeType, 'x-file-name': filename }, body: bytes })

test('PDF suggestions use private stored bytes, support scanned PDFs, and never modify the draft', async () => {
  const s = setup(); s.seed(uuid(10))
  assert.equal((await s.datasheetItem.PUT(upload(), route())).status, 200)
  const result = await s.datasheetExtract.POST(extractionRequest(), route())
  assert.equal(result.status, 200)
  assert.equal(result.headers['Cache-Control'], 'private, no-store')
  assert.equal(result.body.suggestions.supplier_name, '')
  assert.equal(result.body.suggestions.allergen_warnings.milk, undefined, 'Unmentioned/negative claims do not become not-present answers')
  assert.deepEqual(JSON.parse(JSON.stringify(result.body.suggestions.allergen_warnings.cereals_gluten_levels)), { wheat: 'contains' })
  assert.deepEqual(Array.from(result.body.suggestions.dietary_tags), ['Vegan'])
  assert.equal(s.rows[0].name, 'Bread')
  assert.deepEqual(Object.keys(s.rows[0].allergen_warnings), [])
  const content = JSON.parse(s.gatewayRequests[0].options.body).messages[0].content
  assert.equal(content[1].type, 'file')
  assert.equal(content[1].file.file_data, `data:application/pdf;base64,${pdf.toString('base64')}`)
  assert.match(content[0].text, /row heading alone does not/)
  assert.match(content[0].text, /several distinct products/)
})

test('datasheet analysis enforces live access, ready attachments, draft status and gateway configuration', async () => {
  for (const [options, overrides, status] of [
    [{ token: null }, {}, 401], [{ role: 'removed' }, {}, 403], [{}, { business_id: otherBusiness }, 404],
    [{}, { created_by: colleague }, 404], [{}, { status: 'ready_for_review' }, 409], [{}, { kind: 'prepared_item' }, 400],
  ]) {
    const s = setup(options); s.seed(uuid(10), overrides)
    assert.equal((await s.datasheetExtract.POST(extractionRequest(), route())).status, status)
    assert.equal(s.gatewayRequests.length, 0)
  }
  const s = setup(); s.seed(uuid(10))
  assert.equal((await s.datasheetExtract.POST(extractionRequest(), route())).status, 404)
  await s.datasheetItem.PUT(upload(), route())
  assert.equal((await s.datasheetExtract.POST(new Request('https://test/extract', { method: 'POST' }), route())).status, 503)
  assert.equal(s.gatewayRequests.length, 0)
  s.datasheets[0].state = 'pending'
  assert.equal((await s.datasheetExtract.POST(extractionRequest(), route())).status, 404)
  s.datasheets[0].state = 'ready'; s.datasheets[0].business_id = otherBusiness
  assert.equal((await s.datasheetExtract.POST(extractionRequest(), route())).status, 404)
})

test('Word .docx text is extracted before analysis; older .doc files need conversion', async () => {
  const zip = new (require('jszip'))()
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
  zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
  zip.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Chocolate dessert. Contains milk.</w:t></w:r></w:p></w:body></w:document>')
  const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' })
  const s = setup(); s.seed(uuid(10))
  assert.equal((await s.datasheetItem.PUT(upload(bytes, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'product.docx'), route())).status, 200)
  assert.equal((await s.datasheetExtract.POST(extractionRequest(), route())).status, 200)
  const prompt = JSON.parse(s.gatewayRequests[0].options.body).messages[0].content
  assert.equal(typeof prompt, 'string')
  assert.match(prompt, /Chocolate dessert\. Contains milk\./)
  const legacy = setup(); legacy.seed(uuid(10))
  await legacy.datasheetItem.PUT(upload(Buffer.from([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]), 'application/msword', 'old.doc'), route())
  const result = await legacy.datasheetExtract.POST(extractionRequest(), route())
  assert.equal(result.status, 422); assert.equal(result.body.error, 'datasheetLegacyWord')
  assert.equal(legacy.gatewayRequests.length, 0)
})

test('provider and malformed Word failures keep the stored datasheet and draft intact', async () => {
  const s = setup(); s.seed(uuid(10)); await s.datasheetItem.PUT(upload(), route())
  s.failures.extraction = true
  assert.equal((await s.datasheetExtract.POST(extractionRequest(), route())).status, 502)
  assert.equal(s.datasheets[0].state, 'ready'); assert.equal(s.rows[0].name, 'Bread')
  const broken = setup(); broken.seed(uuid(10))
  await broken.datasheetItem.PUT(upload(Buffer.from('PK[Content_Types].xml word/broken'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'bad.docx'), route())
  const result = await broken.datasheetExtract.POST(extractionRequest(), route())
  assert.equal(result.status, 422); assert.equal(result.body.error, 'datasheetUnreadable')
  assert.equal(broken.gatewayRequests.length, 0)
})


test('staged PDF analysis works before a draft exists and retains no records or files', async () => {
  const s = setup()
  const request = new Request('https://test/extract', { method: 'POST', headers: {
    'content-type': 'application/pdf', 'x-file-name': 'delivery.pdf', 'x-vercel-oidc-token': 'test-token',
  }, body: pdf })
  const result = await s.stagedDatasheetExtract.POST(request)
  assert.equal(result.status, 200)
  assert.equal(result.headers['Cache-Control'], 'private, no-store')
  assert.equal(result.body.suggestions.name, 'AI Bakery Bread')
  assert.equal(s.rows.length, 0)
  assert.equal(s.objects.size, 0)
  assert.equal(s.writes.length, 0)
  const content = JSON.parse(s.gatewayRequests[0].options.body).messages[0].content
  assert.equal(content[1].file.file_data, `data:application/pdf;base64,${pdf.toString('base64')}`)
})

test('staged analysis validates live membership, file bytes, size and provider failures', async () => {
  const request = (bytes = pdf, extra = {}) => new Request('https://test/extract', { method: 'POST', headers: {
    'content-type': 'application/pdf', 'x-file-name': 'delivery.pdf', 'x-vercel-oidc-token': 'test-token', ...extra,
  }, body: bytes })
  for (const [options, status] of [[{ token: null }, 401], [{ role: 'removed' }, 403], [{ membership: false }, 403]]) {
    const s = setup(options)
    assert.equal((await s.stagedDatasheetExtract.POST(request())).status, status)
    assert.equal(s.gatewayRequests.length, 0)
  }
  const s = setup()
  assert.equal((await s.stagedDatasheetExtract.POST(request(Buffer.from('not a pdf')))).status, 415)
  assert.equal((await s.stagedDatasheetExtract.POST(request(pdf, { 'content-length': String(7 * 1024 * 1024) }))).status, 413)
  assert.equal((await s.stagedDatasheetExtract.POST(request(pdf, { 'x-vercel-oidc-token': '' }))).status, 503)
  assert.equal(s.gatewayRequests.length, 0)
  s.failures.extraction = true
  assert.equal((await s.stagedDatasheetExtract.POST(request())).status, 502)
  assert.equal(s.rows.length, 0)
  assert.equal(s.objects.size, 0)
})


test('datasheet scans distinguish service failures from unreadable documents', async () => {
  for (const [providerStatus, code, status] of [
    [429, 'datasheetExtractionBusy', 429],
    [401, 'datasheetExtractionUnavailable', 503],
    [402, 'datasheetExtractionUnavailable', 503],
    [403, 'datasheetExtractionUnavailable', 503],
    [503, 'datasheetExtractionUnavailable', 503],
    [400, 'datasheetExtractionFailed', 502],
    [502, 'datasheetExtractionFailed', 502],
  ]) {
    const s = setup(); s.seed(uuid(10))
    await s.datasheetItem.PUT(upload(), route())
    s.failures.gatewayStatus = providerStatus
    const saved = await s.datasheetExtract.POST(extractionRequest(), route())
    assert.equal(saved.status, status)
    assert.equal(saved.body.error, code)
    const staged = await s.stagedDatasheetExtract.POST(new Request('https://test/extract', { method: 'POST', headers: {
      'content-type': 'application/pdf', 'x-file-name': 'product.pdf', 'x-vercel-oidc-token': 'test-token',
    }, body: pdf }))
    assert.equal(staged.status, status)
    assert.equal(staged.body.error, code)
    assert.equal(s.datasheets[0].state, 'ready')
    assert.equal(s.rows[0].name, 'Bread')
  }
})


test('datasheet analysis budgets for reasoning and rejects truncated JSON without applying partial suggestions', async () => {
  const s = setup(); s.seed(uuid(10))
  await s.datasheetItem.PUT(upload(), route())
  s.failures.gatewayFinishReason = 'length'
  const result = await s.datasheetExtract.POST(extractionRequest(), route())
  assert.equal(result.status, 502)
  assert.equal(result.body.error, 'datasheetExtractionFailed')
  assert.equal(result.body.suggestions, undefined, 'Even valid JSON cannot be applied if the provider reports truncation')
  assert.equal(s.rows[0].name, 'Bread')
  assert.equal(s.datasheets[0].state, 'ready')
  const request = JSON.parse(s.gatewayRequests[0].options.body)
  assert.equal(request.reasoning_effort, 'low')
  assert.ok(request.max_tokens >= 4096, 'Reasoning and complete structured output share this allowance')
  s.failures.gatewayFinishReason = 'stop'
  const retry = await s.datasheetExtract.POST(extractionRequest(), route())
  assert.equal(retry.status, 200)
  assert.equal(retry.body.suggestions.name, 'AI Bakery Bread')
})
