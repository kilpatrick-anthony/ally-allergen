// app/admin/sites/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Building, MapPin, Phone, Mail, Globe,
  ArrowLeft, Save, X, AlertCircle
} from 'lucide-react'
import { Container } from '../../../components/layout/Container'
import { Card } from '../../../components/layout/Card'
import { Button } from '../../../components/ui/Button'

export default function NewSitePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    address: '',
    city: '',
    country: 'Ireland',
    eircode: '',
    phone: '',
    email: '',
    status: 'active'
  })

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          phone: formData.phone,
          email: formData.email,
          is_active: formData.status === 'active'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create site')
      }

      const data = await response.json()
      
      // Redirect to the new site's page
      router.push(`/admin/sites/${data.site.slug}`)
    } catch (err) {
      console.error('Error creating site:', err)
      setError(err instanceof Error ? err.message : 'Failed to create site')
      setLoading(false)
    }
  }

  return (
    <Container>
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/admin/sites"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Sites
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Add New Site</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Create a new location for your business
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Basic Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Site Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Site Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., Oakberry Dublin City Centre"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Location Details */}
              <div className="pt-6 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Location Details
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., 12 Grafton Street"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., Dublin"
                    />
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., Ireland"
                    />
                  </div>

                  {/* Eircode */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Eircode (Irish Postcode)
                    </label>
                    <input
                      type="text"
                      value={formData.eircode}
                      onChange={(e) => setFormData(prev => ({ ...prev, eircode: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white uppercase"
                      placeholder="e.g., D02 XY45"
                      maxLength={8}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used to display location on map
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="pt-6 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Phone className="w-5 h-5 mr-2" />
                  Contact Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                      placeholder="+353 1 234 5678"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                      placeholder="location@example.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3">
              <Link href="/admin/sites" className="flex">
                <Button
                  type="button"
                  variant="secondary"
                  icon={X}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </Link>
              
              <Button
                type="submit"
                variant="primary"
                icon={Save}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Site'}
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </Container>
  )
}
