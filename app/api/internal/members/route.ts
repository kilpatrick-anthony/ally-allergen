import { auditInternal, internalErrorResponse, requireInternalActor } from '@/lib/internal-auth'
import { createServiceClient } from '@/lib/supabase/server'

async function findUserByEmail(supabase: ReturnType<typeof createServiceClient>, email: string) {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email)
    if (user) return user
    if (data.users.length < 200) return null
  }
  throw new Error('Unable to search all users')
}

export async function POST(request: Request) {
  try {
    const { actor, supabase } = await requireInternalActor('access')
    const body = await request.json()
    const email = String(body.email || '').trim().toLowerCase()
    const displayName = String(body.displayName || '').trim()
    if (!displayName || !/^\S+@\S+\.\S+$/.test(email)) {
      return Response.json({ error: 'A valid name and email are required.' }, { status: 400 })
    }
    if (body.platformSuperAdmin && !actor.canGrantSuperAdmin) {
      return Response.json({ error: 'Founder approval is required to grant Super Admin access.' }, { status: 403 })
    }
    if (body.role === 'founder' && !actor.canGrantSuperAdmin) {
      return Response.json({ error: 'Only a founder can appoint another founder.' }, { status: 403 })
    }

    let user = await findUserByEmail(supabase, email)
    let invited = false
    if (!user) {
      const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://allyjen.ie'}/auth/update-password`
      const result = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { full_name: displayName, internal_invite: true },
      })
      if (result.error || !result.data.user) throw result.error || new Error('Could not send invitation')
      user = result.data.user
      invited = true
    }

    const { data, error } = await supabase.from('internal_members').insert({
      user_id: user.id,
      email,
      display_name: displayName,
      role: body.role || 'employee',
      internal_access: true,
      can_manage_people: Boolean(body.canManagePeople),
      can_manage_access: Boolean(body.canManageAccess),
      can_grant_super_admin: Boolean(body.canGrantSuperAdmin && actor.canGrantSuperAdmin),
      platform_super_admin: Boolean(body.platformSuperAdmin && actor.canGrantSuperAdmin),
      created_by: actor.userId,
    }).select('*').single()
    if (error) throw error
    await auditInternal(supabase, actor, 'member.invited', 'internal_member', data.id, {
      email, role: data.role, invited, platformSuperAdmin: data.platform_super_admin,
    }, user.id)
    return Response.json({ member: data, invited }, { status: 201 })
  } catch (error) {
    return internalErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const { actor, supabase } = await requireInternalActor('access')
    const body = await request.json()
    if (!body.id) return Response.json({ error: 'Member ID is required.' }, { status: 400 })
    const { data: current } = await supabase.from('internal_members').select('*').eq('id', body.id).maybeSingle()
    if (!current) return Response.json({ error: 'Internal member not found.' }, { status: 404 })
    if ('platformSuperAdmin' in body && !actor.canGrantSuperAdmin) {
      return Response.json({ error: 'Founder approval is required to change Super Admin access.' }, { status: 403 })
    }
    if ((body.role === 'founder' || current.role === 'founder') && !actor.canGrantSuperAdmin) {
      return Response.json({ error: 'Only a founder can change founder access.' }, { status: 403 })
    }
    if ((current.platform_super_admin || current.can_grant_super_admin) && !actor.canGrantSuperAdmin) {
      return Response.json({ error: 'Founder approval is required to change this member.' }, { status: 403 })
    }
    const removingFounder = current.role === 'founder' && (body.role && body.role !== 'founder' || body.internalAccess === false)
    if (removingFounder) {
      const { count } = await supabase.from('internal_members').select('id', { count: 'exact', head: true })
        .eq('role', 'founder').eq('internal_access', true)
      if ((count || 0) <= 1) return Response.json({ error: 'Internal must keep at least one active founder.' }, { status: 409 })
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if ('role' in body) update.role = body.role
    if ('internalAccess' in body) update.internal_access = Boolean(body.internalAccess)
    if ('canManagePeople' in body) update.can_manage_people = Boolean(body.canManagePeople)
    if ('canManageAccess' in body) update.can_manage_access = Boolean(body.canManageAccess)
    if ('canGrantSuperAdmin' in body) update.can_grant_super_admin = Boolean(body.canGrantSuperAdmin && actor.canGrantSuperAdmin)
    if ('platformSuperAdmin' in body) update.platform_super_admin = Boolean(body.platformSuperAdmin)
    const { data, error } = await supabase.from('internal_members').update(update).eq('id', body.id).select('*').single()
    if (error) throw error
    await auditInternal(supabase, actor, 'member.updated', 'internal_member', body.id, { fields: Object.keys(update), targetEmail: current.email }, current.user_id)
    return Response.json({ member: data })
  } catch (error) {
    return internalErrorResponse(error)
  }
}
