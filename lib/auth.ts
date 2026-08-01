import { createServiceClient } from '@/lib/supabase/server'

export function getJwtSecret(): Uint8Array {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error('Missing required environment variable SUPABASE_SERVICE_ROLE_KEY')
  }
  return new TextEncoder().encode(secret)
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

  if (userRole && userRole.toLowerCase() === 'super_admin') {
    return true
  }

  if (!userId) {
    return false
  }

  const client = supabase ?? createServiceClient()
  const { data, error } = await client
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    return false
  }

  return data?.role === 'super_admin'
}
