import { getJwtSecret, hasSuperAdminAccess } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

async function getAuthenticatedSuperAdmin() {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth-token')?.value
  if (!authToken) return null

  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(authToken, secret)
    const userId = payload.userId as string
    const userEmail = payload.email as string
    const userRole = payload.role as string | undefined
    const supabase = createServiceClient()

    const isSuperAdmin = await hasSuperAdminAccess({
      userEmail,
      userRole,
      userId,
      supabase,
    })

    if (!isSuperAdmin) return null
    return { userId, userEmail }
  } catch {
    return null
  }
}

const SAMPLE_MENU_ITEMS = [
  {
    name: 'Classic Beef Burger',
    description: 'Prime beef patty, lettuce, tomato, house sauce on a brioche bun',
    category: 'Mains',
    price: 14.5,
    allergens: { gluten: true, milk: true, egg: true, sesame: true },
  },
  {
    name: 'Grilled Salmon',
    description: 'Fresh Atlantic salmon, seasonal vegetables, lemon butter',
    category: 'Mains',
    price: 18.0,
    allergens: { fish: true, milk: true },
  },
  {
    name: 'Garden Salad (V)',
    description: 'Mixed leaves, cherry tomatoes, cucumber, house vinaigrette',
    category: 'Starters',
    price: 8.0,
    allergens: {},
  },
  {
    name: 'Caesar Salad',
    description: 'Romaine lettuce, parmesan, croutons, Caesar dressing',
    category: 'Starters',
    price: 9.5,
    allergens: { gluten: true, milk: true, egg: true, fish: true },
  },
  {
    name: 'Chocolate Brownie',
    description: 'Warm chocolate brownie, vanilla ice cream, chocolate sauce',
    category: 'Desserts',
    price: 7.5,
    allergens: { gluten: true, milk: true, egg: true, soya: true },
  },
  {
    name: 'Seasonal Soup',
    description: 'Ask your server for today\'s soup. Served with brown bread',
    category: 'Starters',
    price: 7.0,
    allergens: { gluten: true, milk: true, celery: true },
  },
  {
    name: 'Mushroom Risotto (V)',
    description: 'Wild mushrooms, arborio rice, parmesan, truffle oil',
    category: 'Mains',
    price: 15.0,
    allergens: { milk: true },
  },
  {
    name: 'Kids Fish Goujons',
    description: 'Crispy fish goujons, chips, peas',
    category: 'Kids',
    price: 9.0,
    allergens: { gluten: true, fish: true, milk: true, egg: true },
  },
]

type DemoAllergenFlags = {
  gluten?: boolean
  crustaceans?: boolean
  egg?: boolean
  fish?: boolean
  peanuts?: boolean
  soya?: boolean
  milk?: boolean
  nuts?: boolean
  celery?: boolean
  mustard?: boolean
  sesame?: boolean
  sulphites?: boolean
}

const SAMPLE_INGREDIENTS = [
  {
    name: 'Prime Beef Patty',
    description: '100% beef patty used in house burgers.',
    category: 'Protein',
    suppliers: ['Demo Farms Ltd'],
    warnings: { cereals_gluten: 'none', milk: 'none', eggs: 'none' },
  },
  {
    name: 'Brioche Bun',
    description: 'Soft brioche bun with sesame topping.',
    category: 'Bakery',
    suppliers: ['Golden Bakery Co'],
    warnings: { cereals_gluten: 'contains', eggs: 'contains', milk: 'contains', sesame: 'contains' },
  },
  {
    name: 'Caesar Dressing',
    description: 'Traditional Caesar dressing.',
    category: 'Sauce',
    suppliers: ['Chef Pantry Supply'],
    warnings: { eggs: 'contains', milk: 'contains', fish: 'contains', mustard: 'may_contain' },
  },
  {
    name: 'Parmesan Cheese',
    description: 'Hard aged Parmesan.',
    category: 'Dairy',
    suppliers: ['Dairy House'],
    warnings: { milk: 'contains' },
  },
  {
    name: 'Chocolate Brownie Mix',
    description: 'Chocolate brownie base mix.',
    category: 'Dessert',
    suppliers: ['Sweet Kitchen Supply'],
    warnings: { cereals_gluten: 'contains', eggs: 'contains', milk: 'contains', soybeans: 'contains' },
  },
  {
    name: 'Fresh Atlantic Salmon',
    description: 'Fresh salmon fillet portions.',
    category: 'Protein',
    suppliers: ['North Sea Foods'],
    warnings: { fish: 'contains' },
  },
  {
    name: 'Vegetable Stock',
    description: 'Vegetable stock base for soups.',
    category: 'Pantry',
    suppliers: ['Kitchen Essentials'],
    warnings: { celery: 'contains' },
  },
  {
    name: 'Mushroom Risotto Base',
    description: 'Arborio rice mix and dried mushrooms.',
    category: 'Pantry',
    suppliers: ['Italian Pantry'],
    warnings: { milk: 'may_contain', cereals_gluten: 'may_contain' },
  },
]

const SAMPLE_MENU_ITEM_INGREDIENTS: Array<{ menuItemName: string; ingredientNames: string[] }> = [
  {
    menuItemName: 'Classic Beef Burger',
    ingredientNames: ['Prime Beef Patty', 'Brioche Bun'],
  },
  {
    menuItemName: 'Grilled Salmon',
    ingredientNames: ['Fresh Atlantic Salmon', 'Parmesan Cheese'],
  },
  {
    menuItemName: 'Garden Salad (V)',
    ingredientNames: ['Vegetable Stock'],
  },
  {
    menuItemName: 'Caesar Salad',
    ingredientNames: ['Caesar Dressing', 'Parmesan Cheese', 'Brioche Bun'],
  },
  {
    menuItemName: 'Chocolate Brownie',
    ingredientNames: ['Chocolate Brownie Mix'],
  },
  {
    menuItemName: 'Seasonal Soup',
    ingredientNames: ['Vegetable Stock', 'Brioche Bun'],
  },
  {
    menuItemName: 'Mushroom Risotto (V)',
    ingredientNames: ['Mushroom Risotto Base', 'Parmesan Cheese'],
  },
  {
    menuItemName: 'Kids Fish Goujons',
    ingredientNames: ['Fresh Atlantic Salmon', 'Brioche Bun'],
  },
]

const DEFAULT_ALLERGEN_WARNINGS = {
  cereals_gluten: 'none',
  crustaceans: 'none',
  eggs: 'none',
  fish: 'none',
  peanuts: 'none',
  soybeans: 'none',
  milk: 'none',
  nuts: 'none',
  celery: 'none',
  mustard: 'none',
  sesame: 'none',
  sulphites: 'none',
  lupin: 'none',
  molluscs: 'none',
}

const buildWarnings = (partial?: Record<string, string | undefined>) => ({
  ...DEFAULT_ALLERGEN_WARNINGS,
  ...Object.fromEntries(Object.entries(partial || {}).filter(([, value]) => typeof value === 'string')),
})

export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthenticatedSuperAdmin()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      ownerName = 'Demo User',
      ownerEmail,
      businessName = 'Demo Restaurant',
      locationName = 'Main Location',
    } = body

    if (!ownerEmail) {
      return NextResponse.json({ error: 'ownerEmail is required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const warnings: string[] = []

    // 1. Create owner account
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: Math.random().toString(36).slice(-10) + 'Aa1!',
      email_confirm: true,
      user_metadata: { full_name: ownerName, business_name: businessName },
    })

    if (userError) {
      return NextResponse.json({ error: userError.message || 'Failed to create user' }, { status: 500 })
    }

    const userId = userData.user.id

    // 2. Create business
    const baseSlug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const slug = `${baseSlug}-${Date.now().toString().slice(-6)}`

    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .insert({
        name: businessName,
        slug,
        status: 'active',
        plan_type: 'demo',
        subscription_started_at: new Date().toISOString(),
        pdf_download_count: 0,
        settings: {
          theme: { primaryColor: '#42b8ac', secondaryColor: '#003842' },
          subscription: { plan: 'demo', status: 'active' },
        },
      })
      .select()
      .single()

    if (bizError) {
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Failed to create business' }, { status: 500 })
    }

    // 3. Link owner
    const { error: linkError } = await supabase.from('user_businesses').insert({
      user_id: userId,
      business_id: business.id,
      role: 'owner',
    })

    if (linkError) {
      await supabase.from('businesses').delete().eq('id', business.id)
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: linkError.message || 'Failed to link owner to business' }, { status: 500 })
    }

    // 4. Create sample location (site)
    const siteSlug = locationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .insert({
        business_id: business.id,
        name: locationName,
        slug: `${siteSlug}-${Date.now().toString().slice(-4)}`,
        is_active: true,
      })
      .select()
      .single()

    if (siteError) {
      console.warn('Site creation failed (non-fatal):', siteError.message)
    }

    // 5. Create a demo device for the site
    let device = null
    if (site) {
      const { data: deviceData, error: deviceError } = await supabase
        .from('devices')
        .insert({
          business_id: business.id,
          site_id: site.id,
          device_name: 'Demo Kiosk',
          device_type: 'kiosk',
          status: 'offline',
        })
        .select()
        .single()

      device = deviceData
      if (deviceError) {
        warnings.push(`Device seed warning: ${deviceError.message}`)
      }
    }

    // 6. Seed sample menu items
    const menuRows = SAMPLE_MENU_ITEMS.map((item, index) => {
      const allergenFlags = item.allergens as DemoAllergenFlags
      return {
      business_id: business.id,
      site_id: site?.id || null,
      name: item.name,
      description: item.description,
      category: item.category,
      price: item.price,
      is_active: true,
      display_order: index,
      preferred_review_months: 3,
      allergen_warnings: buildWarnings({
        cereals_gluten: allergenFlags.gluten ? 'contains' : 'none',
        crustaceans: allergenFlags.crustaceans ? 'contains' : 'none',
        eggs: allergenFlags.egg ? 'contains' : 'none',
        fish: allergenFlags.fish ? 'contains' : 'none',
        peanuts: allergenFlags.peanuts ? 'contains' : 'none',
        soybeans: allergenFlags.soya ? 'contains' : 'none',
        milk: allergenFlags.milk ? 'contains' : 'none',
        nuts: allergenFlags.nuts ? 'contains' : 'none',
        celery: allergenFlags.celery ? 'contains' : 'none',
        mustard: allergenFlags.mustard ? 'contains' : 'none',
        sesame: allergenFlags.sesame ? 'contains' : 'none',
        sulphites: allergenFlags.sulphites ? 'contains' : 'none',
      }),
    }
    })

    let menuItemsSeeded = 0
    let { data: insertedMenuItems, error: menuError } = await supabase
      .from('menu_items')
      .insert(menuRows)
      .select('id, name')

    if (menuError && menuError.code === 'PGRST204' && menuError.message?.includes('allergen_warnings')) {
      const fallbackRows = menuRows.map(({ allergen_warnings: _allergenWarnings, ...rest }) => rest)
      const fallbackResult = await supabase
        .from('menu_items')
        .insert(fallbackRows)
        .select('id, name')
      insertedMenuItems = fallbackResult.data
      menuError = fallbackResult.error
    }

    if (menuError) {
      warnings.push(`Menu seed warning: ${menuError.message}`)
      console.warn('Menu seed failed (non-fatal):', menuError.message)
    } else {
      menuItemsSeeded = insertedMenuItems?.length || 0
    }

    // 7. Seed sample ingredients
    const ingredientRows = SAMPLE_INGREDIENTS.map((ingredient) => ({
      business_id: business.id,
      name: ingredient.name,
      description: ingredient.description,
      category: ingredient.category,
      allergen_warnings: buildWarnings(ingredient.warnings),
      suppliers: ingredient.suppliers,
      certifications: [],
      status: 'active',
      compliance: 'compliant',
      preferred_review_months: 3,
    }))

    let ingredientsSeeded = 0
    let { data: insertedIngredients, error: ingredientError } = await supabase
      .from('ingredients')
      .insert(ingredientRows)
      .select('id, name')

    if (ingredientError && ingredientError.code === 'PGRST204' && ingredientError.message?.includes('allergen_warnings')) {
      const fallbackRows = ingredientRows.map(({ allergen_warnings: _allergenWarnings, ...rest }) => rest)
      const fallbackResult = await supabase
        .from('ingredients')
        .insert(fallbackRows)
        .select('id, name')
      insertedIngredients = fallbackResult.data
      ingredientError = fallbackResult.error
    }

    if (ingredientError) {
      warnings.push(`Ingredient seed warning: ${ingredientError.message}`)
      console.warn('Ingredient seed failed (non-fatal):', ingredientError.message)
    } else {
      ingredientsSeeded = insertedIngredients?.length || 0
    }

    // 8. Seed suppliers table using ingredient supplier names
    let suppliersSeeded = 0
    const supplierNames = Array.from(new Set(SAMPLE_INGREDIENTS.flatMap((ingredient) => ingredient.suppliers)))
    if (supplierNames.length > 0) {
      const supplierRows = supplierNames.map((supplierName) => ({
        business_id: business.id,
        name: supplierName,
        ingredient_count: SAMPLE_INGREDIENTS.filter((ingredient) => ingredient.suppliers.includes(supplierName)).length,
        created_by: admin.userId,
      }))

      let { data: insertedSuppliers, error: suppliersError } = await supabase
        .from('suppliers')
        .upsert(supplierRows, { onConflict: 'business_id,name' })
        .select('id')

      if (suppliersError && suppliersError.code === 'PGRST204') {
        const fallbackRows = supplierRows.map(({ ingredient_count: _ingredientCount, created_by: _createdBy, ...rest }) => rest)
        const fallbackResult = await supabase
          .from('suppliers')
          .upsert(fallbackRows, { onConflict: 'business_id,name' })
          .select('id')
        insertedSuppliers = fallbackResult.data
        suppliersError = fallbackResult.error
      }

      if (suppliersError) {
        warnings.push(`Supplier seed warning: ${suppliersError.message}`)
        console.warn('Supplier seed failed (non-fatal):', suppliersError.message)
      } else {
        suppliersSeeded = insertedSuppliers?.length || supplierRows.length
      }
    }

    // 9. Link menu items to ingredients for realistic menu-builder demos
    let ingredientLinksSeeded = 0
    if ((insertedMenuItems?.length || 0) > 0 && (insertedIngredients?.length || 0) > 0) {
      const menuIdByName = new Map<string, string>()
      const ingredientIdByName = new Map<string, string>()

      for (const menuItem of insertedMenuItems || []) {
        menuIdByName.set(String((menuItem as any).name), String((menuItem as any).id))
      }

      for (const ingredient of insertedIngredients || []) {
        ingredientIdByName.set(String((ingredient as any).name), String((ingredient as any).id))
      }

      const linkRows: Array<{ menu_item_id: string; ingredient_id: string; quantity: string; is_optional: boolean }> = []
      for (const mapping of SAMPLE_MENU_ITEM_INGREDIENTS) {
        const menuItemId = menuIdByName.get(mapping.menuItemName)
        if (!menuItemId) continue

        for (const ingredientName of mapping.ingredientNames) {
          const ingredientId = ingredientIdByName.get(ingredientName)
          if (!ingredientId) continue
          linkRows.push({
            menu_item_id: menuItemId,
            ingredient_id: ingredientId,
            quantity: '1 portion',
            is_optional: false,
          })
        }
      }

      if (linkRows.length > 0) {
        const { data: insertedLinks, error: linkSeedError } = await supabase
          .from('menu_item_ingredients')
          .upsert(linkRows, { onConflict: 'menu_item_id,ingredient_id' })
          .select('id')

        if (linkSeedError) {
          warnings.push(`Ingredient linking warning: ${linkSeedError.message}`)
          console.warn('Menu item ingredient link seed failed (non-fatal):', linkSeedError.message)
        } else {
          ingredientLinksSeeded = insertedLinks?.length || linkRows.length
        }
      }
    }

    // 10. Send password setup email
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(ownerEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://allyjen.ie'}/auth/update-password`,
    })

    const passwordSetupEmailSent = !resetError
    if (resetError) {
      warnings.push(`Password setup email warning: ${resetError.message}`)
      console.warn('Password setup email failed (non-fatal):', resetError.message)
    }

    return NextResponse.json({
      success: true,
      businessId: business.id,
      businessName,
      ownerEmail,
      siteId: site?.id || null,
      deviceId: device?.id || null,
      menuItemsSeeded,
      ingredientsSeeded,
      suppliersSeeded,
      ingredientLinksSeeded,
      passwordSetupEmailSent,
      warnings,
      message: `Demo account "${businessName}" created with ${menuItemsSeeded} menu items, ${ingredientsSeeded} ingredients, and ${ingredientLinksSeeded} ingredient links.`,
    })
  } catch (err) {
    console.error('Demo account creation error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
