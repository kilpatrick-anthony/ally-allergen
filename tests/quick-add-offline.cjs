const assert = require('node:assert/strict')
const fs = require('node:fs')
const test = require('node:test')
const ts = require('typescript')
const vm = require('node:vm')

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
