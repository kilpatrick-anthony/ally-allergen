// app/auth/update-password/page.tsx
'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, CheckCircle } from 'lucide-react'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'

function UpdatePasswordContent() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  // formReady gates the spinner vs form — once true it never goes back to false,
  // so clearing the error in handleSubmit can't re-trigger the spinner.
  const [formReady, setFormReady] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const router = useRouter()
  // Use createBrowserClient (SSR, cookie-based storage) so that:
  // - PKCE ?code= links (old emails, same browser) are auto-exchanged via
  //   detectSessionInUrl:true (hardcoded by @supabase/ssr) using the cookie verifier.
  // - Implicit #access_token= links (new emails) are handled manually in useEffect.
  // isSingleton:false ensures a fresh client per page load (no shared module state).
  const supabaseRef = useRef(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { isSingleton: false }
    )
  )

  useEffect(() => {
    const supabase = supabaseRef.current
    let settled = false

    const finish = () => {
      if (settled) return
      settled = true
      setSessionReady(true)
      setFormReady(true)
    }
    const fail = (msg?: string) => {
      if (settled) return
      settled = true
      setError(msg ?? 'Invalid or expired reset link. Please request a new one.')
      setFormReady(true)
    }

    // onAuthStateChange catches PASSWORD_RECOVERY fired by either our manual
    // exchangeCodeForSession call below, or by detectSessionInUrl auto-exchange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (settled) return
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        finish()
      }
    })

    // With implicit flow, Supabase puts the recovery token in the URL hash:
    // #access_token=...&refresh_token=...&type=recovery
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token') ?? ''
      const type = params.get('type')
      // Clear the hash so tokens aren't exposed in the URL
      window.history.replaceState(null, '', window.location.pathname)
      if (accessToken && type === 'recovery') {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error: err }) => { if (err && !settled) fail(err.message) })
          .catch((e: unknown) => { if (!settled) fail(e instanceof Error ? e.message : undefined) })
      } else if (!settled) {
        fail()
      }
    } else {
      // Fallback: check for an already-active session (e.g. page refresh)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && !settled) finish()
      })
    }

    const timer = setTimeout(fail, 10000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!sessionReady) {
      setError('Session expired. Please request a new password reset link.')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await Promise.race([
        supabaseRef.current.auth.updateUser({ password }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out. Please try again.')), 30000)
        ),
      ])
      if (updateError) {
        setError(updateError.message)
        setLoading(false)
      } else {
        setDone(true)
        setTimeout(() => router.push('/auth/signin'), 3000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ fontFamily: "var(--font-atkinson), sans-serif" }}>
      {/* Left: Brand section */}
      <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-[#003842] text-white p-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#42b8ac]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#42b8ac]/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center -mt-24">
          <img src="/Logo-AllyJen-Transparent%20BG.svg" alt="AllyJen" className="h-80 w-auto mb-10" />
          <h2 className="text-3xl font-extrabold text-white mb-3 leading-tight">
            Serving <span className="text-[#42b8ac]">Confidence</span>
          </h2>
          <p className="text-white/60 text-sm max-w-xs">
            The complete allergen management solution for Irish &amp; EU food businesses
          </p>
        </div>
        <div className="absolute bottom-8 text-xs text-white/40">&copy; {new Date().getFullYear()} AllyJen Solutions LTD.</div>
      </div>

      {/* Right: Form */}
      <div className="flex flex-1 flex-col justify-center items-center bg-white min-h-screen px-4 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 md:hidden flex flex-col items-center">
            <img src="/Logo-AllyJen-Transparent%20BG.svg" alt="AllyJen" className="h-40 w-auto mb-4" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-[#003842] mb-1">Choose a new password</h1>
            <p className="text-gray-500 text-sm">Must be at least 8 characters</p>
          </div>

          <Card className="w-full p-8 shadow-xl rounded-2xl border border-gray-100 bg-white">
            {done ? (
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-[#003842] text-lg mb-1">Password updated!</p>
                  <p className="text-gray-500 text-sm">Redirecting you to sign in…</p>
                </div>
              </div>
            ) : !formReady ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="relative h-10 w-10">
                  <div className="absolute inset-0 rounded-full border-4 border-[#003842]/20"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#42b8ac] animate-spin"></div>
                </div>
                <p className="text-gray-500 text-sm">Verifying reset link…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                    {error}
                  </div>
                )}
                <div>
                  <label htmlFor="password" className="block text-base font-semibold text-gray-800 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-lg"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="confirm" className="block text-base font-semibold text-gray-800 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="confirm"
                      name="confirm"
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="Repeat your new password"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-lg"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-3 text-base font-bold bg-[#003842] hover:bg-[#42b8ac] text-white rounded-lg transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Updating…' : 'Update Password'}
                </Button>
                <div className="text-center">
                  <Link href="/auth/signin" className="text-sm text-[#42b8ac] hover:text-[#003842] font-semibold">
                    Back to sign in
                  </Link>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function UpdatePassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#003842] flex items-center justify-center">
        <div className="text-center">
          <img src="/Logo-AllyJen-Transparent%20BG.svg" alt="AllyJen" className="h-16 w-auto mx-auto mb-6 opacity-80" />
          <div className="relative h-12 w-12 mx-auto">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white/30 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
        </div>
      </div>
    }>
      <UpdatePasswordContent />
    </Suspense>
  )
}
