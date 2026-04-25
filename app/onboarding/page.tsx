// app/onboarding/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { 
  MapPin, 
  Users, 
  Sparkles, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Building,
  Monitor,
  Globe,
  Phone,
  Mail
} from 'lucide-react'

type OnboardingStep = 'welcome' | 'location' | 'complete'

interface LocationData {
  name: string
  address: string
  city: string
  county: string
  eircode: string
  phone: string
  email: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState('')
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [createdSiteSlug, setCreatedSiteSlug] = useState<string | null>(null)
  
  const [locationData, setLocationData] = useState<LocationData>({
    name: '',
    address: '',
    city: '',
    county: '',
    eircode: '',
    phone: '',
    email: ''
  })

  useEffect(() => {
    // Get business info
    const fetchBusinessInfo = async () => {
      try {
        const sessionResponse = await fetch('/api/auth/session')
        const sessionData = await sessionResponse.json()

        if (!sessionData?.authenticated || !sessionData?.user) {
          router.push('/auth/signin?redirect=/onboarding')
          return
        }

        const businessIdFromSession = sessionData.user.businessId as string | null
        if (!businessIdFromSession) {
          setError('No business is linked to this account yet. Please contact support.')
          return
        }

        setBusinessId(businessIdFromSession)

        // If setup is already done, skip onboarding.
        const sitesResponse = await fetch('/api/sites')
        const sitesData = await sitesResponse.json()
        if (sitesResponse.ok && Array.isArray(sitesData.sites) && sitesData.sites.length > 0) {
          router.replace('/admin')
          return
        }

        // Fetch business name for a personalized greeting.
        const businessResponse = await fetch(`/api/business/${businessIdFromSession}`)
        if (businessResponse.ok) {
          const businessData = await businessResponse.json()
          setBusinessName(businessData?.name || 'Your Business')
        } else {
          setBusinessName('Your Business')
        }
      } catch (fetchError) {
        console.error('Failed to load onboarding context:', fetchError)
        setError('Failed to load your onboarding details. Please try again.')
      }
    }

    fetchBusinessInfo()
  }, [router])

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleCreateLocation = async () => {
    console.log('handleCreateLocation called', { businessId, locationData })
    
    if (!businessId) {
      alert('Still loading your business information. Please wait a moment and try again.')
      return
    }
    
    // Validate required fields
    if (!locationData.name) {
      alert('Please enter a location name to continue.')
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: locationData.name,
          address: locationData.address || null,
          city: locationData.city || null,
          country: 'Ireland',
          eircode: locationData.eircode || null,
          phone: locationData.phone || null,
          email: locationData.email || null,
          is_active: true,
        })
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create location')
      }

      console.log('Location created successfully:', payload?.site?.id)
      setCreatedSiteSlug(payload?.site?.slug || null)
      setCurrentStep('complete')
    } catch (err: any) {
      console.error('Error creating location:', err)
      alert(`Failed to create location: ${err.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = () => {
    router.push('/admin')
  }

  const handlePairFirstDevice = () => {
    if (createdSiteSlug) {
      router.push(`/admin/sites/${createdSiteSlug}?tab=devices`)
      return
    }

    router.push('/admin/devices')
  }

  const renderStepIndicator = () => {
    const steps = [
      { key: 'welcome', label: 'Welcome' },
      { key: 'location', label: 'Location' },
      { key: 'complete', label: 'Complete' }
    ]

    const currentIndex = steps.findIndex(s => s.key === currentStep)

    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm
              ${index <= currentIndex 
                ? 'bg-[#42b8ac] text-white' 
                : 'bg-gray-200 text-gray-500'
              }
            `}>
              {index < currentIndex ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                index + 1
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={`
                w-16 h-1 mx-2
                ${index < currentIndex ? 'bg-[#42b8ac]' : 'bg-gray-200'}
              `} />
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderWelcome = () => (
    <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center p-6 bg-gradient-to-br from-[#42b8ac] to-[#003842] rounded-3xl shadow-lg">
        <Sparkles className="h-16 w-16 text-white" />
      </div>
      
      <div>
        <h1 className="text-4xl font-bold text-[#003842] mb-3">
          Welcome to AllyJen{businessName && `, ${businessName}`}!
        </h1>
        <p className="text-xl text-gray-600">
          Let's get you set up in just a few minutes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
        <div className="p-6 bg-gray-50 rounded-xl">
          <MapPin className="h-8 w-8 text-[#42b8ac] mb-3 mx-auto" />
          <h3 className="font-semibold text-[#003842] mb-2">Add Your First Location</h3>
          <p className="text-sm text-gray-600">Set up your restaurant or café location details</p>
        </div>

        <div className="p-6 bg-gray-50 rounded-xl">
          <MapPin className="h-8 w-8 text-[#42b8ac] mb-3 mx-auto" />
          <h3 className="font-semibold text-[#003842] mb-2">Pair Your First Device</h3>
          <p className="text-sm text-gray-600">Generate a setup code and link your kiosk in minutes</p>
        </div>

        <div className="p-6 bg-gray-50 rounded-xl">
          <Building className="h-8 w-8 text-[#42b8ac] mb-3 mx-auto" />
          <h3 className="font-semibold text-[#003842] mb-2">Publish Your Menu</h3>
          <p className="text-sm text-gray-600">Add menu items and go live with confidence</p>
        </div>
      </div>

      <Button
        onClick={() => setCurrentStep('location')}
        variant="primary"
        className="px-8"
      >
        Get Started
        <ArrowRight className="h-5 w-5 ml-2" />
      </Button>
    </div>
  )

  const renderLocation = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <MapPin className="h-12 w-12 text-[#42b8ac] mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-[#003842] mb-2">
          Add Your First Location
        </h2>
        <p className="text-gray-600">
          This will be your primary location. You can add more later.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location Name *
          </label>
          <input
            type="text"
            name="name"
            value={locationData.name}
            onChange={handleLocationChange}
            required
            placeholder="e.g., Downtown Location, Main Street"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
              Street Address
          </label>
          <input
            type="text"
            name="address"
            value={locationData.address}
            onChange={handleLocationChange}
            placeholder="12 Main Street"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City/Town
            </label>
            <input
              type="text"
              name="city"
              value={locationData.city}
              onChange={handleLocationChange}
              placeholder="Dublin"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              County
            </label>
            <input
              type="text"
              name="county"
              value={locationData.county}
              onChange={handleLocationChange}
              placeholder="Co. Dublin"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Eircode / Postcode
            </label>
            <input
              type="text"
              name="eircode"
              value={locationData.eircode}
              onChange={handleLocationChange}
              placeholder="D02 XY45"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={locationData.phone}
              onChange={handleLocationChange}
              placeholder="+353 1 234 5678"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={locationData.email}
              onChange={handleLocationChange}
              placeholder="location@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <Button
          onClick={() => setCurrentStep('welcome')}
          variant="outline"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>

        <Button
          onClick={handleCreateLocation}
          variant="primary"
          disabled={loading || !businessId || !locationData.name}
        >
          {loading ? (
            <>
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Creating...
            </>
          ) : !businessId ? 'Loading...' : (
            <>
              Continue
              <ArrowRight className="h-5 w-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )

  const renderComplete = () => (
    <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-full shadow-lg">
        <CheckCircle className="h-16 w-16 text-white" />
      </div>

      <div>
        <h2 className="text-4xl font-bold text-[#003842] mb-3">
          You're All Set!
        </h2>
        <p className="text-xl text-gray-600">
          Your account is ready. Let's start managing your allergen information.
        </p>
      </div>

      <div className="bg-[#f0f9f8] rounded-xl p-8 max-w-2xl mx-auto">
        <h3 className="font-semibold text-[#003842] mb-4">Next Steps:</h3>
        <div className="space-y-3 text-left">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-[#42b8ac] mt-0.5" />
            <div>
                <p className="font-medium text-[#003842]">Pair Your First Device</p>
                <p className="text-sm text-gray-600">Open Device Monitoring and generate a setup code</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-[#42b8ac] mt-0.5" />
            <div>
                <p className="font-medium text-[#003842]">Add Ingredients</p>
                <p className="text-sm text-gray-600">Build your ingredient database with allergen information</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-[#42b8ac] mt-0.5" />
            <div>
                <p className="font-medium text-[#003842]">Create Menu Items</p>
                <p className="text-sm text-gray-600">Build your menu with automatic allergen tracking</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
        <Button
          onClick={handlePairFirstDevice}
          variant="primary"
          className="px-8"
        >
          Pair First Device
          <Monitor className="h-5 w-5 ml-2" />
        </Button>

        <Button
          onClick={handleComplete}
          variant="outline"
          className="px-8"
        >
          Go to Dashboard
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f9f8] to-gray-50">
      <Container>
        <div className="min-h-screen flex items-center justify-center py-12">
          <div className="max-w-3xl w-full">
            {renderStepIndicator()}
            
            <Card className="p-8 md:p-12">
              {currentStep === 'welcome' && renderWelcome()}
              {currentStep === 'location' && renderLocation()}
              {currentStep === 'complete' && renderComplete()}
            </Card>
          </div>
        </div>
      </Container>
    </div>
  )
}
