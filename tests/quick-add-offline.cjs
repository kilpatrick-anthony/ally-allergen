const assert = require('node:assert/strict')
const fs = require('node:fs')
const test = require('node:test')
const ts = require('typescript')
const vm = require('node:vm')
const { indexedDB } = require('fake-indexeddb')

function load() {
  const local = new Map(), session = new Map()
  const storage = values => ({
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  })
  const context = { exports: {}, localStorage: storage(local), sessionStorage: storage(session), window: {} }
  vm.createContext(context)
  vm.runInContext(ts.transpileModule(fs.readFileSync('lib/quick-add-offline.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context)
  return { api: context.exports, local, session }
}

const fields = { kind: 'ingredient', name: 'Bread', category: '', ingredient_ids: [], site_id: null,
  supplier_id: null, supplier_name: '', allergen_warnings: {}, dietary_tags: [], notes: '' }

test('offline recovery and outbox are isolated to the signed-in user and business', () => {
  const { api, session } = load()
  assert.equal(api.saveQuickAddRecovery('draft-1', fields), false)
  session.set('ally_user', 'user-1'); session.set('ally_biz', 'business-1')
  assert.equal(api.saveQuickAddRecovery('draft-1', fields), true)
  assert.equal(api.loadQuickAddRecovery().fields.name, 'Bread')
  assert.equal(api.queueQuickAddDraft('draft-1', fields), true)
  assert.equal(api.loadQuickAddRecovery(), null)
  assert.equal(api.getQuickAddOutbox().length, 1)
  session.set('ally_user', 'user-2')
  assert.equal(api.loadQuickAddRecovery(), null)
  assert.equal(api.getQuickAddOutbox().length, 0)
  session.set('ally_user', 'user-1')
  assert.equal(api.getQuickAddOutbox()[0].business_id, 'business-1')
})

test('queueing the same request replaces it and successful sync removal is durable', () => {
  const { api, session } = load()
  session.set('ally_user', 'user-1'); session.set('ally_biz', 'business-1')
  api.queueQuickAddDraft('draft-1', fields)
  api.queueQuickAddDraft('draft-1', { ...fields, name: 'Updated bread' })
  assert.equal(api.getQuickAddOutbox().length, 1)
  assert.equal(api.getQuickAddOutbox()[0].fields.name, 'Updated bread')
  api.removeQuickAddOutboxItem('draft-1')
  assert.equal(api.getQuickAddOutbox().length, 0)
})

test('cached Quick Add options stay isolated with the recovery data', () => {
  const { api, session } = load()
  session.set('ally_user', 'user-1'); session.set('ally_biz', 'business-1')
  const options = { sites: [{ id: 'site-1', name: 'Kitchen' }], suppliers: [], ingredientCategories: ['Bakery'], productCategories: [], ingredients: [] }
  assert.equal(api.saveQuickAddOptions(options), true)
  assert.equal(api.loadQuickAddOptions().sites[0].name, 'Kitchen')
  session.set('ally_biz', 'business-2')
  assert.equal(api.loadQuickAddOptions(), null)
})

function resetPhotoDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('ally-quick-add-offline')
    request.onsuccess = resolve
    request.onerror = () => reject(request.error)
  })
}

function loadPhotos(session, fetchImpl = async () => new Response('{}', { status: 200 })) {
  const context = { exports: {}, indexedDB, sessionStorage: { getItem: key => session.get(key) || null }, Blob, Response,
    AbortSignal, fetch: fetchImpl, setTimeout, clearTimeout, console }
  vm.createContext(context)
  vm.runInContext(ts.transpileModule(fs.readFileSync('lib/quick-add-offline-photos.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context)
  return context.exports
}

test('offline photos are account-scoped, durable and removed only after upload', async () => {
  await resetPhotoDb()
  const session = new Map([['ally_user', 'user-1'], ['ally_biz', 'business-1']])
  const uploads = []
  const api = loadPhotos(session, async (url, options) => { uploads.push({ url, options }); return new Response('{}', { status: 200 }) })
  await api.saveOfflineQuickAddPhoto('draft-1', 'photo-1', new Blob(['jpeg'], { type: 'image/jpeg' }))
  assert.equal((await api.listOfflineQuickAddPhotos('draft-1')).length, 1)
  assert.deepEqual(Array.from(await api.listOfflineQuickAddPhotoDraftIds()), ['draft-1'])
  session.set('ally_user', 'user-2')
  assert.equal((await api.listOfflineQuickAddPhotos('draft-1')).length, 0)
  session.set('ally_user', 'user-1')
  await api.uploadOfflineQuickAddPhotos('draft-1')
  assert.equal(uploads.length, 1)
  assert.match(uploads[0].url, /draft-1\/photos\/photo-1$/)
  assert.equal((await api.listOfflineQuickAddPhotos('draft-1')).length, 0)
})
