// app/admin/downloads/page.tsx - Enhanced with Design System
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { 
  Download, FileText, Printer, Calendar, Clock,
  CheckCircle, AlertCircle,
  Eye, Trash2, Share2, Copy, Archive, Zap,
  Building, Package, Users, BarChart3, ChefHat, Shield,
  Settings, MapPin  // Added Settings and MapPin icons
} from 'lucide-react'

// Import design system components
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { generateAllergenTablePDF } from '@/lib/pdf/allergenTablePDF'
import { generateIngredientsReportPDF } from '@/lib/pdf/ingredientsReportPDF'
import { generateMenuItemsReportPDF } from '@/lib/pdf/menuItemsReportPDF'
import { generateSuppliersReportPDF } from '@/lib/pdf/suppliersReportPDF'
import { generateComplianceReportPDF } from '@/lib/pdf/complianceReportPDF'
import { generateSiteOverviewReportPDF } from '@/lib/pdf/siteOverviewReportPDF'

export default function DownloadsPage() {
  const { t } = useTranslation()
  
  const [loading, setLoading] = useState(true)
  const [guideLoading, setGuideLoading] = useState(false)
  const [siteGuideLoading, setSiteGuideLoading] = useState(false)
  const [guideError, setGuideError] = useState<string | null>(null)
  const [business, setBusiness] = useState<any | null>(null)
  const [sites, setSites] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [ingredients, setIngredients] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [siteGuideOpen, setSiteGuideOpen] = useState(false)
  const [selectedSiteId, setSelectedSiteId] = useState('')

  // Loading states for different reports
  const [ingredientsReportLoading, setIngredientsReportLoading] = useState(false)
  const [menuItemsReportLoading, setMenuItemsReportLoading] = useState(false)
  const [suppliersReportLoading, setSuppliersReportLoading] = useState(false)
  const [complianceReportLoading, setComplianceReportLoading] = useState(false)
  const [siteOverviewReportLoading, setSiteOverviewReportLoading] = useState(false)

  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!dataLoaded) {
        setLoading(false)
      }
    }, 800)
    return () => clearTimeout(timer)
  }, [dataLoaded])

  useEffect(() => {
    const loadGuideData = async () => {
      try {
        const businessResponse = await fetch('/api/business/data')
        if (!businessResponse.ok) {
          setDataLoaded(true)
          setLoading(false)
          return
        }
        
        const businessData = await businessResponse.json()
        
        setBusiness(businessData.business || null)
        setSites(businessData.sites || [])
        setMenuItems(businessData.menuItems || [])
        setIngredients(businessData.ingredients || [])
        setSuppliers(businessData.suppliers || [])
        
        setDataLoaded(true)
        setLoading(false)
      } catch (err) {
        setDataLoaded(true)
        setLoading(false)
      }
    }

    loadGuideData()
  }, [])

  const handleGenerateBusinessGuide = async () => {
    if (!dataLoaded) {
      setGuideError('Loading business data, please wait...')
      return
    }

    if (!business) {
      setGuideError('No business found. Please contact support if this persists.')
      return
    }

    if (menuItems.length === 0 && ingredients.length === 0) {
      setGuideError('No active menu items or ingredients found for this business.')
      return
    }

    try {
      setGuideLoading(true)
      setGuideError(null)

      const response = await fetch('/api/pdf/track-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          downloadType: 'business_allergen_guide',
          siteId: null
        })
      })

      const result = await response.json()

      if (!response.ok || !result.allowed) {
        throw new Error(result.error || 'PDF download limit reached.')
      }

      // Combine menu items and ingredients with type indicators
      const combinedItems = [
        ...menuItems.map(item => ({ ...item, itemType: 'menu_item' })),
        ...ingredients.map(item => ({ ...item, itemType: 'ingredient' }))
      ]

      console.log('📄 Generating PDF with', combinedItems.length, 'items:', combinedItems.map(item => `${item.name} (${item.itemType})`))

      try {
        await generateAllergenTablePDF({
          business,
          items: combinedItems,
          title: 'Complete Allergen Guide',
          showLegend: true
        })
      } catch (pdfError: any) {
        console.error('PDF generation error:', pdfError)
        throw new Error(`PDF generation failed: ${pdfError.message}`)
      }
    } catch (err: any) {
      setGuideError(err?.message || 'Failed to generate allergen guide.')
    } finally {
      setGuideLoading(false)
    }
  }

  const handleGenerateSiteGuide = async () => {
    if (!dataLoaded) {
      setGuideError('Loading business data, please wait...')
      return
    }

    if (!business) {
      setGuideError('No business found. Please contact support if this persists.')
      return
    }

    if (!selectedSiteId) {
      setGuideError('Select a site to generate a site guide.')
      return
    }

    const site = sites.find((item) => item.id === selectedSiteId)
    const siteItems = menuItems.filter(
      (item) => item.site_id === selectedSiteId || item.site_id === null
    )

    if (siteItems.length === 0 && ingredients.length === 0) {
      setGuideError('No active menu items or ingredients found for this site.')
      return
    }

    try {
      setSiteGuideLoading(true)
      setGuideError(null)

      const response = await fetch('/api/pdf/track-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          downloadType: 'site_allergen_guide',
          siteId: selectedSiteId
        })
      })

      const result = await response.json()

      if (!response.ok || !result.allowed) {
        throw new Error(result.error || 'PDF download limit reached.')
      }

      // Combine site menu items and all ingredients with type indicators
      const combinedItems = [
        ...siteItems.map(item => ({ ...item, itemType: 'menu_item' })),
        ...ingredients.map(item => ({ ...item, itemType: 'ingredient' }))
      ]

      await generateAllergenTablePDF({
        business,
        items: combinedItems,
        title: `${site?.name || 'Site'} Complete Allergen Guide`,
        showLegend: true
      })

      setSiteGuideOpen(false)
    } catch (err: any) {
      setGuideError(err?.message || 'Failed to generate site allergen guide.')
    } finally {
      setSiteGuideLoading(false)
    }
  }

  const handleGenerateIngredientsReport = async () => {
    if (!dataLoaded) {
      setGuideError('Loading business data, please wait...')
      return
    }

    if (!business) {
      setGuideError('No business found. Please contact support if this persists.')
      return
    }

    if (ingredients.length === 0) {
      setGuideError('No ingredients found for this business.')
      return
    }

    try {
      setIngredientsReportLoading(true)
      setGuideError(null)

      const response = await fetch('/api/pdf/track-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          downloadType: 'ingredients_report',
          siteId: null
        })
      })

      const result = await response.json()

      if (!response.ok || !result.allowed) {
        throw new Error(result.error || 'PDF download limit reached.')
      }

      // Generate ingredients report PDF
      await generateIngredientsReportPDF({
        business,
        ingredients
      })

    } catch (err: any) {
      setGuideError(err?.message || 'Failed to generate ingredients report.')
    } finally {
      setIngredientsReportLoading(false)
    }
  }

  const handleGenerateMenuItemsReport = async () => {
    if (!dataLoaded) {
      setGuideError('Loading business data, please wait...')
      return
    }

    if (!business) {
      setGuideError('No business found. Please contact support if this persists.')
      return
    }

    if (menuItems.length === 0) {
      setGuideError('No menu items found for this business.')
      return
    }

    try {
      setMenuItemsReportLoading(true)
      setGuideError(null)

      const response = await fetch('/api/pdf/track-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          downloadType: 'menu_items_report',
          siteId: null
        })
      })

      const result = await response.json()

      if (!response.ok || !result.allowed) {
        throw new Error(result.error || 'PDF download limit reached.')
      }

      // Generate menu items report PDF
      await generateMenuItemsReportPDF({
        business,
        menuItems
      })

    } catch (err: any) {
      setGuideError(err?.message || 'Failed to generate menu items report.')
    } finally {
      setMenuItemsReportLoading(false)
    }
  }

  const handleGenerateSuppliersReport = async () => {
    if (!dataLoaded) {
      setGuideError('Loading business data, please wait...')
      return
    }

    if (!business) {
      setGuideError('No business found. Please contact support if this persists.')
      return
    }

    if (suppliers.length === 0) {
      setGuideError('No suppliers found for this business.')
      return
    }

    try {
      setSuppliersReportLoading(true)
      setGuideError(null)

      const response = await fetch('/api/pdf/track-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          downloadType: 'suppliers_report',
          siteId: null
        })
      })

      const result = await response.json()

      if (!response.ok || !result.allowed) {
        throw new Error(result.error || 'PDF download limit reached.')
      }

      // Generate suppliers report PDF
      await generateSuppliersReportPDF({
        business,
        suppliers
      })

    } catch (err: any) {
      setGuideError(err?.message || 'Failed to generate suppliers report.')
    } finally {
      setSuppliersReportLoading(false)
    }
  }

  const handleGenerateComplianceReport = async () => {
    if (!dataLoaded) {
      setGuideError('Loading business data, please wait...')
      return
    }

    if (!business) {
      setGuideError('No business found. Please contact support if this persists.')
      return
    }

    if (ingredients.length === 0) {
      setGuideError('No ingredients found for compliance check.')
      return
    }

    try {
      setComplianceReportLoading(true)
      setGuideError(null)

      const response = await fetch('/api/pdf/track-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          downloadType: 'compliance_report',
          siteId: null
        })
      })

      const result = await response.json()

      if (!response.ok || !result.allowed) {
        throw new Error(result.error || 'PDF download limit reached.')
      }

      // Generate compliance report PDF
      await generateComplianceReportPDF({
        business,
        ingredients
      })

    } catch (err: any) {
      setGuideError(err?.message || 'Failed to generate compliance report.')
    } finally {
      setComplianceReportLoading(false)
    }
  }

  const handleGenerateSiteOverviewReport = async () => {
    if (!dataLoaded) {
      setGuideError('Loading business data, please wait...')
      return
    }

    if (!business) {
      setGuideError('No business found. Please contact support if this persists.')
      return
    }

    try {
      setSiteOverviewReportLoading(true)
      setGuideError(null)

      const response = await fetch('/api/pdf/track-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          downloadType: 'site_overview_report',
          siteId: null
        })
      })

      const result = await response.json()

      if (!response.ok || !result.allowed) {
        throw new Error(result.error || 'PDF download limit reached.')
      }

      // Generate site overview report PDF
      await generateSiteOverviewReportPDF({
        business,
        sites,
        menuItems,
        ingredients
      })

    } catch (err: any) {
      setGuideError(err?.message || 'Failed to generate site overview report.')
    } finally {
      setSiteOverviewReportLoading(false)
    }
  }

  const downloads: any[] = []

  const stats = {
    sites: sites.length,
    menuItems: menuItems.length,
    ingredients: ingredients.length,
    suppliers: suppliers.length
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative h-12 w-12 mx-auto mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">{t('admin.loadingDownloads')}</p>
        </div>
      </div>
    )
  }

  return (
    <Container>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-teal-400 to-teal-600 dark:from-teal-500 dark:to-gray-700 rounded-lg">
                <Download className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('admin.downloadsReports')}</h1>
                <p className="text-gray-600 dark:text-gray-300">
                  {t('admin.downloadsReportsDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-all hover:border-[#42b8ac] hover:bg-gradient-to-br hover:from-[#42b8ac] hover:to-[#36948a] group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-white transition-colors">Business Sites</p>
              <p className="text-2xl font-bold text-[#003842] dark:text-white mt-1 group-hover:text-white transition-colors">{stats.sites}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-[#42b8ac] to-[#36948a] rounded-lg group-hover:shadow-lg group-hover:ring-2 group-hover:ring-[#42b8ac] transition-all">
              <Building className="h-6 w-6 text-white transition-colors" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors">Locations configured</div>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-all hover:border-emerald-500 hover:bg-gradient-to-br hover:from-emerald-500 hover:to-emerald-600 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-white transition-colors">Menu Items</p>
              <p className="text-2xl font-bold text-[#003842] dark:text-white mt-1 group-hover:text-white transition-colors">{stats.menuItems}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg group-hover:shadow-lg group-hover:ring-2 group-hover:ring-emerald-600 transition-all">
              <ChefHat className="h-6 w-6 text-white transition-colors" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors">Active menu items</div>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-all hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-500 hover:to-blue-600 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-white transition-colors">Ingredients</p>
              <p className="text-2xl font-bold text-[#003842] dark:text-white mt-1 group-hover:text-white transition-colors">{stats.ingredients}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg group-hover:shadow-lg group-hover:ring-2 group-hover:ring-blue-600 transition-all">
              <Package className="h-6 w-6 text-white transition-colors" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors">Ingredients tracked</div>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-all hover:border-purple-500 hover:bg-gradient-to-br hover:from-purple-500 hover:to-purple-600 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-white transition-colors">Suppliers</p>
              <p className="text-2xl font-bold text-[#003842] dark:text-white mt-1 group-hover:text-white transition-colors">{stats.suppliers}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg group-hover:shadow-lg group-hover:ring-2 group-hover:ring-purple-600 transition-all">
              <Users className="h-6 w-6 text-white transition-colors" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors">Active suppliers</div>
          </div>
        </Card>
      </div>

      {/* Report Generation Section */}
      {guideError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700">{guideError}</p>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* Allergen Guides */}
        <Card>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('admin.allergenInformation')}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">{t('admin.allergenGuidesDesc')}</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Building className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  {t('admin.businessWideGuide')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Complete allergen guide for all menu items and ingredients across your entire business</p>
                <Button
                  variant="primary"
                  icon={<FileText className="h-4 w-4" />}
                  size="lg"
                  fullWidth
                  onClick={handleGenerateBusinessGuide}
                  disabled={guideLoading}
                  className="justify-start"
                >
                  {guideLoading ? t('admin.generating') : t('admin.generateCompleteGuide')}
                </Button>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  {t('admin.siteSpecificGuide')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Customised allergen guide for a specific location, including global items plus site-specific menu items</p>
                <div className="flex gap-2">
                  <select
                    value={selectedSiteId}
                    onChange={(event) => setSelectedSiteId(event.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">{t('admin.selectSite')}</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="primary"
                    icon={<FileText className="h-4 w-4" />}
                    size="lg"
                    onClick={handleGenerateSiteGuide}
                    disabled={siteGuideLoading || !selectedSiteId}
                  >
                    {siteGuideLoading ? 'Generating...' : 'Generate'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Business Reports */}
        <Card>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Business Reports</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">Detailed reports for inventory management and compliance</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex flex-col justify-between space-y-3 min-h-[140px]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-500" />
                    <h3 className="font-medium text-gray-900 dark:text-white">Ingredients Inventory</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Complete list of all ingredients with allergen information and supplier details</p>
                </div>
                <Button
                  variant="secondary"
                  icon={<Package className="h-4 w-4" />}
                  size="md"
                  fullWidth
                  onClick={handleGenerateIngredientsReport}
                  disabled={ingredientsReportLoading}
                >
                  {ingredientsReportLoading ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>

              <div className="flex flex-col justify-between space-y-3 min-h-[140px]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-orange-500" />
                    <h3 className="font-medium text-gray-900 dark:text-white">Menu Items Catalog</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Comprehensive catalog of all menu items with ingredients and allergen details</p>
                </div>
                <Button
                  variant="secondary"
                  icon={<ChefHat className="h-4 w-4" />}
                  size="md"
                  fullWidth
                  onClick={handleGenerateMenuItemsReport}
                  disabled={menuItemsReportLoading}
                >
                  {menuItemsReportLoading ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>

              <div className="flex flex-col justify-between space-y-3 min-h-[140px]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-500" />
                    <h3 className="font-medium text-gray-900 dark:text-white">Suppliers Directory</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Contact information and details for all ingredient suppliers</p>
                </div>
                <Button
                  variant="secondary"
                  icon={<Users className="h-4 w-4" />}
                  size="md"
                  fullWidth
                  onClick={handleGenerateSuppliersReport}
                  disabled={suppliersReportLoading}
                >
                  {suppliersReportLoading ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Compliance & Analytics */}
        <Card>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Compliance & Analytics</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">Regulatory compliance reports and business insights</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col justify-between space-y-3 min-h-[120px]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-500" />
                    <h3 className="font-medium text-gray-900 dark:text-white">Compliance Report</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Regulatory compliance check for all ingredients and allergen declarations</p>
                </div>
                <Button
                  variant="secondary"
                  icon={<Shield className="h-4 w-4" />}
                  size="md"
                  fullWidth
                  onClick={handleGenerateComplianceReport}
                  disabled={complianceReportLoading}
                >
                  {complianceReportLoading ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>

              <div className="flex flex-col justify-between space-y-3 min-h-[120px]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-indigo-500" />
                    <h3 className="font-medium text-gray-900 dark:text-white">Site Overview</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Business overview with site locations, menu items, and ingredient counts</p>
                </div>
                <Button
                  variant="secondary"
                  icon={<Building className="h-4 w-4" />}
                  size="md"
                  fullWidth
                  onClick={handleGenerateSiteOverviewReport}
                  disabled={siteOverviewReportLoading}
                >
                  {siteOverviewReportLoading ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-teal-500" />
                    Kiosk Usage Analytics
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Real-time usage statistics and customer interaction data</p>
                </div>
                <Link href="/admin/analytics" className="flex-shrink-0">
                  <Button
                    variant="outline"
                    icon={<BarChart3 className="h-4 w-4" />}
                    size="md"
                  >
                    View Analytics
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>

    </Container>
  )
  console.log('🎯 DownloadsPage component render complete')
}
