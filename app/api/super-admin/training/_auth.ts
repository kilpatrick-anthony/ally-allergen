import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { createServiceClient } from '@/lib/supabase/server'
import { getJwtSecret, hasSuperAdminAccess } from '@/lib/auth'

export async function getAuthenticatedSuperAdmin() {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth-token')?.value
  if (!authToken) return null

  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(authToken, secret)
    const userId = payload.userId as string
    const userEmail = payload.email as string
    const userRole = payload.role as string | undefined
    const supabase = createServiceClient()

    const isSuperAdmin = await hasSuperAdminAccess({
      userEmail,
      userRole,
      userId,
      supabase,
    })

    if (!isSuperAdmin) return null

    return { userId, userEmail }
  } catch {
    return null
  }
}
