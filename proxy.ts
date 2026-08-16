import { NextRequest, NextResponse } from 'next/server'

/**
 * Makes the Internal workspace the landing page for internal.allyjen.ie while
 * retaining /internal for previews and local development. Authentication and
 * authorization remain enforced by the Internal API, not by the hostname.
 */
export function proxy(request: NextRequest) {
  const hostname = request.headers.get('host')?.split(':')[0].toLowerCase()
  if (hostname === 'internal.allyjen.ie' && request.nextUrl.pathname === '/') {
    return NextResponse.rewrite(new URL('/internal', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/'],
}
