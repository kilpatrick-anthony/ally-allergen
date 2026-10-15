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
        let leaveDialogs = 0, expectedLeaveDialogs = 0
        page.on('dialog', dialog => { throw new Error('Unexpected discard prompt: ' + dialog.message()) })
        await context.addInitScript(language => {
          localStorage.setItem('defaultLanguage', language)
          sessionStorage.setItem('jencoach_dismissed', 'true')
        }, language)
        await page.route('**/*.supabase.co/**', route => route.abort())
        await page.route('**/api/**', async route => {
          const request = route.request(), url = new URL(request.url()), pathname = url.pathname
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
        const origin = process.env.BASE_URL || 'http://localhost:3111'
        for (const entity of ['ingredient', 'menu_item']) {
          const base = entity === 'ingredient' ? '/admin/ingredients' : '/admin/menu-builder'
          const recordId = entity === 'ingredient' ? 'recovery-ingredient' : 'recovery-menu'
          const record = { id: recordId, name: 'Recovery example', description: 'Sample', status: entity === 'ingredient' ? 'active' : 'draft', item_type: 'prepared', ingredients: [], dietary: [], suppliers: [], supplier_profiles: {}, certifications: [], allergen_warnings: warnings }
          let documents = ['remove-good', 'remove-fail', 'edit-good', 'edit-fail'].map(id => ({ id, file_name: id + '.pdf', file_type: 'application/pdf', file_size: 100, notes: '', supplier_name: null, version: null, next_review_date: null }))
          const counts = new Map(), writes = []
          await page.route('**/api/**', async route => {
            const request = route.request(), path = new URL(request.url()).pathname
            if (path === (entity === 'ingredient' ? '/api/ingredients/' : '/api/menu-items/') + recordId) {
              if (request.method() === 'PUT') writes.push(request.postDataJSON())
              await route.fulfill({ json: { [entity === 'ingredient' ? 'ingredient' : 'menuItem']: record } }); return
            }
            if (path === '/api/datasheets') { await route.fulfill({ json: { datasheets: documents } }); return }
            if (path.startsWith('/api/datasheets/') && ['DELETE', 'PATCH'].includes(request.method())) {
              const id = path.split('/').at(-1), key = request.method() + ':' + id, count = (counts.get(key) || 0) + 1
              counts.set(key, count)
              if (id.endsWith('fail') && count === 1) { await route.fulfill({ status: 503, json: { error: 'Simulated failure' } }); return }
              if (request.method() === 'DELETE') documents = documents.filter(item => item.id !== id)
              else Object.assign(documents.find(item => item.id === id), request.postDataJSON())
              await route.fulfill({ json: { success: true } }); return
            }
            if (path === '/api/upload/datasheet') {
              const body = request.postDataBuffer().toString('utf8'), name = /filename="([^"]+)"/.exec(body)[1]
              assert.ok(body.includes('name="' + entity + '_id"'))
              const key = 'POST:' + name, count = (counts.get(key) || 0) + 1; counts.set(key, count)
              if (name === 'failed-new.pdf' && count === 1) { await route.fulfill({ status: 503, json: { error: 'Simulated failure' } }); return }
              if (name === 'good-new.pdf') await new Promise(resolve => setTimeout(resolve, 300))
              const datasheet = { id: 'uploaded-' + name, file_name: name }
              documents.push(datasheet)
              await route.fulfill({ json: { datasheet } }); return
            }
            await route.fallback()
          })
          await go(base + '/' + recordId + '/edit')
          await page.getByText('edit-fail.pdf', { exact: true }).waitFor()
          for (const name of ['edit-good.pdf', 'edit-fail.pdf']) {
            await page.getByRole('button', { name: labels.regularForms.editDocumentDetails.replace('{name}', name), exact: true }).click()
            const notes = page.getByRole('textbox', { name: labels.ingredientsPortal.notes, exact: true })
            await notes.pressSequentially('Reviewed evidence')
            assert.equal(await notes.inputValue(), 'Reviewed evidence', 'metadata stays open through typing')
            await page.getByRole('button', { name: labels.regularForms.finishDocumentDetails.replace('{name}', name), exact: true }).click()
          }
          for (const name of ['remove-good.pdf', 'remove-fail.pdf']) await page.getByRole('button', { name: labels.ingredientsPortal.removeFile.replace('{fileName}', name), exact: true }).click()
          await page.locator('input[type=file][accept*=".pdf"]').first().setInputFiles([
            { name: 'good-new.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF good') },
            { name: 'failed-new.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF failed') },
          ])
          const actions = page.getByRole('region', { name: labels.regularForms.actions, exact: true })
          await actions.getByRole('button', { name: entity === 'ingredient' ? labels.admin.saveChanges : labels.admin.saveMenuItem, exact: true }).click()
          await actions.getByText(labels.regularForms.editDocumentsPending, { exact: true }).waitFor()
          assert.equal(writes.length, 1)
          await page.screenshot({ path: `/tmp/edit-recovery-${entity}-${language}-${width}.png` })
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'partial-save feedback fits the viewport')
          assert.equal(counts.get('POST:good-new.pdf'), 1)
          assert.equal(counts.get('DELETE:remove-good'), 1)
          assert.equal(counts.get('PATCH:edit-good'), 1)
          assert.equal(new URL(page.url()).pathname, base + '/' + recordId + '/edit')
          await page.locator('#regular-name').fill('Corrected after partial save')
          await actions.getByRole('button', { name: labels.regularItemSave.saveAndRetry, exact: true }).click()
          await page.waitForURL(origin + base)
          assert.equal(writes.length, 2); assert.equal(writes[1].name, 'Corrected after partial save')
          for (const key of ['POST:good-new.pdf', 'DELETE:remove-good', 'PATCH:edit-good']) assert.equal(counts.get(key), 1, key)
          for (const key of ['POST:failed-new.pdf', 'DELETE:remove-fail', 'PATCH:edit-fail']) assert.equal(counts.get(key), 2, key)
          assert.deepEqual(documents.map(item => item.file_name).sort(), ['edit-fail.pdf','edit-good.pdf','failed-new.pdf','good-new.pdf'])
          for (const id of ['edit-good', 'edit-fail']) assert.equal(documents.find(item => item.id === id).notes, 'Reviewed evidence')
        }
        assert.deepEqual(errors, [])
        console.log(JSON.stringify({ language, width, editors: 2, result: 'passed' }))
        await context.close()
      }
    }
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
