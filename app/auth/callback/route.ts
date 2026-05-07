// app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextParam = requestUrl.searchParams.get('next')

  // Validate next is a safe relative path (prevent open redirect)
  const next =
    nextParam && /^\/[a-zA-Z0-9/_-]/.test(nextParam) ? nextParam : '/admin'

  // Create the redirect response first so we can set cookies directly on it.
  // If we use the next/headers cookieStore instead, the cookies attach to the
  // implicit response and are silently dropped when we return a redirect.
  const response = NextResponse.redirect(new URL(next, requestUrl.origin))

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    await supabase.auth.exchangeCodeForSession(code)
  }

  return response
}