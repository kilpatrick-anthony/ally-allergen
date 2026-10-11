const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
;(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  for (const width of [390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 1024 })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    let counts = { drafts: 65, reviews: 3 }, fail = false
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url())
      let json = {}
      if (url.pathname === '/api/auth/session') json = { authenticated: true, user: { id: 'test', name: 'Test owner', role: 'owner', businessId: 'test-business' } }
      else if (url.pathname === '/api/dashboard/summary') json = { stats: { ingredients: 24, menuItems: 12, datasheets: 8, suppliers: 2, sites: 1 } }
      else if (url.pathname === '/api/quick-add-drafts') {
        if (url.searchParams.has('summary')) return route.fulfill({ status: fail ? 503 : 200, json: fail ? { error: 'unavailable' } : counts })
        json = { drafts: [], nextOffset: null }
      }
      else if (url.pathname === '/api/compliance/status') json = { compliance: { ingredients: [], menuItems: [], totalNonCompliant: 0, totalErrors: 0, totalWarnings: 0 } }
      else if (url.pathname.startsWith('/api/business/')) json = { settings: { defaultLanguage: 'en' } }
      else if (url.pathname === '/api/sites') json = { sites: [] }
      else if (url.pathname === '/api/suppliers') json = { suppliers: [] }
      await route.fulfill({ json })
    })
    await page.goto(`${process.env.BASE_URL || 'http://localhost:3108'}/admin`)
    await page.getByRole('heading', { name: 'Drafts & reviews' }).waitFor()
    const consent = page.getByRole('button', { name: 'Reject non-essential', exact: true })
    if (await consent.isVisible()) await consent.click()
    const summary = page.getByRole('region', { name: 'Drafts & reviews' })
    await summary.getByText('65', { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Quick Add', exact: true }).count(), 1)
    const visibleAdds = page.getByRole('button', { name: 'Quick Add', exact: true }).filter({ visible: true })
    assert.equal(await visibleAdds.count(), 1)
    await visibleAdds.click()
    await page.getByRole('dialog').getByLabel('Product name').waitFor()
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: `/tmp/ally-dashboard-${width}.png`, fullPage: true })
    await summary.getByRole('link', { name: /Ready for review/i }).click()
    await page.getByRole('heading', { name: 'Saved drafts', exact: true }).waitFor()
    assert.equal(await page.locator('main select').inputValue(), 'ready_for_review')
    counts = { drafts: 0, reviews: 0 }
    await page.goto(`${process.env.BASE_URL || 'http://localhost:3108'}/admin`)
    await page.getByText('No drafts or reviews pending.').waitFor({ state: 'attached' })
    assert.equal(await page.getByText('No drafts or reviews pending.').isVisible(), width >= 1024)
    fail = true
    await page.evaluate(() => window.dispatchEvent(new Event('quick-add-saved')))
    await page.getByText('Draft counts are unavailable.', { exact: false }).waitFor()
    fail = false
    counts = { drafts: 1, reviews: 2 }
    await page.getByRole('button', { name: 'Try again', exact: true }).click()
    await page.getByRole('region', { name: 'Drafts & reviews' }).getByText('2', { exact: true }).waitFor()
    assert.deepEqual(errors, [])
    await context.close()
    console.log(`PASS dashboard ${width}: layout, Quick Add, counts, filtered navigation, empty/error/retry states`)
  }
  await browser.close()
})().catch(error => { console.error(error); process.exit(1) })
