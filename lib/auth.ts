import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { createServiceClient } from '@/lib/supabase/server'

export const AUTH_COOKIE_NAME = 'auth-token'
export const IMPERSONATOR_COOKIE_NAME = 'auth-token-impersonator'

export interface SessionTokenPayload extends JWTPayload {
  userId: string
  email: string
  role?: string | null
  businessId?: string | null
  isImpersonating?: boolean
  impersonatedByUserId?: string
  impersonatedByEmail?: string
  impersonatedByRole?: string | null
  mfaVerified?: boolean
  mfaVerifiedAt?: number
}

export function getJwtSecret(): Uint8Array {
  // A dedicated secret lets Supabase keys be rotated without invalidating every
  // AllyJen session. The fallback keeps existing deployments compatible.
  const secret = process.env.AUTH_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error('Missing required environment variable AUTH_SESSION_SECRET')
  }
  return new TextEncoder().encode(secret)
}

export function getSessionCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    ...(typeof maxAge === 'number' ? { maxAge } : {}),
  }
}

export async function signSessionToken(payload: SessionTokenPayload, expiresIn: string = '7d') {
  const secret = getJwtSecret()
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresIn)
    .sign(secret)
}

export async function verifySessionToken(token: string) {
  const secret = getJwtSecret()
  const { payload } = await jwtVerify(token, secret)
  return payload as SessionTokenPayload
}

export function getConfiguredSuperAdminEmails(): string[] {
  return [process.env.SUPER_ADMIN_EMAIL, process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase())
}

export async function hasSuperAdminAccess({
  userEmail,
  userRole,
  userId,
  supabase,
}: {
  userEmail?: string | null
  userRole?: string | null
  userId?: string | null
  supabase?: ReturnType<typeof createServiceClient>
}): Promise<boolean> {
  const normalizedEmail = userEmail?.toLowerCase()
  const configuredEmails = getConfiguredSuperAdminEmails()

  if (normalizedEmail && configuredEmails.includes(normalizedEmail)) {
    return true
  }

  if (!userId) {
    return Boolean(userRole && userRole.toLowerCase() === 'super_admin')
  }

  const client = supabase ?? createServiceClient()
  const [{ data, error }, { data: internalMember }] = await Promise.all([
    client.from('users').select('role').eq('id', userId).maybeSingle(),
    client
      .from('internal_members')
      .select('platform_super_admin, internal_access')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  if (!error && data?.role === 'super_admin') {
    return true
  }

  return Boolean(internalMember?.internal_access && internalMember?.platform_super_admin)
}
