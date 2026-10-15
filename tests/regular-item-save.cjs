const { test } = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
function load(fetch) {
  const exports = {}
  const source = ts.transpileModule(fs.readFileSync('lib/regular-item-save.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  new Function('exports', 'fetch', source)(exports, fetch)
  return exports
}
const json = (data, status = 200) => Response.json(data, { status })
const file = name => new File(['%PDF'], name, { type: 'application/pdf' })

for (const entity of ['ingredient', 'menu_item']) {
  const collection = entity === 'ingredient' ? '/api/ingredients' : '/api/menu-items'
  const key = entity === 'ingredient' ? 'ingredient' : 'menuItem'
  test(`${entity}: partial upload retry updates same item and skips completed documents`, async () => {
    const calls = [], attempts = new Map()
    const api = load(async (url, options) => {
      calls.push({ url, ...options })
      if (url !== '/api/upload/datasheet') return json({ [key]: { id: 'saved-item' } })
      assert.equal(options.body.get(`${entity}_id`), 'saved-item')
      const name = options.body.get('file').name
      attempts.set(name, (attempts.get(name) || 0) + 1)
      if (name === 'failed.pdf' && attempts.get(name) === 1) return json({}, 503)
      return new Response('', { status: 200 }) // Successful uploads need no JSON body.
    })
    const saver = api.createRegularItemSaver(entity)
    const sheets = [{ file: file('good.pdf'), supplier_name: 'Supplier' }, { file: file('failed.pdf') }]
    await assert.rejects(saver.save({ name: 'Initial' }, sheets, 'Failed'), api.AttachmentUploadError)
    await saver.save({ name: 'Corrected' }, sheets.map(sheet => ({ ...sheet })), 'Failed')
    assert.deepEqual(calls.filter(c => c.url !== '/api/upload/datasheet').map(c => [c.url, c.method]), [[collection, 'POST'], [collection + '/saved-item', 'PUT']])
    assert.equal(JSON.parse(calls.find(c => c.method === 'PUT').body).name, 'Corrected')
    assert.equal(attempts.get('good.pdf'), 1)
    assert.equal(attempts.get('failed.pdf'), 2)
  })
  test(`${entity}: concurrent saves share one attempt and await slower successful uploads`, async () => {
    let release, uploads = 0, creates = 0, settled = false
    const slow = new Promise(resolve => { release = resolve })
    const api = load(async (url, options) => {
      if (url !== '/api/upload/datasheet') { creates++; return json({ [key]: { id: 'saved-item' } }) }
      uploads++
      if (options.body.get('file').name === 'slow.pdf') await slow
      else return json({}, 500)
      return json({})
    })
    const saver = api.createRegularItemSaver(entity), sheets = [{ file: file('slow.pdf') }, { file: file('fail.pdf') }]
    const first = saver.save({}, sheets, 'Failed')
    const second = saver.save({}, sheets, 'Failed')
    assert.equal(first, second)
    const result = first.catch(error => { settled = true; assert.ok(error instanceof api.AttachmentUploadError) })
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(settled, false)
    release(); await result
    assert.equal(creates, 1); assert.equal(uploads, 2)
  })
  test(`${entity}: failed creation uploads nothing and remains retryable`, async () => {
    const methods = []
    const api = load(async (url, options) => {
      methods.push(options.method)
      return methods.length === 1 ? json({ error: 'Invalid entry' }, 400) : json({ [key]: { id: 'saved-item' } })
    })
    const saver = api.createRegularItemSaver(entity)
    await assert.rejects(saver.save({}, [{ file: file('unused.pdf') }], 'Failed'), /Invalid entry/)
    await saver.save({}, [], 'Failed')
    assert.deepEqual(methods, ['POST', 'POST'])
  })
  test(`${entity}: failed update cannot upload or recreate the saved item`, async () => {
    const calls = []; let failing = true
    const api = load(async (url, options) => {
      calls.push([url, options.method])
      if (options.method === 'PUT') return json({ error: 'Access revoked' }, 403)
      if (url === '/api/upload/datasheet' && failing) { failing = false; throw new Error('Network unavailable') }
      return json({ [key]: { id: 'saved-item' } })
    })
    const saver = api.createRegularItemSaver(entity), sheets = [{ file: file('evidence.pdf') }]
    await assert.rejects(saver.save({}, sheets, 'Failed'), api.AttachmentUploadError)
    await assert.rejects(saver.save({}, sheets, 'Failed'), /Access revoked/)
    assert.deepEqual(calls, [[collection, 'POST'], ['/api/upload/datasheet', 'POST'], [collection + '/saved-item', 'PUT']])
  })
}

test('recovery messages exist in all supported languages', () => {
  const catalog = require('./helpers/translation-catalog.cjs')
  for (const language of ['en', 'ga', 'pt', 'fr', 'es', 'de']) {
    for (const key of ['documentsPending', 'saveAndRetry', 'saveFailed', 'requiredFields', 'saved']) assert.ok(catalog[language].regularItemSave[key])
  }
})
