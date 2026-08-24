// app/admin/sites/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Building, MapPin, Phone, Mail, Globe,
  ArrowLeft, Save, X, AlertCircle
} from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'

export default function NewSitePage() {
  const router = useRouter()
  const { t } = useTranslation()
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
          eircode: formData.eircode,
          phone: formData.phone,
          email: formData.email,
          is_active: formData.status === 'active'
        })
      })

      if (!response.ok) {
        throw new Error(t('sitePortal.createError'))
      }

      const data = await response.json()
      
      // Redirect to the new site's page
      router.push(`/admin/sites/${data.site.slug}`)
    } catch (err) {
      console.error('Error creating site:', err)
      setError(err instanceof Error ? err.message : t('sitePortal.createError'))
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
            {t('admin.backToSites')}
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('admin.addNewSite')}</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {t('sitePortal.createDescription')}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">{t('sitePortal.error')}</h3>
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
                  {t('ingredientsPortal.basicInformation')}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Site Name */}
                  <div className="md:col-span-2">
                    <label htmlFor="site-name" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('sitePortal.siteName')} *
                    </label>
                    <input
                      type="text"
                      id="site-name"
                      required
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                      placeholder={t('sitePortal.siteNamePlaceholder')}
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label htmlFor="site-status" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.status')}
                    </label>
                    <select
                      id="site-status"
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                    >
                      <option value="active">{t('accessPoints.active')}</option>
                      <option value="inactive">{t('accessPoints.inactive')}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Location Details */}
              <div className="pt-6 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  {t('sitePortal.locationDetails')}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Address */}
                  <div className="md:col-span-2">
                    <label htmlFor="site-address" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settingsPortal.streetAddress')}
                    </label>
                    <input
                      type="text"
                      id="site-address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                      placeholder={t('sitePortal.addressPlaceholder')}
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label htmlFor="site-city" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settingsPortal.city')}
                    </label>
                    <input
                      type="text"
                      id="site-city"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                      placeholder={t('sitePortal.cityPlaceholder')}
                    />
                  </div>

                  {/* Country */}
                  <div>
                    <label htmlFor="site-country" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settingsPortal.country')}
                    </label>
                    <input
                      type="text"
                      id="site-country"
                      value={formData.country}
                      onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                      placeholder={t('sitePortal.countryPlaceholder')}
                    />
                  </div>

                  {/* Eircode */}
                  <div className="md:col-span-2">
                    <label htmlFor="site-eircode" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('sitePortal.eircode')}
                    </label>
                    <input
                      type="text"
                      id="site-eircode"
                      value={formData.eircode}
                      onChange={(e) => setFormData(prev => ({ ...prev, eircode: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white uppercase"
                      placeholder={t('sitePortal.eircodePlaceholder')}
                      maxLength={8}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('sitePortal.mapHint')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="pt-6 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Phone className="w-5 h-5 mr-2" />
                  {t('sitePortal.contactInformation')}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Phone */}
                  <div>
                    <label htmlFor="site-phone" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('sitePortal.phoneNumber')}
                    </label>
                    <input
                      type="tel"
                      id="site-phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                      placeholder="+353 1 234 5678"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="site-email" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('emailAddress')}
                    </label>
                    <input
                      type="email"
                      id="site-email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                      placeholder={t('sitePortal.emailPlaceholder')}
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
                  icon={<X className="h-4 w-4" />}
                  disabled={loading}
                  className="flex-1"
                >
                  {t('accessPoints.cancel')}
                </Button>
              </Link>
              
              <Button
                type="submit"
                variant="primary"
                icon={<Save className="h-4 w-4" />}
                disabled={loading}
              >
                {loading ? t('supplierPortal.creating') : t('sitePortal.createSite')}
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </Container>
  )
}
