import { getJwtSecret } from '@/lib/auth'
// app/api/datasheets/route.ts
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ingredientId = searchParams.get('ingredient_id')
    const menuItemId = searchParams.get('menu_item_id')
    const ingredientIdsParam = searchParams.get('ingredientIds')
    const limit = searchParams.get('limit')

    // Get user from auth token
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth-token')?.value

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const secret = getJwtSecret()
    const { payload } = await jwtVerify(authToken, secret)
    const userId = payload.userId as string

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Get user's business
    const { data: userBusiness } = await supabase
      .from('user_businesses')
      .select('business_id')
      .eq('user_id', userId)
      .single()

    if (!userBusiness) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Build query
    let query = supabase
      .from('datasheets')
      .select('*')
      .eq('business_id', userBusiness.business_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    // Filter by ingredient or menu item if provided
    let needsFallback = false
    if (ingredientIdsParam) {
      const ingredientIds = ingredientIdsParam
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)

      if (ingredientIds.length > 0) {
        query = query.in('ingredient_id', ingredientIds)
      }
    } else if (ingredientId) {
      query = query.eq('ingredient_id', ingredientId)
    } else if (menuItemId) {
      query = query.eq('menu_item_id', menuItemId)
      needsFallback = true // We might need to search notes for fallback references
    }

    // Apply limit if specified
    if (limit) {
      query = query.limit(parseInt(limit))
    }

    let { data: datasheets, error } = await query

    // For menu_item_id queries: always also search the notes-based fallback and merge results.
    // Datasheets may have been stored via (a) the menu_item_id column, (b) a [MENU_ITEM_REF:id]
    // tag in the notes field (used when the column didn't yet exist), or both.
    if (menuItemId) {
      // Clear column-not-found errors so we don't surface them — notes fallback covers this
      if (error && (error.code === '42703' || (error.message && error.message.includes('menu_item_id')))) {
        datasheets = null
        error = null
      }

      // Fetch all active datasheets for this business and look for notes-based references
      const { data: allDatasheets, error: fallbackError } = await supabase
        .from('datasheets')
        .select('*')
        .eq('business_id', userBusiness.business_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (!fallbackError && allDatasheets) {
        const menuItemRef = `[MENU_ITEM_REF:${menuItemId}]`
        const notesDatasheets = allDatasheets.filter((ds: any) =>
          ds.notes && ds.notes.includes(menuItemRef)
        )

        // Merge: take column-based results and append any notes-based ones not already present
        const columnIds = new Set((datasheets || []).map((ds: any) => ds.id))
        const merged = [
          ...(datasheets || []),
          ...notesDatasheets.filter((ds: any) => !columnIds.has(ds.id)),
        ]
        datasheets = merged
      }

      error = null // fallback handled any remaining error
    }

    if (error) {
      console.error('Error fetching datasheets:', error)
      return NextResponse.json({ error: 'Failed to fetch datasheets' }, { status: 500 })
    }

    // Map created_at to uploaded_at and normalize entity_type/entity_id
    const mappedDatasheets = (datasheets || []).map((ds: any) => {
      const normalizedEntityType = ds.entity_type
        || (ds.ingredient_id ? 'ingredient' : (ds.menu_item_id ? 'menu_item' : 'ingredient'))
      const normalizedEntityId = ds.entity_id || ds.ingredient_id || ds.menu_item_id || null

      return {
        ...ds,
        entity_type: normalizedEntityType,
        entity_id: normalizedEntityId,
        uploaded_at: ds.uploaded_at || ds.created_at
      }
    })

    return NextResponse.json({ datasheets: mappedDatasheets })

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
    // Get user from auth token
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth-token')?.value

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const secret = getJwtSecret()
    const { payload } = await jwtVerify(authToken, secret)
    const userId = payload.userId as string

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ingredient_id, menu_item_id, file_name, file_path, file_size, file_type, supplier_name, version, next_review_date, notes } = body

    if (!file_name || !file_path) {
      return NextResponse.json({ error: 'File name and path are required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get user's business
    const { data: userBusiness } = await supabase
      .from('user_businesses')
      .select('business_id')
      .eq('user_id', userId)
      .single()

    if (!userBusiness) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    if ((!ingredient_id && !menu_item_id) || (ingredient_id && menu_item_id)) {
      return NextResponse.json({ error: 'Provide exactly one of ingredient_id or menu_item_id' }, { status: 400 })
    }
    const entityTable = ingredient_id ? 'ingredients' : 'menu_items'
    const { data: ownedEntity } = await supabase
      .from(entityTable)
      .select('id')
      .eq('id', ingredient_id || menu_item_id)
      .eq('business_id', userBusiness.business_id)
      .maybeSingle()
    if (!ownedEntity) {
      return NextResponse.json({ error: 'Ingredient or menu item not found' }, { status: 404 })
    }

    // Create datasheet
    const { data: datasheet, error } = await supabase
      .from('datasheets')
      .insert({
        business_id: userBusiness.business_id,
        ingredient_id: ingredient_id || null,
        menu_item_id: menu_item_id || null,
        file_name,
        file_path,
        file_size: file_size || 0,
        file_type: file_type || 'application/pdf',
        supplier_name: supplier_name || null,
        version: version || null,
        next_review_date: next_review_date || null,
        notes: notes || null,
        status: 'active',
        created_by: userId
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating datasheet:', error)
      return NextResponse.json({ error: 'Failed to create datasheet' }, { status: 500 })
    }

    return NextResponse.json({ datasheet })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
