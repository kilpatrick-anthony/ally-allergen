import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

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

const getUserBusinessId = async (supabase: ReturnType<typeof createServiceClient>, userId: string) => {
  const { data: userBusiness } = await supabase
    .from('user_businesses')
    .select('business_id')
    .eq('user_id', userId)
    .single()

  return userBusiness?.business_id || null
}

const upsertSuppliers = async (
  supabase: ReturnType<typeof createServiceClient>,
  businessId: string,
  suppliers: string[],
  userId: string,
  overrides?: Partial<{
    contact: string
    phone: string
    email: string
    website: string
    notes: string
    ingredient_count: number
  }>
) => {
  const names = normalizeSupplierNames(suppliers)
  if (names.length === 0) {
    return
  }

  const rows = names.map((name) => ({
    business_id: businessId,
    name,
    contact: overrides?.contact || '',
    phone: overrides?.phone || '',
    email: overrides?.email || '',
    website: overrides?.website || '',
    notes: overrides?.notes || '',
    ingredient_count: overrides?.ingredient_count ?? 0,
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
      .from('suppliers')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    // Apply limit if specified
    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data: suppliers, error } = await query

    if (error) {
      console.error('Error fetching suppliers:', error)
      return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
    }

    if (!suppliers || suppliers.length === 0) {
      const { data: ingredientSuppliers, error: ingredientError } = await supabase
        .from('ingredients')
        .select('suppliers')
        .eq('business_id', businessId)

      if (ingredientError) {
        console.error('Error fetching ingredient suppliers:', ingredientError)
        return NextResponse.json({ suppliers: [] })
      }

      const flattened = (ingredientSuppliers || [])
        .flatMap((row: { suppliers?: string[] }) => row.suppliers || [])

      try {
        await upsertSuppliers(supabase, businessId, flattened, userId)
      } catch (upsertError: any) {
        console.error('Error backfilling suppliers:', upsertError)
        return NextResponse.json({ suppliers: [] })
      }

      const { data: refreshedSuppliers, error: refreshError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      if (refreshError) {
        console.error('Error refreshing suppliers:', refreshError)
        return NextResponse.json({ suppliers: [] })
      }

      return NextResponse.json({ suppliers: refreshedSuppliers || [] })
    }

    return NextResponse.json({ suppliers })

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
    const suppliers = Array.isArray(body.suppliers) ? body.suppliers : []
    const singleName = typeof body.name === 'string' ? body.name : ''
    const requestedNames = suppliers.length > 0 ? suppliers : (singleName ? [singleName] : [])

    if (requestedNames.length === 0) {
      return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const businessId = await getUserBusinessId(supabase, userId)

    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    await upsertSuppliers(supabase, businessId, requestedNames, userId, {
      contact: typeof body.contact === 'string' ? body.contact : undefined,
      phone: typeof body.phone === 'string' ? body.phone : undefined,
      email: typeof body.email === 'string' ? body.email : undefined,
      website: typeof body.website === 'string' ? body.website : undefined,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
      ingredient_count: typeof body.ingredient_count === 'number' ? body.ingredient_count : undefined,
    })

    const { data: suppliersData, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('business_id', businessId)
      .in('name', normalizeSupplierNames(requestedNames))

    if (error) {
      console.error('Error fetching suppliers after upsert:', error)
      return NextResponse.json({ error: 'Failed to create suppliers' }, { status: 500 })
    }

    return NextResponse.json({ suppliers: suppliersData || [] })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
