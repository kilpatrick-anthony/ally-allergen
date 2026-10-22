import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const AUTH_COOKIE_NAME = 'auth-token'

async function isDisabledUser(token: string): Promise<boolean> {
  const secret = process.env.AUTH_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret || !supabaseUrl || !serviceKey) {
    throw new Error('Missing authentication configuration')
  }

  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
  if (typeof payload.userId !== 'string') return false

  const url = new URL('/rest/v1/users', supabaseUrl)
  url.searchParams.set('id', `eq.${payload.userId}`)
  url.searchParams.set('select', 'role')
  const response = await fetch(url, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('Unable to verify account status')

  const users = await response.json() as { role: string | null }[]
  return users.some((user) => user.role === 'disabled')
}

/**
 * Makes the Internal workspace the landing page for internal.allyjen.ie while
 * retaining /internal for previews and local development. Authentication and
 * authorization remain enforced by the Internal API, not by the hostname.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (path === '/api/datasheets/review' || /^\/api\/(?:compliance|ingredient-drafts|ingredient-draft-documents|quick-add-drafts|quick-add-notifications)(?:\/|$)/.test(path)) {
    return NextResponse.json({ error: 'This feature is currently unavailable' }, { status: 410 })
  }
  if (request.nextUrl.pathname.startsWith('/api/') && !['/api/signin', '/api/signout'].includes(request.nextUrl.pathname)) {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
    if (token) {
      try {
        if (await isDisabledUser(token)) {
          const response = request.nextUrl.pathname === '/api/auth/session'
            ? NextResponse.json({ user: null, authenticated: false })
            : NextResponse.json({ error: 'Account access revoked' }, { status: 401 })
          response.cookies.delete(AUTH_COOKIE_NAME)
          return response
        }
      } catch (error) {
        // Existing route handlers reject invalid tokens. A failed account lookup
        // must not grant access while the revocation status is unknown.
        if (!(error instanceof Error && error.name === 'JWTExpired') &&
            !(error instanceof Error && error.name === 'JWSInvalid')) {
          return NextResponse.json({ error: 'Unable to verify account access' }, { status: 503 })
        }
      }
    }
  }

  const hostname = request.headers.get('host')?.split(':')[0].toLowerCase()
  if (hostname === 'internal.allyjen.ie' && request.nextUrl.pathname === '/') {
    return NextResponse.rewrite(new URL('/internal', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/api/:path*'],
}
