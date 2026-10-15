'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Truck,
} from 'lucide-react'
import AllergenWarningSelector from '@/components/admin/AllergenWarningSelector'
import { Button } from '@/components/ui/Button'
import {
  buildCompleteSupplierProfiles,
  normalizeSupplierNames,
  type SupplierProfileMap,
  type SupplierSafetyProfile,
} from '@/lib/ingredient-supplier-profiles'
import type { AllergenWarnings } from '@/types/allergen'
import { isAllergenAssessmentComplete } from '@/lib/allergen-assessment'
import { useTranslation } from '@/lib/hooks/useTranslation'

type CertificationOption = {
  name: string
  color: string
  icon: React.ComponentType<{ className?: string }>
}

const createBlankAllergenWarnings = (): AllergenWarnings => ({} as AllergenWarnings)

interface IngredientSupplierVariantsEditorProps {
  suppliers: string[]
  profiles: SupplierProfileMap
  availableSuppliers: string[]
  loadingSuppliers?: boolean
  fallbackAllergens: AllergenWarnings
  fallbackCertifications: string[]
  certificationOptions: CertificationOption[]
  onChange: (suppliers: string[], profiles: SupplierProfileMap) => void
}

export default function IngredientSupplierVariantsEditor({
  suppliers,
  profiles,
  availableSuppliers,
  loadingSuppliers = false,
  fallbackAllergens,
  fallbackCertifications,
  certificationOptions,
  onChange,
}: IngredientSupplierVariantsEditorProps) {
  const { t } = useTranslation()
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [newSupplier, setNewSupplier] = useState('')
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(() => new Set())
  const [supplierToReveal, setSupplierToReveal] = useState<string | null>(null)
  const supplierSectionRefs = useRef(new Map<string, HTMLElement>())

  useEffect(() => {
    if (!supplierToReveal) return

    const section = supplierSectionRefs.current.get(supplierToReveal)
    if (!section) return

    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    section.querySelector<HTMLButtonElement>('[data-supplier-toggle]')?.focus({ preventScroll: true })
    setSupplierToReveal(null)
  }, [supplierToReveal, suppliers])

  const displayedProfiles = Object.keys(profiles).length > 0
    ? profiles
    : buildCompleteSupplierProfiles(suppliers, profiles, fallbackAllergens, fallbackCertifications)
  const variantEntries = Object.entries(displayedProfiles)

  const reviewCount = variantEntries.filter(([, profile]) => profile.assessment_status !== 'assessed' || !isAllergenAssessmentComplete(profile.allergen_warnings)).length

  const emitProfiles = (nextProfiles: SupplierProfileMap) => {
    onChange(
      normalizeSupplierNames(Object.entries(nextProfiles).map(([key, profile]) => profile.supplier_name || key)),
      nextProfiles
    )
  }

  const addSupplier = (rawName: string) => {
    const name = rawName.trim()
    if (!name) return

    const profileKey = crypto.randomUUID()
    const nextProfiles = { ...displayedProfiles }
    nextProfiles[profileKey] = {
      supplier_name: name,
      brand: '',
      allergen_warnings: createBlankAllergenWarnings(),
      certifications: [],
      assessment_status: 'needs_review',
      notes: '',
      last_reviewed_at: null,
    }
    emitProfiles(nextProfiles)
    setExpandedSuppliers((current) => new Set(current).add(profileKey))
    setSupplierToReveal(profileKey)
  }

  const updateProfile = (profileKey: string, updates: Partial<SupplierSafetyProfile>) => {
    const current = displayedProfiles[profileKey] || {
      allergen_warnings: fallbackAllergens,
      certifications: fallbackCertifications,
      assessment_status: 'needs_review' as const,
    }

    emitProfiles({
      ...displayedProfiles,
      [profileKey]: { ...current, ...updates },
    })
  }

  const removeSupplier = (profileKey: string) => {
    const nextProfiles = { ...displayedProfiles }
    delete nextProfiles[profileKey]
    emitProfiles(nextProfiles)
    setExpandedSuppliers((current) => {
      const next = new Set(current)
      next.delete(profileKey)
      return next
    })
  }

  const toggleExpanded = (supplier: string) => {
    setExpandedSuppliers((current) => {
      const next = new Set(current)
      if (next.has(supplier)) next.delete(supplier)
      else next.add(supplier)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-[#0f766e]" />
            <h2 className="text-xl font-semibold text-[#003842] dark:text-[#42b8ac]">{t('ingredientsPortal.supplierVariants')}</h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
            {t('ingredientsPortal.supplierVariantsHelp')}
          </p>
        </div>
        {variantEntries.length > 0 && (
          <div className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${reviewCount > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
            {reviewCount > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {reviewCount > 0 ? t('ingredientsPortal.profilesNeedReview', { count: reviewCount }) : t('ingredientsPortal.allProfilesReviewed')}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <select
          value={selectedSupplier}
          onChange={(event) => {
            const value = event.target.value
            setSelectedSupplier('')
            addSupplier(value)
          }}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-[#42b8ac] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="">{loadingSuppliers ? t('ingredientsPortal.loadingSuppliers') : t('ingredientsPortal.chooseExistingSupplier')}</option>
          {availableSuppliers.map((supplier) => <option key={supplier} value={supplier}>{supplier}</option>)}
        </select>
        <div className="flex min-w-0 gap-2">
          <input
            type="text"
            data-unsaved-draft value={newSupplier}
            onChange={(event) => setNewSupplier(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addSupplier(newSupplier)
                setNewSupplier('')
              }
            }}
            placeholder={t('ingredientsPortal.enterNewSupplier')}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-[#42b8ac] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <Button
            type="button"
            variant="outline"
            icon={<Plus className="h-4 w-4" />}
            disabled={!newSupplier.trim()}
            onClick={() => {
              addSupplier(newSupplier)
              setNewSupplier('')
            }}
          >
            {t('admin.add')}
          </Button>
        </div>
      </div>

      {variantEntries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-400">
          {t('ingredientsPortal.noSupplierVariants')}
        </div>
      ) : (
        <div className="space-y-3">
          {variantEntries.map(([profileKey, profile]) => {
            const supplier = profile.supplier_name || profileKey
            const isExpanded = expandedSuppliers.has(profileKey)
            const isAssessed = profile?.assessment_status === 'assessed' && isAllergenAssessmentComplete(profile.allergen_warnings)

            return (
              <section
                key={profileKey}
                ref={(element) => {
                  if (element) supplierSectionRefs.current.set(profileKey, element)
                  else supplierSectionRefs.current.delete(profileKey)
                }}
                className="scroll-mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center gap-2 p-3 sm:p-4">
                  <button
                    type="button"
                    data-supplier-toggle
                    onClick={() => toggleExpanded(profileKey)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#42b8ac]"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? <ChevronDown className="h-5 w-5 shrink-0 text-gray-500" /> : <ChevronRight className="h-5 w-5 shrink-0 text-gray-500" />}
                    <span className="min-w-0 flex-1 truncate font-semibold text-gray-900 dark:text-white">{supplier}</span>
                    <span className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline ${isAssessed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                      {isAssessed ? t('ingredientsPortal.reviewed') : t('ingredientsPortal.needsReview')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSupplier(profileKey)}
                    aria-label={t('ingredientsPortal.removeSupplier', { supplier })}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {isExpanded && (
                  <div className="space-y-6 border-t border-gray-200 bg-gray-50/70 p-4 sm:p-5 dark:border-gray-700 dark:bg-gray-900/30">
                    {!isAssessed && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>{t('ingredientsPortal.inheritedSafetyHelp')}</p>
                      </div>
                    )}

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor={`supplier-brand-${profileKey}`}>
                        {t('ingredientsPortal.variantBrand')}
                      </label>
                      <input
                        id={`supplier-brand-${profileKey}`}
                        type="text"
                        value={profile?.brand || ''}
                        onChange={(event) => updateProfile(profileKey, { brand: event.target.value })}
                        maxLength={200}
                        placeholder={t('ingredientsPortal.variantBrandPlaceholder')}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#42b8ac] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {t('ingredientsPortal.variantBrandHelp')}
                      </p>
                    </div>

                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">{t('ingredientsPortal.allergensSuppliedBy', { supplier })}</h3>
                      <AllergenWarningSelector
                        value={profile?.allergen_warnings || fallbackAllergens}
                        onChange={(allergen_warnings) => updateProfile(profileKey, {
                          allergen_warnings,
                          assessment_status: 'needs_review',
                          last_reviewed_at: null,
                        })}
                      />
                    </div>

                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">{t('ingredientsPortal.dietaryCertifications')}</h3>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {certificationOptions.map(({ name, color, icon: Icon }) => {
                          const selected = (profile?.certifications || []).includes(name)
                          return (
                            <button
                              type="button"
                              key={name}
                              aria-pressed={selected}
                              onClick={() => {
                                const current = profile?.certifications || []
                                updateProfile(profileKey, {
                                  certifications: selected ? current.filter((item) => item !== name) : [...current, name],
                                  assessment_status: 'needs_review',
                                  last_reviewed_at: null,
                                })
                              }}
                              className={`flex min-h-11 items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-xs font-semibold transition ${selected ? 'bg-teal-50 text-gray-900 shadow-sm dark:bg-teal-950 dark:text-gray-100' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}
                              style={selected ? { borderColor: color } : undefined}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <span>{name}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor={`supplier-notes-${profileKey}`}>
                        {t('ingredientsPortal.profileNotes')}
                      </label>
                      <textarea
                        id={`supplier-notes-${profileKey}`}
                        value={profile?.notes || ''}
                        onChange={(event) => updateProfile(profileKey, { notes: event.target.value })}
                        rows={2}
                        placeholder={t('ingredientsPortal.profileNotesPlaceholder')}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#42b8ac] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        data-review-profile={!isAssessed || undefined}
                        disabled={!isAllergenAssessmentComplete(profile?.allergen_warnings)}
                        variant={isAssessed ? 'outline' : 'primary'}
                        icon={<CheckCircle2 className="h-4 w-4" />}
                        onClick={() => updateProfile(profileKey, {
                          assessment_status: 'assessed',
                          last_reviewed_at: new Date().toISOString(),
                        })}
                      >
                        {isAssessed ? t('ingredientsPortal.reviewed') : t('ingredientsPortal.markProfileReviewed')}
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
