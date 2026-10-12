import { NextResponse } from 'next/server'
import { quickAddContext, quickAddFailure, QuickAddError } from '@/lib/server/quick-add'

export async function GET() {
  try {
    const context = await quickAddContext()
    if (context.role === 'staff') return NextResponse.json({ unread: 0 })
    const { count, error } = await context.supabase.from('quick_add_review_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', context.businessId).eq('user_id', context.userId).is('read_at', null)
    if (error) throw error
    return NextResponse.json({ unread: count ?? 0 })
  } catch (error) { return quickAddFailure(error) }
}

export async function PATCH() {
  try {
    const context = await quickAddContext()
    if (context.role === 'staff') throw new QuickAddError('forbidden', 403)
    const { error } = await context.supabase.from('quick_add_review_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('business_id', context.businessId).eq('user_id', context.userId).is('read_at', null)
    if (error) throw error
    return NextResponse.json({ unread: 0 })
  } catch (error) { return quickAddFailure(error) }
}
