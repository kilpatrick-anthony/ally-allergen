import { cookies } from 'next/headers'
import { AUTH_COOKIE_NAME, hasSuperAdminAccess, verifySessionToken } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

const MFA_WINDOW_MS = 12 * 60 * 60 * 1000

export class InternalAccessError extends Error {
  constructor(message: string, public status = 403, public code = 'INTERNAL_ACCESS_DENIED') {
    super(message)
  }
}

export type InternalActor = {
  userId: string
  email: string
  memberId: string
  displayName: string
  role: string
  canManagePeople: boolean
  canManageAccess: boolean
  canGrantSuperAdmin: boolean
  platformSuperAdmin: boolean
}

export async function getSessionIdentity() {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value
  if (!token) throw new InternalAccessError('Please sign in to continue.', 401, 'NOT_AUTHENTICATED')

  const payload = await verifySessionToken(token)
  if (!payload.userId || !payload.email) {
    throw new InternalAccessError('Your session is invalid.', 401, 'INVALID_SESSION')
  }
  if (payload.isImpersonating) {
    throw new InternalAccessError('The Internal portal cannot be opened while impersonating a customer.', 403, 'IMPERSONATION_BLOCKED')
  }
  return payload
}

export function hasRecentMfa(payload: { mfaVerified?: boolean; mfaVerifiedAt?: number }) {
  return Boolean(
    payload.mfaVerified &&
    payload.mfaVerifiedAt &&
    Date.now() - payload.mfaVerifiedAt <= MFA_WINDOW_MS
  )
}

export async function requireInternalActor(permission?: 'people' | 'access' | 'super_admin') {
  const payload = await getSessionIdentity()
  if (!hasRecentMfa(payload)) {
    throw new InternalAccessError(
      'A recent authenticator-code verification is required for sensitive employee information.',
      403,
      'MFA_REQUIRED'
    )
  }

  const supabase = createServiceClient()
  const [{ data: member, error }, { data: authUser }] = await Promise.all([
    supabase.from('internal_members').select('*').eq('user_id', payload.userId).maybeSingle(),
    supabase.auth.admin.getUserById(payload.userId),
  ])
  const appMetadata = authUser?.user?.app_metadata || {}
  const legacyMetadata = authUser?.user?.user_metadata || {}
  if (!(appMetadata.twoFactorEnabled || legacyMetadata.twoFactorEnabled)) {
    throw new InternalAccessError('Two-factor authentication must be enabled to use Internal.', 403, 'MFA_ENROLMENT_REQUIRED')
  }
  if (error || !member?.internal_access) {
    throw new InternalAccessError('You do not have access to AllyJen Internal.', 403, 'NOT_AN_INTERNAL_MEMBER')
  }

  const isFounder = member.role === 'founder'
  const actor: InternalActor = {
    userId: payload.userId,
    email: payload.email,
    memberId: member.id,
    displayName: member.display_name || payload.email.split('@')[0],
    role: member.role,
    canManagePeople: isFounder || Boolean(member.can_manage_people),
    canManageAccess: isFounder || Boolean(member.can_manage_access),
    canGrantSuperAdmin: isFounder || Boolean(member.can_grant_super_admin),
    platformSuperAdmin: Boolean(member.platform_super_admin),
  }

  if (permission === 'people' && !actor.canManagePeople) {
    throw new InternalAccessError('People-management access is required.')
  }
  if (permission === 'access' && !actor.canManageAccess) {
    throw new InternalAccessError('Access-management permission is required.')
  }
  if (permission === 'super_admin' && !actor.canGrantSuperAdmin) {
    throw new InternalAccessError('Founder approval is required to grant Super Admin access.')
  }

  void supabase.from('internal_members').update({ last_access_at: new Date().toISOString() }).eq('id', member.id)
  return { actor, supabase }
}

export async function canBootstrapInternal() {
  const payload = await getSessionIdentity()
  if (!hasRecentMfa(payload)) return { allowed: false, reason: 'MFA_REQUIRED' }
  const supabase = createServiceClient()
  const [{ count }, isSuperAdmin] = await Promise.all([
    supabase.from('internal_members').select('id', { count: 'exact', head: true }),
    hasSuperAdminAccess({ userId: payload.userId, userEmail: payload.email, supabase }),
  ])
  return { allowed: count === 0 && isSuperAdmin, payload, supabase }
}

export async function auditInternal(
  supabase: ReturnType<typeof createServiceClient>,
  actor: Pick<InternalActor, 'userId' | 'email'>,
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata: Record<string, unknown> = {},
  targetUserId?: string | null
) {
  const { error } = await supabase.from('internal_audit_log').insert({
    actor_user_id: actor.userId,
    actor_email: actor.email,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    target_user_id: targetUserId || null,
    metadata,
  })
  if (error) console.error('Internal audit log failed:', error.message)
}

export function internalErrorResponse(error: unknown) {
  if (error instanceof InternalAccessError) {
    return Response.json({ error: error.message, code: error.code }, { status: error.status })
  }
  console.error('Internal portal error:', error)
  return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}
