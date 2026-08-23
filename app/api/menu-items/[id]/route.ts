import { getJwtSecret } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { recordAuditLog, diffRecordFields, MENU_ITEM_AUDIT_FIELDS } from '@/lib/audit'
import { deriveMenuItemSafety, normalizeIngredientIds, replaceMenuItemIngredients } from '@/lib/server/menu-item-safety'

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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
    const businessId = await getUserBusinessId(supabase, userId)

    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { data: menuItem, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessId)
      .single()

    if (error) {
      console.error('Error fetching menu item:', error)
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    const { data: menuIngredients } = await supabase
      .from('menu_item_ingredients')
      .select('ingredient_id')
      .eq('menu_item_id', id)

    const ingredients = (menuIngredients || []).map((row) => String(row.ingredient_id))

    return NextResponse.json({
      menuItem: {
        ...menuItem,
        // Transform is_active to status for consistent UI display
        status: menuItem.is_active ? 'active' : 'draft',
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    if (!body?.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const businessId = await getUserBusinessId(supabase, userId)

    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Snapshot the current row before updating, so we can diff for the audit trail
    const { data: previousMenuItem } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessId)
      .single()

    const ingredients = normalizeIngredientIds(body.ingredients)
    let safety
    try {
      safety = await deriveMenuItemSafety(
        supabase,
        businessId,
        ingredients,
        body.allergen_warnings || {},
        Array.isArray(body.dietary) ? body.dietary : []
      )
    } catch (validationError: any) {
      return NextResponse.json({ error: validationError.message }, { status: 400 })
    }

    const { data: previousLinks } = await supabase
      .from('menu_item_ingredients')
      .select('ingredient_id')
      .eq('menu_item_id', id)

    const updatePayload = {
      name: body.name,
      description: body.description || '',
      category: body.category || '',
      site_id: typeof body.site_id === 'string' && body.site_id.trim() !== ''
        ? body.site_id
        : null,
      allergen_warnings: safety.allergenWarnings,
      dietary: safety.dietary,
      color: typeof body.color === 'string' && body.color.trim() !== '' ? body.color : null,
      icon: typeof body.icon === 'string' && body.icon.trim() !== '' ? body.icon : null,
      is_active: body.status ? body.status === 'active' : body.is_active ?? true,
      price: typeof body.price === 'number' ? body.price : 0,
      display_order: typeof body.display_order === 'number' ? body.display_order : 0,
      preferred_review_months: typeof body.preferred_review_months === 'number' ? body.preferred_review_months : 12,
      updated_at: new Date().toISOString()
    }

    let { data: menuItem, error } = await supabase
      .from('menu_items')
      .update(updatePayload)
      .eq('id', id)
      .eq('business_id', businessId)
      .select()
      .single()

    if (error && error.code === 'PGRST204' && error.message?.includes('icon')) {
      const { icon: _icon, ...fallbackPayload } = updatePayload
      const retry = await supabase
        .from('menu_items')
        .update(fallbackPayload)
        .eq('id', id)
        .eq('business_id', businessId)
        .select()
        .single()
      menuItem = retry.data
      error = retry.error
    }

    if (error && error.code === 'PGRST204' && error.message?.includes('allergen_warnings')) {
      const { allergen_warnings: _allergenWarnings, icon: _icon, ...fallbackPayload } = updatePayload
      const retry = await supabase
        .from('menu_items')
        .update(fallbackPayload)
        .eq('id', id)
        .eq('business_id', businessId)
        .select()
        .single()
      menuItem = retry.data
      error = retry.error
    }

    if (error) {
      console.error('Error updating menu item:', error)
      return NextResponse.json({
        error: error.message || 'Failed to update menu item',
        details: error.details,
        hint: error.hint,
        code: error.code
      }, { status: 500 })
    }

    try {
      await replaceMenuItemIngredients(supabase, id, ingredients)
    } catch (ingredientError: any) {
      if (previousMenuItem) {
        await supabase.from('menu_items').update(previousMenuItem).eq('id', id).eq('business_id', businessId)
      }
      const oldIngredientIds = (previousLinks || []).map((row: any) => String(row.ingredient_id))
      await replaceMenuItemIngredients(supabase, id, oldIngredientIds).catch(() => undefined)
      console.error('Error linking menu item ingredients:', ingredientError)
      return NextResponse.json({ error: ingredientError.message }, { status: 500 })
    }

    await recordAuditLog(supabase, {
      businessId,
      entityType: 'menu_item',
      entityId: id,
      entityName: menuItem.name,
      action: 'updated',
      changes: diffRecordFields(previousMenuItem || null, menuItem, MENU_ITEM_AUDIT_FIELDS),
      userId,
      userEmail: payload.email as string,
    })

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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
    const { data: membership } = await supabase
      .from('user_businesses')
      .select('business_id, role')
      .eq('user_id', userId)
      .single()
    const businessId = membership?.business_id || null

    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    if (membership?.role === 'staff') {
      return NextResponse.json(
        { error: 'Staff members cannot delete menu items' },
        { status: 403 }
      )
    }

    const { error: ingredientError } = await supabase
      .from('menu_item_ingredients')
      .delete()
      .eq('menu_item_id', id)

    if (ingredientError) {
      console.error('Error deleting menu item ingredients:', ingredientError)
    }

    // Snapshot the row before deleting so we can record its name in the audit trail
    const { data: menuItemToDelete } = await supabase
      .from('menu_items')
      .select('name')
      .eq('id', id)
      .eq('business_id', businessId)
      .single()

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId)

    if (error) {
      console.error('Error deleting menu item:', error)
      return NextResponse.json({ error: 'Failed to delete menu item' }, { status: 500 })
    }

    await recordAuditLog(supabase, {
      businessId,
      entityType: 'menu_item',
      entityId: id,
      entityName: menuItemToDelete?.name || 'Unknown menu item',
      action: 'deleted',
      changes: [],
      userId,
      userEmail: payload.email as string,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
