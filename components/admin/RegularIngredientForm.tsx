// Ingredient creation publishes directly when saved.
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import DatasheetUploader from '@/components/admin/DatasheetUploader'
import IngredientSupplierVariantsEditor from '@/components/admin/IngredientSupplierVariantsEditor'
import { ReviewFrequencySelector } from '@/components/admin/ReviewFrequencySelector'
import type { AllergenWarnings } from '@/types/allergen'
import {
  deriveEffectiveIngredientSafety,
  type SupplierProfileMap,
} from '@/lib/ingredient-supplier-profiles'
import { AttachmentUploadError, RegularItemSaveError, createRegularItemSaver } from '@/lib/regular-item-save'

import { isIngredientAssessmentComplete } from '@/lib/allergen-assessment'
import { CategoryFields } from '@/components/admin/CategoryFields'
import { useTranslation } from '@/lib/hooks/useTranslation'

export default function RegularIngredientForm() {
  const { showNotification } = useNotification()
  const { t } = useTranslation()
  const router = useRouter()
  const { returnTo } = useListReturnPath('/admin/ingredients')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const saveLock = useRef(false)
  const [itemSaver] = useState(() => createRegularItemSaver('ingredient'))
  const [uploadRetryNeeded, setUploadRetryNeeded] = useState(false)
  const [datasheets, setDatasheets] = useState<any[]>([])



  const [ingredient, setIngredient] = useState({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    allergen_warnings: {} as AllergenWarnings,
    suppliers: [] as string[],
    certifications: [] as string[],
    preferred_review_months: 12,
  })

  const [availableSuppliers, setAvailableSuppliers] = useState<string[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [customCertInput, setCustomCertInput] = useState('')
  const [showCustomCertInput, setShowCustomCertInput] = useState(false)

  // Per-supplier profiles
  const [supplierProfiles, setSupplierProfiles] = useState<SupplierProfileMap>({})


  const applyDefaultSupplierToDatasheets = (files: any[], suppliers: string[]) => {
    if (suppliers.length !== 1) {
      return files
    }

    const defaultSupplier = suppliers[0].trim()
    if (!defaultSupplier) {
      return files
    }

    return files.map((file) => {
      const currentSupplier = typeof file.supplier_name === 'string' ? file.supplier_name.trim() : ''
      if (currentSupplier) {
        return file
      }
      return { ...file, supplier_name: defaultSupplier }
    })
  }

  useEffect(() => {
    if (datasheets.length === 0) {
      return
    }

    const updated = applyDefaultSupplierToDatasheets(datasheets, ingredient.suppliers)
    const hasChanges = updated.some((file, index) => file.supplier_name !== datasheets[index]?.supplier_name)

    if (hasChanges) {
      setDatasheets(updated)
    }
  }, [ingredient.suppliers, datasheets])

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoadingSuppliers(true)

        // Add timeout to prevent hanging
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        const response = await fetch('/api/suppliers', {
          signal: controller.signal
        })
        clearTimeout(timeoutId)

        const data = await response.json()

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
        // Don't show error to user, just continue with empty suppliers list
        setAvailableSuppliers([])
      } finally {
        setLoadingSuppliers(false)
      }
    }

    fetchSuppliers()
  }, [])

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

  const { confirmLeave, markSaved } = useUnsavedChanges({ ingredient, supplierProfiles, datasheets, customCertInput }, true)

  const { issues, reportIssues, fieldProps } = useRegularFormValidation({ ingredient, supplierProfiles })

  const handleSave = async () => {
    if (saveLock.current) return
    setFormError('')
    if (reportIssues([

      ...(!ingredient.name.trim() ? [{ field: 'regular-name', message: t('ingredientsPortal.nameRequired') }] : []),
      ...(!isIngredientAssessmentComplete(ingredient.allergen_warnings, supplierProfiles) ? [{ field: 'regular-assessment', message: t('reminders.completeIngredient') }] : []),
    ])) return
    saveLock.current = true
    setSaving(true)
    try {
      await itemSaver.save(
        { ...ingredient, supplier_profiles: supplierProfiles },
        datasheets,
        t('regularItemSave.saveFailed'),
      )
      setUploadRetryNeeded(false)
      showNotification(t('ingredientsPortal.ingredientSaved'), 'success')
      markSaved(); router.push(returnTo)
    } catch (error: unknown) {

      if (error instanceof AttachmentUploadError) {
        setUploadRetryNeeded(true)
      } else {
        const message = error instanceof RegularItemSaveError && ['completeIngredient', 'completeMenu'].includes(error.code || '') ? t(`reminders.${error.code}`) : error instanceof Error ? error.message : t('regularItemSave.saveFailed')
        setFormError(message)
        showNotification(message, 'error')
      }
      saveLock.current = false
    } finally {
      setSaving(false)
    }
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
    if (ingredient.certifications.includes(cert)) {
      setIngredient({
        ...ingredient,
        certifications: ingredient.certifications.filter(c => c !== cert)
      })
    } else {
      setIngredient({
        ...ingredient,
        certifications: [...ingredient.certifications, cert]
      })
    }
  }

  const addCustomCertification = () => {
    if (customCertInput.trim() && !ingredient.certifications.includes(customCertInput.trim())) {
      setIngredient({
        ...ingredient,
        certifications: [...ingredient.certifications, customCertInput.trim()]
      })
      setCustomCertInput('')
      setShowCustomCertInput(false)
      requestAnimationFrame(() => document.getElementById('regular-custom-certification-toggle')?.focus())
    }
  }

  const removeCustomCertification = (cert: string) => {
    setIngredient({
      ...ingredient,
      certifications: ingredient.certifications.filter(c => c !== cert)
    })
    requestAnimationFrame(() => (document.getElementById('regular-custom-certification') || document.getElementById('regular-custom-certification-toggle'))?.focus())
  }

  const isCustomCertification = (cert: string) => {
    return !certificationOptions.some(opt => opt.name === cert)
  }

  return (
    <>
      <Container>
        <div className="py-8">
        {/* Header */}
        <div data-no-translate className="mb-8">
          <Link
            href={returnTo}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t('ingredientsPortal.backToIngredients')}
          </Link>

          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-[#42b8ac] to-[#003842] rounded-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-[#003842] dark:text-white">{t('ingredientsPortal.addNewIngredient')}</h1>
                  <p className="text-gray-600">
                    {t('ingredientsPortal.newIngredientDescription')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>


        <div data-no-translate><FormValidationSummary issues={issues} /></div>
        <fieldset disabled={saving} className="min-w-0">
        {/* Basic Information */}
        <Card className="mb-8">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-[#003842] dark:text-[#42b8ac]">{t('ingredientsPortal.basicInformation')}</h2>
            <p className="text-sm text-gray-600">{t('ingredientsPortal.ingredientDetailsHelp')}</p>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              {/* Ingredient Name */}
              <div>
                <label htmlFor="regular-name" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('ingredientsPortal.ingredientName')} *
                </label>
                <input
                  type="text"
                  {...fieldProps('regular-name')}
                  value={ingredient.name}
                  onChange={(e) => setIngredient({...ingredient, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                  placeholder={t('ingredientsPortal.newNamePlaceholder')}
                />
                <FormFieldError field="regular-name" issues={issues} />
              </div>

              {/* Category */}
              <CategoryFields kind="ingredients" category={ingredient.category} subcategory={ingredient.subcategory} options={categoryOptions} onChange={fields => setIngredient({ ...ingredient, ...fields })} />

              {/* Description */}
              <div>
                <label htmlFor="regular-description" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('ingredientsPortal.descriptionOptional')}
                </label>
                <textarea
                  {...fieldProps('regular-description')}
                  value={ingredient.description}
                  onChange={(e) => setIngredient({...ingredient, description: e.target.value})}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                  placeholder={t('ingredientsPortal.newDescriptionPlaceholder')}
                />
                <FormFieldError field="regular-description" issues={issues} />
              </div>

            </div>
          </div>
        </Card>

        <Card className="mb-8 p-6">
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

        {/* Product Datasheets */}
        <Card className="mb-8">
          <div className="p-6 border-b">
            <div>
              <h2 className="text-lg font-semibold text-[#003842] dark:text-[#42b8ac]">{t('admin.productDatasheets')}</h2>
              <p className="text-sm text-gray-600">
                {t('ingredientsPortal.datasheetUploadHelp')}
              </p>
            </div>
          </div>

          <div className="p-6">
            <div id="regular-documents" tabIndex={-1}>
            <DatasheetUploader
              disabled={saving}
              entityType="ingredient"
              existingDatasheets={datasheets}
              onFilesChange={(files) => setDatasheets(applyDefaultSupplierToDatasheets(files, ingredient.suppliers))}
              maxFiles={5}
            />
            </div>
          </div>
        </Card>

        <div className="mb-8">
              {/* Certifications are entered per supplier once supplier variants exist. */}
              {ingredient.suppliers.length === 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('ingredientsPortal.certificationsAndDietaryAttributes')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {certificationOptions.map(cert => {
                    const isSelected = ingredient.certifications.includes(cert.name);
                    const IconComponent = cert.icon;

                    return (
                      <button
                        key={cert.name}
                        aria-pressed={isSelected}
                        type="button"
                        onClick={() => toggleCertification(cert.name)}
                        className={`
                          relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                          ${isSelected
                            ? 'border-opacity-100 bg-teal-50 shadow-md dark:bg-teal-950'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg dark:bg-gray-800'
                          }
                          group cursor-pointer
                        `}
                        style={{
                          borderColor: isSelected ? cert.color : undefined
                        }}
                      >
                        <div
                          className={`
                            flex items-center justify-center w-12 h-12 rounded-lg transition-all
                            ${isSelected
                              ? 'scale-100'
                              : 'group-hover:scale-110'
                            }
                            group-hover:shadow-lg
                          `}
                          style={{ backgroundColor: cert.color }}
                        >
                          {typeof cert.icon === 'function' && React.createElement(cert.icon as React.ComponentType<{className: string}>, { className: 'h-6 w-6 text-white' })}
                        </div>
                        <span
                          className={`text-xs font-semibold text-center transition-colors ${
                            isSelected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-200'
                          }`}
                        >
                          {cert.name}
                        </span>
                        {isSelected && (
                          <div
                            className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: cert.color }}
                          >
                            <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* Custom Certification Card */}
                  <button
                    type="button"
                    id="regular-custom-certification-toggle"
                    data-no-translate
                    aria-controls="regular-custom-certification-panel"
                    aria-expanded={showCustomCertInput}
                    onClick={() => setShowCustomCertInput(!showCustomCertInput)}
                    className={`
                      relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                      ${showCustomCertInput
                        ? 'border-gray-400 shadow-md bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-lg bg-white'
                      }
                      group cursor-pointer
                    `}
                  >
                    <div
                      className={`
                        flex items-center justify-center w-12 h-12 rounded-lg transition-all bg-gray-500
                        ${showCustomCertInput
                          ? 'scale-100'
                          : 'group-hover:scale-110'
                        }
                        group-hover:shadow-lg
                      `}
                    >
                      <Plus className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-center text-gray-700">
                      {t('ingredientsPortal.custom')}
                    </span>
                  </button>
                </div>

                {/* Custom Certification Input */}
                {showCustomCertInput && (
                  <div id="regular-custom-certification-panel" className="mt-4 flex flex-wrap items-end gap-2">
                    <label className="min-w-0 basis-full break-words text-sm font-medium text-gray-700 dark:text-gray-200 sm:flex-1 sm:basis-0" data-no-translate>
                      {t('ingredientsPortal.customCertification')}
                      <input
                        id="regular-custom-certification"
                        autoFocus
                        type="text"
                        value={customCertInput}
                        onChange={(e) => setCustomCertInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); addCustomCertification() } }}
                        placeholder={t('ingredientsPortal.customCertificationPlaceholder')}
                        className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-700 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </label>
                    <Button
                      variant="secondary"
                      className="min-h-11"
                      onClick={addCustomCertification}
                      disabled={!customCertInput.trim()}
                    >
                      {t('admin.add')}
                    </Button>
                    <Button variant="ghost" className="min-h-11 min-w-11" aria-label={t('admin.close')}
                      onClick={() => {
                        setShowCustomCertInput(false)
                        setCustomCertInput('')
                        requestAnimationFrame(() => document.getElementById('regular-custom-certification-toggle')?.focus())
                      }}>
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                )}

                {/* Display Custom Certifications */}
                {ingredient.certifications.filter(cert => isCustomCertification(cert)).length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">{t('ingredientsPortal.customCertifications')}</p>
                    <div className="flex flex-wrap gap-2">
                      {ingredient.certifications.filter(cert => isCustomCertification(cert)).map(cert => (
                        <span
                          key={cert}
                          data-no-translate
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
                        >
                          {cert}
                          <button
                            type="button"
                            aria-label={t('regularForms.removeIngredient', { name: cert })}
                            onClick={() => removeCustomCertification(cert)}
                            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-600 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-teal-700 dark:text-gray-300"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              )}

        </div>

        {/* Allergen Information — hidden when suppliers have their own profiles */}
        {ingredient.suppliers.length === 0 && (
        <Card className="mb-8">
          <div className="p-6 border-b">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#003842]" />
              <div>
                <h2 className="text-lg font-semibold text-[#003842] dark:text-[#42b8ac]">{t('admin.allergenInformation')}</h2>
                <p className="text-sm text-gray-600">
                  {t('ingredientsPortal.allergenWarningsHelp')}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <AllergenWarningSelector
              value={ingredient.allergen_warnings}
              onChange={(warnings) => setIngredient({...ingredient, allergen_warnings: warnings})}
            />
          </div>
        </Card>
        )}

        {/* Review Frequency */}
        <Card className="mb-8 p-6">
          <ReviewFrequencySelector
            value={ingredient.preferred_review_months}
            onChange={(months) => setIngredient((current) => ({
              ...current,
              preferred_review_months: months,
            }))}
            label={t('ingredientsPortal.reviewFrequency')}
          />
        </Card>

        </fieldset>
        {uploadRetryNeeded && (
          <div role="alert" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            {t('regularItemSave.documentsPending')}
          </div>
        )}
        {!isIngredientAssessmentComplete(ingredient.allergen_warnings, supplierProfiles) && (
          <p data-no-translate className="mb-4 text-sm font-medium text-amber-900 dark:text-amber-200">{t('reminders.completeIngredient')}</p>
        )}
        <RegularFormActions feedback={formError || (uploadRetryNeeded ? t('regularItemSave.documentsPending') : '') ? { text: formError || (uploadRetryNeeded ? t('regularItemSave.documentsPending') : ''), error: true } : undefined} onSave={() => handleSave()} onCancel={() => { if (confirmLeave()) router.push(returnTo) }} saveLabel={saving ? t('admin.savingMenuItem') : uploadRetryNeeded ? t('regularItemSave.saveAndRetry') : t('admin.saveChanges')} disabled={false} busy={saving} />
      </div>
    </Container>

    </>
  )
}
