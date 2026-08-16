// app/auth/signin/page.tsx
'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, CheckCircle, ShieldCheck } from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'

function SignInContent() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const router = useRouter()
  const supabaseRef = useRef(createClient())

  // Get email and message from URL params; restore remembered email
  useEffect(() => {
    const emailParam = searchParams.get('email')
    const messageParam = searchParams.get('message')
    
    if (emailParam) {
      setEmail(emailParam)
    } else {
      const remembered = localStorage.getItem('rememberMe_email')
      if (remembered) {
        setEmail(remembered)
        setRememberMe(true)
      }
    }
    if (messageParam) {
      setSuccessMessage(messageParam)
    }
  }, [searchParams])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')

    console.log('🔐 Starting server-side sign-in...', email)

    try {
      // Call server-side sign-in API
      const response = await fetch('/api/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          rememberMe,
          twoFactorCode: requiresTwoFactor ? twoFactorCode : undefined,
        })
      })

      console.log('📥 Sign-in response status:', response.status)
      
      const result = await response.json()
      console.log('📋 Sign-in response:', result)

      if (result.requiresTwoFactor) {
        setRequiresTwoFactor(true)
        setLoading(false)
        return
      }

      if (!response.ok) {
        throw new Error(result.error || 'Invalid email or password')
      }

      if (!result.success) {
        throw new Error('Sign in was not successful')
      }

      console.log('✅ Sign-in successful, user:', result.email)
      console.log('→ Redirecting to /admin...')

      // Persist or clear remembered email
      if (rememberMe) {
        localStorage.setItem('rememberMe_email', email)
      } else {
        localStorage.removeItem('rememberMe_email')
      }

      // Redirect to intended destination or default to /admin
      const redirectTo = searchParams.get('redirect') || '/admin'
      window.location.href = redirectTo
    } catch (error: any) {
      console.error('❌ Sign in error:', error)
      setError(error.message || 'Invalid email or password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ fontFamily: "var(--font-atkinson), sans-serif" }}>
      {/* Left: Brand section — full panel on desktop, compact banner on mobile */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 bg-[#003842] text-white relative overflow-hidden
                      py-8 px-6 md:p-12 md:min-h-screen">
        {/* decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#42b8ac]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#42b8ac]/10 blur-3xl pointer-events-none" />
        {/* Mobile: horizontal layout; Desktop: vertical layout */}
        <div className="relative z-10 flex flex-row items-center gap-4 md:flex-col md:text-center md:-mt-24">
          <img
            src="/Logo-AllyJen-Transparent%20BG.svg"
            alt="AllyJen"
            className="h-20 w-auto md:h-80 md:mb-10"
          />
          <div className="flex flex-col md:items-center">
            <h2 className="text-xl md:text-3xl font-extrabold text-white mb-1 md:mb-3 leading-tight">
              Serving <span className="text-[#42b8ac]">Confidence</span>
            </h2>
            <p className="text-white/60 text-xs md:text-sm md:max-w-xs">
              The complete allergen management solution for Irish &amp; EU food businesses
            </p>
          </div>
        </div>
        <div className="hidden md:block absolute bottom-8 text-xs text-white/40">&copy; {new Date().getFullYear()} AllyJen Solutions LTD.</div>
      </div>
      {/* Right: Sign-in form */}
      <div className="flex flex-1 flex-col justify-center items-center bg-white px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-extrabold text-[#003842] mb-1">Welcome back</h1>
            <p className="text-gray-500 text-sm">Sign in to your AllyJen account</p>
          </div>
          <Card className="w-full p-8 shadow-xl rounded-2xl border border-gray-100 bg-white">
            <form onSubmit={handleSignIn} className="space-y-7">
              {successMessage && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                  {successMessage}
                </div>
              )}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {error}
                </div>
              )}
              {!requiresTwoFactor && <div>
                <label htmlFor="email" className="block text-base font-semibold text-gray-800 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-lg text-gray-900"
                  />
                </div>
              </div>}
              {!requiresTwoFactor && <div>
                <label htmlFor="password" className="block text-base font-semibold text-gray-800 mb-2">
                  Password
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
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-lg text-gray-900"
                  />
                </div>
              </div>}
              {requiresTwoFactor && (
                <div>
                  <div className="mb-5 rounded-xl border border-[#42b8ac]/30 bg-[#42b8ac]/10 p-4 text-sm text-[#003842]">
                    <div className="mb-1 flex items-center gap-2 font-bold">
                      <ShieldCheck className="h-5 w-5" /> Two-factor verification
                    </div>
                    Enter the 6-digit code from your authenticator app, or one unused backup code.
                  </div>
                  <label htmlFor="twoFactorCode" className="block text-base font-semibold text-gray-800 mb-2">
                    Authenticator code
                  </label>
                  <input
                    id="twoFactorCode"
                    value={twoFactorCode}
                    onChange={(event) => setTwoFactorCode(event.target.value)}
                    required
                    autoFocus
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    placeholder="000000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center font-mono text-2xl tracking-[0.35em] text-gray-900 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                  />
                </div>
              )}
              {!requiresTwoFactor && <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#42b8ac] focus:ring-[#42b8ac] cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
              </div>}
              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 text-base font-bold bg-[#003842] hover:bg-[#42b8ac] text-white rounded-lg transition-colors"
                disabled={loading}
              >
                {loading ? 'Verifying…' : requiresTwoFactor ? 'Verify and sign in' : 'Sign In'}
              </Button>
              {requiresTwoFactor && (
                <button
                  type="button"
                  onClick={() => { setRequiresTwoFactor(false); setTwoFactorCode(''); setError('') }}
                  className="w-full text-sm font-semibold text-gray-500 hover:text-[#003842]"
                >
                  Use a different account
                </button>
              )}
              <div className="text-center space-y-2">
                <div>
                  <Link href="/auth/reset-password" className="text-sm text-[#42b8ac] hover:text-[#003842] font-semibold">
                    Forgot password?
                  </Link>
                </div>
                <div className="text-base text-gray-600">
                  Don't have an account?{' '}
                  <Link href="/#contact-form" className="text-[#42b8ac] hover:text-[#003842] font-semibold">
                    Contact us
                  </Link>
                </div>
                <div>
                  <Link href="/" className="text-sm text-gray-400 hover:text-[#003842]">
                    ← Back to home
                  </Link>
                </div>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function SignIn() {
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
      <SignInContent />
    </Suspense>
  )
}
