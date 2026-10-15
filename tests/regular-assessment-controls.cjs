const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const catalog = require('./helpers/translation-catalog.cjs').en
const cache = new Map()
function load(name) {
  if (name === '@/lib/hooks/useTranslation') return { useTranslation: () => ({ t: key => key.split('.').reduce((value, part) => value?.[part], catalog) || key }) }
  if (!name.startsWith('@/')) return require(name)
  const base = path.resolve(name.slice(2)), file = fs.existsSync(base + '.tsx') ? base + '.tsx' : base + '.ts'
  if (cache.has(file)) return cache.get(file)
  const exports = {}; cache.set(file, exports)
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('exports', 'require', source)(exports, load)
  return exports
}
const Selector = load('@/components/admin/AllergenWarningSelector').default
const value = { cereals_gluten: 'contains', nuts: 'may_contain' }

test('read-only assessments disable parent, subtype and bulk editing controls', () => {
  const html = renderToStaticMarkup(React.createElement(Selector, { value, disabled: true, onChange: () => assert.fail('read-only assessment changed') }))
  const selects = html.match(/<select\b[^>]*>/g) || [], buttons = html.match(/<button\b[^>]*>/g) || []
  assert.equal(selects.length, 26) // 14 parents, 4 grains, 8 tree nuts.
  assert.equal(buttons.length, 2)
  for (const control of [...selects, ...buttons]) assert.match(control, /\bdisabled=""/)
})

test('multiple expanded supplier assessments have unique targets and labelled subtype fields', () => {
  const html = renderToStaticMarkup(React.createElement(React.Fragment, null, ...[1, 2].map(key => React.createElement(Selector, { key, value, onChange() {} }))))
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1])
  assert.equal(new Set(ids).size, ids.length)
  const targets = new Set([...html.matchAll(/<label\b[^>]*\bfor="([^"]+)"/g)].map(match => match[1]))
  for (const control of html.match(/<select\b[^>]*>/g)) {
    const id = control.match(/\bid="([^"]+)"/)?.[1]
    assert.ok(id && targets.has(id), 'every assessment selector has a visible label')
  }
  for (const match of html.matchAll(/aria-(?:describedby|labelledby)="([^"]+)"/g)) for (const id of match[1].split(' ')) assert.ok(ids.includes(id), 'descriptions and groups reference an existing element')
})
