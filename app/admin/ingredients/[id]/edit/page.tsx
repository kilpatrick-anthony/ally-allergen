// app/admin/ingredients/[id]/edit/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useNotification } from '@/lib/hooks/useNotification'
import { 
  Package, ArrowLeft, Save, X, AlertCircle, Plus, Trash2,
  Leaf, Apple, WheatOff, Moon, Star, Sprout, Globe, Droplets, ShieldCheck,
} from 'lucide-react'

import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import AllergenWarningSelector from '@/components/admin/AllergenWarningSelector'
import AllergenWarningDisplay from '@/components/kiosk/AllergenWarningDisplay'
import DatasheetUploader from '@/components/admin/DatasheetUploader'
import IngredientSupplierVariantsEditor from '@/components/admin/IngredientSupplierVariantsEditor'
import { ReviewFrequencySelector } from '@/components/admin/ReviewFrequencySelector'
import type { AllergenWarnings } from '@/types/allergen'
import { useContentPermissions } from '@/lib/hooks/useContentPermissions'
import {
  deriveEffectiveIngredientSafety,
  type SupplierProfileMap,
} from '@/lib/ingredient-supplier-profiles'

export default function EditIngredientPage() {
  const { showNotification } = useNotification()
  const { canDeleteContent } = useContentPermissions()
  const router = useRouter()
  const params = useParams()
  const ingredientId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [marking, setMarking] = useState(false)
  const [datasheets, setDatasheets] = useState<any[]>([])
  const [existingDatasheets, setExistingDatasheets] = useState<any[]>([])
  const [compliance, setCompliance] = useState<any>(null)
  const [loadingCompliance, setLoadingCompliance] = useState(false)
  const [datasheetsTouched, setDatasheetsTouched] = useState(false)
  
  const [ingredient, setIngredient] = useState({
    name: '',
    description: '',
    category: '',
    status: 'active' as 'active' | 'review' | 'archived',
    preferred_review_months: 3,
    allergen_warnings: {
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
    } as AllergenWarnings,
    suppliers: [] as string[],
    certifications: [] as string[]
  })

  const [availableSuppliers, setAvailableSuppliers] = useState<string[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [customCertInput, setCustomCertInput] = useState('')
  const [showCustomCertInput, setShowCustomCertInput] = useState(false)

  // Per-supplier profiles: each supplier can have their own allergen warnings + certifications
  const [supplierProfiles, setSupplierProfiles] = useState<SupplierProfileMap>({})

  const parseJsonSafely = async (response: Response) => {
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return response.json()
    }
    const text = await response.text()
    return { error: text || 'Unexpected response from server' }
  }

  const DEFAULT_INGREDIENT_CATEGORIES = [
    'Dairy', 'Dairy Alternative', 'Fruit', 'Grain', 'Nut', 'Oil',
    'Other', 'Protein', 'Seed', 'Spice', 'Spread', 'Sweetener', 'Vegetable'
  ]
  const [categoryOptions, setCategoryOptions] = useState<string[]>(DEFAULT_INGREDIENT_CATEGORIES)

  useEffect(() => {
    fetch('/api/ingredients/categories')
      .then(r => r.ok ? r.json() : { categories: [] })
      .then(({ categories }: { categories: string[] }) => {
        const merged = [...new Set([...DEFAULT_INGREDIENT_CATEGORIES, ...(categories || [])])].sort()
        setCategoryOptions(merged)
      })
      .catch(() => {})
  }, [])

  const certificationOptions = [
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

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoadingSuppliers(true)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await fetch('/api/suppliers', {
          signal: controller.signal
        })
        clearTimeout(timeoutId)

        const data = await parseJsonSafely(response)

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch suppliers')
        }

        const names = (data.suppliers || [])
          .map((supplier: any) => supplier.name)
          .filter((name: string) => typeof name === 'string' && name.trim() !== '')
          .map((name: string) => name.trim())

        const uniqueNames = (Array.from(new Set(names)) as string[]).sort((a, b) => a.localeCompare(b))
        setAvailableSuppliers(uniqueNames)
      } catch (error: any) {
        console.error('Error fetching suppliers:', error)
        setAvailableSuppliers([])
      } finally {
        setLoadingSuppliers(false)
      }
    }

    fetchSuppliers()
  }, [])

  useEffect(() => {
    const fetchIngredient = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/ingredients/${ingredientId}`)
        const data = await parseJsonSafely(response)
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch ingredient')
        }
        
        console.log('Edit page - Ingredient data:', data.ingredient)
        console.log('Edit page - Allergen warnings:', data.ingredient.allergen_warnings)
        
        setIngredient({
          name: data.ingredient.name,
          description: data.ingredient.description || '',
          category: data.ingredient.category || '',
          status: data.ingredient.status || 'active',
          preferred_review_months: data.ingredient.preferred_review_months || 3,
          allergen_warnings: data.ingredient.allergen_warnings || ingredient.allergen_warnings,
          suppliers: data.ingredient.suppliers || [],
          certifications: data.ingredient.certifications || []
        })
        setSupplierProfiles(data.ingredient.supplier_profiles || {})

        // Fetch existing datasheets
        const datasheetsResponse = await fetch(`/api/datasheets?ingredient_id=${ingredientId}`)
        const datasheetsData = await parseJsonSafely(datasheetsResponse)
        if (datasheetsResponse.ok) {
          setExistingDatasheets(datasheetsData.datasheets || [])
          setDatasheets(datasheetsData.datasheets || [])
          setDatasheetsTouched(false)
        }
      } catch (error: any) {
        console.error('Error fetching ingredient:', error)
        showNotification('Failed to load ingredient', 'error')
      } finally {
        setLoading(false)
      }
    }
    
    fetchIngredient()
  }, [ingredientId])

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${ingredient.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/ingredients/${ingredientId}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await parseJsonSafely(response)
        throw new Error(data.error || 'Failed to delete ingredient')
      }
      router.push('/admin/ingredients')
    } catch (error: any) {
      console.error('Error deleting ingredient:', error)
      showNotification(error.message || 'Failed to delete ingredient', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const fetchCompliance = async () => {
    try {
      setLoadingCompliance(true)
      const response = await fetch(`/api/compliance/status?itemId=${ingredientId}&itemType=ingredient`)
      const data = await parseJsonSafely(response)
      if (response.ok) {
        setCompliance(data.compliance)
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
          itemId: ingredientId,
          itemType: 'ingredient'
        })
      })

      if (!response.ok) {
        const data = await parseJsonSafely(response)
        throw new Error(data.error || 'Failed to mark as reviewed')
      }

      // Refresh compliance status
      await fetchCompliance()
      showNotification('Ingredient marked as reviewed!', 'success')
    } catch (error: any) {
      console.error('Error marking as reviewed:', error)
      showNotification(error.message || 'Failed to mark as reviewed', 'error')
    } finally {
      setMarking(false)
    }
  }

  // Fetch compliance status on load
  useEffect(() => {
    if (ingredientId && !loading) {
      fetchCompliance()
    }
  }, [ingredientId, loading])

  const handleSave = async () => {
    if (!ingredient.name) {
      showNotification('Please fill in required field (Name)', 'error')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/ingredients/${ingredientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ingredient, supplier_profiles: supplierProfiles })
      })
      const data = await parseJsonSafely(response)
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update ingredient')
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
        const deleteResults = await Promise.all(
          removedDatasheetIds.map(async (id: string) => {
            const deleteResponse = await fetch(`/api/datasheets/${id}`, { method: 'DELETE' })
            if (!deleteResponse.ok) {
              const errorData = await parseJsonSafely(deleteResponse)
              throw new Error(errorData.error || 'Failed to delete datasheet')
            }
            return id
          })
        )
        console.log('🗑️ Deleted datasheets:', deleteResults.length)
      }

      // Upload only new datasheets that include a File object
      if (currentDatasheets.length > 0) {
        console.log('📤 Uploading', currentDatasheets.length, 'datasheets...')
        
        const uploadPromises = currentDatasheets.map(async (datasheet) => {
          if (!datasheet.file) return
          
          const fileName = datasheet.file_name || datasheet.file?.name || 'datasheet'
          const formData = new FormData()
          formData.append('file', datasheet.file)
          formData.append('ingredient_id', String(ingredientId))
          if (datasheet.supplier_name) formData.append('supplier_name', datasheet.supplier_name)
          if (datasheet.version) formData.append('version', datasheet.version)
          if (datasheet.next_review_date) formData.append('next_review_date', datasheet.next_review_date)
          if (datasheet.notes) formData.append('notes', datasheet.notes)

          const uploadResponse = await fetch('/api/upload/datasheet', {
            method: 'POST',
            body: formData
          })

          if (!uploadResponse.ok) {
            const errorData = await parseJsonSafely(uploadResponse)
            console.error('Failed to upload:', fileName, errorData)
            throw new Error(`Failed to upload ${fileName}: ${errorData.error || 'Unknown error'}`)
          }

          return parseJsonSafely(uploadResponse)
        })

        await Promise.all(uploadPromises)
        console.log('✅ All datasheets uploaded successfully')
      }

      router.push('/admin/ingredients')
    } catch (error: any) {
      console.error('Error updating ingredient:', error)
      showNotification(error.message || 'Failed to update ingredient', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDatasheetsChange = (files: any[]) => {
    setDatasheets(files)
    setDatasheetsTouched(true)
  }

  const handleSupplierVariantsChange = (suppliers: string[], profiles: SupplierProfileMap) => {
    const derived = deriveEffectiveIngredientSafety(profiles)
    setSupplierProfiles(profiles)
    setIngredient((current) => ({
      ...current,
      suppliers,
      ...(derived ? {
        allergen_warnings: derived.allergen_warnings,
        certifications: derived.certifications,
      } : {}),
    }))
  }

  const toggleCertification = (cert: string) => {
    setIngredient(prev => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter(c => c !== cert)
        : [...prev.certifications, cert]
    }))
  }

  const addCustomCertification = () => {
    const trimmed = customCertInput.trim()
    if (trimmed && !ingredient.certifications.includes(trimmed)) {
      setIngredient(prev => ({
        ...prev,
        certifications: [...prev.certifications, trimmed]
      }))
      setCustomCertInput('')
      setShowCustomCertInput(false)
    }
  }

  const removeCertification = (cert: string) => {
    setIngredient(prev => ({
      ...prev,
      certifications: prev.certifications.filter(c => c !== cert)
    }))
  }

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="relative h-12 w-12 mx-auto mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
            </div>
            <p className="text-gray-600 dark:text-gray-400">Loading ingredient...</p>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <>
      <Container>
        <div className="mb-6">
        <Link href="/admin/ingredients">
          <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />}>
            Back to Ingredients
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-[#42b8ac] to-[#003842] rounded-xl flex-shrink-0">
            <Package className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Edit Ingredient</h1>
            <p className="text-gray-600 dark:text-gray-300">Update ingredient details and allergen information</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <h2 className="text-xl font-semibold text-[#003842] mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ingredient.name}
                  onChange={(e) => setIngredient({ ...ingredient, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                  placeholder="e.g., Almonds"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={ingredient.description}
                  onChange={(e) => setIngredient({ ...ingredient, description: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                  placeholder="Enter ingredient description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  list="ingredient-categories"
                  value={ingredient.category}
                  onChange={(e) => setIngredient({ ...ingredient, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                  placeholder="e.g., Dairy, Produce, Dry Goods"
                />
                <datalist id="ingredient-categories">
                  {categoryOptions.map(opt => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <IngredientSupplierVariantsEditor
              suppliers={ingredient.suppliers}
              profiles={supplierProfiles}
              availableSuppliers={availableSuppliers}
              loadingSuppliers={loadingSuppliers}
              fallbackAllergens={ingredient.allergen_warnings}
              fallbackCertifications={ingredient.certifications}
              certificationOptions={certificationOptions}
              onChange={handleSupplierVariantsChange}
            />
          </Card>

          {/* Allergen Information */}
          <Card>
            <h2 className="text-xl font-semibold text-[#003842] mb-2">
              {ingredient.suppliers.length > 0 ? 'Effective allergen summary' : 'Allergen information'}
            </h2>
            {ingredient.suppliers.length > 0 ? (
              <>
                <p className="mb-4 text-sm text-gray-500">
                  Read-only safest result calculated from every supplier variant above. Update a supplier profile to change it.
                </p>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/20">
                  <AllergenWarningDisplay warnings={ingredient.allergen_warnings} compact={false} showNone={true} />
                </div>
              </>
            ) : (
              <AllergenWarningSelector
                value={ingredient.allergen_warnings}
                onChange={(warnings) => setIngredient({ ...ingredient, allergen_warnings: warnings })}
              />
            )}
          </Card>

          {/* Status Toggle */}
          <Card>
            <h2 className="text-xl font-semibold text-[#003842] mb-4">Visibility Status</h2>
            <p className="text-sm text-gray-600 mb-3">
              Active ingredients appear in reports and menu builder. Draft ingredients are hidden from view.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIngredient({ ...ingredient, status: 'active' })}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  ingredient.status === 'active'
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setIngredient({ ...ingredient, status: 'review' })}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  ingredient.status === 'review'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Draft
              </button>
              <button
                onClick={() => setIngredient({ ...ingredient, status: 'archived' })}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  ingredient.status === 'archived'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Archived
              </button>
            </div>
          </Card>

          {/* Compliance Status */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#003842]">Compliance Status</h2>
              <Button
                onClick={handleMarkReviewed}
                disabled={marking || loadingCompliance}
                className="bg-emerald-500 text-white hover:bg-emerald-600 text-sm"
              >
                {marking ? 'Marking...' : 'Mark as Reviewed'}
              </Button>
            </div>
            
            {loadingCompliance ? (
              <div className="text-gray-500 text-sm">Loading compliance status...</div>
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
                    {compliance.status === 'compliant' ? '✓ Compliant' : 
                     compliance.status === 'warning' ? '⚠ Review Due Soon' : '✕ Not Compliant'}
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
                    Last reviewed: {new Date(compliance.lastReviewedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Unable to load compliance status</div>
            )}
          </Card>

          {/* Datasheets Section */}
          <Card>
            <h2 className="text-xl font-semibold text-[#003842] mb-4">Product Datasheets</h2>
            <DatasheetUploader 
              existingDatasheets={existingDatasheets}
              onFilesChange={handleDatasheetsChange}
              entityType="ingredient"
            />
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:col-span-1">
          {/* Save Button */}
          <Card className="p-6">
            <Button
              onClick={handleSave}
              variant="primary"
              icon={<Save className="h-4 w-4" />}
              fullWidth
              size="lg"
              disabled={saving || !ingredient.name}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <button
              type="button"
              onClick={() => router.push('/admin/ingredients')}
              className="w-full mt-3 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            {canDeleteContent && (
              <button type="button" onClick={handleDelete} disabled={deleting} className="w-full mt-3 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors">
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Deleting...' : 'Delete Ingredient'}
              </button>
            )}
          </Card>

          {/* Review Frequency */}
          <Card>
            <ReviewFrequencySelector 
              value={ingredient.preferred_review_months || 3}
              onChange={(months) => setIngredient(prev => ({ ...prev, preferred_review_months: months }))}
              label="Review Frequency"
            />
          </Card>

          {/* Dietary Attributes */}
          {ingredient.suppliers.length === 0 && (
          <Card>
            <h2 className="text-xl font-semibold text-[#003842] mb-4">Dietary Attributes</h2>
            
            <div className="space-y-3">
              {certificationOptions.map((cert) => {
                const Icon = cert.icon
                const isSelected = ingredient.certifications.includes(cert.name)
                
                return (
                  <button
                    key={cert.name}
                    onClick={() => toggleCertification(cert.name)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                      isSelected 
                        ? 'border-current shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{
                      borderColor: isSelected ? cert.color : undefined,
                      backgroundColor: isSelected ? `${cert.color}15` : undefined,
                      color: isSelected ? cert.color : '#6b7280'
                    }}
                  >
                    {typeof Icon === 'function' && React.createElement(Icon as React.ComponentType<{className: string}>, { className: 'h-5 w-5' })}
                    <span className="font-medium">{cert.name}</span>
                  </button>
                )
              })}

              {/* Custom Certification */}
              {!showCustomCertInput && (
                <button
                  onClick={() => setShowCustomCertInput(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-700 transition-all"
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-medium">Add Custom</span>
                </button>
              )}

              {showCustomCertInput && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCertInput}
                    onChange={(e) => setCustomCertInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomCertification()}
                    placeholder="Custom certification"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                    autoFocus
                  />
                  <Button size="sm" onClick={addCustomCertification}>
                    Add
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      setShowCustomCertInput(false)
                      setCustomCertInput('')
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Display custom certifications */}
              {ingredient.certifications.filter(cert => 
                !certificationOptions.some(opt => opt.name === cert)
              ).map((cert, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border-2 border-gray-300 bg-gray-50"
                >
                  <span className="font-medium text-gray-700">{cert}</span>
                  <button
                    onClick={() => removeCertification(cert)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
          )}
        </div>
      </div>
    </Container>

    </>
  )
}
