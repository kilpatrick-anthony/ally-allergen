// app/signup/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Building, Mail, Lock, User, ArrowRight, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const publicSignupEnabled = false
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    // User info
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    // Business info
    businessName: '',
    businessDescription: '',
    businessAddress: '',
    businessCity: '',
    businessPostalCode: '',
    businessCountry: '',
    businessPhone: ''
  })

  if (!publicSignupEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f9f8] to-gray-50">
        <Container>
          <div className="min-h-screen flex items-center justify-center py-12">
            <div className="max-w-2xl w-full">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-[#42b8ac] to-[#003842] rounded-2xl mb-4 shadow-lg">
                  <Building className="h-12 w-12 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-[#003842] mb-2">
                  Account Setup by Invitation
                </h1>
                <p className="text-gray-600 text-lg">
                  New business accounts are currently created by the AllyJen team.
                </p>
              </div>

              <Card className="p-8">
                <div className="space-y-6 text-center">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
                    Public self-service signup is temporarily unavailable.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Link href="/auth/signin" className="block">
                      <Button variant="primary" className="w-full">
                        Go to Sign In
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </Button>
                    </Link>
                    <a href="mailto:info@allyjen.ie" className="block">
                      <Button variant="outline" className="w-full">
                        Contact Sales / Support
                      </Button>
                    </a>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </Container>
      </div>
    )
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🚀 Form submitted!')
    console.log('Form data:', formData)
    setError(null)
    setLoading(true)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    if (!formData.businessName.trim()) {
      setError('Business name is required')
      setLoading(false)
      return
    }

    try {
      console.log('🚀 Starting server-side signup...')

      // Call the server-side signup API that handles everything
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          businessName: formData.businessName,
          businessDescription: formData.businessDescription,
          businessAddress: formData.businessAddress,
          businessCity: formData.businessCity,
          businessPostalCode: formData.businessPostalCode,
          businessCountry: formData.businessCountry,
          businessPhone: formData.businessPhone
        })
      })

      console.log('📥 Response status:', response.status)
      
      const result = await response.json()
      console.log('📋 Signup response:', result)

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create account')
      }

      if (!result.success) {
        throw new Error('Account creation was not successful')
      }

      console.log('✅ Account created successfully!')
      console.log('✅ User ID:', result.userId)
      console.log('✅ Business ID:', result.businessId)

      // Skip client-side sign-in to avoid timeout issues in Codespaces
      // Redirect to sign-in page with success message
      console.log('→ Redirecting to sign-in page...')
      const message = 'Account created successfully! Please sign in to continue.'
      window.location.href = `/auth/signin?email=${encodeURIComponent(formData.email)}&message=${encodeURIComponent(message)}`

    } catch (err: any) {
      console.error('❌ Signup error:', err)
      console.error('❌ Error details:', {
        message: err.message,
        status: err.status,
        name: err.name,
        stack: err.stack
      })
      setError(err.message || 'An error occurred during signup')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f9f8] to-gray-50">
      <Container>
        <div className="min-h-screen flex items-center justify-center py-12">
          <div className="max-w-2xl w-full">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-[#42b8ac] to-[#003842] rounded-2xl mb-4 shadow-lg">
                <Building className="h-12 w-12 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-[#003842] mb-2">
                Start Your Free Trial
              </h1>
              <p className="text-gray-600 text-lg">
                Join AllyJen and manage your allergen information with confidence
              </p>
            </div>

            {/* Signup Card */}
            <Card className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                    {error}
                  </div>
                )}

                {/* Business Information */}
                <div>
                  <h3 className="text-lg font-semibold text-[#003842] mb-4 flex items-center gap-2">
                    <Building className="h-5 w-5 text-[#42b8ac]" />
                    Business Information
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                        Business Name *
                      </label>
                      <input
                        id="businessName"
                        type="text"
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleChange}
                        required
                        autoComplete="organization"
                        placeholder="e.g., Joe's Café"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label htmlFor="businessDescription" className="block text-sm font-medium text-gray-700 mb-2">
                        Business Description (Optional)
                      </label>
                      <textarea
                        id="businessDescription"
                        name="businessDescription"
                        value={formData.businessDescription}
                        onChange={handleChange}
                        rows={2}
                        placeholder="Brief description of your business"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-700 mb-2">
                        Business Address (Optional)
                      </label>
                      <input
                        id="businessAddress"
                        type="text"
                        name="businessAddress"
                        value={formData.businessAddress}
                        onChange={handleChange}
                        autoComplete="address-line1"
                        placeholder="Street address"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="businessCity" className="block text-sm font-medium text-gray-700 mb-2">
                          City
                        </label>
                        <input
                          id="businessCity"
                          type="text"
                          name="businessCity"
                          value={formData.businessCity}
                          onChange={handleChange}
                          autoComplete="address-level2"
                          placeholder="City"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label htmlFor="businessPostalCode" className="block text-sm font-medium text-gray-700 mb-2">
                          Postal Code
                        </label>
                        <input
                          id="businessPostalCode"
                          type="text"
                          name="businessPostalCode"
                          value={formData.businessPostalCode}
                          onChange={handleChange}
                          autoComplete="postal-code"
                          placeholder="Postal code"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label htmlFor="businessCountry" className="block text-sm font-medium text-gray-700 mb-2">
                          Country
                        </label>
                        <input
                          id="businessCountry"
                          type="text"
                          name="businessCountry"
                          value={formData.businessCountry}
                          onChange={handleChange}
                          autoComplete="country-name"
                          placeholder="Country"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="businessPhone" className="block text-sm font-medium text-gray-700 mb-2">
                        Business Phone (Optional)
                      </label>
                      <input
                        id="businessPhone"
                        type="tel"
                        name="businessPhone"
                        value={formData.businessPhone}
                        onChange={handleChange}
                        autoComplete="tel"
                        placeholder="Business phone number"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-[#003842] mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-[#42b8ac]" />
                    Your Account
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        id="fullName"
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        autoComplete="name"
                        placeholder="Your full name"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        id="email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                          Password *
                        </label>
                        <input
                          id="password"
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          required
                          autoComplete="new-password"
                          placeholder="Minimum 6 characters"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm Password *
                        </label>
                        <input
                          id="confirmPassword"
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required
                          autoComplete="new-password"
                          placeholder="Re-enter password"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Creating your account...
                      </>
                    ) : (
                      <>
                        Create Account & Continue
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-center text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link href="/auth/signin" className="text-[#42b8ac] hover:text-[#003842] font-medium">
                    Sign in
                  </Link>
                </div>
              </form>
            </Card>

            {/* Features */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <CheckCircle className="h-5 w-5 text-[#42b8ac] flex-shrink-0" />
                <span>7-day free trial</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <CheckCircle className="h-5 w-5 text-[#42b8ac] flex-shrink-0" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <CheckCircle className="h-5 w-5 text-[#42b8ac] flex-shrink-0" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}
