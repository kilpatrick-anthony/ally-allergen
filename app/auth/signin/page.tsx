// app/auth/signin/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Shield, Mail, Lock, CheckCircle } from 'lucide-react'
import { Container } from '@/app/components/layout/Container'
import { Card } from '@/app/components/layout/Card'
import { Button } from '@/app/components/ui/Button'
import { AllyjenLogo } from '@/components/icons';

function SignInContent() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Get email and message from URL params
  useEffect(() => {
    const emailParam = searchParams.get('email')
    const messageParam = searchParams.get('message')
    
    if (emailParam) {
      setEmail(emailParam)
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
        })
      })

      console.log('📥 Sign-in response status:', response.status)
      
      const result = await response.json()
      console.log('📋 Sign-in response:', result)

      if (!response.ok) {
        throw new Error(result.error || 'Invalid email or password')
      }

      if (!result.success) {
        throw new Error('Sign in was not successful')
      }

      console.log('✅ Sign-in successful, user:', result.email)
      console.log('→ Redirecting to /admin...')
      
      // Redirect immediately - cookies are already set server-side
      window.location.href = '/admin'
    } catch (error: any) {
      console.error('❌ Sign in error:', error)
      setError(error.message || 'Invalid email or password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left: Brand section */}
      <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-gradient-to-br from-[#003842] to-[#42b8ac] text-white p-12 relative">
        <div className="mb-8">
          <img
            src="/Logo-AllyJen-Transparent BG.svg"
            alt="AllyJen Logo"
            className="h-40 w-auto object-contain drop-shadow-2xl"
          />
        </div>
        <h1 className="text-5xl font-extrabold mb-4 tracking-tight text-white drop-shadow-lg">What's Occurring?</h1>
        <div className="absolute bottom-8 text-xs text-white/60">&copy; {new Date().getFullYear()} AllyJen</div>
      </div>
      {/* Right: Sign-in form */}
      <div className="flex flex-1 flex-col justify-center items-center bg-white/90 min-h-screen px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 md:hidden flex flex-col items-center">
            <div className="mb-4">
              <div className="bg-white rounded-2xl shadow-2xl relative h-16 w-32 mx-auto overflow-hidden">
                <AllyjenLogo className="absolute inset-0 h-16 w-32 max-w-none max-h-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold text-[#003842] mb-2 tracking-tight">What's Occurring?</h1>
          </div>
          <Card className="w-full p-8 shadow-2xl rounded-2xl border border-gray-100 bg-white/95">
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
              <div>
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
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-lg"
                  />
                </div>
              </div>
              <div>
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
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-lg"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-[#42b8ac] focus:ring-[#42b8ac] border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>
                <Link href="/auth/reset-password" className="text-sm text-[#42b8ac] hover:text-[#003842] font-semibold">
                  Forgot password?
                </Link>
              </div>
              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 text-lg font-bold"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
              <div className="text-center text-base text-gray-600 mt-4">
                Don't have an account?{' '}
                <Link href="/" className="text-[#42b8ac] hover:text-[#003842] font-semibold">
                  Contact us
                </Link>
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
      <div className="min-h-screen bg-gradient-to-br from-[#f0f9f8] to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac] mx-auto"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin mx-auto" style={{animationDirection: 'reverse', animationDuration: '1s'}}></div>
          </div>
          <p className="text-sm text-gray-600 mt-4 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}