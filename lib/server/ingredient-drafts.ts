import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { NextResponse } from 'next/server'
import { getJwtSecret } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

export const validDraftId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

export async function ingredientDraftAccess() {
  const token = (await cookies()).get('auth-token')?.value
  let userId: unknown
  try { if (token) userId = (await jwtVerify(token, getJwtSecret())).payload.userId } catch {}
  if (typeof userId !== 'string' || !validDraftId(userId)) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const db = createServiceClient()
  const { data, error } = await db.from('user_businesses').select('business_id, role').eq('user_id', userId).single()
  if (error || !data || !['owner', 'manager', 'staff'].includes(data.role)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db, userId, businessId: data.business_id as string }
}

export function ingredientDraftError(error: { message?: string }) {
  const code = ['draftConflict', 'draftNotFound', 'completeIngredient', 'draftForbidden'].find(code => error.message?.includes(code))
  return NextResponse.json({ error: code || 'Could not save ingredient draft', errorCode: code }, {
    status: code === 'draftNotFound' ? 404 : code === 'draftForbidden' ? 403 : code === 'completeIngredient' ? 400 : code ? 409 : 500,
  })
}
