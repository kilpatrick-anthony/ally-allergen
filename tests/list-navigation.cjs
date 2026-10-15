const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), ts = require('typescript')
const exportsObject = {}
new Function('exports', ts.transpileModule(fs.readFileSync('lib/list-navigation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(exportsObject)
const { safeListReturnPath, listContextHref } = exportsObject
for (const base of ['/admin/ingredients', '/admin/menu-builder']) {
  test(`${base} preserves encoded search and filters through nested item routes`, () => {
    const original = base + '?q=Milk+%26+oats&category=Breakfast&view=list&sort=date&direction=desc&filters=1'
    const detail = listContextHref(base + '/example', original)
    const returnTo = new URL(detail, 'https://example.invalid').searchParams.get('returnTo')
    assert.equal(safeListReturnPath(base, returnTo), original)
    const edit = listContextHref(base + '/example/edit', returnTo)
    assert.equal(new URL(edit, 'https://example.invalid').searchParams.get('returnTo'), original)
    assert.equal(listContextHref(base + '/new?source=list', original).includes('&returnTo='), true)
  })
  test(`${base} rejects external or unrelated return destinations`, () => {
    for (const value of [null, '', 'https://evil.invalid', '//evil.invalid', '/admin', base + '/other', base + '-other?q=x', base + '#x']) {
      assert.equal(safeListReturnPath(base, value), base)
    }
  })
}
