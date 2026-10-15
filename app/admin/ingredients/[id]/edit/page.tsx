// app/admin/ingredients/[id]/edit/page.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createRegularEditSaver, EditDocumentSaveError } from '@/lib/regular-edit-save'
import { RegularItemSaveError } from '@/lib/regular-item-save'
import { changedAttachments } from '@/lib/regular-form-state'
import { useRegularFormValidation } from '@/lib/hooks/useRegularFormValidation'
import { FormValidationSummary, FormFieldError } from '@/components/admin/FormValidationSummary'
import { useUnsavedChanges } from '@/lib/hooks/useUnsavedChanges'
import { RegularFormActions } from '@/components/admin/RegularFormActions'
import { useListReturnPath } from '@/lib/hooks/useListReturnPath'
import { useNotification } from '@/lib/hooks/useNotification'
import {
  Package, ArrowLeft, Save, X, AlertCircle, Plus, Trash2,
  Leaf, Apple, WheatOff, Moon, Star, Sprout, Globe, Droplets, MilkOff, ShieldCheck,
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
import { isIngredientAssessmentComplete } from '@/lib/allergen-assessment'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { translateComplianceReason } from '@/lib/compliance-documents-translations'

export default function EditIngredientPage() {
  const { showNotification } = useNotification()
  const { t, language } = useTranslation()
  const { canDeleteContent } = useContentPermissions()
  const router = useRouter()
  const { returnTo } = useListReturnPath('/admin/ingredients')
  const params = useParams()
  const ingredientId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const saveLock = useRef(false)
  const [documentRetry, setDocumentRetry] = useState(false)
  const [editSaver] = useState(() => createRegularEditSaver('ingredient'))
  const [formError, setFormError] = useState('')
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
    preferred_review_months: 12,
    allergen_warnings: {} as AllergenWarnings,
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
    return { error: text || t('ingredientsPortal.unexpectedServerResponse') }
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
    { name: 'Dairy Free', color: '#0ea5e9', icon: MilkOff },
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
          preferred_review_months: data.ingredient.preferred_review_months || 12,
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
        showNotification(t('ingredientsPortal.failedToLoadIngredient'), 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchIngredient()
  }, [ingredientId, t])

  const handleDelete = async () => {
    if (!confirm(t('ingredientsPortal.deleteNamedIngredientConfirm', { name: ingredient.name }))) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/ingredients/${ingredientId}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await parseJsonSafely(response)
        throw new Error(data.error || 'Failed to delete ingredient')
      }
      markSaved(); router.push(returnTo)
    } catch (error: any) {
      console.error('Error deleting ingredient:', error)
      showNotification(t('ingredientsPortal.deleteIngredientFailed', { error: error.message || '' }), 'error')
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
      showNotification(t('ingredientsPortal.ingredientMarkedReviewed'), 'success')
    } catch (error: any) {
      console.error('Error marking as reviewed:', error)
      showNotification(t('ingredientsPortal.markReviewedFailed', { error: error.message || '' }), 'error')
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

  const { confirmLeave, markSaved } = useUnsavedChanges({ ingredient, supplierProfiles, datasheets: datasheetsTouched ? changedAttachments(datasheets, existingDatasheets) : null, customCertInput }, !loading)

  const { issues, reportIssues, fieldProps } = useRegularFormValidation({ ingredient, supplierProfiles })

  const handleSave = async () => {
    if (saveLock.current) return
    setFormError('')
    if (reportIssues([
      ...(!ingredient.name.trim() ? [{ field: 'regular-name', message: t('ingredientsPortal.nameRequired') }] : []),
      ...(!isIngredientAssessmentComplete(ingredient.allergen_warnings, supplierProfiles) ? [{ field: 'regular-assessment', message: t('regularAssessment.completeIngredient') }] : []),
    ])) return
    saveLock.current = true
    setSaving(true)
    try {
      await editSaver.save(String(ingredientId), { ...ingredient, supplier_profiles: supplierProfiles }, datasheetsTouched ? datasheets : existingDatasheets, existingDatasheets, t('regularItemSave.saveFailed'))
      setDocumentRetry(false)
      markSaved(); router.push(returnTo)
    } catch (error: unknown) {
      setDocumentRetry(error instanceof EditDocumentSaveError)
      const message = error instanceof EditDocumentSaveError
        ? t(error.needsReload ? 'regularForms.documentsNeedRefresh' : 'regularForms.editDocumentsPending')
        : error instanceof RegularItemSaveError && error.code === 'completeIngredient'
          ? t('regularAssessment.completeIngredient') : error instanceof Error ? error.message : t('regularItemSave.saveFailed')
      setFormError(message)
    } finally {
      saveLock.current = false
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
      } : { allergen_warnings: {} as AllergenWarnings, certifications: [] }),
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
      requestAnimationFrame(() => document.getElementById('regular-custom-certification-toggle')?.focus())
    }
  }

  const removeCertification = (cert: string) => {
    setIngredient(prev => ({
      ...prev,
      certifications: prev.certifications.filter(c => c !== cert)
    }))
    requestAnimationFrame(() => (document.getElementById('regular-custom-certification') || document.getElementById('regular-custom-certification-toggle'))?.focus())
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
            <p className="text-gray-600 dark:text-gray-400">{t('ingredientsPortal.loadingIngredient')}</p>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <>
      <Container>
      <fieldset disabled={saving || deleting} className="min-w-0">
        <div className="mb-6">
        <Link href={returnTo}>
          <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />}>
            {t('ingredientsPortal.backToIngredients')}
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-[#42b8ac] to-[#003842] rounded-xl flex-shrink-0">
            <Package className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{t('admin.editIngredient')}</h1>
            <p className="text-gray-600 dark:text-gray-300">{t('ingredientsPortal.editIngredientDescription')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FormValidationSummary issues={issues} />
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <h2 className="text-xl font-semibold text-[#003842] mb-4">{t('ingredientsPortal.basicInformation')}</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="regular-name" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('accessPoints.name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...fieldProps('regular-name')}
                  value={ingredient.name}
                  onChange={(e) => setIngredient({ ...ingredient, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                  placeholder={t('ingredientsPortal.namePlaceholder')}
                />
                <FormFieldError field="regular-name" issues={issues} />
              </div>

              <div>
                <label htmlFor="regular-description" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('ingredientsPortal.description')}
                </label>
                <textarea
                  {...fieldProps('regular-description')}
                  value={ingredient.description}
                  onChange={(e) => setIngredient({ ...ingredient, description: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                  placeholder={t('ingredientsPortal.descriptionPlaceholder')}
                />
                <FormFieldError field="regular-description" issues={issues} />
              </div>

              <div>
                <label htmlFor="regular-category" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.category')}
                </label>
                <input
                  type="text"
                  list="ingredient-categories"
                  {...fieldProps('regular-category')}
                  value={ingredient.category}
                  onChange={(e) => setIngredient({ ...ingredient, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                  placeholder={t('ingredientsPortal.categoryPlaceholder')}
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
            <div id="regular-assessment" tabIndex={-1}>
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
          </div>
          </Card>

          {/* Datasheets Section */}
          <Card>
            <h2 className="text-xl font-semibold text-[#003842] mb-4">{t('admin.productDatasheets')}</h2>
            <DatasheetUploader
              disabled={saving || deleting}
              existingDatasheets={existingDatasheets}
              onFilesChange={handleDatasheetsChange}
              entityType="ingredient"
            />
          </Card>
          {/* Dietary Attributes */}
          {ingredient.suppliers.length === 0 && (
          <Card>
            <h2 className="text-xl font-semibold text-[#003842] mb-4">{t('admin.dietaryAttributes')}</h2>

            <div className="space-y-3">
              {certificationOptions.map((cert) => {
                const Icon = cert.icon
                const isSelected = ingredient.certifications.includes(cert.name)

                return (
                  <button
                    key={cert.name}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleCertification(cert.name)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-current bg-teal-50 text-gray-900 shadow-sm dark:bg-teal-950 dark:text-gray-100'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300 dark:text-gray-200'
                    }`}
                    style={{
                      borderColor: isSelected ? cert.color : undefined
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
                  id="regular-custom-certification-toggle"
                  type="button"
                  data-no-translate
                  onClick={() => setShowCustomCertInput(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-700 transition-all"
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-medium">{t('ingredientsPortal.addCustom')}</span>
                </button>
              )}

              {showCustomCertInput && (
                <div className="flex flex-wrap items-end gap-2">
                  <label className="min-w-0 basis-full break-words text-sm font-medium text-gray-700 dark:text-gray-200 sm:flex-1 sm:basis-0" data-no-translate>
                    {t('ingredientsPortal.customCertification')}
                    <input
                      id="regular-custom-certification"
                      type="text"
                      value={customCertInput}
                      onChange={(e) => setCustomCertInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); addCustomCertification() } }}
                      placeholder={t('ingredientsPortal.customCertification')}
                      className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-700 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      autoFocus
                    />
                  </label>
                  <Button variant="secondary" className="min-h-11" disabled={!customCertInput.trim()} onClick={addCustomCertification}>
                    {t('admin.add')}
                  </Button>
                  <Button
                    size="sm"
                    className="min-h-11 min-w-11"
                    variant="ghost"
                    aria-label={t('admin.close')}
                    onClick={() => {
                      setShowCustomCertInput(false)
                      setCustomCertInput('')
                      requestAnimationFrame(() => document.getElementById('regular-custom-certification-toggle')?.focus())
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Display custom certifications */}
              {ingredient.certifications.filter(cert =>
                !certificationOptions.some(opt => opt.name === cert)
              ).map((cert) => (
                <div
                  key={cert}
                  data-no-translate
                  className="flex items-center justify-between p-3 rounded-lg border-2 border-gray-300 bg-gray-50"
                >
                  <span className="font-medium text-gray-700">{cert}</span>
                  <button
                    type="button"
                    aria-label={t('regularForms.removeIngredient', { name: cert })}
                    onClick={() => removeCertification(cert)}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-600 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-teal-700 dark:text-gray-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
          )}
          {/* Allergen Information */}
          <Card>
            <h2 className="text-xl font-semibold text-[#003842] mb-2">
              {ingredient.suppliers.length > 0 ? t('ingredientsPortal.effectiveAllergenSummary') : t('admin.allergenInformation')}
            </h2>
            {ingredient.suppliers.length > 0 ? (
              <>
                <p className="mb-4 text-sm text-gray-500">
                  {t('ingredientsPortal.effectiveAllergenHelp')}
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

          {!isIngredientAssessmentComplete(ingredient.allergen_warnings, supplierProfiles) && <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{t('regularAssessment.completeIngredient')}</p>}
          {/* Status Toggle */}
          <Card>
            <h2 className="text-xl font-semibold text-[#003842] mb-4">{t('admin.visibilityStatus')}</h2>
            <p className="text-sm text-gray-600 mb-3">
              {t('ingredientsPortal.visibilityStatusHelp')}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                aria-pressed={ingredient.status === 'active'}
                onClick={() => setIngredient({ ...ingredient, status: 'active' })}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  ingredient.status === 'active'
                    ? 'bg-emerald-700 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('admin.active')}
              </button>
              <button
                type="button"
                aria-pressed={ingredient.status === 'review'}
                onClick={() => setIngredient({ ...ingredient, status: 'review' })}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  ingredient.status === 'review'
                    ? 'bg-amber-100 text-amber-950 shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('admin.draft')}
              </button>
              <button
                type="button"
                aria-pressed={ingredient.status === 'archived'}
                onClick={() => setIngredient({ ...ingredient, status: 'archived' })}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  ingredient.status === 'archived'
                    ? 'bg-red-700 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('admin.archived')}
              </button>
            </div>
          </Card>

          {/* Review Frequency */}
          <Card>
            <ReviewFrequencySelector
              value={ingredient.preferred_review_months || 12}
              onChange={(months) => setIngredient(prev => ({ ...prev, preferred_review_months: months }))}
              label={t('ingredientsPortal.reviewFrequency')}
            />
          </Card>

          {/* Compliance Status */}
          <Card>
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
                    {compliance.status === 'compliant' ? t('ingredientsPortal.compliantStatus') :
                     compliance.status === 'warning' ? t('ingredientsPortal.reviewDueSoonStatus') : t('ingredientsPortal.notCompliantStatus')}
                  </div>
                </div>

                {compliance.reasons.length > 0 && (
                  <div className="space-y-1">
                    {compliance.reasons.map((reason: string, idx: number) => (
                      <div key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-gray-400 mt-0.5">•</span>
                        <span>{translateComplianceReason(reason, t)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {compliance.lastReviewedAt && (
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    {t('corePortal.lastReviewed')} {new Date(compliance.lastReviewedAt).toLocaleDateString(language)}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">{t('admin.unableLoadComplianceStatus')}</div>
            )}
          </Card>


        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="p-6">
            {canDeleteContent && (
              <button type="button" onClick={handleDelete} disabled={deleting} className="w-full mt-3 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors">
                <Trash2 className="h-4 w-4" />
                {deleting ? t('admin.deletingMenuItem') : t('admin.deleteIngredient')}
              </button>
            )}
          </Card>


        </div>
      </div>

        <RegularFormActions feedback={formError ? { text: formError, error: true } : undefined} onSave={handleSave} onCancel={() => { if (confirmLeave()) router.push(returnTo) }} saveLabel={saving ? t('admin.savingMenuItem') : documentRetry ? t('regularItemSave.saveAndRetry') : t('admin.saveChanges')} disabled={false} busy={saving || deleting} />
    </fieldset>
      </Container>

    </>
  )
}
