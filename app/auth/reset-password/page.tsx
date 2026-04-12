// app/auth/reset-password/page.tsx
'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const supabaseRef = useRef(createClient())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabaseRef.current.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ fontFamily: "var(--font-atkinson), sans-serif" }}>
      {/* Left: Brand section — full panel on desktop, compact banner on mobile */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 bg-[#003842] text-white relative overflow-hidden
                      py-8 px-6 md:p-12 md:min-h-screen">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#42b8ac]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#42b8ac]/10 blur-3xl pointer-events-none" />
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

      {/* Right: Form */}
      <div className="flex flex-1 flex-col justify-center items-center bg-white px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-extrabold text-[#003842] mb-1">Reset your password</h1>
            <p className="text-gray-500 text-sm">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          <Card className="w-full p-8 shadow-xl rounded-2xl border border-gray-100 bg-white">
            {sent ? (
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-[#003842] text-lg mb-1">Check your inbox</p>
                  <p className="text-gray-500 text-sm">
                    We've sent a password reset link to <span className="font-semibold text-[#003842]">{email}</span>.
                    The link will expire in 1 hour.
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Sent from info@allyjen.ie — check your spam folder if you don't see it.
                </p>
                <Link
                  href="/auth/signin"
                  className="mt-2 inline-flex items-center gap-2 text-sm text-[#42b8ac] hover:text-[#003842] font-semibold"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
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
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-3 text-base font-bold bg-[#003842] hover:bg-[#42b8ac] text-white rounded-lg transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </Button>
                <div className="text-center">
                  <Link
                    href="/auth/signin"
                    className="inline-flex items-center gap-1 text-sm text-[#42b8ac] hover:text-[#003842] font-semibold"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back to sign in
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
