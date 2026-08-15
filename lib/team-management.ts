import { cookies } from 'next/headers'
import { hasSuperAdminAccess, verifySessionToken } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

export type TeamRole = 'owner' | 'manager' | 'staff'

export class TeamError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

export async function getTeamActor() {
  const token = (await cookies()).get('auth-token')?.value
  if (!token) return null
  try {
    const payload = await verifySessionToken(token)
    return { userId: payload.userId, email: payload.email, role: payload.role }
  } catch {
    return null
  }
}

export async function requireOwnerContext() {
  const actor = await getTeamActor()
  if (!actor?.userId) throw new TeamError('Unauthorized', 401)
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('user_businesses')
    .select('business_id, role')
    .eq('user_id', actor.userId)
    .maybeSingle()
  if (error || !data || data.role !== 'owner') throw new TeamError('Only the business owner can manage team members', 403)
  return { supabase, actor, businessId: data.business_id as string }
}

export async function requireSuperAdminContext() {
  const actor = await getTeamActor()
  if (!actor?.userId) throw new TeamError('Unauthorized', 401)
  const supabase = createServiceClient()
  const allowed = await hasSuperAdminAccess({
    userId: actor.userId,
    userEmail: actor.email,
    userRole: actor.role,
    supabase,
  })
  if (!allowed) throw new TeamError('Unauthorized', 401)
  return { supabase, actor }
}

async function findAuthUserByEmail(supabase: ReturnType<typeof createServiceClient>, email: string) {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new TeamError(error.message, 500)
    const match = data.users.find(user => user.email?.toLowerCase() === email)
    if (match) return match
    if (data.users.length < 200) return null
  }
  throw new TeamError('Unable to search all users', 500)
}

export async function listTeamMembers(
  supabase: ReturnType<typeof createServiceClient>,
  businessId: string
) {
  const { data, error } = await supabase
    .from('user_businesses')
    .select('id, user_id, role, display_name, invited_at, created_at')
    .eq('business_id', businessId)
    .order('created_at')
  if (error) throw new TeamError(error.message, 500)

  return Promise.all((data || []).map(async membership => {
    const { data: authData } = await supabase.auth.admin.getUserById(membership.user_id)
    const user = authData?.user
    return {
      id: membership.id,
      userId: membership.user_id,
      name: membership.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Team member',
      email: user?.email || '',
      role: membership.role,
      invitedAt: membership.invited_at || membership.created_at,
      joinedAt: user?.email_confirmed_at || null,
      status: user?.email_confirmed_at ? 'active' : 'invited',
    }
  }))
}

export async function inviteTeamMember({
  supabase,
  businessId,
  invitedBy,
  businessName,
  name,
  email,
  role,
}: {
  supabase: ReturnType<typeof createServiceClient>
  businessId: string
  invitedBy: string
  businessName?: string
  name: string
  email: string
  role: TeamRole
}) {
  const cleanName = name.trim()
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanName || !/^\S+@\S+\.\S+$/.test(cleanEmail)) throw new TeamError('A valid name and email are required')
  if (!['owner', 'manager', 'staff'].includes(role)) throw new TeamError('Invalid role')

  let user = await findAuthUserByEmail(supabase, cleanEmail)
  let createdUser = false
  if (user) {
    const { data: memberships, error } = await supabase
      .from('user_businesses').select('business_id').eq('user_id', user.id)
    if (error) throw new TeamError(error.message, 500)
    if ((memberships || []).some(item => item.business_id === businessId)) throw new TeamError('That person is already on this team', 409)
    if ((memberships || []).length > 0) throw new TeamError('That email is already attached to another business', 409)
    await supabase.auth.admin.updateUserById(user.id, { user_metadata: { ...user.user_metadata, full_name: cleanName } })
  } else {
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://allyjen.ie'}/auth/update-password`
    const result = await supabase.auth.admin.inviteUserByEmail(cleanEmail, {
      redirectTo,
      data: { full_name: cleanName, business_name: businessName || '' },
    })
    if (result.error || !result.data.user) throw new TeamError(result.error?.message || 'Could not send invitation', 500)
    user = result.data.user
    createdUser = true
  }

  const { error } = await supabase.from('user_businesses').insert({
    user_id: user.id,
    business_id: businessId,
    role,
    display_name: cleanName,
    invited_by: invitedBy,
    invited_at: new Date().toISOString(),
  })
  if (error) {
    if (createdUser) await supabase.auth.admin.deleteUser(user.id)
    throw new TeamError(error.message, 500)
  }
}

async function getMembership(supabase: ReturnType<typeof createServiceClient>, businessId: string, membershipId: string) {
  const { data, error } = await supabase.from('user_businesses')
    .select('id, user_id, role').eq('id', membershipId).eq('business_id', businessId).maybeSingle()
  if (error || !data) throw new TeamError('Team member not found', 404)
  return data
}

async function assertOwnerRemains(supabase: ReturnType<typeof createServiceClient>, businessId: string, currentRole: string) {
  if (currentRole !== 'owner') return
  const { count, error } = await supabase.from('user_businesses')
    .select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('role', 'owner')
  if (error) throw new TeamError(error.message, 500)
  if ((count || 0) <= 1) throw new TeamError('Every business must keep at least one owner', 409)
}

export async function updateTeamMember(
  supabase: ReturnType<typeof createServiceClient>, businessId: string, membershipId: string,
  values: { name: string; role: TeamRole }, actorId: string, allowSelf = false
) {
  const membership = await getMembership(supabase, businessId, membershipId)
  if (!allowSelf && membership.user_id === actorId) throw new TeamError('You cannot change your own team role', 409)
  if (!['owner', 'manager', 'staff'].includes(values.role)) throw new TeamError('Invalid role')
  if (!values.name?.trim()) throw new TeamError('Name is required')
  if (membership.role === 'owner' && values.role !== 'owner') await assertOwnerRemains(supabase, businessId, membership.role)
  const { error } = await supabase.from('user_businesses').update({ display_name: values.name.trim(), role: values.role })
    .eq('id', membershipId).eq('business_id', businessId)
  if (error) throw new TeamError(error.message, 500)
  const { data: authData } = await supabase.auth.admin.getUserById(membership.user_id)
  if (authData?.user) {
    await supabase.auth.admin.updateUserById(membership.user_id, {
      user_metadata: { ...authData.user.user_metadata, full_name: values.name.trim() },
    })
  }
}

export async function removeTeamMember(
  supabase: ReturnType<typeof createServiceClient>, businessId: string, membershipId: string,
  actorId: string, allowSelf = false
) {
  const membership = await getMembership(supabase, businessId, membershipId)
  if (!allowSelf && membership.user_id === actorId) throw new TeamError('You cannot remove yourself', 409)
  await assertOwnerRemains(supabase, businessId, membership.role)
  const { error } = await supabase.from('user_businesses').delete().eq('id', membershipId).eq('business_id', businessId)
  if (error) throw new TeamError(error.message, 500)
}

export function teamErrorResponse(error: unknown) {
  const teamError = error instanceof TeamError ? error : new TeamError('Unexpected error', 500)
  return Response.json({ error: teamError.message }, { status: teamError.status })
}
