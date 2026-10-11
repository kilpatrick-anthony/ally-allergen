// Load the real TypeScript catalog without importing browser components.
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const cache = new Map()
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const exports = {}
  cache.set(file, exports)
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const localRequire = name => {
    if (!name.startsWith('@/lib/')) throw new Error(`Unexpected translation dependency: ${name}`)
    return load(path.resolve(__dirname, '../..', `${name.slice(2)}.ts`))
  }
  new Function('exports', 'require', source)(exports, localRequire)
  return exports
}
module.exports = load(path.resolve(__dirname, '../../lib/translations.ts')).translations
