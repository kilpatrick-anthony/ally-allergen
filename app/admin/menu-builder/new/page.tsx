// app/admin/menu-builder/new/page.tsx
'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useRegularFormValidation } from '@/lib/hooks/useRegularFormValidation'
import { FormValidationSummary, FormFieldError } from '@/components/admin/FormValidationSummary'
import { useUnsavedChanges } from '@/lib/hooks/useUnsavedChanges'
import { IngredientPicker } from '@/components/admin/IngredientPicker'
import { MenuDietaryFields } from '@/components/admin/MenuDietaryFields'
import { RegularFormActions } from '@/components/admin/RegularFormActions'
import { useListReturnPath } from '@/lib/hooks/useListReturnPath'
import { AttachmentUploadError, RegularItemSaveError, createRegularItemSaver } from '@/lib/regular-item-save'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { ArrowLeft, Save, X, Plus, CheckCircle, AlertTriangle } from 'lucide-react'

import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import AllergenWarningDisplay from '@/components/kiosk/AllergenWarningDisplay'
import AllergenWarningSelector from '@/components/admin/AllergenWarningSelector'
import DatasheetUploader from '@/components/admin/DatasheetUploader'
import { MenuItemSupplyFields, type MenuItemType, type SupplierOption } from '@/components/admin/MenuItemSupplyFields'
import { ReviewFrequencySelector } from '@/components/admin/ReviewFrequencySelector'
import type { AllergenWarnings } from '@/types/allergen'
import { mergeAllergenAssessments, isIngredientAssessmentComplete, isAllergenAssessmentComplete } from '@/lib/allergen-assessment'

interface MenuItem {
  name: string
  description: string
  category: string
  site_id: string | null
  allergen_warnings: AllergenWarnings
  dietary: string[]
  ingredients: string[]
  preferred_review_months: number
  color?: string
  icon?: string
  item_type: MenuItemType
  supplier_id: string | null
  manufacturer: string
  product_code: string
  barcode: string
  ingredient_declaration: string
  label_verified_at: string | null
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

function NewMenuItemForm() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useSearchParams()
  const { returnTo } = useListReturnPath('/admin/menu-builder')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const saveLock = useRef(false)
  const [itemSaver] = useState(() => createRegularItemSaver('menu_item'))
  const [uploadRetryNeeded, setUploadRetryNeeded] = useState(false)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [sites, setSites] = useState<SiteOption[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [datasheets, setDatasheets] = useState<any[]>([])
  const [showIngredientSelector, setShowIngredientSelector] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const [uploadingIcon, setUploadingIcon] = useState(false)

  const [menuItem, setMenuItem] = useState<MenuItem>({
    name: '',
    description: '',
    category: '',
    site_id: params.get('site') || null,
    allergen_warnings: {} as AllergenWarnings,
    dietary: [],
    ingredients: [],
    preferred_review_months: 12,
    color: '',
    icon: '',
    item_type: (params.get('type') === 'packaged_product' ? 'packaged_product' : 'prepared') as MenuItemType, supplier_id: null, manufacturer: '', product_code: '',
    barcode: '', ingredient_declaration: '', label_verified_at: null,
  })

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

  const defaultWarnings = {} as AllergenWarnings

  // Load ingredients and sites
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [ingredientResponse, sitesResponse, suppliersResponse] = await Promise.all([
          fetch('/api/ingredients'),
          fetch('/api/sites'),
          fetch('/api/suppliers')
        ])

        const ingredientData = await ingredientResponse.json()
        if (ingredientResponse.ok) {
          const mappedIngredients = (ingredientData.ingredients || []).map((ingredient: any) => ({
            id: ingredient.id,
            name: ingredient.name,
            allergen_warnings: { ...(ingredient.allergen_warnings || {}), assessment_incomplete: (ingredient.status && ingredient.status !== 'active') || !isIngredientAssessmentComplete(ingredient.allergen_warnings, ingredient.supplier_profiles) },
            suppliers: ingredient.suppliers || [],
            certifications: ingredient.certifications || []
          }))
          setIngredients(mappedIngredients)
        }

        const sitesData = await sitesResponse.json()
        if (sitesResponse.ok) {
          const mappedSites = (sitesData.sites || []).map((site: any) => ({
            id: site.id,
            name: site.name
          }))
          setSites(mappedSites)
        }
        const suppliersData = await suppliersResponse.json()
        if (suppliersResponse.ok) setSuppliers((suppliersData.suppliers || []).map((supplier: any) => ({ id: supplier.id, name: supplier.name })))
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleIngredientSelect = (ingredientId: string) => {
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
    setMenuItem({
      ...menuItem,
      ingredients: updatedIngredients,
      allergen_warnings: profiles.length > 0
        ? mergeAllergenAssessments(profiles)
        : { ...defaultWarnings },
      dietary: mergedCertifications,
    })
  }

  const handleIconUpload = async (file: File | null) => {
    if (!file) return

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

      setMenuItem(current => ({ ...current, icon: data.iconUrl }))
    } catch (error: any) {
      console.error('Error uploading menu item icon:', error)
      setSaveStatus('error')
      setSaveMessage(error?.message || 'Failed to upload icon')
    } finally {
      setUploadingIcon(false)
    }
  }

  const { confirmLeave, markSaved } = useUnsavedChanges({ menuItem, datasheets }, !loading && Boolean(menuItem))

  const { issues, reportIssues, fieldProps } = useRegularFormValidation(menuItem)

  const handleSave = async (activate = true) => {
    if (saveLock.current) return
    if (!menuItem) return
    const active = true
    const ready = isAllergenAssessmentComplete(menuItem.allergen_warnings) && (menuItem.item_type === 'prepared'
      ? menuItem.ingredients.length > 0
      : Boolean(menuItem.supplier_id && menuItem.ingredient_declaration.trim()))
    if (reportIssues([
      ...(!menuItem.name.trim() ? [{ field: 'regular-name', message: t('regularForms.nameRequired') }] : []),
      ...(active && !menuItem.description.trim() ? [{ field: 'regular-description', message: t('regularForms.descriptionRequired') }] : []),
      ...(active && !ready ? [{ field: menuItem.item_type === 'prepared' ? 'regular-recipe' : !menuItem.supplier_id ? 'regular-supplier' : !menuItem.ingredient_declaration.trim() ? 'regular-declaration' : 'regular-assessment', message: t('reminders.completeMenu') }] : []),
    ])) return
    saveLock.current = true
    setSaving(true)
    setSaveStatus('saving')
    setSaveMessage(t('admin.savingMenuItem'))
    try {
      await itemSaver.save({ ...menuItem, status: 'active' }, datasheets, t('regularItemSave.saveFailed'))
      setUploadRetryNeeded(false)
      setSaveStatus('success')
      setSaveMessage(t('regularItemSave.saved'))
      markSaved(); router.push(returnTo)
    } catch (error: unknown) {
      setSaveStatus('error')
      if (error instanceof AttachmentUploadError) {
        setUploadRetryNeeded(true)
        setSaveMessage(t('regularItemSave.documentsPending'))
      } else {
        setSaveMessage(error instanceof RegularItemSaveError && ['completeIngredient', 'completeMenu'].includes(error.code || '') ? t(`reminders.${error.code}`) : error instanceof Error ? error.message : t('regularItemSave.saveFailed'))
      }
      saveLock.current = false
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative h-12 w-12 mx-auto mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">{t('admin.loading')}</p>
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
            href={returnTo}
            className="inline-flex items-center gap-2 text-[#42b8ac] hover:text-[#003842] dark:hover:text-[#42b8ac] font-medium mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('admin.backToMenuBuilder')}
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {t('admin.createNewMenuItem')}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {t('admin.createNewMenuItemDesc')}
          </p>
        </div>

        <FormValidationSummary issues={issues} />
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Menu Item Name */}
            <Card className="p-6">
              <label htmlFor="regular-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('admin.menuItemName')} *
              </label>
              <input
                type="text"
                {...fieldProps('regular-name')}
                  value={menuItem.name}
                onChange={(e) => setMenuItem({ ...menuItem, name: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={t('admin.menuItemName')}
              />
                <FormFieldError field="regular-name" issues={issues} />
            </Card>

            {/* Category */}
            <Card className="p-6">
              <label htmlFor="regular-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('admin.category')}
              </label>
              <input
                type="text"
                list="menu-item-categories"
                {...fieldProps('regular-category')}
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
              <label htmlFor="regular-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('admin.itemDescription')}
                <span className="mt-1 block text-xs font-normal text-gray-500 dark:text-gray-400">{t('reminders.descriptionHelp')}</span>
              </label>
              <textarea
                {...fieldProps('regular-description')}
                  value={menuItem.description}
                onChange={(e) => setMenuItem({ ...menuItem, description: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={t('admin.descriptionPlaceholder')}
              />
                <FormFieldError field="regular-description" issues={issues} />
            </Card>

            <Card className="p-6">
              <MenuItemSupplyFields
                value={menuItem}
                suppliers={suppliers}
                onChange={(changes) => setMenuItem(current => ({
                  ...current,
                  ...changes,
                  ...(changes.item_type && changes.item_type !== current.item_type ? { ingredients: [], allergen_warnings: {} as AllergenWarnings, dietary: [], label_verified_at: null } : {}),
                }))}
              />
            </Card>
            {menuItem.item_type === 'prepared' && <>
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
                            aria-label={t('regularForms.removeIngredient', { name: ingredient.name })}
                            onClick={() => { handleIngredientSelect(ingredient.id); requestAnimationFrame(() => document.getElementById('regular-recipe')?.focus()) }}
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
                id="regular-recipe"
                data-no-translate
                onClick={() => setShowIngredientSelector(true)}
                variant="outline"
                icon={<Plus className="h-4 w-4" />}
                fullWidth
              >
                {menuItem.ingredients.length === 0 ? t('admin.addIngredients') : t('admin.addMoreIngredients')}
              </Button>
            </Card>
            </>}

            {/* Allergen Information */}
            <Card className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <span id="regular-assessment" tabIndex={-1}>{t('admin.allergenInformation')}</span>
              </label>
              {menuItem.item_type === 'packaged_product' ? (
                <AllergenWarningSelector value={menuItem.allergen_warnings} onChange={(allergen_warnings) => setMenuItem({ ...menuItem, allergen_warnings })} />
              ) : menuItem.ingredients.length > 0 ? (
                <>
                  <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                    {t('admin.preparedAllergenHelp')}
                  </p>
                  <div className="rounded-xl border border-[#42b8ac]/30 bg-[#42b8ac]/5 p-4">
                    <AllergenWarningDisplay warnings={menuItem.allergen_warnings} showNone={true} />
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800/60 dark:text-gray-400">
                  {t('admin.addIngredientsForAllergens')}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <MenuDietaryFields prepared={menuItem.item_type === 'prepared'} value={menuItem.dietary} onChange={dietary => setMenuItem(current => ({ ...current, dietary }))} />
            </Card>
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">{t('admin.menuItemSpecificDatasheets')}</h2>
              <DatasheetUploader entityType="menu_item" onFilesChange={setDatasheets} />
            </Card>


            {/* Site Scope */}
            <Card className="p-6">
              <label htmlFor="regular-site-scope" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('admin.siteScope')}
              </label>
              <select id="regular-site-scope"
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

            {/* Review Frequency */}
            <Card className="p-6">
              <ReviewFrequencySelector
                value={menuItem.preferred_review_months}
                onChange={(months) => setMenuItem((current) => ({
                  ...current,
                  preferred_review_months: months,
                }))}
                label={t('admin.reviewFrequency')}
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
              <div className="flex flex-wrap items-center gap-4">
                <input
                  id="regular-tile-colour"
                  aria-label={t('admin.tileColour')}
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
                    data-no-translate
                    aria-label={`${t('admin.clear')}: ${t('admin.tileColour')}`}
                    onClick={() => { setMenuItem({ ...menuItem, color: '' }); requestAnimationFrame(() => document.getElementById('regular-tile-colour')?.focus()) }}
                    className="min-h-11 rounded px-2 text-xs text-gray-600 dark:text-gray-300 hover:text-red-700 underline focus-visible:ring-2 focus-visible:ring-teal-600"
                  >
                    {t('admin.clear')}
                  </button>
                )}
              </div>
            </Card>

            {/* Menu Item Icon/Image */}
            <Card className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('admin.iconOrPicture')} <span className="text-gray-400 font-normal">({t('admin.optional')})</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                {t('admin.iconPictureHelp')}
              </p>

              {/* Upload Custom Image */}
              <div className="mb-5 pb-5 border-b border-gray-200 dark:border-gray-600">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t('admin.uploadCustomImage')}</p>
                <input
                  id="regular-menu-image"
                  aria-label={t('admin.uploadCustomImage')}
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
                    data-no-translate
                    aria-label={`${t('admin.clear')}: ${t('admin.selectedIcon')}`}
                    onClick={() => { setMenuItem({ ...menuItem, icon: '' }); requestAnimationFrame(() => document.getElementById('regular-menu-image')?.focus()) }}
                    className="min-h-11 rounded px-2 text-xs text-gray-600 dark:text-gray-300 hover:text-red-700 underline focus-visible:ring-2 focus-visible:ring-teal-600"
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
                    aria-label={t('regularForms.menuIconLabel', { name: preset.name })}
                    aria-pressed={menuItem.icon === preset.icon}
                    title={preset.name}
                  >
                    {preset.icon}
                  </button>
                ))}
              </div>
            </Card>


          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Final Allergen Summary */}
            <Card className={`p-6 border-2 ${isAllergenAssessmentComplete(menuItem.allergen_warnings) ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20' : 'border-amber-300 bg-amber-50 dark:bg-amber-900/20'}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`shrink-0 p-2 rounded-lg ${isAllergenAssessmentComplete(menuItem.allergen_warnings) ? 'bg-emerald-600' : 'bg-amber-600'}`}>
                  {isAllergenAssessmentComplete(menuItem.allergen_warnings) ? <CheckCircle className="h-5 w-5 text-white" /> : <AlertTriangle className="h-5 w-5 text-white" />}
                </div>
                <h3 className="min-w-0 break-words font-semibold text-gray-900 dark:text-gray-100">{t('admin.allergenSummary')}</h3>
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

        <RegularFormActions feedback={saveStatus === 'idle' ? undefined : { text: saveMessage, error: saveStatus === 'error' }} onSave={() => handleSave(true)} onCancel={() => { if (confirmLeave()) router.push(returnTo) }} saveLabel={saving ? t('admin.savingMenuItem') : uploadRetryNeeded ? t('regularItemSave.saveAndRetry') : t('admin.saveChanges')} disabled={false} busy={saving || uploadingIcon} />
      </Container>

      <IngredientPicker open={showIngredientSelector} onOpenChange={setShowIngredientSelector}
        ingredients={ingredients} selectedIds={menuItem.ingredients} onToggle={handleIngredientSelect} />

    </>
  )
}

export default function NewMenuItemPage() {
  return <Suspense><NewMenuItemForm /></Suspense>
}
