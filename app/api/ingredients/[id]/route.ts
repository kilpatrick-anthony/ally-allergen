// app/api/ingredients/[id]/route.ts
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
