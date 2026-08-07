// app/super-admin/components/BusinessSetupModal.tsx
'use client'

import { useState } from 'react'
import { X, Save, User, Building, Mail, Phone, MapPin, CreditCard, DollarSign, Calendar, CheckCircle } from 'lucide-react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { PLAN_DEFINITIONS, SUPER_ADMIN_PLAN_ORDER, type PlanKey } from '@/lib/plans'
import StripeCardElementField, { type StripeCardElementHandle } from '@/components/stripe/StripeCardElementField'

interface BusinessSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (businessData: any) => void
}

interface PlanDetails {
  name: string
  priceLabel: string
  features: string[]
  stripePriceId?: string
}

const PLAN_DETAILS: Record<string, PlanDetails> = {
  free: {
    name: PLAN_DEFINITIONS.free.title,
    priceLabel: PLAN_DEFINITIONS.free.priceLabel,
    features: PLAN_DEFINITIONS.free.adminFeatures,
  },
  demo: {
    name: PLAN_DEFINITIONS.demo.title,
    priceLabel: PLAN_DEFINITIONS.demo.priceLabel,
    features: PLAN_DEFINITIONS.demo.adminFeatures,
  },
  qr_lite: {
    name: PLAN_DEFINITIONS.qr_lite.title,
    priceLabel: PLAN_DEFINITIONS.qr_lite.priceLabel.replace('EUR', '€'),
    features: PLAN_DEFINITIONS.qr_lite.adminFeatures,
  },
  starter: {
    name: PLAN_DEFINITIONS.starter.title,
    priceLabel: PLAN_DEFINITIONS.starter.priceLabel.replace('EUR', '€'),
    features: PLAN_DEFINITIONS.starter.adminFeatures,
    stripePriceId: 'price_starter_plan'
  },
  pro: {
    name: PLAN_DEFINITIONS.pro.title,
    priceLabel: PLAN_DEFINITIONS.pro.priceLabel.replace('EUR', '€'),
    features: PLAN_DEFINITIONS.pro.adminFeatures,
    stripePriceId: 'price_pro_plan'
  },
  enterprise: {
    name: PLAN_DEFINITIONS.enterprise.title,
    priceLabel: PLAN_DEFINITIONS.enterprise.priceLabel,
    features: PLAN_DEFINITIONS.enterprise.adminFeatures,
    stripePriceId: 'price_enterprise_plan'
  }
}

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

export function BusinessSetupModal({ isOpen, onClose, onSave }: BusinessSetupModalProps) {
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [stepError, setStepError] = useState('')
  const cardElementRef = useRef<StripeCardElementHandle>(null)
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

    // First Site Info
    createFirstSite: true,
    siteName: 'Main Location',
    siteAddress: '',
    siteCity: '',
    sitePostalCode: '',
    siteCountry: 'Ireland',

    // Subscription Info
    plan: 'starter' as PlanKey,
    subscriptionStatus: 'active',
    billingCycle: 'monthly',
    setupStripePayment: true,
    chargeDeviceFee: false,
    sendWelcomeEmail: true,
    createSampleData: true,

    // Payment Info (for manual setup)
    billingName: '',
    billingAddress: ''
  })

  const selectedPlan = PLAN_DETAILS[formData.plan]
  const canSetUpStripe = formData.plan === 'starter' || formData.plan === 'pro'
  const totalSteps = canSetUpStripe ? 4 : 3

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

      if (formData.createFirstSite && !formData.siteName.trim()) {
        setStepError('First site name is required, or turn off first site creation.')
        return false
      }
    }

    if (currentStep === 4 && canSetUpStripe) {
      if (!stripePromise) {
        setStepError('Stripe publishable key is missing. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to continue.')
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
    setStepError('')

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

      // Paid plans require Stripe setup before finishing.
      if (canSetUpStripe) {
        try {
          const paymentMethodResult = await cardElementRef.current?.createPaymentMethod(formData.billingName)
          if (!paymentMethodResult?.paymentMethodId) {
            throw new Error(paymentMethodResult?.error || 'Unable to validate payment details')
          }

          const stripeResponse = await fetch('/api/super-admin/stripe/setup-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessId: result.businessId,
              plan: formData.plan,
              billingCycle: formData.billingCycle,
              paymentMethodId: paymentMethodResult.paymentMethodId,
              chargeSetupFee: formData.chargeDeviceFee,
              paymentMethod: {
                billingName: formData.billingName,
                billingAddress: formData.billingAddress,
              },
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
        createFirstSite: true,
        siteName: 'Main Location',
        siteAddress: '',
        siteCity: '',
        sitePostalCode: '',
        siteCountry: 'Ireland',
        plan: 'starter' as PlanKey,
        subscriptionStatus: 'active',
        billingCycle: 'monthly',
        setupStripePayment: true,
        chargeDeviceFee: false,
        sendWelcomeEmail: true,
        createSampleData: true,
        billingName: '',
        billingAddress: ''
      })
      setCurrentStep(1)
      setStepError('')
    } catch (error) {
      console.error('Failed to create business:', error)
      setStepError(error instanceof Error ? error.message : 'Failed to create business. Please try again.')
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
              <option value="Ireland">Ireland</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="United States">United States</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#42b8ac]" />
              First Site / Location
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Create the first store now so devices, kiosk links, and reporting have a location to attach to.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              name="createFirstSite"
              checked={formData.createFirstSite}
              onChange={handleChange}
              className="rounded border-gray-300 text-[#42b8ac] focus:ring-[#42b8ac]"
            />
            Create
          </label>
        </div>

        {formData.createFirstSite && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Site Name *
              </label>
              <input
                type="text"
                name="siteName"
                value={formData.siteName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Main Location"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Site Address
              </label>
              <input
                type="text"
                name="siteAddress"
                value={formData.siteAddress}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Use business address if left blank"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                City
              </label>
              <input
                type="text"
                name="siteCity"
                value={formData.siteCity}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Use business city if left blank"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Eircode / Postal Code
              </label>
              <input
                type="text"
                name="sitePostalCode"
                value={formData.sitePostalCode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Use business postal code if left blank"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country
              </label>
              <select
                name="siteCountry"
                value={formData.siteCountry}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Use business country</option>
                <option value="Ireland">Ireland</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="United States">United States</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
              </select>
            </div>
          </div>
        )}
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6 items-stretch">
          {SUPER_ADMIN_PLAN_ORDER.map((key) => {
            const plan = PLAN_DETAILS[key]
            return (
            <div
              key={key}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all flex flex-col h-full ${
                formData.plan === key
                  ? 'border-[#42b8ac] bg-[#42b8ac]/5 dark:bg-[#42b8ac]/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => setFormData(prev => ({
                ...prev,
                plan: key,
                setupStripePayment: key === 'starter' || key === 'pro',
                billingCycle: 'monthly'
              }))}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900 dark:text-white">{plan.name}</h4>
                {formData.plan === key && <CheckCircle className="h-5 w-5 text-[#42b8ac]" />}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {plan.priceLabel}
                {key !== 'free' && key !== 'demo' && key !== 'enterprise' && <span className="text-sm font-normal text-gray-600 dark:text-gray-400">/month</span>}
              </div>
              <ul className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-2 flex-1">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 leading-5">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 text-green-500 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            )
          })}
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
              disabled={!canSetUpStripe}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="monthly">Monthly</option>
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
                disabled
                className="rounded border-gray-300 text-[#42b8ac] focus:ring-[#42b8ac]"
              />
              <label htmlFor="setupStripePayment" className={`text-sm ${canSetUpStripe ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                {canSetUpStripe ? 'Payment setup required for this plan' : 'Payment setup not required for this plan'}
              </label>
            </div>
            {!canSetUpStripe && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Stripe setup is only available for Self-Managed and Fully Managed plans. Free, Demo, QR Lite and Enterprise are not auto-billed here.
              </p>
            )}
            {canSetUpStripe && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Monthly billing only. You can optionally add a one-time device/setup fee on the first invoice.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chargeDeviceFee"
                    name="chargeDeviceFee"
                    checked={formData.chargeDeviceFee}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-[#42b8ac] focus:ring-[#42b8ac]"
                  />
                  <label htmlFor="chargeDeviceFee" className="text-sm text-gray-700 dark:text-gray-300">
                    Add one-time device/setup fee to first invoice (optional)
                  </label>
                </div>
              </div>
            )}
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
            {stripePromise ? (
              <Elements stripe={stripePromise}>
                <StripeCardElementField ref={cardElementRef} disabled={loading} />
              </Elements>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Stripe payment form is unavailable because NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set.
              </div>
            )}
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
            Create owner, business, and first site. Paid plans require billing details in the final step.
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
