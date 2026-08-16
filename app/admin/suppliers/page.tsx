// app/admin/suppliers/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/hooks/useTranslation'
import {
  Truck, Phone, Mail, Globe,
  Plus, Search, Eye, Edit,
  FileText, ShoppingBag
} from 'lucide-react'

// Import design system components
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface Supplier {
  id: string
  name: string
  contact: string
  phone: string
  email: string
  website: string
  ingredientCount: number
}

export default function SuppliersPage() {
  const { t } = useTranslation()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true)
        const suppliersResponse = await fetch('/api/suppliers')
        const data = await suppliersResponse.json()

        if (!suppliersResponse.ok) {
          throw new Error(data.error || 'Failed to fetch suppliers')
        }

        const mappedSuppliers = (data.suppliers || []).map((supplier: any) => ({
          id: supplier.id,
          name: supplier.name,
          contact: supplier.contact || 'Not set',
          phone: supplier.phone || 'Not set',
          email: supplier.email || 'Not set',
          website: supplier.website || 'Not set',
          ingredientCount: supplier.ingredient_count || 0
        }))

        setSuppliers(mappedSuppliers)
      } catch (error: any) {
        console.error('Error fetching suppliers:', error)
        setSuppliers([])
      } finally {
        setLoading(false)
      }
    }

    fetchSuppliers()
  }, [])

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.contact.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const stats = {
    total: suppliers.length
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative h-12 w-12 mx-auto mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <p className="text-gray-600">{t('admin.loadingSupplierData')}</p>
        </div>
      </div>
    )
  }

  return (
    <Container>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-teal-400 to-teal-600 dark:from-teal-500 dark:to-gray-700 rounded-lg">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#003842] dark:text-white">{t('admin.supplierManagement')}</h1>
                <p className="text-gray-600 dark:text-gray-300">
                  {t('admin.supplierManagementDesc')}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary" icon={ShoppingBag}>
              {stats.total} suppliers
            </Badge>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-[#42b8ac] to-[#36948a] rounded-lg">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.totalSuppliers')}</p>
            <p className="text-2xl font-bold text-[#003842] dark:text-white">{stats.total}</p>
          </div>
        </div>
        <Link href="/admin/suppliers/new">
          <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
            {t('admin.addSupplier')}
          </Button>
        </Link>
      </div>

      <Card className="mb-8">
        <div className="p-4 md:p-6">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('admin.searchSuppliers')}</label>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('admin.searchSuppliersPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>
        </div>
      </Card>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {filteredSuppliers.map((supplier) => (
          <Card key={supplier.id} className="hover:shadow-lg transition-shadow group flex flex-col">
            <div className="p-6 flex flex-col flex-1">
              {/* Supplier Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg">
                    <Truck className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-[#003842] transition-colors">
                      {supplier.name}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Supplier Details */}
              <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <ShoppingBag className="h-4 w-4 mr-2 text-gray-400" />
                  {supplier.contact}
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  {supplier.phone}
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  {supplier.email}
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Globe className="h-4 w-4 mr-2 text-gray-400" />
                  {supplier.website}
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-1 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-lg font-semibold text-[#003842] dark:text-white">{supplier.ingredientCount}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t('admin.ingredients')}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Link href={`/admin/suppliers/${supplier.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Eye className="h-4 w-4" />}
                    >
                      {t('admin.view')}
                    </Button>
                  </Link>
                  <Link href={`/admin/suppliers/${supplier.id}/edit`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Edit className="h-4 w-4" />}
                    >
                      {t('admin.edit')}
                    </Button>
                  </Link>
                  <Link href={`/admin/suppliers/${supplier.id}/docs`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<FileText className="h-4 w-4" />}
                    >
                      {t('admin.docs')}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredSuppliers.length === 0 && (
        <Card className="text-center py-12">
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Truck className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('admin.noSuppliersFound')}</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchTerm
              ? 'Try adjusting your search or filters'
              : t('admin.getStartedFirstSupplier')}
          </p>
          <Link href="/admin/suppliers/new">
            <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
              {t('admin.addFirstSupplier')}
            </Button>
          </Link>
        </Card>
      )}


    </Container>
  )
}
