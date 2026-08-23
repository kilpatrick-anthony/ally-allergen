import { getJwtSecret } from '@/lib/auth'
// app/api/compliance/mark-reviewed/route.ts
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
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

    const { itemId, itemType } = await request.json()

    if (!itemId || !itemType) {
      return NextResponse.json({ error: 'Missing itemId or itemType' }, { status: 400 })
    }

    if (!['ingredient', 'menu_item'].includes(itemType)) {
      return NextResponse.json({ error: 'Invalid itemType' }, { status: 400 })
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

    const tableName = itemType === 'ingredient' ? 'ingredients' : 'menu_items'
    const now = new Date().toISOString()

    // Update the item with current timestamp
    const { data: updatedItem, error: updateError } = await supabase
      .from(tableName)
      .update({
        last_reviewed_at: now,
        updated_at: now
      })
      .eq('id', itemId)
      .eq('business_id', userBusiness.business_id)
      .select('id')
      .maybeSingle()

    if (updateError) {
      console.error('Error updating review date:', updateError)
      return NextResponse.json({ error: 'Failed to mark as reviewed' }, { status: 500 })
    }

    if (!updatedItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Record the review action without claiming that all other compliance
    // requirements (such as datasheets or supplier details) have passed.
    const { error: auditError } = await supabase
      .from('compliance_audit')
      .insert({
        business_id: userBusiness.business_id,
        item_id: itemId,
        item_type: itemType,
        new_compliance: 'reviewed',
        reason: 'Review date manually renewed; remaining compliance requirements are evaluated separately',
        changed_by: userId
      })

    if (auditError) {
      console.error('Review date updated but compliance audit logging failed:', auditError)
    }

    return NextResponse.json({
      success: true,
      message: 'Item marked as reviewed',
      auditLogged: !auditError
    })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
