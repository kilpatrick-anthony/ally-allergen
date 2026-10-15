// Run against a local production build. All data and writes are isolated fixtures.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const catalog = require('../tests/helpers/translation-catalog.cjs')
const format = (value, replacements) => Object.entries(replacements).reduce((text, [key, replacement]) => text.replaceAll(`{${key}}`, String(replacement)), value)

;(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  try {
    for (const language of (process.env.REVIEW_LANGUAGES || 'en,de').split(',')) for (const width of (process.env.REVIEW_WIDTHS || '390,1440').split(',').map(Number)) {
      const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 900 } }), page = await context.newPage()
      const labels = catalog[language], errors = [], mutations = []
      let role = 'owner', ingredientFailure = true, menuFailure = true, denyArchive = true, denyDelete = true, cancel = true
      const warnings = Object.fromEntries(['cereals_gluten','crustaceans','eggs','fish','peanuts','soybeans','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs'].map(key => [key, 'none']))
      let ingredients = [
        { id: 'z-old', name: 'Old yoghurt', category: 'Zed', allergen_warnings: { ...warnings, milk: 'contains' }, created_at: '2026-02-03T12:00:00Z', updated_at: '2026-10-15T18:00:00Z' },
        { id: 'a-new', name: 'New almonds', category: 'Alpha', allergen_warnings: { ...warnings, nuts: 'contains', nuts_levels: { almonds: 'contains' } }, created_at: '2026-10-14T12:00:00Z', updated_at: '2026-02-03T12:00:00Z' },
        { id: 'undated', name: 'Undated water', category: 'Middle', allergen_warnings: { ...warnings, cereals_gluten: 'contains', cereals_gluten_levels: {} } },
      ].map(item => ({ ...item, status: 'active', suppliers: [], certifications: [] }))
      const menus = [
        { id: 'z-old', name: 'Old dish', category: 'Zed', created_at: '2026-02-03T12:00:00Z' },
        { id: 'a-new', name: 'New dish', category: 'Alpha', created_at: '2026-10-14T12:00:00Z' },
        { id: 'undated', name: 'Undated dish', category: 'Middle' },
      ].map(item => ({ ...item, description: 'Sample dish', ingredients: [], dietary: [], status: item.id === 'z-old' ? 'active' : 'draft', item_type: item.id === 'a-new' ? 'packaged_product' : 'prepared', allergen_warnings: warnings }))
      page.setDefaultTimeout(15000)
      page.on('pageerror', error => errors.push(error.message))
      page.on('dialog', dialog => cancel ? dialog.dismiss() : dialog.accept())
      await context.addInitScript(language => { localStorage.setItem('defaultLanguage', language); sessionStorage.setItem('jencoach_dismissed', 'true') }, language)
      await page.route('**/*.supabase.co/**', route => route.abort())
      await page.route('**/api/**', async route => {
        const request = route.request(), url = new URL(request.url()), pathname = url.pathname
        let data = {}, status = 200
        if (pathname === '/api/auth/session') data = { authenticated: true, user: { id: 'fixture-user', role, name: 'Reviewer', email: 'review@example.invalid', businessId: 'fixture-business' } }
        else if (pathname.startsWith('/api/business/')) data = { settings: { defaultLanguage: language } }
        else if (pathname === '/api/ingredients') {
          if (url.searchParams.has('count_only')) data = { count: ingredients.length }
          else { data = { ingredients }; if (ingredientFailure) status = 503 }
        } else if (pathname.startsWith('/api/ingredients/')) {
          if (['PATCH', 'DELETE'].includes(request.method())) {
            mutations.push([request.method(), pathname])
            const id = pathname.split('/').at(-1)
            if ((request.method() === 'PATCH' && id === 'a-new' && denyArchive) || (request.method() === 'DELETE' && id === 'a-new' && denyDelete)) status = 503
            else if (request.method() === 'PATCH') { assert.deepEqual(request.postDataJSON(), { status: 'archived' }); ingredients.find(item => item.id === id).status = 'archived' }
            else ingredients = ingredients.filter(item => item.id !== id)
          } else if (pathname.endsWith('/categories')) data = { categories: [] }
          else data = { ingredient: ingredients.find(item => item.id === pathname.split('/').at(-1)) }
        } else if (pathname === '/api/menu-items') { data = { menuItems: menus }; if (menuFailure) status = 503 }
        else if (pathname.startsWith('/api/menu-items/')) data = { menuItem: menus.find(item => item.id === pathname.split('/').at(-1)) }
        else if (pathname === '/api/datasheets') data = { datasheets: [] }
        else if (pathname === '/api/compliance/status') data = { status: 'compliant', reasons: [] }
        else if (pathname === '/api/sites') data = { sites: [] }
        else if (pathname === '/api/suppliers') data = { suppliers: [] }
        else if (pathname.includes('notification')) data = { notifications: [] }
        await route.fulfill({ status, json: data })
      })
      const button = name => page.getByRole('button', { name: new RegExp(`^${name}$`, 'i') })
      const selected = name => page.getByRole('checkbox', { name: new RegExp(name) })
      const navigate = async path => {
        await page.goto((process.env.BASE_URL || 'http://localhost:3111') + path)
        await page.locator('h1').waitFor()
        const cookie = button(labels.cookieConsent.rejectNonEssential)
        if (await cookie.isVisible()) await cookie.click()
      }
      const expectOrder = async (container, names) => {
        const text = await container.innerText()
        for (let index = 1; index < names.length; index++) assert.ok(text.indexOf(names[index - 1]) < text.indexOf(names[index]), text)
      }
      await navigate('/admin/ingredients?view=list')
      await page.getByRole('alert').filter({ hasText: labels.regularLists.loadFailed }).waitFor()
      assert.equal(await page.getByText(labels.admin.noIngredientsFound, { exact: true }).count(), 0)
      ingredientFailure = false
      await button(labels.regularLists.retry).click()
      await selected('Old yoghurt').waitFor()
      await button(labels.admin.filters).click()
      await page.getByLabel(labels.admin.allergens, { exact: true }).selectOption('milk')
      await selected('New almonds').waitFor({ state: 'detached' })
      assert.equal(await selected('Old yoghurt').count(), 1)
      await page.getByLabel(labels.admin.allergens, { exact: true }).selectOption('nuts')
      await selected('Old yoghurt').waitFor({ state: 'detached' })
      assert.equal(await selected('New almonds').count(), 1)
      await page.getByLabel(labels.admin.allergens, { exact: true }).selectOption('cereals_gluten')
      await selected('New almonds').waitFor({ state: 'detached' })
      assert.equal(await selected('Undated water').count(), 1, 'a broad parent warning survives an empty subtype map')
      await page.getByLabel(labels.admin.allergens, { exact: true }).selectOption('all')
      await page.getByLabel(labels.regularLists.sortBy, { exact: true }).selectOption('date')
      await expectOrder(page.locator('tbody'), ['Old yoghurt', 'New almonds', 'Undated water'])
      await button(labels.ingredientsPortal.ascending).click()
      await expectOrder(page.locator('tbody'), ['New almonds', 'Old yoghurt', 'Undated water'])
      const roundTrip = async (base, id, returnPath) => {
        const itemLink = page.locator(`a[href^="${base}/${id}?"]`).first()
        assert.equal(new URL(await itemLink.getAttribute('href'), 'https://example.invalid').searchParams.get('returnTo'), returnPath)
        await itemLink.click()
        await page.waitForURL(url => url.pathname === `${base}/${id}`)
        await page.locator(`a[href^="${base}/${id}/edit?"]`).first().waitFor()
        await page.locator(`a[href^="${base}/${id}/edit?"]`).first().click()
        await page.waitForURL(url => url.pathname === `${base}/${id}/edit`)
        const back = page.locator('a').filter({ has: page.locator('svg.lucide-arrow-left') }).first()
        await back.waitFor()
        assert.equal(await back.getAttribute('href'), returnPath)
        await back.click()
        await page.waitForURL(url => url.pathname + url.search === returnPath)
        await page.locator(`a[href^="${base}/${id}/edit?"]`).first().click()
        await page.waitForURL(url => url.pathname === `${base}/${id}/edit`)
        await button(base.endsWith('ingredients') ? labels.accessPoints.cancel : labels.admin.cancel).click()
        await page.waitForURL(url => url.pathname + url.search === returnPath)
        await page.locator(`a[href^="${base}/new?"]`).first().click()
        await page.waitForURL(url => url.pathname === `${base}/new`)
        const newBack = page.locator('a').filter({ has: page.locator('svg.lucide-arrow-left') }).first()
        await newBack.waitFor()
        assert.equal(await newBack.getAttribute('href'), returnPath)
        await newBack.click()
        await page.waitForURL(url => url.pathname + url.search === returnPath)
        await page.locator(`a[href^="${base}/${id}?"]`).first().click()
        await page.waitForURL(url => url.pathname === `${base}/${id}`)
        await page.locator(`a[href^="${base}/${id}/edit?"]`).first().waitFor()
        await page.goBack()
        await page.waitForURL(url => url.pathname + url.search === returnPath)
      }
      await roundTrip('/admin/ingredients', 'a-new', new URL(page.url()).pathname + new URL(page.url()).search)
      await selected('Old yoghurt').check(); await selected('New almonds').check()
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'selected ingredient controls fit')
      await button(labels.admin.archive).click()
      assert.equal(mutations.length, 0, 'cancelling confirmation sends no writes')
      cancel = false
      await button(labels.admin.archive).click()
      await page.getByText(format(labels.regularLists.partialResult, { succeeded: 1, failed: 1 }), { exact: true }).waitFor()
      assert.equal(await selected('Old yoghurt').isChecked(), false)
      assert.equal(await selected('New almonds').isChecked(), true)
      await page.reload(); await selected('Old yoghurt').waitFor()
      assert.match(await selected('Old yoghurt').locator('xpath=ancestor::tr').innerText(), new RegExp('archived|' + labels.admin.archived, 'i'))
      denyArchive = false
      await selected('New almonds').check(); await button(labels.admin.archive).click()
      await page.getByText(format(labels.regularLists.completed, { count: 1 }), { exact: true }).waitFor()
      await selected('Old yoghurt').check(); await selected('New almonds').check()
      const deleteBulk = page.getByRole('group', { name: new RegExp(labels.regularLists.bulkActions, 'i') }).getByRole('button', { name: new RegExp(`^${labels.admin.delete}$`, 'i') })
      await deleteBulk.click()
      await selected('Old yoghurt').waitFor({ state: 'detached' })
      await page.getByText(format(labels.regularLists.partialResult, { succeeded: 1, failed: 1 }), { exact: true }).waitFor()
      assert.equal(await selected('New almonds').isChecked(), true)
      denyDelete = false
      await deleteBulk.click()
      await selected('New almonds').waitFor({ state: 'detached' })
      await page.reload(); await selected('Undated water').waitFor()
      assert.equal(await selected('Old yoghurt').count(), 0)
      assert.equal(await selected('New almonds').count(), 0)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'ingredient phone toolbar fits')
      role = 'staff'
      await page.reload(); await selected('Undated water').waitFor()
      assert.equal(await selected('Undated water').isDisabled(), true)
      assert.equal(await button(labels.admin.archive).count(), 0)
      await navigate('/admin/menu-builder?view=list')
      await page.getByRole('alert').filter({ hasText: labels.regularLists.loadFailed }).waitFor()
      assert.equal(await page.getByText(labels.admin.noMenuItemsFound, { exact: true }).count(), 0)
      menuFailure = false
      await button(labels.regularLists.retry).click()
      await page.getByText('Old dish', { exact: true }).waitFor()
      await page.getByLabel(labels.regularLists.sortBy, { exact: true }).selectOption('date')
      await expectOrder(page.locator('tbody'), ['Old dish', 'New dish', 'Undated dish'])
      await button(labels.admin.ascending).click()
      await expectOrder(page.locator('tbody'), ['New dish', 'Old dish', 'Undated dish'])
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'menu phone toolbar fits')
      await button(labels.admin.filters).click()
      await page.getByLabel(labels.admin.status, { exact: true }).selectOption('active')
      await page.getByText('New dish', { exact: true }).waitFor({ state: 'detached' })
      assert.equal(await page.getByText('Old dish', { exact: true }).count(), 1)
      await page.getByLabel(labels.regularLists.itemType, { exact: true }).selectOption('packaged_product')
      await page.getByText(labels.admin.noMenuItemsFound, { exact: true }).waitFor()
      await button(labels.admin.clearFilters).click()
      await page.getByText('New dish', { exact: true }).waitFor()
      await page.getByLabel(labels.admin.status, { exact: true }).selectOption('draft')
      await page.getByLabel(labels.regularLists.itemType, { exact: true }).selectOption('packaged_product')
      await page.getByText('Old dish', { exact: true }).waitFor({ state: 'detached' })
      assert.equal(await page.getByText('New dish', { exact: true }).count(), 1)
      assert.ok(await page.getByRole('textbox', { name: labels.admin.searchMenuItems }).evaluate(el => el.getBoundingClientRect().top < 900), 'search appears in the first phone screen')
      await roundTrip('/admin/menu-builder', 'a-new', new URL(page.url()).pathname + new URL(page.url()).search)
      assert.equal(await page.getByLabel(labels.admin.status, { exact: true }).inputValue(), 'draft')
      assert.equal(await page.getByLabel(labels.regularLists.itemType, { exact: true }).inputValue(), 'packaged_product')
      await page.screenshot({ path: `/tmp/regular-lists-${language}-${width}.png` })
      assert.deepEqual(errors, [])
      console.log(JSON.stringify({ language, width, result: 'passed', mutations: mutations.length }))
      await context.close()
    }
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
