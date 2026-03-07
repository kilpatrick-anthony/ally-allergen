// app/admin/downloads/datasheets/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  FileText, Download, Calendar, Clock,  AlertCircle, 
  Filter, Search, RefreshCw, Eye, Package, ChefHat,
  CheckCircle, AlertTriangle, ArrowLeft, Truck, Tag
} from 'lucide-react'

// Import design system components
import { Container } from '../../../components/layout/Container'
import { Card } from '../../../components/layout/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import DatasheetViewer from '@/components/admin/DatasheetViewer'
import { createClient } from '@/lib/supabase/client'

interface DatasheetWithEntity {
  id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  entity_type: 'ingredient' | 'menu_item'
  entity_id: string
  entity_name: string
  supplier_name?: string
  version?: string
  uploaded_at: string
  last_reviewed_at?: string
  next_review_date?: string
  status: 'active' | 'archived' | 'expired'
  notes?: string
  review_status?: 'up_to_date' | 'due_soon' | 'overdue'
}

export default function DatasheetsPage() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEntityType, setSelectedEntityType] = useState<'all' | 'ingredient' | 'menu_item'>('all')
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<'all' | 'up_to_date' | 'due_soon' | 'overdue'>('all')
  const [selectedSupplier, setSelectedSupplier] = useState('all')
  const [datasheets, setDatasheets] = useState<DatasheetWithEntity[]>([])
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const loadDatasheets = async () => {
      try {
        console.log('📄 Datasheets page loading')
        setLoading(true)
        setLoadError(null)

        const supabase = createClient()
        const { data: auth, error: authError } = await supabase.auth.getUser()

        if (authError || !auth?.user) {
          throw new Error('Please sign in to view datasheets.')
        }

        const { data: sheets, error: sheetsError } = await supabase
          .from('datasheets')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (sheetsError) {
          throw new Error(sheetsError.message || 'Failed to load datasheets')
        }

        const rawDatasheets = Array.isArray(sheets) ? sheets : []

        // Use new schema: ingredient_id and menu_item_id
        const ingredientIds = rawDatasheets
          .map((sheet: any) => sheet.ingredient_id)
          .filter((id: string | null | undefined) => !!id) as string[]

        const menuItemIds = rawDatasheets
          .map((sheet: any) => sheet.menu_item_id)
          .filter((id: string | null | undefined) => !!id) as string[]

        const ingredientMap = new Map<string, string>()
        const menuItemMap = new Map<string, string>()

        if (ingredientIds.length > 0) {
          const { data: ingredientsData } = await supabase
            .from('ingredients')
            .select('id, name')
            .in('id', ingredientIds)

          ;(ingredientsData || []).forEach((ingredient: { id: string; name: string }) => {
            ingredientMap.set(ingredient.id, ingredient.name)
          })
        }

        if (menuItemIds.length > 0) {
          const { data: menuItemsData } = await supabase
            .from('menu_items')
            .select('id, name')
            .in('id', menuItemIds)

          ;(menuItemsData || []).forEach((menuItem: { id: string; name: string }) => {
            menuItemMap.set(menuItem.id, menuItem.name)
          })
        }

        const computeReviewStatus = (nextReviewDate?: string | null) => {
          if (!nextReviewDate) return 'up_to_date' as const
          const today = new Date()
          const reviewDate = new Date(nextReviewDate)
          const diffDays = Math.floor((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

          if (diffDays < 0) return 'overdue' as const
          if (diffDays <= 7) return 'due_soon' as const
          return 'up_to_date' as const
        }

        const mapped = rawDatasheets.map((sheet: any) => {
          let entityType: 'ingredient' | 'menu_item' = 'ingredient';
          let entityId: string = '';
          let entityName: string = '';
          if (sheet.ingredient_id) {
            entityType = 'ingredient';
            entityId = String(sheet.ingredient_id);
            entityName = ingredientMap.get(entityId) || 'Ingredient';
          } else if (sheet.menu_item_id) {
            entityType = 'menu_item';
            entityId = String(sheet.menu_item_id);
            entityName = menuItemMap.get(entityId) || 'Menu Item';
          } else {
            entityType = 'ingredient';
            entityId = '';
            entityName = 'Unknown';
          }

          return {
            id: sheet.id,
            file_name: sheet.file_name,
            file_path: sheet.file_path,
            file_size: sheet.file_size || 0,
            file_type: sheet.file_type || 'application/pdf',
            entity_type: entityType,
            entity_id: entityId,
            entity_name: entityName,
            supplier_name: sheet.supplier_name || undefined,
            version: sheet.version || undefined,
            uploaded_at: sheet.uploaded_at || sheet.created_at,
            last_reviewed_at: sheet.last_reviewed_at || undefined,
            next_review_date: sheet.next_review_date || undefined,
            status: sheet.status || 'active',
            notes: sheet.notes || undefined,
            review_status: computeReviewStatus(sheet.next_review_date)
          } as DatasheetWithEntity
        })

        console.log('✅ Datasheets loaded, mapped:', mapped)
        setDatasheets(mapped)
        if (mapped.length === 0) {
          setLoadError('No datasheets found. Please upload a datasheet or check your filters.')
        }
        console.log('✅ Datasheets loaded')
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          console.error('Datasheets request timed out')
          setLoadError('Loading datasheets timed out. Please try again.')
        } else {
          console.error('Error loading datasheets:', err)
          setLoadError(err?.message || 'Failed to load datasheets.')
        }
        setDatasheets([])
      } finally {
        setLoading(false)
      }
    }

    loadDatasheets()
  }, [])

  // Get unique suppliers
  const suppliers = Array.from(new Set(
    datasheets
      .map(d => d.supplier_name)
      .filter(Boolean)
  )) as string[]

  // Filter datasheets
  const filteredDatasheets = datasheets.filter(datasheet => {
    const matchesSearch = datasheet.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         datasheet.entity_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesEntityType = selectedEntityType === 'all' || datasheet.entity_type === selectedEntityType
    const matchesReviewStatus = selectedReviewStatus === 'all' || datasheet.review_status === selectedReviewStatus
    const matchesSupplier = selectedSupplier === 'all' || datasheet.supplier_name === selectedSupplier
    
    return matchesSearch && matchesEntityType && matchesReviewStatus && matchesSupplier
  })

  // Stats
  const stats = {
    total: datasheets.length,
    ingredients: datasheets.filter(d => d.entity_type === 'ingredient').length,
    menuItems: datasheets.filter(d => d.entity_type === 'menu_item').length,
    overdue: datasheets.filter(d => d.review_status === 'overdue').length,
    dueSoon: datasheets.filter(d => d.review_status === 'due_soon').length,
    upToDate: datasheets.filter(d => d.review_status === 'up_to_date').length
  }

  const handleDownload = (datasheet: DatasheetWithEntity) => {
    console.log('Download datasheet:', datasheet.file_name)
    // In production, download from storage
  }

  const handlePreview = (datasheet: DatasheetWithEntity) => {
    console.log('Preview datasheet:', datasheet.file_name)
    // In production, open preview modal or new tab
  }

  const handleMarkReviewed = (datasheet: DatasheetWithEntity) => {
    console.log('Mark reviewed:', datasheet.file_name)
    // In production, update database
    setDatasheets(datasheets.map(d => 
      d.id === datasheet.id 
        ? { ...d, last_reviewed_at: new Date().toISOString(), review_status: 'up_to_date' as const }
        : d
    ))
  }

  if (loading && !loadError) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#42b8ac] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading datasheets...</p>
        </div>
      </div>
    )
  }

  return (
    <Container>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/admin/downloads">
            <Button variant="ghost" size="sm" icon={ArrowLeft}>
              Back to Downloads
            </Button>
          </Link>
        </div>
        
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-[#42b8ac] to-[#003842] rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#003842]">Product Datasheets</h1>
                <p className="text-gray-600">
                  View and manage all product specification sheets and compliance documents
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="primary" icon={FileText}>
              {stats.total} datasheets
            </Badge>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-[#003842] mt-1">{stats.total}</p>
            </div>
            <FileText className="h-8 w-8 text-[#42b8ac]" />
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ingredients</p>
              <p className="text-2xl font-bold text-[#003842] mt-1">{stats.ingredients}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Menu Items</p>
              <p className="text-2xl font-bold text-[#003842] mt-1">{stats.menuItems}</p>
            </div>
            <ChefHat className="h-8 w-8 text-purple-500" />
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700">Due Soon</p>
              <p className="text-2xl font-bold text-amber-800 mt-1">{stats.dueSoon}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-red-200 bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700">Overdue</p>
              <p className="text-2xl font-bold text-red-800 mt-1">{stats.overdue}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 md:flex-initial md:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search datasheets or items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
              />
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              icon={Filter}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
          </div>

          <Button variant="secondary" size="md" icon={RefreshCw}>
            Refresh
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entity Type
                </label>
                <select
                  value={selectedEntityType}
                  onChange={(e) => setSelectedEntityType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="ingredient">Ingredients</option>
                  <option value="menu_item">Menu Items</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Status
                </label>
                <select
                  value={selectedReviewStatus}
                  onChange={(e) => setSelectedReviewStatus(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="up_to_date">Up to Date</option>
                  <option value="due_soon">Due Soon</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier
                </label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                >
                  <option value="all">All Suppliers</option>
                  {suppliers.map(supplier => (
                    <option key={supplier} value={supplier}>{supplier}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Results */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Showing {filteredDatasheets.length} of {stats.total} datasheets
        </p>
      </div>

      {filteredDatasheets.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No datasheets found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search or filters
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDatasheets.map((datasheet) => (
            <Card key={datasheet.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="text-3xl mt-1">
                    {datasheet.file_type.includes('pdf') ? '📄' : 
                     datasheet.file_type.includes('sheet') ? '📊' : '📎'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {datasheet.file_name}
                      </h3>
                      {datasheet.review_status === 'overdue' && (
                        <Badge variant="error">Overdue</Badge>
                      )}
                      {datasheet.review_status === 'due_soon' && (
                        <Badge variant="warning">Due Soon</Badge>
                      )}
                      {datasheet.review_status === 'up_to_date' && (
                        <Badge variant="success">Up to Date</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-500">Associated With</p>
                        <div className="flex items-center space-x-2 mt-1">
                          {datasheet.entity_type === 'ingredient' ? (
                            <Package className="h-4 w-4 text-blue-500" />
                          ) : (
                            <ChefHat className="h-4 w-4 text-purple-500" />
                          )}
                          <p className="text-sm font-medium text-gray-900">
                            {datasheet.entity_name}
                          </p>
                        </div>
                      </div>

                      {datasheet.supplier_name && (
                        <div>
                          <p className="text-xs text-gray-500">Supplier</p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {datasheet.supplier_name}
                          </p>
                        </div>
                      )}

                      {datasheet.version && (
                        <div>
                          <p className="text-xs text-gray-500">Version</p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {datasheet.version}
                          </p>
                        </div>
                      )}

                      {datasheet.next_review_date && (
                        <div>
                          <p className="text-xs text-gray-500">Next Review</p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {new Date(datasheet.next_review_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Eye}
                    onClick={() => handlePreview(datasheet)}
                  >
                    Preview
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Download}
                    onClick={() => handleDownload(datasheet)}
                  >
                    Download
                  </Button>
                  {datasheet.review_status !== 'up_to_date' && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={CheckCircle}
                      onClick={() => handleMarkReviewed(datasheet)}
                    >
                      Mark Reviewed
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Container>
  )
}
