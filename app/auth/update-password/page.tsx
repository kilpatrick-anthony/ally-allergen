// app/auth/update-password/page.tsx
'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
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
  const [sessionReady, setSessionReady] = useState(false)
  const router = useRouter()
  const supabaseRef = useRef(createClient())

  // Wait for Supabase to signal that the recovery session is ready.
  // With PKCE flow the callback route exchanges the code and redirects here
  // with an active session already set — onAuthStateChange fires PASSWORD_RECOVERY.
  useEffect(() => {
    const supabase = supabaseRef.current
    const settled = { current: false }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (settled.current) return
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        settled.current = true
        setSessionReady(true)
      }
    })

    // Fallback: session may already be active by the time the listener is registered
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !settled.current) {
        settled.current = true
        setSessionReady(true)
      }
    })

    // If nothing resolves after 8 s the link is invalid/expired
    const timer = setTimeout(() => {
      if (!settled.current) {
        setError('Invalid or expired reset link. Please request a new one.')
      }
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const { error } = await supabaseRef.current.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
      setTimeout(() => router.push('/auth/signin'), 3000)
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
            ) : !sessionReady && !error ? (
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
