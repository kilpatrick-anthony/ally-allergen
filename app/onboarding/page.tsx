// app/onboarding/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
  Globe,
  Phone,
  Mail
} from 'lucide-react'

type OnboardingStep = 'welcome' | 'location' | 'team' | 'complete'

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
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.log('No user found, redirecting to signin')
        router.push('/auth/signin')
        return
      }

      console.log('🔍 Fetching business for user:', user.id)

      // Retry logic for getting business (in case of timing issues)
      let attempts = 0
      const maxAttempts = 5
      
      while (attempts < maxAttempts) {
        attempts++
        console.log(`🔄 Attempt ${attempts}/${maxAttempts}: Querying user_businesses...`)
        
        // First, try to get just the user_business record
        const { data: userBusinessData, error: ubError } = await supabase
          .from('user_businesses')
          .select('business_id, role')
          .eq('user_id', user.id)
          .single()

        console.log(`📊 Attempt ${attempts} user_business result:`, { 
          userBusinessData, 
          ubError,
          hasBusinessId: userBusinessData?.business_id ? 'YES' : 'NO'
        })

        if (userBusinessData && userBusinessData.business_id) {
          // Now get the business name separately
          const { data: businessData, error: businessError } = await supabase
            .from('businesses')
            .select('name')
            .eq('id', userBusinessData.business_id)
            .single()

          console.log('📊 Business query result:', { businessData, businessError })

          setBusinessId(userBusinessData.business_id)
          setBusinessName(businessData?.name || 'Your Business')
          console.log('✅ Business loaded successfully:', {
            id: userBusinessData.business_id,
            name: businessData?.name
          })
          return
        }
        
        // Wait before retrying
        if (attempts < maxAttempts) {
          console.log(`⏳ Business not found, waiting 1 second before retry ${attempts + 1}...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      // If still not found after retries, show error
      console.error('❌ Failed to load business after', maxAttempts, 'attempts')
      setError('Failed to load your business information. Please contact support.')
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
    if (!locationData.name || !locationData.address || !locationData.city) {
      alert('Please fill in all required fields (Name, Address, and City)')
      return
    }
    
    setLoading(true)
    try {
      const supabase = createClient()
      
      // Create unique slug from location name with timestamp to avoid duplicates
      const baseSlug = locationData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      const timestamp = Date.now().toString().slice(-6)
      const slug = `${baseSlug}-${timestamp}`

      console.log('Inserting site:', {
        business_id: businessId,
        name: locationData.name,
        slug
      })

      console.log('⏳ Calling sites INSERT...')
      const insertPromise = supabase
        .from('sites')
        .insert({
          business_id: businessId,
          name: locationData.name,
          address: locationData.address,
          city: locationData.city,
          country: 'Ireland',
          phone: locationData.phone,
          email: locationData.email,
          slug: slug,
          is_active: true
        })
        .select()
      
      // Add timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Site insert timeout after 10 seconds')), 10000)
      )
      
      const { data, error } = await Promise.race([
        insertPromise,
        timeoutPromise
      ]) as any
      
      console.log('📥 Insert completed. Data:', data, 'Error:', error)

      if (error) {
        console.error('❌ Supabase INSERT error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw new Error(error.message || 'Failed to create site')
      }

      console.log('Site created successfully:', data)
      setCurrentStep('team')
    } catch (err: any) {
      console.error('Error creating location:', err)
      alert(`Failed to create location: ${err.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSkipTeam = () => {
    setCurrentStep('complete')
  }

  const handleComplete = () => {
    router.push('/admin')
  }

  const renderStepIndicator = () => {
    const steps = [
      { key: 'welcome', label: 'Welcome' },
      { key: 'location', label: 'Location' },
      { key: 'team', label: 'Team' },
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
          <Users className="h-8 w-8 text-[#42b8ac] mb-3 mx-auto" />
          <h3 className="font-semibold text-[#003842] mb-2">Invite Your Team</h3>
          <p className="text-sm text-gray-600">Collaborate with your staff members</p>
        </div>

        <div className="p-6 bg-gray-50 rounded-xl">
          <Building className="h-8 w-8 text-[#42b8ac] mb-3 mx-auto" />
          <h3 className="font-semibold text-[#003842] mb-2">Start Managing</h3>
          <p className="text-sm text-gray-600">Add ingredients and create your menu</p>
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
            Street Address *
          </label>
          <input
            type="text"
            name="address"
            value={locationData.address}
            onChange={handleLocationChange}
            required
            placeholder="12 Main Street"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City/Town *
            </label>
            <input
              type="text"
              name="city"
              value={locationData.city}
              onChange={handleLocationChange}
              required
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
          disabled={loading || !businessId || !locationData.name || !locationData.address || !locationData.city}
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

  const renderTeam = () => (
    <div className="text-center space-y-6">
      <Users className="h-12 w-12 text-[#42b8ac] mx-auto mb-4" />
      <h2 className="text-3xl font-bold text-[#003842] mb-2">
        Invite Your Team
      </h2>
      <p className="text-gray-600 max-w-2xl mx-auto">
        You can invite team members to help manage ingredients, menu items, and allergen information. 
        Don't worry—you can always do this later from your dashboard.
      </p>

      <div className="bg-gray-50 rounded-xl p-8 max-w-md mx-auto">
        <p className="text-sm text-gray-600 mb-4">
          Team invitations will be available in your admin dashboard under Settings → Team.
        </p>
      </div>

      <div className="flex justify-center gap-4 pt-6">
        <Button
          onClick={() => setCurrentStep('location')}
          variant="outline"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>

        <Button
          onClick={handleSkipTeam}
          variant="primary"
        >
          Continue to Dashboard
          <ArrowRight className="h-5 w-5 ml-2" />
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
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-[#42b8ac] mt-0.5" />
            <div>
              <p className="font-medium text-[#003842]">Set Up Kiosks</p>
              <p className="text-sm text-gray-600">Deploy customer-facing allergen information displays</p>
            </div>
          </div>
        </div>
      </div>

      <Button
        onClick={handleComplete}
        variant="primary"
        className="px-8"
      >
        Go to Dashboard
        <ArrowRight className="h-5 w-5 ml-2" />
      </Button>
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
              {currentStep === 'team' && renderTeam()}
              {currentStep === 'complete' && renderComplete()}
            </Card>
          </div>
        </div>
      </Container>
    </div>
  )
}
