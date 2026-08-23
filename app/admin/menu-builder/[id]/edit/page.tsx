// app/admin/menu-builder/[id]/edit/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useNotification } from '@/lib/hooks/useNotification'
import { useTranslation } from '@/lib/hooks/useTranslation'
import {
  ArrowLeft, Save, X, Plus, ScanLine, Trash2,
  Leaf, Apple, WheatOff, Moon, Star, Sprout, Globe, Droplets, ShieldCheck, FileText, CheckCircle
} from 'lucide-react'

import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import AllergenWarningSelector from '@/components/admin/AllergenWarningSelector'
import AllergenWarningDisplay from '@/components/kiosk/AllergenWarningDisplay'
import DatasheetUploader from '@/components/admin/DatasheetUploader'
import { ReviewFrequencySelector } from '@/components/admin/ReviewFrequencySelector'
import { LabelScanModal } from '@/components/admin/LabelScanModal'
import type { AllergenWarnings } from '@/types/allergen'
import { computeWorstCaseAllergens } from '@/types/allergen'
import { useContentPermissions } from '@/lib/hooks/useContentPermissions'

interface MenuItem {
  id: string
  name: string
  description: string
  category: string
  site_id: string | null
  allergen_warnings: AllergenWarnings
  dietary: string[]
  ingredients: string[]
  status: 'active' | 'draft' | 'archived'
  preferred_review_months?: number
  color?: string
  icon?: string
}

interface Ingredient {
  id: string
  name: string
  allergen_warnings: AllergenWarnings
  suppliers: string[]
  certifications: string[]
}

interface SiteOption {
  id: string
  name: string
}

const PRESET_MENU_ICONS = [
  { icon: '🍕', name: 'Pizza' },
  { icon: '🍔', name: 'Burger' },
  { icon: '🥗', name: 'Salad' },
  { icon: '🍜', name: 'Noodles' },
  { icon: '🥩', name: 'Meat' },
  { icon: '🐟', name: 'Fish' },
  { icon: '🥘', name: 'Curry' },
  { icon: '🍰', name: 'Dessert' },
  { icon: '☕', name: 'Coffee' },
  { icon: '🥤', name: 'Drink' },
  { icon: '🧁', name: 'Cupcake' },
  { icon: '🍪', name: 'Cookie' },
  { icon: '🌮', name: 'Taco' },
  { icon: '🥙', name: 'Wrap' },
  { icon: '🍝', name: 'Pasta' },
  { icon: '🥟', name: 'Dumpling' },
]

const isImageIcon = (icon?: string) => Boolean(icon && /^https?:\/\//.test(icon))

export default function EditMenuItemPage() {
  const { canDeleteContent } = useContentPermissions()
  const { t } = useTranslation()
  const { showNotification } = useNotification()
  const router = useRouter()
  const params = useParams()
  const itemId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [marking, setMarking] = useState(false)
  const [menuItem, setMenuItem] = useState<MenuItem | null>(null)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [sites, setSites] = useState<SiteOption[]>([])
  const [showIngredientSelector, setShowIngredientSelector] = useState(false)
  const [datasheets, setDatasheets] = useState<any[]>([])
  const [existingDatasheets, setExistingDatasheets] = useState<any[]>([])
  const [datasheetsTouched, setDatasheetsTouched] = useState(false)
  const [showScan, setShowScan] = useState(false)
  const [customDietaryInput, setCustomDietaryInput] = useState('')
  const [showCustomDietaryInput, setShowCustomDietaryInput] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [loadingIngredientDatasheets, setLoadingIngredientDatasheets] = useState(false)
  const [compliance, setCompliance] = useState<any>(null)
  const [loadingCompliance, setLoadingCompliance] = useState(false)
  const [uploadingIcon, setUploadingIcon] = useState(false)

  const dietaryOptions = [
    { name: 'Vegan', color: '#16a34a', icon: Leaf },
    { name: 'Vegetarian', color: '#84cc16', icon: Apple },
    { name: 'Gluten-Free', color: '#f59e0b', icon: WheatOff },
    { name: 'Halal', color: '#10b981', icon: Moon },
    { name: 'Kosher', color: '#3b82f6', icon: Star },
    { name: 'Organic', color: '#22c55e', icon: Sprout },
    { name: 'Fair Trade', color: '#8b5cf6', icon: Globe },
    { name: 'Lactose-Free', color: '#06b6d4', icon: Droplets },
    { name: 'Coeliac-Friendly', color: '#ec4899', icon: ShieldCheck }
  ]

  const DEFAULT_MENU_CATEGORIES = [
    'Breakfast', 'Desserts', 'Drinks', 'Lunch', 'Mains',
    'Sides', 'Snacks', 'Specials', 'Starters'
  ]
  const [categoryOptions, setCategoryOptions] = useState<string[]>(DEFAULT_MENU_CATEGORIES)

  useEffect(() => {
    fetch('/api/menu-items/categories')
      .then(r => r.ok ? r.json() : { categories: [] })
      .then(({ categories }: { categories: string[] }) => {
        const merged = [...new Set([...DEFAULT_MENU_CATEGORIES, ...(categories || [])])].sort()
        setCategoryOptions(merged)
      })
      .catch(() => {})
  }, [])

  const defaultWarnings: AllergenWarnings = {
    cereals_gluten: 'none',
    crustaceans: 'none',
    eggs: 'none',
    fish: 'none',
    peanuts: 'none',
    soybeans: 'none',
    milk: 'none',
    nuts: 'none',
    celery: 'none',
    mustard: 'none',
    sesame: 'none',
    sulphites: 'none',
    lupin: 'none',
    molluscs: 'none'
  }

  // Load menu item, ingredients and sites
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [itemResponse, ingredientResponse, sitesResponse] = await Promise.all([
          fetch(`/api/menu-items/${itemId}`),
          fetch('/api/ingredients'),
          fetch('/api/sites')
        ])

        const [itemData, ingredientData] = await Promise.all([
          itemResponse.json(),
          ingredientResponse.json(),
        ])

        if (!itemResponse.ok || !itemData.menuItem) {
          throw new Error('Menu item not found')
        }

        const mappedIngredients = ingredientResponse.ok
          ? (ingredientData.ingredients || []).map((ingredient: any) => ({
              id: ingredient.id,
              name: ingredient.name,
              allergen_warnings: ingredient.allergen_warnings || { ...defaultWarnings },
              suppliers: ingredient.suppliers || [],
              certifications: ingredient.certifications || []
            }))
          : []

        setIngredients(mappedIngredients)

        const item = itemData.menuItem
        const itemIngredientIds: string[] = Array.isArray(item.ingredients) ? item.ingredients : []
        const existingDietary: string[] = Array.isArray(item.dietary) ? item.dietary : []

        // Auto carry-over: strict intersection of certifications across all ingredients on load
        const ingredientCerts = itemIngredientIds.map(id => mappedIngredients.find((i: { id: string }) => i.id === id)?.certifications ?? [])
        const mergedCerts: string[] = ingredientCerts.length === 0
          ? []
          : ingredientCerts.reduce((acc: string[], certs: string[]) => acc.filter((c: string) => certs.includes(c)))
        const combinedDietary = Array.from(new Set([...existingDietary, ...mergedCerts]))

        setMenuItem({
          id: item.id,
          name: item.name,
          description: item.description || '',
          category: item.category || '',
          site_id: item.site_id ?? null,
          allergen_warnings: item.allergen_warnings || { ...defaultWarnings },
          dietary: combinedDietary,
          ingredients: itemIngredientIds,
          status: item.status || (item.is_active ? 'active' : 'draft'),
          preferred_review_months: item.preferred_review_months || 12,
          color: item.color || '',
          icon: item.icon || '',
        })

        const sitesData = await sitesResponse.json()
        if (sitesResponse.ok) {
          const mappedSites = (sitesData.sites || []).map((site: any) => ({
            id: site.id,
            name: site.name
          }))
          setSites(mappedSites)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [itemId])

  // Fetch existing datasheets for this menu item
  useEffect(() => {
    const fetchExistingDatasheets = async () => {
      try {
        const response = await fetch(`/api/datasheets?menu_item_id=${itemId}`)
        const data = await response.json()
        if (response.ok && data.datasheets) {
          setExistingDatasheets(data.datasheets)
          setDatasheets(data.datasheets)
          setDatasheetsTouched(false)
        }
      } catch (error) {
        console.error('Error fetching existing datasheets:', error)
      }
    }
    
    if (itemId) {
      fetchExistingDatasheets()
    }
  }, [itemId])

  // Load ingredient datasheets
  useEffect(() => {
    if (!menuItem || menuItem.ingredients.length === 0) {
      return
    }

    const fetchIngredientDatasheets = async () => {
      try {
        setLoadingIngredientDatasheets(true)
        const params = new URLSearchParams({
          ingredientIds: menuItem.ingredients.join(',')
        })
        const response = await fetch(`/api/datasheets?${params.toString()}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch datasheets')
        }
      } catch (error: any) {
        console.error('Error loading ingredient datasheets:', error)
      } finally {
        setLoadingIngredientDatasheets(false)
      }
    }

    fetchIngredientDatasheets()
  }, [menuItem?.ingredients])

  const addCustomDietary = () => {
    if (!menuItem || !customDietaryInput.trim() || menuItem.dietary.includes(customDietaryInput.trim())) return
    
    const newDietary = [...menuItem.dietary, customDietaryInput.trim()]
    setMenuItem({ ...menuItem, dietary: newDietary })
    setCustomDietaryInput('')
    setShowCustomDietaryInput(false)
  }

  const removeCustomDietary = (dietary: string) => {
    if (!menuItem) return
    setMenuItem({
      ...menuItem,
      dietary: menuItem.dietary.filter(d => d !== dietary)
    })
  }

  const isCustomDietary = (dietary: string) => {
    return !dietaryOptions.some(opt => opt.name === dietary)
  }

  const handleIngredientSelect = (ingredientId: string) => {
    if (!menuItem) return
    
    const updatedIngredients = menuItem.ingredients.includes(ingredientId)
      ? menuItem.ingredients.filter(id => id !== ingredientId)
      : [...menuItem.ingredients, ingredientId]

    const profiles = updatedIngredients
      .map(id => ingredients.find(i => i.id === id)?.allergen_warnings)
      .filter((w): w is AllergenWarnings => !!w)

    // Strict intersection: a dietary label only carries over if ALL selected ingredients have it.
    // This prevents e.g. 'Vegan' appearing on a menu item just because one ingredient is vegan.
    const ingredientCerts = updatedIngredients.map(id => ingredients.find(i => i.id === id)?.certifications ?? [])
    const mergedCertifications = ingredientCerts.length === 0
      ? []
      : ingredientCerts.reduce((acc, certs) => acc.filter(c => certs.includes(c)))
    const manualDietary = menuItem.dietary.filter(d => !dietaryOptions.some(opt => opt.name === d) || mergedCertifications.includes(d))
    const combinedDietary = Array.from(new Set([...manualDietary, ...mergedCertifications]))

    setMenuItem({
      ...menuItem,
      ingredients: updatedIngredients,
      allergen_warnings: profiles.length > 0
        ? computeWorstCaseAllergens(profiles)
        : menuItem.allergen_warnings,
      dietary: combinedDietary,
    })
  }

  const filteredIngredients = ingredients.filter(ing =>
    ing.name.toLowerCase().includes(ingredientSearch.toLowerCase())
  )

  const handleDelete = async () => {
    if (!menuItem || !confirm(`Are you sure you want to delete "${menuItem.name}"? This cannot be undone.`)) {
      return
    }

    try {
      setDeleting(true)
      const response = await fetch(`/api/menu-items/${itemId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete menu item')
      }

      router.push('/admin/menu-builder')
    } catch (error: any) {
      console.error('Error deleting menu item:', error)
      showNotification(error.message || 'Failed to delete menu item', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const fetchCompliance = async () => {
    try {
      setLoadingCompliance(true)
      const response = await fetch(`/api/compliance/status?itemId=${itemId}&itemType=menu_item`)
      const data = await response.json()
      if (response.ok && data.compliance) {
        setCompliance(data.compliance)
      } else {
        console.error('Error fetching compliance:', data.error || 'Unknown error')
      }
    } catch (error: any) {
      console.error('Error fetching compliance:', error)
    } finally {
      setLoadingCompliance(false)
    }
  }

  const handleMarkReviewed = async () => {
    try {
      setMarking(true)
      const response = await fetch('/api/compliance/mark-reviewed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: itemId,
          itemType: 'menu_item'
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to mark as reviewed')
      }

      // Refresh compliance status
      await fetchCompliance()
      showNotification('Menu item marked as reviewed!', 'success')
    } catch (error: any) {
      console.error('Error marking as reviewed:', error)
      showNotification(error.message || 'Failed to mark as reviewed', 'error')
    } finally {
      setMarking(false)
    }
  }

  // Fetch compliance status on load
  useEffect(() => {
    if (itemId && menuItem) {
      fetchCompliance()
    }
  }, [itemId, menuItem])

  const handleSave = async () => {
    if (!menuItem || !menuItem.name || !menuItem.description) {
      setSaveStatus('error')
      setSaveMessage('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)
      setSaveStatus('saving')
      setSaveMessage('Saving menu item...')

      const response = await fetch(`/api/menu-items/${menuItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menuItem)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save menu item')
      }

      const currentDatasheets = datasheetsTouched ? datasheets : existingDatasheets
      const currentDatasheetIds = new Set(
        currentDatasheets
          .map((datasheet: any) => datasheet.id)
          .filter((id: any): id is string => typeof id === 'string' && id.length > 0)
      )
      const removedDatasheetIds = existingDatasheets
        .map((datasheet: any) => datasheet.id)
        .filter((id: any): id is string => typeof id === 'string' && id.length > 0)
        .filter((id: string) => !currentDatasheetIds.has(id))

      if (removedDatasheetIds.length > 0) {
        setSaveMessage('Deleting removed datasheets...')
        await Promise.all(
          removedDatasheetIds.map(async (id: string) => {
            const deleteResponse = await fetch(`/api/datasheets/${id}`, { method: 'DELETE' })
            if (!deleteResponse.ok) {
              const deleteData = await deleteResponse.json()
              throw new Error(deleteData.error || 'Failed to delete datasheet')
            }
          })
        )
      }

      // Upload datasheets if any
      if (currentDatasheets.length > 0) {
        try {
          setSaveMessage('Uploading datasheets...')
          const uploadPromises = currentDatasheets
            .filter((datasheet) => datasheet.file)
            .map(async (datasheet) => {
              const fileName = datasheet.file_name || datasheet.file?.name || 'datasheet'
              const formData = new FormData()
              formData.append('file', datasheet.file)
              formData.append('menu_item_id', menuItem.id)
              if (datasheet.supplier_name) formData.append('supplier_name', datasheet.supplier_name)
              if (datasheet.version) formData.append('version', datasheet.version)
              if (datasheet.next_review_date) formData.append('next_review_date', datasheet.next_review_date)
              if (datasheet.notes) formData.append('notes', datasheet.notes)

              const uploadResponse = await fetch('/api/upload/datasheet', {
                method: 'POST',
                body: formData
              })

              const uploadData = await uploadResponse.json()
              if (!uploadResponse.ok) {
                const errorMsg = uploadData.details 
                  ? `${uploadData.error}: ${uploadData.details}`
                  : uploadData.error || `Failed to upload ${fileName}`
                throw new Error(errorMsg)
              }
              return uploadData
            })

          await Promise.all(uploadPromises)
          setDatasheets([])
          setExistingDatasheets([])
        } catch (uploadError: any) {
          console.error('Error uploading datasheets:', uploadError)
          setSaveStatus('error')
          setSaveMessage(uploadError?.message || 'Failed to upload datasheets')
          return
        }
      }

      setSaveStatus('success')
      setSaveMessage('Menu item updated successfully!')
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/admin/menu-builder')
      }, 1000)
    } catch (error: any) {
      console.error('Error saving menu item:', error)
      setSaveStatus('error')
      setSaveMessage(error?.message || 'Failed to save menu item')
    } finally {
      setSaving(false)
    }
  }

  const handleDatasheetsChange = (files: any[]) => {
    setDatasheets(files)
    setDatasheetsTouched(true)
  }

  const handleIconUpload = async (file: File | null) => {
    if (!file || !menuItem) return

    try {
      setUploadingIcon(true)
      const formData = new FormData()
      formData.append('icon', file)

      const response = await fetch('/api/upload/menu-item-icon', {
        method: 'POST',
        body: formData
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload icon')
      }

      setMenuItem(current => current ? ({ ...current, icon: data.iconUrl }) : current)
    } catch (error: any) {
      console.error('Error uploading menu item icon:', error)
      setSaveStatus('error')
      setSaveMessage(error?.message || 'Failed to upload icon')
    } finally {
      setUploadingIcon(false)
    }
  }

  if (loading || !menuItem) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative h-12 w-12 mx-auto mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Container>
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/menu-builder"
            className="inline-flex items-center gap-2 text-[#42b8ac] hover:text-[#003842] dark:hover:text-[#42b8ac] font-medium mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('admin.backToMenuBuilder')}
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {t('admin.editMenuItem')}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {t('admin.updateDetailsFor')}: <strong>{menuItem.name}</strong>
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Menu Item Name */}
            <Card className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('admin.menuItemName')} *
              </label>
              <input
                type="text"
                value={menuItem.name}
                onChange={(e) => setMenuItem({ ...menuItem, name: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </Card>

            {/* Site Scope */}
            <Card className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('admin.siteScope')}
              </label>
              <select
                value={menuItem.site_id ?? 'global'}
                onChange={(e) => setMenuItem({ 
                  ...menuItem, 
                  site_id: e.target.value === 'global' ? null : e.target.value 
                })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="global">{t('admin.globalAllSites')}</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </Card>

            {/* Status Toggle */}
            <Card className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('admin.visibilityStatus')}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {t('admin.visibilityStatusDesc')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setMenuItem({ ...menuItem, status: 'active' })}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                    menuItem.status === 'active'
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('admin.active')}
                </button>
                <button
                  onClick={() => setMenuItem({ ...menuItem, status: 'draft' })}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                    menuItem.status === 'draft'
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('admin.draft')}
                </button>
              </div>
            </Card>

            {/* Compliance Status */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#003842]">{t('admin.complianceStatus')}</h2>
                <Button
                  onClick={handleMarkReviewed}
                  disabled={marking || loadingCompliance}
                  className="bg-emerald-500 text-white hover:bg-emerald-600 text-sm"
                >
                  {marking ? t('admin.marking') : t('admin.markAsReviewed')}
                </Button>
              </div>
              
              {loadingCompliance ? (
                <div className="text-gray-500 text-sm">{t('admin.loadingComplianceStatus')}</div>
              ) : compliance ? (
                <div className="space-y-3">
                  <div
                    className="p-3 rounded-lg border-2"
                    style={{
                      backgroundColor: compliance.status === 'compliant' ? '#dcfce7' : 
                                      compliance.status === 'warning' ? '#fef3c7' : '#fee2e2',
                      borderColor: compliance.status === 'compliant' ? '#16a34a' : 
                                  compliance.status === 'warning' ? '#f59e0b' : '#dc2626'
                    }}
                  >
                    <div className="font-semibold" style={{
                      color: compliance.status === 'compliant' ? '#16a34a' : 
                            compliance.status === 'warning' ? '#f59e0b' : '#dc2626'
                    }}>
                      {compliance.status === 'compliant' ? `✓ ${t('admin.compliant')}` : 
                       compliance.status === 'warning' ? `⚠ ${t('admin.reviewDueSoon')}` : `✕ ${t('admin.notCompliant')}`}
                    </div>
                  </div>
                  
                  {compliance.reasons.length > 0 && (
                    <div className="space-y-1">
                      {compliance.reasons.map((reason: string, idx: number) => (
                        <div key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-gray-400 mt-0.5">•</span>
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {compliance.lastReviewedAt && (
                    <div className="text-xs text-gray-500 pt-2 border-t">
                      {t('admin.lastSeenLabel')}: {new Date(compliance.lastReviewedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">{t('admin.unableLoadComplianceStatus')}</div>
              )}
            </Card>

            {/* Category */}
            <Card className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('admin.category')}
              </label>
              <input
                type="text"
                list="menu-item-categories"
                value={menuItem.category}
                onChange={(e) => setMenuItem({ ...menuItem, category: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={t('admin.categoryPlaceholder')}
              />
              <datalist id="menu-item-categories">
                {categoryOptions.map(opt => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </Card>

            {/* Description */}
            <Card className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('admin.itemDescription')} *
              </label>
              <textarea
                value={menuItem.description}
                onChange={(e) => setMenuItem({ ...menuItem, description: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </Card>

            {/* Tile Colour */}
            <Card className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('admin.tileColour')} <span className="text-gray-400 font-normal">({t('admin.optional')})</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {t('admin.tileColourDesc')}
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={menuItem.color || '#ffffff'}
                  onChange={(e) => setMenuItem({ ...menuItem, color: e.target.value === '#ffffff' ? '' : e.target.value })}
                  className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                />
                <div
                  className="flex-1 h-10 rounded-lg border border-gray-200 flex items-center px-3 text-sm font-medium transition-colors"
                  style={{ backgroundColor: menuItem.color || '#ffffff', color: menuItem.color ? '#fff' : '#374151', border: menuItem.color ? 'none' : undefined }}
                >
                  {menuItem.color ? menuItem.color : t('admin.noColorSelected')}
                </div>
                {menuItem.color && (
                  <button
                    type="button"
                    onClick={() => setMenuItem({ ...menuItem, color: '' })}
                    className="text-xs text-gray-500 hover:text-red-600 underline whitespace-nowrap"
                  >
                    {t('admin.clear')}
                  </button>
                )}
              </div>
            </Card>

            {/* Menu Item Icon/Image */}
            <Card className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Icon or Picture <span className="text-gray-400 font-normal">({t('admin.optional')})</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Add an icon or picture to this menu item. Choose from preset icons or upload a custom image. This will be displayed on the kiosk menu.
              </p>
              
              {/* Upload Custom Image */}
              <div className="mb-5 pb-5 border-b border-gray-200 dark:border-gray-600">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t('admin.uploadCustomImage')}</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    handleIconUpload(e.target.files?.[0] || null)
                    e.currentTarget.value = ''
                  }}
                  disabled={uploadingIcon}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#42b8ac] file:text-white hover:file:bg-[#3aa89e]"
                />
                {uploadingIcon && (
                  <p className="mt-2 text-xs text-[#0f766e] font-medium">{t('admin.uploadingImage')}</p>
                )}
              </div>

              {menuItem.icon && (
                <div className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-[#42b8ac]/40 bg-[#42b8ac]/10 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-white border border-gray-200 text-3xl shrink-0">
                      {isImageIcon(menuItem.icon) ? (
                        <img src={menuItem.icon} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span>{menuItem.icon}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#003842]">{t('admin.selectedIcon')}</p>
                      <p className="truncate text-xs text-gray-500">{isImageIcon(menuItem.icon) ? t('admin.customUploadedImage') : t('admin.presetIcon')}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMenuItem({ ...menuItem, icon: '' })}
                    className="text-xs text-gray-500 hover:text-red-600 underline whitespace-nowrap"
                  >
                    {t('admin.clear')}
                  </button>
                </div>
              )}

              {/* Preset Icons */}
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">{t('admin.choosePresetIcons')}</p>
              <div className="grid grid-cols-4 gap-3">
                {PRESET_MENU_ICONS.map(preset => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setMenuItem({ ...menuItem, icon: preset.icon })}
                    className={`p-3 rounded-lg border-2 transition-all text-3xl ${
                      menuItem.icon === preset.icon
                        ? 'border-[#42b8ac] bg-[#42b8ac]/10'
                        : 'border-gray-200 dark:border-gray-600 hover:border-[#42b8ac] hover:bg-[#42b8ac]/10'
                    }`}
                    title={preset.name}
                  >
                    {preset.icon}
                  </button>
                ))}
              </div>
            </Card>

            {/* Selected Ingredients */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('admin.selectedIngredients')}
                </label>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {menuItem.ingredients.length} {t('admin.selected')}
                </span>
              </div>

              <div className="min-h-[100px] border border-gray-300 dark:border-gray-600 rounded-lg p-4 mb-4 bg-gray-50 dark:bg-gray-800">
                {menuItem.ingredients.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                    {t('admin.noIngredientsSelected')}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {menuItem.ingredients.map(ingredientId => {
                      const ingredient = ingredients.find(i => i.id === ingredientId)
                      return ingredient ? (
                        <div
                          key={ingredient.id}
                          className="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600"
                        >
                          <span className="text-sm text-gray-800 dark:text-gray-200">{ingredient.name}</span>
                          <button
                            type="button"
                            onClick={() => handleIngredientSelect(ingredient.id)}
                            className="text-gray-500 dark:text-gray-400 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : null
                    })}
                  </div>
                )}
              </div>

              <Button
                onClick={() => setShowIngredientSelector(true)}
                variant="outline"
                icon={<Plus className="h-4 w-4" />}
                fullWidth
              >
                {menuItem.ingredients.length === 0 ? t('admin.addIngredients') : t('admin.addMoreIngredients')}
              </Button>
            </Card>

            {/* Dietary Attributes */}
            <Card className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                {t('admin.dietaryAttributesCertifications')}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {dietaryOptions.map(dietary => {
                  const isSelected = menuItem.dietary.includes(dietary.name)
                  
                  return (
                    <button
                      key={dietary.name}
                      type="button"
                      onClick={() => {
                        const newDietary = isSelected
                          ? menuItem.dietary.filter(d => d !== dietary.name)
                          : [...menuItem.dietary, dietary.name]
                        setMenuItem({ ...menuItem, dietary: newDietary })
                      }}
                      className={`
                        relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                        ${isSelected
                          ? 'border-opacity-100 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
                        }
                        group cursor-pointer
                      `}
                      style={{
                        borderColor: isSelected ? dietary.color : undefined,
                        backgroundColor: isSelected ? `${dietary.color}15` : '#fff'
                      }}
                    >
                      <div 
                        className={`
                          flex items-center justify-center w-10 h-10 rounded-lg transition-all
                          ${isSelected ? 'scale-100' : 'group-hover:scale-110'}
                          group-hover:shadow-lg
                        `}
                        style={{ backgroundColor: dietary.color }}
                      >
                        {typeof dietary.icon === 'function' && React.createElement(dietary.icon as React.ComponentType<{className: string}>, { className: 'h-6 w-6 text-white' })}
                      </div>
                      <span
                        className={`text-xs font-semibold text-center transition-colors ${
                          isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {dietary.name}
                      </span>
                      {isSelected && (
                        <div 
                          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: dietary.color }}
                        >
                          <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Custom Dietary Input */}
              <button
                type="button"
                onClick={() => setShowCustomDietaryInput(!showCustomDietaryInput)}
                className="w-full text-left px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                + {t('admin.addCustomAttribute')}
              </button>

              {showCustomDietaryInput && (
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={customDietaryInput}
                    onChange={(e) => setCustomDietaryInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomDietary()}
                    placeholder={t('admin.enterCustomAttribute')}
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                  />
                  <Button
                    variant="primary"
                    onClick={addCustomDietary}
                    disabled={!customDietaryInput.trim()}
                  >
                    {t('admin.add')}
                  </Button>
                </div>
              )}

              {menuItem.dietary.filter(d => isCustomDietary(d)).length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('admin.customAttributes')}</p>
                  <div className="flex flex-wrap gap-2">
                    {menuItem.dietary.filter(d => isCustomDietary(d)).map(dietary => (
                      <span
                        key={dietary}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium"
                      >
                        {dietary}
                        <button
                          type="button"
                          onClick={() => removeCustomDietary(dietary)}
                          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Allergen Information */}
            <Card className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('admin.allergenInformation')}
              </label>
              {menuItem.ingredients.length > 0 ? (
                <>
                  <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                    Calculated automatically from the selected ingredients. Edit an ingredient or its supplier profile to change this result.
                  </p>
                  <div className="rounded-xl border border-[#42b8ac]/30 bg-[#42b8ac]/5 p-4">
                    <AllergenWarningDisplay warnings={menuItem.allergen_warnings} showNone={true} />
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                    No ingredients are linked, so set this menu item's allergen information manually.
                  </p>
                  <AllergenWarningSelector
                    value={menuItem.allergen_warnings}
                    onChange={(warnings) => setMenuItem({ ...menuItem, allergen_warnings: warnings })}
                  />
                </>
              )}
            </Card>

            {/* Datasheets */}
            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('admin.menuItemSpecificDatasheets')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                {t('admin.menuItemDatasheetsDesc')}
              </p>
              <DatasheetUploader
                entityType="menu_item"
                existingDatasheets={existingDatasheets}
                onFilesChange={handleDatasheetsChange}
                maxFiles={5}
                compact={false}
              />
            </Card>

            {/* Save Status */}
            {saveStatus !== 'idle' && (
              <Card className={`p-4 border-2 ${
                saveStatus === 'success'
                  ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20'
                  : saveStatus === 'error'
                    ? 'border-red-200 bg-red-50 dark:bg-red-900/20'
                    : 'border-blue-200 bg-blue-50 dark:bg-blue-900/20'
              }`}>
                <p className={`text-sm font-medium ${
                  saveStatus === 'success'
                    ? 'text-emerald-800 dark:text-emerald-200'
                    : saveStatus === 'error'
                      ? 'text-red-800 dark:text-red-200'
                      : 'text-blue-800 dark:text-blue-200'
                }`}>
                  {saveMessage}
                </p>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Save Button */}
            <Card className="p-6">
              <Button
                onClick={handleSave}
                variant="primary"
                icon={<Save className="h-4 w-4" />}
                fullWidth
                size="lg"
                disabled={saving || !menuItem.name || !menuItem.description}
              >
                {saving ? t('admin.savingMenuItem') : t('admin.saveMenuItem')}
              </Button>
              <Link href="/admin/menu-builder">
                <Button
                  variant="outline"
                  fullWidth
                  size="lg"
                  className="mt-3"
                >
                  {t('admin.cancel')}
                </Button>
              </Link>
              {canDeleteContent && (
                <button type="button" onClick={handleDelete} disabled={deleting} className="w-full mt-3 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors">
                  <Trash2 className="h-4 w-4" />
                  {deleting ? t('admin.deletingMenuItem') : t('admin.delete') + ' ' + t('admin.menuItemsStat')}
                </button>
              )}
            </Card>

            {/* Review Frequency */}
            <Card>
              <ReviewFrequencySelector 
                value={menuItem?.preferred_review_months || 12}
                onChange={(months) => setMenuItem(prev => prev ? { ...prev, preferred_review_months: months } : prev)}
                label={t('admin.reviewFrequency')}
              />
            </Card>

            {/* Final Allergen Summary */}
            <Card className="p-6 border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-emerald-600 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">{t('admin.allergenSummary')}</h3>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <AllergenWarningDisplay
                  warnings={menuItem.allergen_warnings}
                  compact={false}
                  showNone={true}
                />
              </div>
            </Card>
          </div>
        </div>
      </Container>

      {/* Ingredient Selector Modal */}
      {showIngredientSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-[#003842] dark:text-[#42b8ac]">{t('admin.selectIngredientsTitle')}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('admin.chooseIngredientsForMenuItem')}</p>
                </div>
                <button
                  onClick={() => setShowIngredientSelector(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-4 border-b dark:border-gray-700">
              <div className="relative">
                <input
                  type="text"
                  value={ingredientSearch}
                  onChange={(e) => setIngredientSearch(e.target.value)}
                  placeholder={t('admin.searchIngredients')}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredIngredients.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No ingredients found
                </div>
              ) : (
                filteredIngredients.map((ingredient) => (
                  <label
                    key={ingredient.id}
                    className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={menuItem.ingredients.includes(ingredient.id)}
                      onChange={() => handleIngredientSelect(ingredient.id)}
                      className="w-4 h-4 rounded border-gray-300 text-[#42b8ac] focus:ring-[#42b8ac]"
                    />
                    <span className="ml-3 min-w-0">
                      <span className="block text-gray-900 dark:text-white">{ingredient.name}</span>
                      <span className="block truncate text-xs text-gray-500">
                        {ingredient.suppliers.length > 0 ? ingredient.suppliers.join(', ') : 'No supplier linked'}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>

            <div className="p-6 border-t dark:border-gray-700">
              <Button
                variant="primary"
                fullWidth
                onClick={() => setShowIngredientSelector(false)}
              >
                Done
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Label Scan Modal */}
      <LabelScanModal
        open={showScan}
        onClose={() => setShowScan(false)}
        onAccept={(scanData) => {
          if (scanData.name) setMenuItem({ ...menuItem, name: scanData.name })
          if (scanData.description) setMenuItem({ ...menuItem, description: scanData.description })
          setShowScan(false)
        }}
      />
    </>
  )
}
