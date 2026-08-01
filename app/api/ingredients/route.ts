import { getJwtSecret } from '@/lib/auth'
// app/api/ingredients/route.ts
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

    await upsertSuppliers(supabase, userBusiness.business_id, suppliers || [], userId)

    // Compute effective allergen/cert values from per-supplier profiles if provided
    const profiles = supplier_profiles ? Object.values(supplier_profiles as Record<string, { allergen_warnings: any; certifications: string[] }>) : []
    const effectiveAllergens = profiles.length > 0
      ? computeWorstCaseAllergens(profiles.map(p => p.allergen_warnings).filter(Boolean) as Parameters<typeof computeWorstCaseAllergens>[0])
      : (allergen_warnings || {})
    const effectiveCertifications = profiles.length > 0
      ? profiles.map(p => p.certifications || []).reduce((acc, certs) => acc.filter(c => certs.includes(c)))
      : (certifications || [])

    // Create ingredient
    const insertPayload = {
      business_id: userBusiness.business_id,
      name,
      description: description || '',
      category: category || '',
      allergen_warnings: effectiveAllergens,
      suppliers: suppliers || [],
      certifications: effectiveCertifications,
      supplier_profiles: supplier_profiles || {},
      preferred_review_months: preferred_review_months || 3,
      status: 'active',
      compliance: 'compliant',
      created_by: userId
    }

    let { data: ingredient, error } = await supabase
      .from('ingredients')
      .insert(insertPayload)
      .select()
      .single()

    // Fallback: if supplier_profiles column doesn't exist yet (migration not run), retry without it
    if (error && error.message?.includes('supplier_profiles')) {
      const { supplier_profiles: _sp, ...fallbackPayload } = insertPayload;
      ({ data: ingredient, error } = await supabase
        .from('ingredients')
        .insert(fallbackPayload)
        .select()
        .single())
    }

    if (error) {
      console.error('Error creating ingredient:', error)
      return NextResponse.json({ error: 'Failed to create ingredient' }, { status: 500 })
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
