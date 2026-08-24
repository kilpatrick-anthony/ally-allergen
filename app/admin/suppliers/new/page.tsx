// app/admin/suppliers/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Truck } from 'lucide-react'

import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'

export default function NewSupplierPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    website: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(t('supplierPortal.createError'))
      const newId = data.supplier?.id || data.id || data.suppliers?.[0]?.id
      router.push(`/admin/suppliers/${newId}`)
    } catch (err: any) {
      setError(err.message || t('supplierPortal.createError'))
      setLoading(false)
    }
  }

  return (
    <Container>
      <div className="mb-6">
        <Link href="/admin/suppliers">
          <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />}>
            {t('supplierPortal.backToSuppliers')}
          </Button>
        </Link>
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#003842] dark:text-white">{t('supplierPortal.addNewSupplier')}</h1>
            <p className="text-gray-600 dark:text-gray-300">{t('supplierPortal.createDescription')}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="supplier-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('supplierPortal.supplierName')} *</label>
            <input
              id="supplier-name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="supplier-contact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('supplierPortal.contactName')}</label>
            <input
              id="supplier-contact"
              type="text"
              value={formData.contact}
              onChange={(e) => setFormData(p => ({ ...p, contact: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="supplier-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.email')}</label>
              <input
                id="supplier-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="supplier-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('supplierPortal.phone')}</label>
              <input
                id="supplier-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label htmlFor="supplier-website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('messaging.website')}</label>
            <input
              id="supplier-website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData(p => ({ ...p, website: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
              placeholder="https://"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" icon={<Plus className="h-4 w-4" />} disabled={loading}>
              {loading ? t('supplierPortal.creating') : t('supplierPortal.createSupplier')}
            </Button>
            <Link href="/admin/suppliers">
              <Button variant="ghost">{t('accessPoints.cancel')}</Button>
            </Link>
          </div>
        </form>
      </Card>
    </Container>
  )
}
