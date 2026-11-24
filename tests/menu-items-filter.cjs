const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

function loadRoute(db) {
  const exports = {}
  const source = ts.transpileModule(fs.readFileSync('app/api/menu-items/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const mocks = {
    'next/server': { NextResponse: Response },
    '@/lib/auth': { getJwtSecret: () => 'secret' },
    '@/lib/supabase/server': { createServiceClient: () => db },
    jose: { jwtVerify: async () => ({ payload: { userId: 'user' } }) },
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'token' }) }) },
  }
  new Function('exports', 'require', source)(exports, name => mocks[name] || {})
  return exports
}

function makeDb(ingredientLinks = [{ menu_item_id: 'item-1', ingredient_id: 'ingredient-1' }]) {
  const calls = []
  const menuItem = { id: 'item-1', business_id: 'business-1', is_active: true, created_at: '2026-01-01' }

  function from(table) {
    const filters = []
    const builder = {
      select() { return this },
      eq(column, value) { filters.push(['eq', column, value]); return this },
      in(column, value) { filters.push(['in', column, value]); return this },
      is(column, value) { filters.push(['is', column, value]); return this },
      or(value) { filters.push(['or', value]); return this },
      single: async () => ({ data: { business_id: 'business-1' }, error: null }),
      order: async () => execute(),
      then(resolve, reject) { return Promise.resolve(execute()).then(resolve, reject) },
    }

    function execute() {
      calls.push({ table, filters })
      if (table === 'menu_items') return { data: [menuItem], error: null }
      if (table === 'menu_item_ingredients') {
        return { data: ingredientLinks, error: null }
      }
      return { data: [], error: null }
    }

    return builder
  }

  return { db: { from }, calls }
}

test('menu item label loads request only the selected item and its recipe links', async () => {
  const { db, calls } = makeDb()
  const route = loadRoute(db)
  const response = await route.GET(new Request('https://example.test/api/menu-items?item_id=item-1'))
  assert.equal(response.status, 200)
  assert.ok(calls.some(({ table, filters }) =>
    table === 'menu_items' && filters.some(([kind, column, value]) => kind === 'eq' && column === 'id' && value === 'item-1')))
  assert.deepEqual((await response.json()).menuItems.map(item => item.id), ['item-1'])
})

test('ingredient label loads request only menu items linked to that ingredient', async () => {
  const { db, calls } = makeDb()
  const route = loadRoute(db)
  const response = await route.GET(new Request('https://example.test/api/menu-items?ingredient_id=ingredient-1'))
  assert.equal(response.status, 200)
  assert.ok(calls.some(({ table, filters }) =>
    table === 'menu_item_ingredients' && filters.some(([kind, column, value]) => kind === 'eq' && column === 'ingredient_id' && value === 'ingredient-1')))
  assert.ok(calls.some(({ table, filters }) =>
    table === 'menu_items' && filters.some(([kind, column, values]) => kind === 'in' && column === 'id' && values.includes('item-1'))))
  assert.deepEqual((await response.json()).menuItems.map(item => item.id), ['item-1'])
})

test('ingredient label with no linked items does not fetch the full menu', async () => {
  const { db, calls } = makeDb([])
  const route = loadRoute(db)
  const response = await route.GET(new Request('https://example.test/api/menu-items?ingredient_id=ingredient-1'))
  assert.equal(response.status, 200)
  assert.deepEqual((await response.json()).menuItems, [])
  assert.equal(calls.some(({ table }) => table === 'menu_items'), false)
})

test('label page passes the requested item or ingredient as a menu-items filter', () => {
  const page = fs.readFileSync('app/admin/labels/page.tsx', 'utf8')
  assert.match(page, /item_id=\$\{encodeURIComponent\(requestedItemId\)\}/)
  assert.match(page, /ingredient_id=\$\{encodeURIComponent\(requestedIngredientId\)\}/)
})
