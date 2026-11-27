const assert = require('node:assert/strict')
const fs = require('node:fs')
const { test } = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

const { outputText } = ts.transpileModule(fs.readFileSync('lib/serviceWorkerRegistration.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})

function boot(readyState) {
  const window = new EventTarget()
  const serviceWorker = new EventTarget()
  const registrations = []
  serviceWorker.register = async path => {
    registrations.push(path)
    return new EventTarget()
  }
  const exports = {}
  vm.runInNewContext(outputText, {
    window,
    navigator: { serviceWorker },
    document: { readyState },
    console: { log() {}, error() {} },
    setInterval() {},
    exports,
  })
  exports.registerServiceWorker()
  return { window, registrations }
}

test('registers immediately when hydration runs after the window load event', () => {
  const { registrations } = boot('complete')
  assert.deepEqual(registrations, ['/service-worker.js'])
})

test('registers once on load when the document is still loading', () => {
  const { window, registrations } = boot('interactive')
  assert.deepEqual(registrations, [])
  window.dispatchEvent(new Event('load'))
  window.dispatchEvent(new Event('load'))
  assert.deepEqual(registrations, ['/service-worker.js'])
})
