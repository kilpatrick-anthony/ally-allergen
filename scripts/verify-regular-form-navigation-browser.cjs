// Local interface regression checks. All API calls use sample data; no live writes.
// PLAYWRIGHT_MODULE may point to an existing Playwright installation.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const catalog = require('../tests/helpers/translation-catalog.cjs')

;(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const warnings = Object.fromEntries(['cereals_gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans', 'milk', 'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs'].map(key => [key, key === 'milk' ? 'contains' : 'none']))
  try {
    for (const language of (process.env.REVIEW_LANGUAGES || 'en,de').split(',')) {
      for (const width of (process.env.REVIEW_WIDTHS || '390,1440').split(',').map(Number)) {
        const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 900 } })
        const page = await context.newPage(), errors = [], posts = [], updates = [], ingredientUpdates = [], labels = catalog[language]
        page.setDefaultTimeout(10000)
        page.on('pageerror', error => errors.push(error.message))
        page.on('dialog', dialog => dialog.accept())
        await context.addInitScript(language => {
          localStorage.setItem('defaultLanguage', language)
          sessionStorage.setItem('jencoach_dismissed', 'true')
        }, language)
        await page.route('**/*.supabase.co/**', route => route.abort())
        await page.route('**/api/**', async route => {
          const request = route.request(), url = new URL(request.url()), pathname = url.pathname
          if (failSaves && ['POST', 'PUT'].includes(request.method()) && /^\/api\/(ingredients|menu-items)(\/[^/]+)?$/.test(pathname)) { await route.fulfill({ status: 503, json: { error: 'Simulated save failure' } }); return }
          let data = {}
          if (pathname === '/api/menu-items/review-recipe') data = { menuItem: { id: 'review-recipe', name: 'Recipe review', description: 'Sample recipe', item_type: 'prepared', ingredients: ['sample-ingredient'], dietary: ['Vegan', 'Custom old claim'], allergen_warnings: warnings, status: 'draft' } }
          else if (pathname === '/api/menu-items/review-menu') {
            if (request.method() === 'PUT') updates.push(request.postDataJSON())
            data = { menuItem: { id: 'review-menu', name: 'Unassessed menu', description: '', category: '', item_type: 'prepared', ingredients: [], dietary: [], allergen_warnings: {}, status: 'draft', is_active: false, created_at: '2026-10-15T12:00:00Z', updated_at: '2026-10-15T12:00:00Z' } }
          } else if (pathname === '/api/ingredients/review-ingredient') {
            if (request.method() === 'PUT') ingredientUpdates.push(request.postDataJSON())
            data = { ingredient: { id: 'review-ingredient', name: 'Unassessed ingredient', category: '', suppliers: [], certifications: [], supplier_profiles: {}, allergen_warnings: {}, created_at: '2026-10-15T12:00:00Z' } }
          } else if (pathname === '/api/compliance/status') data = { status: 'error', reasons: [] }
          else if (pathname === '/api/datasheets') data = { datasheets: [] }
          else if (pathname === '/api/auth/session') data = { authenticated: true, user: { id: 'review-user', name: 'Reviewer', email: 'review@example.invalid', role: 'owner', businessId: 'review-business' } }
          else if (pathname.startsWith('/api/business/')) data = { settings: { defaultLanguage: language }, business: { name: 'Sample kitchen' } }
          else if (request.method() === 'POST' && ['/api/ingredients', '/api/menu-items'].includes(pathname)) {
            posts.push(request.postDataJSON())
            data = { [pathname === '/api/ingredients' ? 'ingredient' : 'menuItem']: { id: 'saved' } }
          } else if (pathname === '/api/ingredients') data = { count: 1, ingredients: [{ id: 'sample-ingredient', name: 'Natural yoghurt', category: 'Dairy', suppliers: ['Sample supplier'], allergen_warnings: warnings, certifications: ['Vegetarian'], status: 'active' }] }
          else if (pathname === '/api/menu-items') data = { menuItems: [] }
          else if (pathname === '/api/sites') data = { sites: [{ id: 'sample-site', name: 'Main kitchen' }] }
          else if (pathname === '/api/suppliers') data = { suppliers: [{ id: 'sample-supplier', name: 'Sample supplier' }] }
          else if (pathname.includes('categories')) data = { categories: [] }
          else if (pathname.includes('notification')) data = { notifications: [] }
          await route.fulfill({ json: data })
        })
        async function go(path) {
          await page.goto((process.env.BASE_URL || 'http://localhost:3111') + path, { timeout: 120000 })
          await page.locator('h1').waitFor()
          const cookie = page.getByRole('button', { name: labels.cookieConsent.rejectNonEssential, exact: true })
          if (await cookie.isVisible()) await cookie.click()
          if (/\/(new|edit)(\?|$)/.test(path)) {
            const actions = page.getByRole('region', { name: labels.regularForms.actions, exact: true })
            await actions.waitFor()
            for (const scroll of [0, 100000]) {
              await page.evaluate(y => window.scrollTo(0, y), scroll)
              const rect = await actions.boundingBox()
              assert.ok(rect && rect.y >= 0 && rect.y + rect.height <= 902, 'actions stay within the viewport')
            }
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'form fits the viewport')
            await page.evaluate(() => window.scrollTo(0, 0))
          }

        }
        async function assess() {
          for (const key of Object.keys(warnings)) await page.getByLabel(labels.allergenNames[key], { exact: true }).selectOption(warnings[key])
        }
        let accept = false, failSaves = false
        const dialogs = []
        page.removeAllListeners('dialog')
        page.on('dialog', async dialog => {
          dialogs.push({ type: dialog.type(), message: dialog.message() })
          await (accept ? dialog.accept() : dialog.dismiss())
        })
        const origin = process.env.BASE_URL || 'http://localhost:3111'
        const routes = [
          ['/admin/ingredients', '/admin/ingredients/new', labels.ingredientsPortal.saveIngredient],
          ['/admin/ingredients', '/admin/ingredients/review-ingredient/edit', labels.admin.saveChanges],
          ['/admin/menu-builder', '/admin/menu-builder/new', labels.regularAssessment.saveDraft],
          ['/admin/menu-builder', '/admin/menu-builder/review-menu/edit', labels.admin.saveMenuItem],
        ]
        for (const [base, form, saveLabel] of routes) {
          await go(base)
          await go(form)
          const cancel = () => page.getByRole('region', { name: labels.regularForms.actions, exact: true }).getByRole('button', { name: labels.admin.cancel, exact: true })
          const before = dialogs.length
          await cancel().click()
          await page.waitForURL(origin + base)
          assert.equal(dialogs.length, before, 'pristine forms leave without a warning')
          await go(form)
          const name = page.locator('#regular-name')
          const original = await name.inputValue()
          await name.fill('')
          await page.getByRole('button', { name: new RegExp('^' + saveLabel + '$', 'i') }).click()
          await page.waitForFunction(() => document.activeElement?.id === 'regular-name')
          assert.equal(await name.getAttribute('aria-invalid'), 'true')
          assert.equal(await page.locator('#regular-name-error').count(), 1)
          await name.fill(original)
          await cancel().click()
          await page.waitForURL(origin + base)
          assert.equal(dialogs.length, before, 'reverting edits restores the pristine state')
          await go(form)
          await page.locator('#regular-name').fill('Unsaved test')
          await cancel().click()
          assert.equal(dialogs.at(-1).message, labels.regularForms.unsaved)
          assert.equal(new URL(page.url()).pathname, form)
          assert.equal(await page.locator('#regular-name').inputValue(), 'Unsaved test')
          const backLink = page.locator('a').filter({ has: page.locator('svg.lucide-arrow-left') }).first()
          await backLink.click()
          assert.equal(new URL(page.url()).pathname, form, 'declining the Back link keeps edits')
          await page.evaluate(() => history.back())
          await page.waitForTimeout(150)
          assert.equal(new URL(page.url()).pathname, form, 'declining browser Back keeps edits')
          assert.equal(await page.locator('#regular-name').inputValue(), 'Unsaved test')
          if (base.endsWith('ingredients')) await assess()
          failSaves = true
          const response = page.waitForResponse(response => response.request().method() === (form.endsWith('/new') ? 'POST' : 'PUT') && response.url().includes('/api/'))
          await page.getByRole('button', { name: new RegExp('^' + saveLabel + '$', 'i') }).click()
          await response
          await cancel().click()
          assert.equal(new URL(page.url()).pathname, form, 'a failed save retains the form and still warns')
          assert.equal(await page.locator('#regular-name').inputValue(), 'Unsaved test')
          failSaves = false
          const count = dialogs.length
          const reloadDialog = page.waitForEvent('dialog')
          await page.evaluate(() => { setTimeout(() => location.reload(), 0) })
          await reloadDialog
          await page.waitForTimeout(100)
          assert.equal(dialogs.length, count + 1)
          assert.equal(dialogs.at(-1).type, 'beforeunload')
          assert.equal(await page.locator('#regular-name').inputValue(), 'Unsaved test')
          accept = true
          await page.evaluate(() => history.back())
          await page.waitForURL(origin + base)
          accept = false
        }
        assert.deepEqual(errors, [])
        console.log(JSON.stringify({ language, width, forms: 4, result: 'passed' }))
        await context.close()
      }
    }
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
