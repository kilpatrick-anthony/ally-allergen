// Local interface regression checks. All API calls use sample data; no live writes.
// PLAYWRIGHT_MODULE may point to an existing Playwright installation.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const catalog = require('../tests/helpers/translation-catalog.cjs')

;(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const warnings = Object.fromEntries(['cereals_gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans', 'milk', 'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs'].map(key => [key, key === 'milk' ? 'contains' : 'none']))
  let activePage
  try {
    for (const language of (process.env.REVIEW_LANGUAGES || 'en,de').split(',')) {
      for (const width of (process.env.REVIEW_WIDTHS || '390,1440').split(',').map(Number)) {
        const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 900 } })
        const page = await context.newPage(), errors = [], posts = [], updates = [], ingredientUpdates = [], labels = catalog[language]
        activePage = page
        page.setDefaultTimeout(10000)
        page.on('pageerror', error => errors.push(error.message))
        let leaveDialogs = 0, expectedLeaveDialogs = 0
        page.on('dialog', dialog => { leaveDialogs++; void dialog.accept() })
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
        async function checkCertificationToggle() {
          const button = page.getByRole('button', { name: labels.quickAdd.tag_Vegan, exact: true })
          assert.equal(await button.getAttribute('aria-pressed'), 'false')
          await button.focus()
          await page.keyboard.press('Space')
          assert.equal(await button.getAttribute('aria-pressed'), 'true')
          await page.keyboard.press('Space')
          assert.equal(await button.getAttribute('aria-pressed'), 'false')
        }
        async function checkIngredientPicker() {
          const originalDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
          for (const dark of [false, true]) {
            await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark)
            const dialog = page.getByRole('dialog', { name: labels.admin.selectIngredientsTitle, exact: true })
            const search = dialog.getByRole('searchbox', { name: labels.admin.searchIngredients, exact: true })
            await search.waitFor()
            await page.waitForFunction(() => document.activeElement?.type === 'search')
            assert.equal(await dialog.getAttribute('aria-modal'), 'true')
            assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'picker fits the viewport')
            await page.keyboard.press('Shift+Tab')
            assert.equal(await dialog.getByRole('button', { name: labels.admin.close, exact: true }).evaluate(el => el === document.activeElement), true)
            await page.keyboard.press('Shift+Tab')
            assert.equal(await dialog.getByRole('button', { name: labels.admin.done, exact: true }).evaluate(el => el === document.activeElement), true, 'reverse Tab wraps inside the picker')
            await page.keyboard.press('Tab')
            assert.equal(await dialog.getByRole('button', { name: labels.admin.close, exact: true }).evaluate(el => el === document.activeElement), true, 'Tab wraps inside the picker')
            await search.fill('no-matching-review-ingredient')
            await dialog.getByRole('status').waitFor()
            await search.fill('')
            const option = dialog.getByRole('checkbox')
            await option.waitFor()
            const wasChecked = await option.isChecked()
            await option.focus()
            await page.keyboard.press('Space')
            assert.equal(await option.isChecked(), !wasChecked, 'Space toggles the recipe ingredient')
            await page.keyboard.press('Space')
            assert.equal(await option.isChecked(), wasChecked, 'keyboard selection can be reversed')
            await page.screenshot({ path: `/tmp/ingredient-picker-${language}-${width}-${dark ? 'dark' : 'light'}.png` })
            await page.keyboard.press('Escape')
            await dialog.waitFor({ state: 'hidden' })
            await page.waitForFunction(() => document.activeElement?.id === 'regular-recipe')
            await page.keyboard.press('Enter')
          }
          await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), originalDark)
        }
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
        const ingredientReturn = '/admin/ingredients?q=Reviewed&view=list&sort=date&direction=desc'
        const menuReturn = '/admin/menu-builder?q=Draft&status=draft&type=prepared&view=list&filters=1'
        await go('/admin/ingredients/new?returnTo=' + encodeURIComponent(ingredientReturn))
        await page.getByPlaceholder(labels.ingredientsPortal.newNamePlaceholder, { exact: true }).fill('Reviewed ingredient')
        await checkCertificationToggle()
        assert.equal(await page.getByLabel(labels.allergenNames.milk, { exact: true }).inputValue(), '')
        await page.getByRole('button', { name: labels.ingredientsPortal.saveIngredient, exact: true }).click()
        assert.equal(posts.length, 0)
        const supplier = page.locator('select').filter({ has: page.locator('option', { hasText: labels.ingredientsPortal.chooseExistingSupplier }) })
        await supplier.selectOption({ label: 'Sample supplier' })
        await page.getByRole('button', { name: labels.ingredientsPortal.removeSupplier.replace('{supplier}', 'Sample supplier'), exact: true }).click()
        for (const key of Object.keys(warnings)) assert.equal(await page.getByLabel(labels.allergenNames[key], { exact: true }).inputValue(), '')
        await supplier.selectOption({ label: 'Sample supplier' })
        await checkCertificationToggle()
        await assess()
        assert.equal(await page.getByRole('button', { name: labels.ingredientsPortal.markProfileReviewed, exact: true }).isEnabled(), true)
        await page.getByRole('button', { name: labels.ingredientsPortal.saveIngredient, exact: true }).click()
        assert.equal(posts.length, 0)
        await page.getByRole('button', { name: labels.ingredientsPortal.markProfileReviewed, exact: true }).click()
        await page.getByRole('button', { name: labels.ingredientsPortal.saveIngredient, exact: true }).click()
        await page.waitForURL(url => url.pathname + url.search === ingredientReturn)
        assert.equal(leaveDialogs, expectedLeaveDialogs, 'successful saves do not prompt to discard changes')
        assert.equal(posts.length, 1)
        assert.equal(Object.values(posts[0].supplier_profiles)[0].assessment_status, 'assessed')

        await go('/admin/menu-builder/new?returnTo=' + encodeURIComponent(menuReturn))
        assert.equal(await page.getByRole('region', { name: labels.admin.dietaryClaims, exact: true }).getByRole('button').count(), 0, 'prepared dietary claims are read-only')
        await page.getByText(labels.regularAssessment.incomplete, { exact: true }).scrollIntoViewIfNeeded()
        await page.screenshot({ path: `/tmp/regular-assessment-${language}-${width}.png` })
        assert.ok(await page.getByRole('heading', { name: labels.admin.allergenSummary, exact: true }).evaluate(el => {
          const heading = el.getBoundingClientRect(), parent = el.parentElement.getBoundingClientRect()
          return heading.right <= parent.right + 1 && heading.left >= parent.left && el.scrollWidth <= el.clientWidth + 1
        }), 'the translated summary heading fits beside its icon')
        assert.equal(await page.getByText(labels.noAllergensDetected, { exact: true }).count(), 0)
        assert.equal(await page.getByText(labels.regularAssessment.incomplete, { exact: true }).count(), 1)
        await page.getByPlaceholder(labels.admin.menuItemName, { exact: true }).fill('Draft menu')
        await page.getByRole('button', { name: new RegExp('^' + labels.regularAssessment.makeActive + '$', 'i') }).click()
        assert.equal(posts.length, 1)
        await page.waitForFunction(() => document.activeElement?.id === 'regular-description')
        await page.getByRole('button', { name: new RegExp('^' + labels.regularAssessment.saveDraft + '$', 'i') }).click()
        await page.waitForURL(url => url.pathname + url.search === menuReturn)
        assert.equal(leaveDialogs, expectedLeaveDialogs, 'successful saves do not prompt to discard changes')
        assert.equal(posts[1].status, 'draft')

        await go('/admin/menu-builder/new?returnTo=' + encodeURIComponent(menuReturn))
        assert.equal(await page.getByRole('region', { name: labels.admin.dietaryClaims, exact: true }).getByRole('button').count(), 0, 'prepared dietary claims are read-only')
        await page.getByPlaceholder(labels.admin.menuItemName, { exact: true }).fill('Reviewed recipe')
        await page.getByPlaceholder(labels.admin.descriptionPlaceholder, { exact: true }).fill('Prepared recipe')
        await page.getByRole('button', { name: labels.admin.addIngredients, exact: true }).click()
        await checkIngredientPicker()
        await page.locator('label').filter({ hasText: 'Natural yoghurt' }).getByRole('checkbox').check()
        await page.getByRole('button', { name: labels.admin.done, exact: true }).click()
        await page.waitForFunction(() => document.activeElement?.id === 'regular-recipe')
        await page.getByRole('button', { name: new RegExp('^' + labels.regularAssessment.makeActive + '$', 'i') }).click()
        await page.waitForURL(url => url.pathname + url.search === menuReturn)
        assert.equal(leaveDialogs, expectedLeaveDialogs, 'successful saves do not prompt to discard changes')
        assert.equal(posts[2].status, 'active')
        assert.equal(posts[2].allergen_warnings.milk, 'contains')

        await go('/admin/menu-builder/new?returnTo=' + encodeURIComponent(menuReturn))
        assert.equal(await page.getByRole('region', { name: labels.admin.dietaryClaims, exact: true }).getByRole('button').count(), 0, 'prepared dietary claims are read-only')
        await page.getByRole('button', { name: labels.admin.packagedProduct + ' ' + labels.admin.packagedProductHelp, exact: true }).click()
        assert.equal(await page.getByRole('button', { name: labels.admin.packagedProduct + ' ' + labels.admin.packagedProductHelp, exact: true }).getAttribute('aria-pressed'), 'true')
        await page.getByPlaceholder(labels.admin.menuItemName, { exact: true }).fill('Reviewed product')
        await page.getByPlaceholder(labels.admin.descriptionPlaceholder, { exact: true }).fill('Bought-in product')
        await assess()
        await page.getByRole('button', { name: labels.quickAdd.tag_Vegetarian, exact: true }).click()
        await page.getByRole('button', { name: new RegExp('^' + labels.regularAssessment.makeActive + '$', 'i') }).click()
        assert.equal(posts.length, 3)
        await page.waitForFunction(() => document.activeElement?.id === 'regular-supplier')
        await page.getByLabel(new RegExp('^' + labels.admin.supplier)).selectOption({ label: 'Sample supplier' })
        await page.getByLabel(new RegExp(labels.admin.fullIngredientDeclaration, 'i')).fill('Milk')
        await page.getByRole('checkbox').check()
        await page.getByRole('button', { name: new RegExp('^' + labels.regularAssessment.makeActive + '$', 'i') }).click()
        await page.waitForURL(url => url.pathname + url.search === menuReturn)
        assert.equal(leaveDialogs, expectedLeaveDialogs, 'successful saves do not prompt to discard changes')
        assert.equal(posts[3].status, 'active')
        assert.deepEqual(posts[3].dietary, ['Vegetarian'])
        await go('/admin/menu-builder/review-menu')
        await page.getByText(labels.regularAssessment.incomplete, { exact: true }).waitFor()
        assert.equal(await page.getByText(labels.ingredientsPortal.noAllergensPresent, { exact: true }).count(), 0)
        await go('/admin/ingredients/review-ingredient')
        await page.getByText(labels.regularAssessment.incomplete, { exact: true }).waitFor()
        assert.equal(await page.getByText(labels.ingredientsPortal.noAllergensPresent, { exact: true }).count(), 0)
        await go('/admin/ingredients/review-ingredient/edit?returnTo=' + encodeURIComponent(ingredientReturn))
        await checkCertificationToggle()
        await assess()
        await page.getByRole('button', { name: labels.admin.saveChanges, exact: true }).click()
        await page.waitForURL(url => url.pathname + url.search === ingredientReturn)
        assert.equal(leaveDialogs, expectedLeaveDialogs, 'successful saves do not prompt to discard changes')
        assert.equal(ingredientUpdates.length, 1)
        assert.deepEqual(ingredientUpdates[0].allergen_warnings, warnings)
        await go('/admin/menu-builder/review-recipe/edit?returnTo=' + encodeURIComponent(menuReturn))
        const dietarySummary = page.getByRole('region', { name: labels.admin.dietaryClaims, exact: true })
        assert.equal(await dietarySummary.getByRole('button').count(), 0)
        await dietarySummary.getByText(labels.quickAdd.tag_Vegetarian, { exact: true }).waitFor()
        assert.doesNotMatch(await dietarySummary.innerText(), /Custom old claim|Vegan/)
        await page.getByRole('button', { name: labels.admin.addMoreIngredients, exact: true }).click()
        await checkIngredientPicker()
        await page.locator('label').filter({ hasText: 'Natural yoghurt' }).getByRole('checkbox').uncheck()
        await page.getByRole('button', { name: labels.admin.done, exact: true }).click()
        await page.waitForFunction(() => document.activeElement?.id === 'regular-recipe')
        await dietarySummary.getByText(labels.regularForms.noDerivedDietary, { exact: true }).waitFor()
        expectedLeaveDialogs++ // Intentionally leave the modified recipe without saving.
        await go('/admin/menu-builder/review-menu/edit?returnTo=' + encodeURIComponent(menuReturn))
        await page.getByRole('button', { name: labels.admin.saveMenuItem, exact: true }).click()
        await page.waitForURL(url => url.pathname + url.search === menuReturn)
        assert.equal(leaveDialogs, expectedLeaveDialogs, 'successful saves do not prompt to discard changes')
        assert.equal(updates.length, 1)
        assert.equal(updates[0].status, 'draft')
        assert.deepEqual(errors, [])
        console.log(JSON.stringify({ language, width, journeys: 9, result: 'passed' }))
        await context.close()
      }
    }
  } catch (error) {
    if (activePage && !activePage.isClosed()) {
      await activePage.screenshot({ path: '/tmp/regular-assessment-failure.png' })
      console.error('Action labels:', await activePage.locator('[role=region] button').allTextContents())
    }
    throw error
  } finally {
    await browser.close()
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
