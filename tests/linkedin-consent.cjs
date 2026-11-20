// Run with: node --test tests/linkedin-consent.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function load(file, globals, imports = {}) {
  const context = { exports: {}, ...globals, require: name => {
    if (name in imports) return imports[name]
    return require(name)
  } }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, context)
  return context.exports
}

function consentBrowser(preferences) {
  const document = { cookie: preferences ? `allyjen_cookie_consent=${encodeURIComponent(JSON.stringify(preferences))}` : '' }
  const events = []
  const window = { location: { protocol: 'https:', hostname: 'allyjen.ie', reload() { window.reloaded = true } }, dispatchEvent: event => events.push(event) }
  const consent = load('lib/cookie-consent.ts', { document, window, CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail } } })
  return { document, window, events, consent }
}

const legacy = { version: 1, necessary: true, analytics: true, updatedAt: '2026-11-15T00:00:00Z' }

test('existing analytics consent never enables marketing; choices persist independently', () => {
  const { consent, events } = consentBrowser(legacy)
  assert.equal(consent.readCookieConsent().analytics, true)
  assert.equal(consent.readCookieConsent().marketing, false)
  consent.saveCookieConsent(false, true)
  assert.equal(consent.readCookieConsent().analytics, false)
  assert.equal(consent.readCookieConsent().marketing, true)
  assert.equal(events[0].detail.marketing, true)
  consent.saveCookieConsent(false)
  assert.equal(consent.readCookieConsent().marketing, false)
})

test('missing or malformed consent does not permit tracking', () => {
  for (const value of [null, { ...legacy, marketing: 'true' }]) {
    assert.equal(consentBrowser(value).consent.readCookieConsent(), null)
  }
})

function render(preferences) {
  const browser = consentBrowser(preferences)
  let index = 0
  const states = [browser.consent.readCookieConsent(), true, true, false, false]
  const Component = load('components/shared/CookieConsentManager.tsx', { window: browser.window }, {
    react: { useState: () => { const slot = index++; return [states[slot], value => { states[slot] = value }] }, useEffect() {} },
    '@radix-ui/react-dialog': {},
    '@vercel/analytics/next': { Analytics: 'analytics' },
    'lucide-react': { Cookie: 'cookie', X: 'x' },
    'next/link': { default: 'a' },
    'next/navigation': { usePathname: () => '/' },
    'next/script': { default: 'script' },
    '@/lib/cookie-consent': browser.consent,
    '@/lib/hooks/useTranslation': { useTranslation: () => ({ t: key => key }) },
  }).default
  const elements = []
  function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    elements.push(node)
    walk(node.props?.children)
  }
  walk(Component())
  return { ...browser, elements }
}

test('LinkedIn loads only with marketing consent, with the supplied ID and async library', () => {
  for (const preferences of [null, legacy, { ...legacy, marketing: false }]) {
    assert.equal(render(preferences).elements.some(e => e.props.id === 'linkedin-insight'), false)
  }
  const script = render({ ...legacy, analytics: false, marketing: true }).elements.find(e => e.props.id === 'linkedin-insight')
  assert.ok(script)
  const inserted = []
  const window = {}
  const document = {
    getElementsByTagName: () => [{ parentNode: { insertBefore: element => inserted.push(element) } }],
    createElement: () => ({}),
  }
  vm.runInNewContext(script.props.children, { window, document })
  assert.equal(window._linkedin_partner_id, '11335313')
  assert.deepEqual(Array.from(window._linkedin_data_partner_ids), ['11335313'])
  assert.equal(inserted[0].src, 'https://snap.licdn.com/li.lms-analytics/insight.min.js')
  assert.equal(inserted[0].async, true)
  window.lintrk('track', { conversion_id: 123 })
  assert.equal(window.lintrk.q[0][0], 'track')
})

test('rejecting marketing saves rejection before reloading to unload the tracker', () => {
  const result = render({ ...legacy, marketing: true })
  const reject = result.elements.find(e => e.type === 'button' && e.props.children === 'cookieConsent.rejectNonEssential')
  reject.props.onClick()
  assert.equal(result.consent.readCookieConsent().marketing, false)
  assert.equal(result.window.reloaded, true)
})
