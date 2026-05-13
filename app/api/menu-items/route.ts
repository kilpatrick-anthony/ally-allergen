import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const getUserBusinessId = async (
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
) => {
  const { data: userBusiness } = await supabase
    .from('user_businesses')
    .select('business_id')
    .eq('user_id', userId)
    .single()

  return userBusiness?.business_id || null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('site_id')
    const scope = searchParams.get('scope')
    const includeGlobal = searchParams.get('include_global') === 'true'
    const limit = searchParams.get('limit')

    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth-token')?.value

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const secret = new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret')
    const { payload } = await jwtVerify(authToken, secret)
    const userId = payload.userId as string

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const businessId = await getUserBusinessId(supabase, userId)

    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    let query = supabase
      .from('menu_items')
      .select('*')
      .eq('business_id', businessId)

    if (scope === 'global') {
      query = query.is('site_id', null)
    } else if (scope === 'site' && siteId) {
      query = query.eq('site_id', siteId)
    } else if (siteId && includeGlobal) {
      query = query.or(`site_id.is.null,site_id.eq.${siteId}`)
    } else if (siteId) {
      query = query.eq('site_id', siteId)
    }

    // Apply limit if specified
    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data: menuItems, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching menu items:', error)
      return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 })
    }

    const ids = (menuItems || []).map((item) => item.id)

    let ingredientsByMenuItem = new Map<string, string[]>()

    if (ids.length > 0) {
      const { data: menuIngredients, error: ingredientsError } = await supabase
        .from('menu_item_ingredients')
        .select('menu_item_id, ingredient_id')
        .in('menu_item_id', ids)

      if (ingredientsError) {
        console.error('Error fetching menu item ingredients:', ingredientsError)
      } else if (menuIngredients) {
        ingredientsByMenuItem = menuIngredients.reduce((acc, row) => {
          const list = acc.get(row.menu_item_id) || []
          list.push(String(row.ingredient_id))
          acc.set(row.menu_item_id, list)
          return acc
        }, new Map<string, string[]>())
      }
    }

    const mappedItems = (menuItems || []).map((item) => ({
      ...item,
      // Transform is_active to status for consistent UI display
      status: item.is_active ? 'active' : 'draft',
      ingredients: ingredientsByMenuItem.get(item.id) || []
    }))

    return NextResponse.json({ menuItems: mappedItems })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth-token')?.value

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const secret = new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret')
    const { payload } = await jwtVerify(authToken, secret)
    const userId = payload.userId as string

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body?.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const businessId = await getUserBusinessId(supabase, userId)

    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const insertPayload = {
      business_id: businessId,
      name: body.name,
      description: body.description || '',
      category: body.category || '',
      site_id: typeof body.site_id === 'string' && body.site_id.trim() !== ''
        ? body.site_id
        : null,
      allergen_warnings: body.allergen_warnings || {},
      dietary: Array.isArray(body.dietary) ? body.dietary : [],
      color: typeof body.color === 'string' && body.color.trim() !== '' ? body.color : null,
      is_active: body.status ? body.status === 'active' : body.is_active ?? true,
      price: typeof body.price === 'number' ? body.price : 0,
      display_order: typeof body.display_order === 'number' ? body.display_order : 0,
      preferred_review_months: typeof body.preferred_review_months === 'number' ? body.preferred_review_months : 3
    }

    let { data: menuItem, error } = await supabase
      .from('menu_items')
      .insert(insertPayload)
      .select()
      .single()

    if (error && error.code === 'PGRST204' && error.message?.includes('allergen_warnings')) {
      const { allergen_warnings: _allergenWarnings, ...fallbackPayload } = insertPayload
      const retry = await supabase
        .from('menu_items')
        .insert(fallbackPayload)
        .select()
        .single()
      menuItem = retry.data
      error = retry.error
    }

    if (error) {
      console.error('Error creating menu item:', error)
      return NextResponse.json({
        error: error.message || 'Failed to create menu item',
        hint: error.hint,
        code: error.code
      }, { status: 500 })
    }

    const ingredients = Array.isArray(body.ingredients) ? body.ingredients : []

    if (ingredients.length > 0) {
      const ingredientRows = ingredients.map((ingredientId: string) => ({
        menu_item_id: menuItem.id,
        ingredient_id: ingredientId,
        quantity: '',
        is_optional: false
      }))

      const { error: ingredientError } = await supabase
        .from('menu_item_ingredients')
        .insert(ingredientRows)

      if (ingredientError) {
        console.error('Error linking menu item ingredients:', ingredientError)
      }
    }

    return NextResponse.json({
      menuItem: {
        ...menuItem,
        ingredients
      }
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
