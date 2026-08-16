import { auditInternal, canBootstrapInternal, internalErrorResponse } from '@/lib/internal-auth'

export async function POST() {
  try {
    const { allowed, payload, supabase } = await canBootstrapInternal()
    if (!allowed || !payload || !supabase) {
      return Response.json({ error: 'Internal has already been set up or this account is not eligible.' }, { status: 403 })
    }

    const { data, error } = await supabase.from('internal_members').insert({
      user_id: payload.userId,
      email: payload.email.toLowerCase(),
      display_name: payload.email.split('@')[0],
      role: 'founder',
      internal_access: true,
      can_manage_people: true,
      can_manage_access: true,
      can_grant_super_admin: true,
      platform_super_admin: true,
      created_by: payload.userId,
    }).select('*').single()
    if (error) throw error

    await auditInternal(supabase, { userId: payload.userId, email: payload.email }, 'internal.bootstrap', 'internal_member', data.id)
    return Response.json({ success: true })
  } catch (error) {
    return internalErrorResponse(error)
  }
}
