// app/api/ingredients/[id]/route.ts
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { computeWorstCaseAllergens } from '@/types/allergen'

const normalizeSupplierNames = (suppliers: string[]) => {
  const names: string[] = []
  suppliers.forEach((supplier) => {
    const trimmed = supplier.trim()
    if (trimmed !== '' && !names.includes(trimmed)) {
      names.push(trimmed)
    }
  })
  return names
}

const upsertSuppliers = async (
  supabase: ReturnType<typeof createServiceClient>,
  businessId: string,
  suppliers: string[],
  userId: string
) => {
  const names = normalizeSupplierNames(suppliers)
  if (names.length === 0) {
    return
  }

  const rows = names.map((name) => ({
    business_id: businessId,
    name,
    contact: '',
    phone: '',
    email: '',
    website: '',
    ingredient_count: 0,
    created_by: userId
  }))

  const { error } = await supabase
    .from('suppliers')
    .upsert(rows, { onConflict: 'business_id,name' })

  if (error) {
    throw error
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get user from auth token
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

    // Get user's business
    const { data: userBusiness } = await supabase
      .from('user_businesses')
      .select('business_id')
      .eq('user_id', userId)
      .single()

    if (!userBusiness) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Fetch ingredient
    const { data: ingredient, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('id', id)
      .eq('business_id', userBusiness.business_id)
      .single()

    if (error) {
      console.error('Error fetching ingredient:', error)
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 })
    }

    return NextResponse.json({ ingredient })

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
    
    // Get user from auth token
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
    const { name, description, category, allergen_warnings, suppliers, certifications, preferred_review_months } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
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

    await upsertSuppliers(supabase, userBusiness.business_id, suppliers || [], userId)

    // Update ingredient
    const { data: ingredient, error } = await supabase
      .from('ingredients')
      .update({
        name,
        description: description || '',
        category: category || '',
        allergen_warnings: allergen_warnings || {},
        suppliers: suppliers || [],
        certifications: certifications || [],
        preferred_review_months: preferred_review_months || 3,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('business_id', userBusiness.business_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating ingredient:', error)
      return NextResponse.json({ error: 'Failed to update ingredient' }, { status: 500 })
    }

    // Cascade: recompute dietary on all menu items that contain this ingredient
    try {
      // 1. Find all menu items containing this ingredient
      const { data: links } = await supabase
        .from('menu_item_ingredients')
        .select('menu_item_id')
        .eq('ingredient_id', id)

      if (links && links.length > 0) {
        const menuItemIds = links.map((l: { menu_item_id: string }) => l.menu_item_id)

        // 2. For each menu item, fetch all its ingredients and recompute strict intersection
        for (const menuItemId of menuItemIds) {
          const { data: allLinks } = await supabase
            .from('menu_item_ingredients')
            .select('ingredient_id')
            .eq('menu_item_id', menuItemId)

          if (!allLinks || allLinks.length === 0) continue

          const ingredientIds = allLinks.map((l: { ingredient_id: string }) => l.ingredient_id)

          const { data: ingredientRows } = await supabase
            .from('ingredients')
            .select('certifications, allergen_warnings')
            .in('id', ingredientIds)

          if (!ingredientRows) continue

          // Strict intersection: dietary label only carries over if ALL ingredients have it
          const allCerts: string[][] = ingredientRows.map((r: { certifications: string[] | null }) => r.certifications || [])
          const mergedCerts: string[] = allCerts.length === 0
            ? []
            : allCerts.reduce((acc, certs) => acc.filter(c => certs.includes(c)))

          // Fetch existing dietary to preserve any manually-added entries
          const { data: menuItemRow } = await supabase
            .from('menu_items')
            .select('dietary')
            .eq('id', menuItemId)
            .single()

          const existingDietary: string[] = Array.isArray(menuItemRow?.dietary) ? menuItemRow.dietary : []
          // Keep manually-added entries that aren't auto-computed certifications
          const knownCertNames = new Set(mergedCerts)
          // We can't know which existing entries were manual vs auto, so union — then
          // remove auto certs that no longer pass the intersection
          const autoCertNames = ['Vegan','Vegetarian','Gluten-Free','Halal','Kosher','Organic','Fair Trade','Lactose-Free','Coeliac-Friendly']
          const manualEntries = existingDietary.filter(d => !autoCertNames.includes(d) || knownCertNames.has(d))
          const combined = Array.from(new Set([...manualEntries, ...mergedCerts]))

          // Worst-case allergen merge: if any ingredient has an allergen, the menu item has it
          const allergenProfiles = ingredientRows
            .map((r: { allergen_warnings: Record<string, unknown> | null }) => r.allergen_warnings)
            .filter((w): w is Record<string, unknown> => !!w)
          const mergedAllergens = allergenProfiles.length > 0
            ? computeWorstCaseAllergens(allergenProfiles as Parameters<typeof computeWorstCaseAllergens>[0])
            : undefined

          await supabase
            .from('menu_items')
            .update({
              dietary: combined,
              ...(mergedAllergens !== undefined && { allergen_warnings: mergedAllergens }),
            })
            .eq('id', menuItemId)
        }
      }
    } catch (cascadeErr) {
      // Non-fatal: cascade failure shouldn't block the ingredient save response
      console.error('[ingredient PUT] dietary cascade error:', cascadeErr)
    }

    return NextResponse.json({ ingredient })

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
    
    // Get user from auth token
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

    // Get user's business
    const { data: userBusiness } = await supabase
      .from('user_businesses')
      .select('business_id')
      .eq('user_id', userId)
      .single()

    if (!userBusiness) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Delete ingredient
    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id)
      .eq('business_id', userBusiness.business_id)

    if (error) {
      console.error('Error deleting ingredient:', error)
      return NextResponse.json({ error: 'Failed to delete ingredient' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
