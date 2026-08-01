import { getJwtSecret } from '@/lib/auth'
// app/api/notifications/route.ts
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
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

    // Get notification settings from localStorage (passed as query params for now)
    const { searchParams } = new URL(request.url)
    const datasheetEnabled = searchParams.get('datasheetEnabled') === 'true'
    const ingredientEnabled = searchParams.get('ingredientEnabled') === 'true'
    const menuEnabled = searchParams.get('menuEnabled') === 'true'
    const supplierEnabled = searchParams.get('supplierEnabled') === 'true'
    const datasheetFreq = searchParams.get('datasheetFreq') || '1 month'
    const ingredientFreq = searchParams.get('ingredientFreq') || '1 month'
    const menuFreq = searchParams.get('menuFreq') || '1 month'
    const supplierFreq = searchParams.get('supplierFreq') || '1 month'

    // Convert frequency to days
    const freqToDays = (freq: string) => {
      switch (freq) {
        case '2 weeks': return 14
        case '1 month': return 30
        case '3 months': return 90
        case '1 year': return 365
        default: return 30
      }
    }

    const notifications = []

    // Check datasheets if enabled
    if (datasheetEnabled) {
      const days = freqToDays(datasheetFreq)
      const { data: datasheets } = await supabase
        .from('datasheets')
        .select('id, name, updated_at')
        .eq('business_id', userBusiness.business_id)
        .eq('status', 'active')
        .lt('updated_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000))

      if (datasheets) {
        notifications.push(...datasheets.map(d => ({
          type: 'datasheet',
          id: d.id,
          name: d.name,
          lastUpdated: d.updated_at,
          daysOverdue: Math.floor((Date.now() - new Date(d.updated_at).getTime()) / (24 * 60 * 60 * 1000)) - days,
          frequency: datasheetFreq
        })))
      }
    }

    // Check ingredients if enabled
    if (ingredientEnabled) {
      const days = freqToDays(ingredientFreq)
      const { data: ingredients } = await supabase
        .from('ingredients')
        .select('id, name, updated_at')
        .eq('business_id', userBusiness.business_id)
        .lt('updated_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000))

      if (ingredients) {
        notifications.push(...ingredients.map(i => ({
          type: 'ingredient',
          id: i.id,
          name: i.name,
          lastUpdated: i.updated_at,
          daysOverdue: Math.floor((Date.now() - new Date(i.updated_at).getTime()) / (24 * 60 * 60 * 1000)) - days,
          frequency: ingredientFreq
        })))
      }
    }

    // Check menu items if enabled
    if (menuEnabled) {
      const days = freqToDays(menuFreq)
      const { data: menuItems } = await supabase
        .from('menu_items')
        .select('id, name, updated_at')
        .eq('business_id', userBusiness.business_id)
        .lt('updated_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000))

      if (menuItems) {
        notifications.push(...menuItems.map(m => ({
          type: 'menu_item',
          id: m.id,
          name: m.name,
          lastUpdated: m.updated_at,
          daysOverdue: Math.floor((Date.now() - new Date(m.updated_at).getTime()) / (24 * 60 * 60 * 1000)) - days,
          frequency: menuFreq
        })))
      }
    }

    // Check suppliers if enabled
    if (supplierEnabled) {
      const days = freqToDays(supplierFreq)
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name, updated_at')
        .eq('business_id', userBusiness.business_id)
        .lt('updated_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000))

      if (suppliers) {
        notifications.push(...suppliers.map(s => ({
          type: 'supplier',
          id: s.id,
          name: s.name,
          lastUpdated: s.updated_at,
          daysOverdue: Math.floor((Date.now() - new Date(s.updated_at).getTime()) / (24 * 60 * 60 * 1000)) - days,
          frequency: supplierFreq
        })))
      }
    }

    return NextResponse.json({ notifications })

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Mark an item as reviewed (resets the notification timer)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { entityType, entityId } = body

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

    // Upsert notification record with last_reviewed_at = now
    const { error } = await supabase
      .from('notifications')
      .upsert({
        business_id: userBusiness.business_id,
        entity_type: entityType,
        entity_id: entityId,
        last_reviewed_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString()
      }, {
        onConflict: 'business_id,entity_type,entity_id'
      })

    if (error) {
      console.error('Error updating notification:', error)
      return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error marking as reviewed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}