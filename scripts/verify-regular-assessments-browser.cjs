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
        await page.route('**/review-icon.png', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') }))
        await page.route('**/api/**', async route => {
          const request = route.request(), url = new URL(request.url()), pathname = url.pathname
          let data = {}
          if (pathname === '/api/upload/menu-item-icon') data = { iconUrl: '/review-icon.png' }
          else if (pathname === '/api/menu-items/review-recipe') data = { menuItem: { id: 'review-recipe', name: 'Recipe review', description: 'Sample recipe', item_type: 'prepared', ingredients: ['sample-ingredient'], dietary: ['Vegan', 'Custom old claim'], allergen_warnings: warnings, status: 'draft' } }
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
          } else if (pathname === '/api/ingredient-drafts') data = { drafts: [] }
          else if (pathname === '/api/ingredients') data = { count: 1, ingredients: [{ id: 'sample-ingredient', name: 'Natural yoghurt', category: 'Dairy', suppliers: ['Sample supplier'], allergen_warnings: warnings, certifications: ['Vegetarian'], status: 'active' }] }
          else if (pathname === '/api/menu-items') data = { menuItems: [] }
          else if (pathname === '/api/sites') data = { sites: [{ id: 'sample-site', name: 'Main kitchen' }] }
          else if (pathname === '/api/suppliers') data = { suppliers: [{ id: 'sample-supplier', name: 'Sample supplier' }] }
          else if (pathname.includes('categories')) data = { categories: [] }
          else if (pathname.includes('notification')) data = { notifications: [] }
          await route.fulfill({ json: data })
        })
        async function checkExpandedAssessments() {
          const wasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
          for (const [key, types] of [['cereals_gluten', ['barley', 'oats', 'rye', 'wheat']], ['nuts', ['almonds', 'brazil_nuts', 'cashews', 'hazelnuts', 'macadamia', 'pecans', 'pistachios', 'walnuts']]]) {
            const parent = page.getByRole('combobox', { name: labels.allergenNames[key], exact: true })
            const original = await parent.inputValue(), parentId = await parent.getAttribute('id')
            await parent.selectOption('contains')
            await page.getByText(labels.regularAssessment.remaining.replace('{count}', '13'), { exact: true }).waitFor()
            const group = parent.locator('xpath=../../..').getByRole('group')
            assert.equal(await group.getByRole('combobox').count(), types.length)
            for (const type of types) assert.equal(await group.getByRole('combobox', { name: labels.allergenSubtypes[type], exact: true }).count(), 1, 'every subtype has a distinct visible label')
            const first = group.getByRole('combobox', { name: labels.allergenSubtypes[types[0]], exact: true })
            for (const dark of [false, true]) {
              await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark)
              await first.selectOption('may_contain')
              await group.getByRole('button').click()
              assert.equal(await first.inputValue(), 'contains', 'bulk action restores the parent warning level')
              assert.ok((await group.getByRole('button').boundingBox()).height >= 44)
              assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'expanded assessments fit the viewport')
              await group.evaluate(el => Promise.all(el.parentElement.getAnimations().map(animation => animation.finished.catch(() => {}))))
              const contrast = await group.evaluate(el => {
                const luminance = colour => {
                  // Tailwind colours may be reported as lab()/oklch(), not rgb().
                  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1
                  const context = canvas.getContext('2d', { willReadFrequently: true })
                  context.fillStyle = colour; context.fillRect(0, 0, 1, 1)
                  const channels = Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3).map(value => { const channel = value / 255; return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4 })
                  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
                }
                const text = luminance(getComputedStyle(el.querySelector('label')).color)
                const background = luminance(getComputedStyle(el.parentElement).backgroundColor)
                return { ratio: (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05), text: getComputedStyle(el.querySelector('label')).color, background: getComputedStyle(el.parentElement).backgroundColor, parent: el.parentElement.className, dark: document.documentElement.className }
              })
              assert.ok(contrast.ratio >= 4.5, `expanded caption contrast is readable: ${JSON.stringify(contrast)}`)
              await group.screenshot({ path: `/tmp/expanded-${key}-${language}-${width}-${dark ? 'dark' : 'light'}.png` })
            }
            for (const type of types) await group.getByRole('combobox', { name: labels.allergenSubtypes[type], exact: true }).selectOption('none')
            assert.equal(await parent.inputValue(), 'none')
            await page.waitForFunction(id => document.activeElement?.id === id, parentId)
            await parent.selectOption(original)
            await page.getByText(labels.regularAssessment.remaining.replace('{count}', '14'), { exact: true }).waitFor()
          }
          await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), wasDark)
        }
        async function checkSupplierPanel() {
          const toggle = page.locator('[data-supplier-toggle]')
          const panelId = await toggle.getAttribute('aria-controls')
          assert.ok(panelId)
          const panel = page.locator(`[id="${panelId}"]`)
          assert.equal(await panel.getAttribute('role'), 'region')
          assert.ok((await toggle.boundingBox()).height >= 44)
          await toggle.focus()
          await page.keyboard.press('Space')
          assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
          await panel.waitFor({ state: 'hidden' })
          await page.keyboard.press('Enter')
          await panel.waitFor()
          assert.equal(await toggle.getAttribute('aria-expanded'), 'true')
          assert.equal(await toggle.evaluate(el => el === document.activeElement), true)
        }
        async function checkMenuAppearance() {
          const colour = page.locator('#regular-tile-colour')
          await colour.evaluate(el => {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '#003842')
            el.dispatchEvent(new Event('input', { bubbles: true }))
            el.dispatchEvent(new Event('change', { bubbles: true }))
          })
          await page.getByRole('button', { name: `${labels.admin.clear}: ${labels.admin.tileColour}`, exact: true }).click()
          await page.waitForFunction(() => document.activeElement?.id === 'regular-tile-colour')
          assert.equal(await colour.inputValue(), '#ffffff')
          await page.locator('#regular-menu-image').setInputFiles({ name: 'review.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') })
          await page.getByRole('button', { name: `${labels.admin.clear}: ${labels.admin.selectedIcon}`, exact: true }).click()
          await page.waitForFunction(() => document.activeElement?.id === 'regular-menu-image')
        }
        async function checkCustomMenuClaim() {
          const section = page.getByRole('region', { name: labels.admin.dietaryClaims, exact: true })
          const input = section.getByRole('textbox')
          await input.fill('House verified claim')
          await section.getByRole('button', { name: labels.admin.add, exact: true }).click()
          assert.equal(await input.evaluate(el => el === document.activeElement), true)
          await section.getByRole('button', { name: 'House verified claim', exact: true }).click()
          await page.waitForFunction(() => document.activeElement?.tagName === 'INPUT' && document.activeElement?.hasAttribute('data-unsaved-draft'))
          assert.equal(await input.evaluate(el => el === document.activeElement), true)
        }
        async function checkReviewFrequency() {
          const radios = page.getByRole('radio')
          assert.equal(await radios.count(), 4)
          const original = await page.locator('input[type=radio]:checked').inputValue()
          const last = page.getByRole('radio', { name: labels.admin.twelveMonths, exact: true })
          await last.focus()
          await page.keyboard.press('ArrowRight')
          assert.equal(await page.getByRole('radio', { name: labels.admin.threeMonths, exact: true }).isChecked(), true, 'ArrowRight wraps review choices')
          await page.keyboard.press('ArrowLeft')
          assert.equal(await last.isChecked(), true)
          await page.locator(`input[type=radio][value="${original}"]`).check()
          const wasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
          for (const dark of [false, true]) {
            await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark)
            await last.locator('xpath=ancestor::fieldset[1]').screenshot({ path: `/tmp/review-frequency-${language}-${width}-${dark ? 'dark' : 'light'}.png` })
          }
          await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), wasDark)
        }
        async function checkCustomCertification(editing) {
          const toggle = page.locator('#regular-custom-certification-toggle')
          const originalDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
          for (const dark of [false, true]) {
            await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark)
            await toggle.click()
            const input = page.getByRole('textbox', { name: labels.ingredientsPortal.customCertification, exact: true })
            await input.waitFor()
            await page.waitForFunction(() => document.activeElement?.id === 'regular-custom-certification')
            const add = input.locator('xpath=../..').getByRole('button', { name: labels.admin.add, exact: true })
            assert.equal(await add.isEnabled(), false, 'empty custom claims cannot be added')
            await input.fill('House claim')
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'custom entry fits the viewport')
            await input.locator('xpath=../..').screenshot({ path: `/tmp/custom-certification-${editing ? 'edit' : 'new'}-${language}-${width}-${dark ? 'dark' : 'light'}.png` })
            if (dark) await page.keyboard.press('Enter')
            else await add.click()
            await page.waitForFunction(() => document.activeElement?.id === 'regular-custom-certification-toggle')
            const removeName = labels.regularForms.removeIngredient.replace('{name}', 'House claim')
            const remove = page.getByRole('button', { name: removeName, exact: true })
            assert.ok((await remove.boundingBox()).width >= 44)
            await remove.click()
            assert.equal(await remove.count(), 0)
            await page.waitForFunction(() => document.activeElement?.id === 'regular-custom-certification-toggle')
            {
              await toggle.click()
              await input.fill('Unfinished claim')
              await input.locator('xpath=../..').getByRole('button', { name: labels.admin.close, exact: true }).click()
              await page.waitForFunction(() => document.activeElement?.id === 'regular-custom-certification-toggle')
            }
          }
          await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), originalDark)
        }
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
            await checkReviewFrequency()
            const unnamed = await page.locator('main input:visible, main textarea:visible, main select:visible').evaluateAll(fields => fields.filter(field => !field.getAttribute('aria-label') && !field.getAttribute('aria-labelledby') && !field.labels?.length).map(field => ({ tag: field.tagName, type: field.type, id: field.id, placeholder: field.getAttribute('placeholder') })))
            assert.deepEqual(unnamed, [], 'visible form fields have labels')
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
        if (process.env.REVIEW_DYNAMIC_ONLY === '1') {
          for (const path of ['/admin/ingredients/new', '/admin/ingredients/review-ingredient/edit', '/admin/menu-builder/new', '/admin/menu-builder/review-menu/edit']) {
            await go(path)
            if (path.includes('ingredients')) {
              await checkCustomCertification(path.endsWith('/edit'))
              await checkExpandedAssessments()
              await page.getByRole('combobox', { name: labels.ingredientsPortal.chooseExistingSupplier, exact: true }).selectOption({ label: 'Sample supplier' })
              await checkSupplierPanel()
              await checkExpandedAssessments()
            } else {
              await page.getByRole('button', { name: labels.admin.packagedProduct + ' ' + labels.admin.packagedProductHelp, exact: true }).click()
              await checkExpandedAssessments()
              await checkCustomMenuClaim()
              await checkMenuAppearance()
            }
          }
          assert.deepEqual(errors, [])
          console.log(JSON.stringify({ language, width, dynamicJourneys: 4, result: 'passed' }))
          await context.close()
          continue
        }
        const ingredientReturn = '/admin/ingredients?q=Reviewed&view=list&sort=date&direction=desc'
        const menuReturn = '/admin/menu-builder?q=Draft&status=draft&type=prepared&view=list&filters=1'
        await go('/admin/ingredients/new?returnTo=' + encodeURIComponent(ingredientReturn))
        await page.getByPlaceholder(labels.ingredientsPortal.newNamePlaceholder, { exact: true }).fill('Reviewed ingredient')
        await checkExpandedAssessments()
        await checkCustomCertification(false)
        await checkCertificationToggle()
        assert.equal(await page.getByLabel(labels.allergenNames.milk, { exact: true }).inputValue(), '')
        await page.getByRole('button', { name: labels.regularAssessment.makeActive, exact: true }).click()
        assert.equal(posts.length, 0)
        const supplier = page.locator('select').filter({ has: page.locator('option', { hasText: labels.ingredientsPortal.chooseExistingSupplier }) })
        await supplier.selectOption({ label: 'Sample supplier' })
        await checkSupplierPanel()
        await checkExpandedAssessments()
        await page.getByRole('button', { name: labels.ingredientsPortal.removeSupplier.replace('{supplier}', 'Sample supplier'), exact: true }).click()
        assert.equal(await supplier.evaluate(el => el === document.activeElement), true, 'supplier removal returns focus to its chooser')
        for (const key of Object.keys(warnings)) assert.equal(await page.getByLabel(labels.allergenNames[key], { exact: true }).inputValue(), '')
        await supplier.selectOption({ label: 'Sample supplier' })
        await checkCertificationToggle()
        await assess()
        assert.equal(await page.getByRole('button', { name: labels.ingredientsPortal.markProfileReviewed, exact: true }).isEnabled(), true)
        await page.getByRole('button', { name: labels.regularAssessment.makeActive, exact: true }).click()
        assert.equal(posts.length, 0)
        await page.getByRole('button', { name: labels.ingredientsPortal.markProfileReviewed, exact: true }).click()
        await page.getByRole('button', { name: labels.regularAssessment.makeActive, exact: true }).click()
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
        await checkExpandedAssessments()
        await checkCustomMenuClaim()
        await checkMenuAppearance()
        assert.equal(await page.getByRole('button', { name: labels.admin.packagedProduct + ' ' + labels.admin.packagedProductHelp, exact: true }).getAttribute('aria-pressed'), 'true')
        await page.getByPlaceholder(labels.admin.menuItemName, { exact: true }).fill('Reviewed product')
        await page.getByPlaceholder(labels.admin.descriptionPlaceholder, { exact: true }).fill('Bought-in product')
        await assess()
        await page.getByRole('button', { name: labels.quickAdd.tag_Vegetarian, exact: true }).click()
        await page.getByRole('button', { name: new RegExp('^' + labels.regularAssessment.makeActive + '$', 'i') }).click()
        assert.equal(posts.length, 3)
        await page.waitForFunction(() => document.activeElement?.id === 'regular-supplier')
        await page.getByLabel(new RegExp('^' + labels.admin.supplier)).selectOption({ label: 'Sample supplier' })
        await page.getByRole('button', { name: new RegExp('^' + labels.regularAssessment.makeActive + '$', 'i') }).click()
        await page.waitForFunction(() => document.activeElement?.id === 'regular-declaration')
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
        await checkExpandedAssessments()
        await checkCustomCertification(true)
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
        await page.getByRole('button', { name: labels.admin.done, exact: true }).click()
        await page.waitForFunction(() => document.activeElement?.id === 'regular-recipe')
        await page.getByRole('button', { name: labels.regularForms.removeIngredient.replace('{name}', 'Natural yoghurt'), exact: true }).click()
        await page.waitForFunction(() => document.activeElement?.id === 'regular-recipe')
        await dietarySummary.getByText(labels.regularForms.noDerivedDietary, { exact: true }).waitFor()
        expectedLeaveDialogs++ // Intentionally leave the modified recipe without saving.
        await go('/admin/menu-builder/review-menu/edit?returnTo=' + encodeURIComponent(menuReturn))
        await page.getByRole('button', { name: labels.admin.packagedProduct + ' ' + labels.admin.packagedProductHelp, exact: true }).click()
        await checkExpandedAssessments()
        await checkCustomMenuClaim()
        await checkMenuAppearance()
        assert.equal(await page.getByRole('button', { name: labels.admin.draft, exact: true }).getAttribute('aria-pressed'), 'true')
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
