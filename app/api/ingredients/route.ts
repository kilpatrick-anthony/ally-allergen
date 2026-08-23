import { getJwtSecret } from '@/lib/auth'
// app/api/ingredients/route.ts
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { recordAuditLog, diffRecordFields, INGREDIENT_AUDIT_FIELDS } from '@/lib/audit'
import {
  buildCompleteSupplierProfiles,
  deriveEffectiveIngredientSafety,
  normalizeSupplierNames,
  type SupplierProfileMap,
} from '@/lib/ingredient-supplier-profiles'
import {
  ensureSupplierRecords,
  syncIngredientSupplierVariants,
} from '@/lib/server/ingredient-supplier-variants'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
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

    // Fetch ingredients for the business
    let query = supabase
      .from('ingredients')
      .select(`*,datasheets:datasheets(count)`)
      .eq('business_id', userBusiness.business_id)
      .order('created_at', { ascending: false })

    // Apply limit if specified
    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data: ingredients, error } = await query

    if (error) {
      console.error('Error fetching ingredients:', error)
      return NextResponse.json({ error: 'Failed to fetch ingredients' }, { status: 500 })
    }

    return NextResponse.json({ ingredients: ingredients || [] })

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
    const { name, description, category, allergen_warnings, suppliers, certifications, preferred_review_months, supplier_profiles } = body

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

    const normalizedSuppliers = normalizeSupplierNames(Array.isArray(suppliers) ? suppliers : [])
    const supplierRecords = await ensureSupplierRecords(
      supabase,
      userBusiness.business_id,
      normalizedSuppliers,
      userId
    )
    const completeProfiles = buildCompleteSupplierProfiles(
      normalizedSuppliers,
      supplier_profiles as SupplierProfileMap | undefined,
      allergen_warnings || {},
      Array.isArray(certifications) ? certifications : []
    )
    for (const [supplierName, supplier] of supplierRecords) {
      completeProfiles[supplierName].supplier_id = supplier.id
    }
    const derivedSafety = deriveEffectiveIngredientSafety(completeProfiles)
    const effectiveAllergens = derivedSafety?.allergen_warnings || allergen_warnings || {}
    const effectiveCertifications = derivedSafety?.certifications || certifications || []

    // Create ingredient
    const insertPayload = {
      business_id: userBusiness.business_id,
      name,
      description: description || '',
      category: category || '',
      allergen_warnings: effectiveAllergens,
      suppliers: normalizedSuppliers,
      certifications: effectiveCertifications,
      supplier_profiles: completeProfiles,
      preferred_review_months: preferred_review_months || 12,
      status: 'active',
      compliance: 'compliant',
      created_by: userId
    }

    const { data: ingredient, error } = await supabase
      .from('ingredients')
      .insert(insertPayload)
      .select()
      .single()

    if (error) {
      console.error('Error creating ingredient:', error)
      return NextResponse.json({ error: 'Failed to create ingredient' }, { status: 500 })
    }

    try {
      await syncIngredientSupplierVariants(
        supabase,
        userBusiness.business_id,
        ingredient.id,
        supplierRecords,
        completeProfiles,
        userId
      )
    } catch (variantError) {
      await supabase.from('ingredients').delete().eq('id', ingredient.id)
      throw variantError
    }

    await recordAuditLog(supabase, {
      businessId: userBusiness.business_id,
      entityType: 'ingredient',
      entityId: ingredient.id,
      entityName: ingredient.name,
      action: 'created',
      changes: diffRecordFields(null, ingredient, INGREDIENT_AUDIT_FIELDS),
      userId,
      userEmail: payload.email as string,
    })

    return NextResponse.json({ ingredient })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
