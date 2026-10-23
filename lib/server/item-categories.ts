import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { getJwtSecret } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export function categoryRoutes(kind: 'ingredients' | 'menu-items') {
  const table = kind === 'ingredients' ? 'ingredients' : 'menu_items'
  async function context() {
    const token = (await cookies()).get('auth-token')?.value
    if (!token) return null
    let payload
    try { payload = (await jwtVerify(token, getJwtSecret())).payload } catch { return null }
    if (typeof payload.userId !== 'string') return null
    const db = createServiceClient()
    const { data: member, error } = await db.from('user_businesses').select('business_id, role').eq('user_id', payload.userId).single()
    if (error || !member || !['owner', 'manager', 'staff'].includes(member.role)) return null
    return { db, businessId: member.business_id, userId: payload.userId, email: typeof payload.email === 'string' ? payload.email : null }
  }
  return {
    async GET() {
      try {
        const actor = await context()
        if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        const { data, error } = await actor.db.from(table).select('category, subcategory').eq('business_id', actor.businessId)
        if (error) throw error
        const categories = [...new Set((data || []).map(row => row.category).filter(Boolean))].sort()
        const subcategories: Record<string, string[]> = Object.create(null)
        for (const row of data || []) if (row.category && row.subcategory) {
          const values = subcategories[row.category] || []
          if (!values.includes(row.subcategory)) values.push(row.subcategory)
          Object.defineProperty(subcategories, row.category, { value: values.sort(), enumerable: true, configurable: true, writable: true })
        }
        return NextResponse.json({ categories, subcategories })
      } catch { return NextResponse.json({ error: 'Could not load categories' }, { status: 500 }) }
    },
    async PATCH(request: NextRequest) {
      try {
        const actor = await context()
        if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        const body = await request.json()
        if (typeof body.category !== 'string' || typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100 || /[\u0000-\u001f]/.test(body.name) ||
          (body.subcategory !== undefined && (typeof body.subcategory !== 'string' || !body.subcategory.trim()))) {
          return NextResponse.json({ errorCode: 'invalidName' }, { status: 400 })
        }
        const { data, error } = await actor.db.rpc('rename_item_category', {
          p_business_id: actor.businessId, p_user_id: actor.userId, p_user_email: actor.email,
          p_kind: kind, p_category: body.category, p_subcategory: body.subcategory ?? null, p_new_name: body.name.trim(),
        })
        if (error) {
          const code = error.code === '23505' ? 'nameExists' : error.code === 'P0002' ? 'notFound' : error.code === '22023' ? 'invalidName' : 'saveFailed'
          return NextResponse.json({ errorCode: code }, { status: error.code === '23505' ? 409 : error.code === 'P0002' ? 404 : error.code === '22023' ? 400 : 500 })
        }
        return NextResponse.json({ updatedCount: data })
      } catch { return NextResponse.json({ errorCode: 'saveFailed' }, { status: 500 }) }
    },
  }
}
