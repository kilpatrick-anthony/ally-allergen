// app/admin/sites/[slug]/edit/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Building, MapPin, Phone, Mail, ArrowLeft, Save, X, AlertCircle, Loader2, Trash2
} from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'

export default function EditSitePage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useTranslation()
  const slug = params.slug as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    address: '',
    city: '',
    country: '',
    eircode: '',
    phone: '',
    email: '',
    status: 'active'
  })

  const mapQuery = [formData.address, formData.city, formData.country, formData.eircode]
    .filter(Boolean)
    .join(', ')
  const mapEmbedUrl = mapQuery
    ? `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
    : ''

  useEffect(() => {
    const loadSiteData = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/sites/${slug}`)
        const data = await response.json()

        if (!response.ok) throw new Error(t('sitePortal.loadError'))

        setFormData({
          name: data.site.name || '', slug: data.site.slug || slug,
          address: data.site.address || '', city: data.site.city || '', country: data.site.country || '',
          eircode: data.site.eircode || '', phone: data.site.phone || '', email: data.site.email || '',
          status: data.site.is_active ? 'active' : 'inactive'
        })
      } catch (err) {
        console.error('Error loading site:', err)
        setError(t('sitePortal.loadError'))
      } finally {
        setLoading(false)
      }
    }

    void loadSiteData()
  }, [slug, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/sites/${slug}`, {
        method: 'PUT',
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
          is_active: formData.status === 'active',
        })
      })

      if (!response.ok) {
        throw new Error(t('sitePortal.updateError'))
      }

      // Redirect to the site's detail page
      router.push(`/admin/sites/${formData.slug}`)
    } catch (err) {
      console.error('Error updating site:', err)
      setError(err instanceof Error ? err.message : t('sitePortal.updateError'))
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('sitePortal.deleteConfirm'))) {
      return
    }

    try {
      setSaving(true)
      
      // TODO: Replace with actual API call
      const response = await fetch(`/api/sites/${slug}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(t('sitePortal.deleteError'))
      }

      // Redirect to sites list
      router.push('/admin/sites')
    } catch (err) {
      console.error('Error deleting site:', err)
      setError(err instanceof Error ? err.message : t('sitePortal.deleteError'))
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Container>
        <div className="flex justify-center items-center py-24">
          <div className="text-center">
            <div className="relative h-12 w-12 mx-auto mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">{t('admin.loadingSite')}</p>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/admin/sites/${slug}`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t('sitePortal.backToDetails')}
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('sitePortal.editSite')}</h1>
          <p className="text-gray-600 mt-2">
            {t('sitePortal.updateFor', { name: formData.name })}
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
              {/* Map Preview */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  {t('sitePortal.mapPreview')}
                </h2>
                {mapEmbedUrl ? (
                  <div className="rounded-lg overflow-hidden border border-gray-200">
                    <iframe
                      title={t('sitePortal.mapTitle')}
                      src={mapEmbedUrl}
                      className="w-full h-64"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
                    {t('sitePortal.mapEmpty')}
                  </div>
                )}
              </div>

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
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
              <Button
                type="button"
                variant="ghost"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={handleDelete}
                disabled={saving}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {t('sitePortal.deleteSite')}
              </Button>
              
              <div className="flex gap-3">
                <Link href={`/admin/sites/${slug}`}>
                  <Button
                    type="button"
                    variant="secondary"
                    icon={<X className="h-4 w-4" />}
                    disabled={saving}
                  >
                    {t('accessPoints.cancel')}
                  </Button>
                </Link>
                
                <Button
                  type="submit"
                  variant="primary"
                  icon={<Save className="h-4 w-4" />}
                  disabled={saving}
                >
                  {saving ? t('supplierPortal.saving') : t('admin.saveChanges')}
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </div>
    </Container>
  )
}
