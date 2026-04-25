// app/super-admin/components/BusinessSetupModal.tsx
'use client'

import { useState } from 'react'
import { X, Save, User, Building, Mail, Phone, MapPin, CreditCard, DollarSign, Calendar, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'

interface BusinessSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (businessData: any) => void
}

interface PlanDetails {
  name: string
  price: number
  features: string[]
  stripePriceId?: string
}

const PLAN_DETAILS: Record<string, PlanDetails> = {
  starter: {
    name: 'Starter',
    price: 99,
    features: ['Up to 50 menu items', 'Basic allergen tracking', 'Email support', '1 location'],
    stripePriceId: 'price_starter_plan'
  },
  pro: {
    name: 'Professional',
    price: 299,
    features: ['Up to 200 menu items', 'Advanced allergen tracking', 'Priority support', '3 locations', 'Custom branding'],
    stripePriceId: 'price_pro_plan'
  },
  enterprise: {
    name: 'Enterprise',
    price: 499,
    features: ['Unlimited menu items', 'Advanced analytics', 'Phone & email support', 'Unlimited locations', 'API access', 'Custom integrations'],
    stripePriceId: 'price_enterprise_plan'
  }
}

export function BusinessSetupModal({ isOpen, onClose, onSave }: BusinessSetupModalProps) {
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [stepError, setStepError] = useState('')
  const [formData, setFormData] = useState({
    // Business Owner Info
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',

    // Business Info
    businessName: '',
    businessDescription: '',
    businessAddress: '',
    businessCity: '',
    businessPostalCode: '',
    businessCountry: 'Ireland',

    // Subscription Info
    plan: 'starter',
    subscriptionStatus: 'active',
    billingCycle: 'monthly',
    setupStripePayment: false,
    sendWelcomeEmail: true,
    createSampleData: true,

    // Payment Info (for manual setup)
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvc: '',
    billingName: '',
    billingAddress: ''
  })

  const selectedPlan = PLAN_DETAILS[formData.plan]
  const totalSteps = formData.setupStripePayment ? 4 : 3

  const validateStep = () => {
    if (currentStep === 1) {
      if (!formData.ownerName.trim() || !formData.ownerEmail.trim()) {
        setStepError('Owner name and email are required to continue.')
        return false
      }
    }

    if (currentStep === 2) {
      if (!formData.businessName.trim()) {
        setStepError('Business name is required to continue.')
        return false
      }
    }

    if (currentStep === 4 && formData.setupStripePayment) {
      if (!formData.cardNumber || !formData.expiryMonth || !formData.expiryYear || !formData.cvc) {
        setStepError('Complete payment details or disable payment setup for now.')
        return false
      }
    }

    setStepError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (currentStep < totalSteps) {
      if (!validateStep()) return
      setCurrentStep(currentStep + 1)
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/super-admin/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          // Include plan details for the API
          planDetails: selectedPlan
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create business')
      }

      // If Stripe payment setup is enabled, create the subscription
      if (formData.setupStripePayment) {
        try {
          const stripeResponse = await fetch('/api/super-admin/stripe/setup-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessId: result.businessId,
              plan: formData.plan,
              billingCycle: formData.billingCycle,
              paymentMethod: {
                cardNumber: formData.cardNumber,
                expiryMonth: formData.expiryMonth,
                expiryYear: formData.expiryYear,
                cvc: formData.cvc,
                billingName: formData.billingName,
                billingAddress: formData.billingAddress
              }
            })
          })

          if (!stripeResponse.ok) {
            console.warn('Stripe setup failed, but business was created:', await stripeResponse.text())
          }
        } catch (stripeError) {
          console.warn('Stripe setup error:', stripeError)
          // Don't fail the entire process if Stripe setup fails
        }
      }

      onSave({ ...formData, ...result })
      onClose()

      // Reset form
      setFormData({
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        businessName: '',
        businessDescription: '',
        businessAddress: '',
        businessCity: '',
        businessPostalCode: '',
        businessCountry: 'Ireland',
        plan: 'starter',
        subscriptionStatus: 'active',
        billingCycle: 'monthly',
        setupStripePayment: false,
        sendWelcomeEmail: true,
        createSampleData: true,
        cardNumber: '',
        expiryMonth: '',
        expiryYear: '',
        cvc: '',
        billingName: '',
        billingAddress: ''
      })
      setCurrentStep(1)
      setStepError('')
    } catch (error) {
      console.error('Failed to create business:', error)
      alert('Failed to create business. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setStepError('')
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const nextStep = () => setCurrentStep(currentStep + 1)
  const prevStep = () => setCurrentStep(currentStep - 1)

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {[1, 2, 3, 4].slice(0, totalSteps).map((step) => (
        <div key={step} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step <= currentStep
              ? 'bg-[#42b8ac] text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}>
            {step}
          </div>
          {step < totalSteps && (
            <div className={`w-12 h-0.5 mx-2 ${
              step < currentStep ? 'bg-[#42b8ac]' : 'bg-gray-200 dark:bg-gray-700'
            }`} />
          )}
        </div>
      ))}
    </div>
  )

  const renderBusinessOwnerStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-[#42b8ac]" />
          Business Owner Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              name="ownerName"
              value={formData.ownerName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="John Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              name="ownerEmail"
              value={formData.ownerEmail}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="john@restaurant.com"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              name="ownerPhone"
              value={formData.ownerPhone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderBusinessDetailsStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Building className="h-5 w-5 text-[#42b8ac]" />
          Business Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Business Name *
            </label>
            <input
              type="text"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Joe's Café"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Business Description
            </label>
            <textarea
              name="businessDescription"
              value={formData.businessDescription}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="A cozy café serving fresh, locally-sourced meals..."
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Business Address
            </label>
            <input
              type="text"
              name="businessAddress"
              value={formData.businessAddress}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="123 Main Street"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              City
            </label>
            <input
              type="text"
              name="businessCity"
              value={formData.businessCity}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Anytown"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Postal Code
            </label>
            <input
              type="text"
              name="businessPostalCode"
              value={formData.businessPostalCode}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="12345"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Country
            </label>
            <select
              name="businessCountry"
              value={formData.businessCountry}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select Country</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="UK">United Kingdom</option>
              <option value="AU">Australia</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )

  const renderPlanSelectionStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-[#42b8ac]" />
          Subscription Plan
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Object.entries(PLAN_DETAILS).map(([key, plan]) => (
            <div
              key={key}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                formData.plan === key
                  ? 'border-[#42b8ac] bg-[#42b8ac]/5 dark:bg-[#42b8ac]/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => setFormData(prev => ({ ...prev, plan: key }))}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900 dark:text-white">{plan.name}</h4>
                {formData.plan === key && <CheckCircle className="h-5 w-5 text-[#42b8ac]" />}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                ${plan.price}<span className="text-sm font-normal text-gray-600 dark:text-gray-400">/month</span>
              </div>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Billing Cycle
            </label>
            <select
              name="billingCycle"
              value={formData.billingCycle}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly (Save 20%)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Setup Payment Method
            </label>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="setupStripePayment"
                name="setupStripePayment"
                checked={formData.setupStripePayment}
                onChange={handleChange}
                className="rounded border-gray-300 text-[#42b8ac] focus:ring-[#42b8ac]"
              />
              <label htmlFor="setupStripePayment" className="text-sm text-gray-700 dark:text-gray-300">
                Set up payment method now
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderPaymentSetupStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-[#42b8ac]" />
          Payment Setup
        </h3>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Secure Payment Processing</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Payment information is securely processed through Stripe. We don't store card details on our servers.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Card Number
            </label>
            <input
              type="text"
              name="cardNumber"
              value={formData.cardNumber}
              onChange={handleChange}
              placeholder="1234 5678 9012 3456"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Expiry Month
            </label>
            <select
              name="expiryMonth"
              value={formData.expiryMonth}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">MM</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month.toString().padStart(2, '0')}>
                  {month.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Expiry Year
            </label>
            <select
              name="expiryYear"
              value={formData.expiryYear}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">YYYY</option>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              CVC
            </label>
            <input
              type="text"
              name="cvc"
              value={formData.cvc}
              onChange={handleChange}
              placeholder="123"
              maxLength={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Billing Name
            </label>
            <input
              type="text"
              name="billingName"
              value={formData.billingName}
              onChange={handleChange}
              placeholder="John Smith"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Billing Address
            </label>
            <input
              type="text"
              name="billingAddress"
              value={formData.billingAddress}
              onChange={handleChange}
              placeholder="123 Main Street, Anytown, USA 12345"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderBusinessOwnerStep()
      case 2:
        return renderBusinessDetailsStep()
      case 3:
        return renderPlanSelectionStep()
      case 4:
        return renderPaymentSetupStep()
      default:
        return renderBusinessOwnerStep()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              New Customer Setup
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Fast path: create owner + business now, then handle billing details later if needed.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {renderStepIndicator()}

          {stepError && (
            <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
              {stepError}
            </div>
          )}

          <div className="min-h-[400px]">
            {renderStepContent()}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    if (!validateStep()) return
                    nextStep()
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? 'Creating Business...' : 'Create Business'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}