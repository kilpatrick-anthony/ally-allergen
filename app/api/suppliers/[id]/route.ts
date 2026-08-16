import { getJwtSecret } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const getUserBusinessId = async (supabase: ReturnType<typeof createServiceClient>, userId: string) => {
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

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessId)
      .single()

    if (error) {
      console.error('Error fetching supplier:', error)
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    const { data: variants, error: variantsError } = await supabase
      .from('ingredient_supplier_variants')
      .select('ingredient_id, allergen_warnings, certifications, assessment_status, last_reviewed_at, ingredient:ingredients(id, name, category, status)')
      .eq('business_id', businessId)
      .eq('supplier_id', id)
      .order('created_at', { ascending: false })

    if (variantsError) {
      console.error('Error fetching supplier ingredients:', variantsError)
      return NextResponse.json({ error: 'Failed to load supplier ingredients' }, { status: 500 })
    }

    return NextResponse.json({
      supplier: {
        ...supplier,
        ingredient_count: variants?.length || 0,
      },
      ingredients: variants || [],
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

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .update({
        name: body.name,
        contact: body.contact || '',
        phone: body.phone || '',
        email: body.email || '',
        website: body.website || '',
        notes: body.notes || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('business_id', businessId)
      .select()
      .single()

    if (error) {
      console.error('Error updating supplier:', error)
      const message = error.code === '23505'
        ? 'A supplier with this name already exists'
        : 'Failed to update supplier'
      return NextResponse.json({ error: message }, { status: error.code === '23505' ? 409 : 500 })
    }

    return NextResponse.json({ supplier })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
