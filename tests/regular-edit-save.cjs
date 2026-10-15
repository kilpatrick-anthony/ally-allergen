const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), ts = require('typescript')
function setup(handler) {
  const cache = {}, calls = []
  function load(name) {
    const file = name.startsWith('@/') ? name.slice(2) + '.ts' : name
    if (cache[file]) return cache[file]
    const exports = cache[file] = {}
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
    new Function('exports', 'require', 'fetch', source)(exports, load, async (url, options) => { calls.push({ url, ...options }); return handler(url, options) })
    return exports
  }
  return { ...load('lib/regular-edit-save.ts'), calls }
}
const json = (data = {}, status = 200) => Response.json(data, { status })
const file = name => new File(['%PDF'], name, { type: 'application/pdf' })
for (const entity of ['ingredient', 'menu_item']) {
  test(`${entity}: retries only failed deletion, metadata and upload operations`, async () => {
    const attempts = new Map()
    const s = setup(async (url, options) => {
      if (options.method === 'PUT') return json()
      const key = options.method + (options.method === 'POST' ? options.body.get('file').name : url)
      const attempt = (attempts.get(key) || 0) + 1; attempts.set(key, attempt)
      if (attempt === 1 && (key.includes('fail') || key.includes('edited'))) return json({}, 503)
      return options.method === 'POST' ? json({ datasheet: { id: options.body.get('file').name } }) : json()
    })
    const original = [{ id: 'deleted-good' }, { id: 'deleted-fail' }, { id: 'edited', notes: 'Before' }]
    const sheets = [{ id: 'edited', notes: 'After' }, { file: file('good.pdf') }, { file: file('fail.pdf') }]
    const saver = s.createRegularEditSaver(entity)
    await assert.rejects(saver.save('record', { name: 'First' }, sheets, original, 'Failed'), s.EditDocumentSaveError)
    await saver.save('record', { name: 'Corrected' }, sheets.map(sheet => ({ ...sheet })), original, 'Failed')
    assert.equal(attempts.get('DELETE/api/datasheets/deleted-good'), 1)
    assert.equal(attempts.get('DELETE/api/datasheets/deleted-fail'), 2)
    assert.equal(attempts.get('PATCH/api/datasheets/edited'), 2)
    assert.equal(attempts.get('POSTgood.pdf'), 1)
    assert.equal(attempts.get('POSTfail.pdf'), 2)
    assert.deepEqual(s.calls.filter(call => call.method === 'PUT').map(call => JSON.parse(call.body).name), ['First', 'Corrected'])
    for (const call of s.calls.filter(call => call.method === 'POST')) assert.equal(call.body.get(`${entity}_id`), 'record')
  })
  test(`${entity}: rapid saves share a promise and wait for slow operations to settle`, async () => {
    let release, settled = false
    const slow = new Promise(resolve => { release = resolve })
    const s = setup(async (url, options) => {
      if (options.method === 'PUT') return json()
      if (url.endsWith('slow')) { await slow; return json() }
      return json({}, 503)
    })
    const saver = s.createRegularEditSaver(entity)
    const first = saver.save('record', {}, [], [{ id: 'slow' }, { id: 'fail' }], 'Failed')
    assert.equal(saver.save('record', {}, [], [], 'Failed'), first)
    const outcome = first.catch(error => { settled = true; assert.ok(error instanceof s.EditDocumentSaveError) })
    await new Promise(resolve => setImmediate(resolve)); assert.equal(settled, false)
    release(); await outcome
    assert.equal(s.calls.filter(call => call.method === 'PUT').length, 1)
  })
  test(`${entity}: record errors preserve their validation code and perform no document operations`, async () => {
    const s = setup(async () => json({ error: 'Incomplete', errorCode: 'completeMenu' }, 400))
    const saver = s.createRegularEditSaver(entity)
    await assert.rejects(saver.save('record', {}, [{ file: file('new.pdf') }], [{ id: 'old' }], 'Failed'), error => error.code === 'completeMenu')
    assert.deepEqual(s.calls.map(call => call.method), ['PUT'])
  })
  test(`${entity}: removing or editing an acknowledged upload uses its returned ID`, async () => {
    const s = setup(async (url, options) => options.method === 'POST'
      ? options.body.get('file').name === 'fail.pdf' ? json({}, 503) : json({ datasheet: { id: 'uploaded-id' } }) : json())
    const saver = s.createRegularEditSaver(entity), good = file('good.pdf'), failed = file('fail.pdf')
    await assert.rejects(saver.save('record', {}, [{ file: good }, { file: failed }], [], 'Failed'))
    await saver.save('record', {}, [{ file: good, notes: 'Changed after partial save' }], [], 'Failed')
    assert.equal(s.calls.filter(call => call.url === '/api/datasheets/uploaded-id' && call.method === 'PATCH').length, 1)
    await saver.save('record', {}, [], [], 'Failed')
    assert.equal(s.calls.filter(call => call.url === '/api/datasheets/uploaded-id' && call.method === 'DELETE').length, 1)
    assert.equal(s.calls.filter(call => call.method === 'POST' && call.body.get('file').name === 'good.pdf').length, 1)
  })
  test(`${entity}: an acknowledged upload with unreadable JSON is never repeated`, async () => {
    const s = setup(async (url, options) => options.method === 'POST' ? new Response('', { status: 200 }) : json())
    const saver = s.createRegularEditSaver(entity), sheet = { file: file('good.pdf') }
    await saver.save('record', {}, [sheet], [], 'Failed')
    await saver.save('record', {}, [sheet], [], 'Failed')
    await assert.rejects(saver.save('record', {}, [], [], 'Failed'), error => error.needsReload)
    assert.equal(s.calls.filter(call => call.method === 'POST').length, 1)
  })
  test(`${entity}: unchanged metadata ignores presentation flags and is not patched`, async () => {
    const s = setup(async () => json())
    await s.createRegularEditSaver(entity).save('record', {}, [{ id: 'old', notes: '', status: 'uploaded' }], [{ id: 'old', notes: null }], 'Failed')
    assert.deepEqual(s.calls.map(call => call.method), ['PUT'])
  })
}
