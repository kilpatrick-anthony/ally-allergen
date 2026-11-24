const assert = require('node:assert/strict')
const fs = require('node:fs')
const { test } = require('node:test')
const ts = require('typescript')

test('localizing part of a padded label review text node settles after one edit', () => {
  const { outputText } = ts.transpileModule(fs.readFileSync('components/shared/PortalLocalizationBridge.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const parent = {
    closest: selector => selector.startsWith('[data-context=') ? parent : null,
  }
  let text = 'Saved review '
  let writes = 0
  const node = {
    nodeType: 3,
    parentElement: parent,
    get data() { return text },
    set data(value) {
      assert.ok(value.length < 40, 'translation must not accumulate whitespace')
      text = value
      writes++
    },
  }
  const document = { documentElement: {}, body: {}, querySelectorAll: () => [] }
  const window = { location: { pathname: '/admin/labels' } }
  let onMutations
  class MutationObserver {
    constructor(callback) { onMutations = callback }
    observe() {}
  }
  const modules = {
    react: { useEffect: callback => callback(), useMemo: callback => callback() },
    '@/lib/translations': { translations: { en: { action: 'Review' }, fr: { action: 'review' } } },
    '@/lib/hooks/useTranslation': { useTranslation: () => ({ language: 'en' }) },
    '@/lib/ui-audited-literals.generated': { uiAuditedLiterals: ['Review'] },
    '@/lib/ui-literal-overrides': { uiLiteralOverrides: { en: {}, fr: {} } },
  }
  const exports = {}
  new Function('exports', 'require', 'document', 'window', 'MutationObserver', 'Node', outputText)(
    exports, name => modules[name], document, window, MutationObserver, { ELEMENT_NODE: 1 },
  )
  exports.default()
  const mutation = [{ type: 'characterData', target: node, addedNodes: [] }]
  onMutations(mutation)
  onMutations(mutation)
  assert.equal(node.data, 'Saved Review ')
  assert.equal(writes, 1)
})
