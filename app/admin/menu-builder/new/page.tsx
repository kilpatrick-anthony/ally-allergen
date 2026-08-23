// app/admin/menu-builder/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { ArrowLeft, Save, X, Plus, CheckCircle } from 'lucide-react'

import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import AllergenWarningDisplay from '@/components/kiosk/AllergenWarningDisplay'
import { LabelScanModal } from '@/components/admin/LabelScanModal'
import AllergenWarningSelector from '@/components/admin/AllergenWarningSelector'
import DatasheetUploader from '@/components/admin/DatasheetUploader'
import { MenuItemSupplyFields, type MenuItemType, type SupplierOption } from '@/components/admin/MenuItemSupplyFields'
import { ReviewFrequencySelector } from '@/components/admin/ReviewFrequencySelector'
import type { AllergenWarnings } from '@/types/allergen'
import { computeWorstCaseAllergens } from '@/types/allergen'

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

export default function NewMenuItemPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [sites, setSites] = useState<SiteOption[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [datasheets, setDatasheets] = useState<any[]>([])
  const [showIngredientSelector, setShowIngredientSelector] = useState(false)
  const [showScan, setShowScan] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [uploadingIcon, setUploadingIcon] = useState(false)

  const [menuItem, setMenuItem] = useState<MenuItem>({
    name: '',
    description: '',
    category: '',
    site_id: null,
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
    },
    dietary: [],
    ingredients: [],
    preferred_review_months: 12,
    color: '',
    icon: '',
    item_type: 'prepared', supplier_id: null, manufacturer: '', product_code: '',
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
            allergen_warnings: ingredient.allergen_warnings || { ...defaultWarnings },
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
        ? computeWorstCaseAllergens(profiles)
        : { ...defaultWarnings },
      dietary: mergedCertifications,
    })
  }

  const filteredIngredients = ingredients.filter(ing =>
    ing.name.toLowerCase().includes(ingredientSearch.toLowerCase())
  )

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

  const handleSave = async () => {
    if (!menuItem.name || !menuItem.description) {
      setSaveStatus('error')
      setSaveMessage('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)
      setSaveStatus('saving')
      setSaveMessage(t('admin.savingMenuItem'))

      const response = await fetch('/api/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...menuItem,
          status: 'active'
        })
      })

      const data = await response.json()

      if (!response.ok) {
          throw new Error(data.error || t('admin.failedToDownload'))
      }

      if (datasheets.length > 0) {
        setSaveMessage('Uploading product evidence...')
        await Promise.all(datasheets.filter(sheet => sheet.file).map(async sheet => {
          const formData = new FormData()
          formData.append('file', sheet.file)
          formData.append('menu_item_id', data.menuItem.id)
          if (sheet.supplier_name) formData.append('supplier_name', sheet.supplier_name)
          if (sheet.version) formData.append('version', sheet.version)
          if (sheet.next_review_date) formData.append('next_review_date', sheet.next_review_date)
          if (sheet.notes) formData.append('notes', sheet.notes)
          const uploadResponse = await fetch('/api/upload/datasheet', { method: 'POST', body: formData })
          const uploadData = await uploadResponse.json()
          if (!uploadResponse.ok) throw new Error(uploadData.error || 'The item was created, but its datasheet could not be uploaded')
        }))
      }

      setSaveStatus('success')
      setSaveMessage('Menu item saved successfully!')
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/admin/menu-builder')
      }, 1000)
    } catch (error: any) {
      console.error('Error saving menu item:', error)
      setSaveStatus('error')
      setSaveMessage(error?.message || t('admin.failedToDownload'))
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
            Back to Menu Builder
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {t('admin.createNewMenuItem')}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {t('admin.createNewMenuItemDesc')}
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <MenuItemSupplyFields
                value={menuItem}
                suppliers={suppliers}
                onChange={(changes) => setMenuItem(current => ({
                  ...current,
                  ...changes,
                  ...(changes.item_type === 'packaged_product' ? { ingredients: [] } : {}),
                }))}
                onScanLabel={() => setShowScan(true)}
              />
            </Card>
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
                placeholder={t('admin.menuItemName')}
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
                placeholder={t('admin.descriptionPlaceholder')}
              />
            </Card>

            {/* Tile Colour */}
            <Card className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('admin.tileColour')} <span className="text-gray-400 font-normal">({t('admin.optional')})</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Choose a background colour for this item's tile on the kiosk. Leave blank to use the default white tile.
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
                {t('admin.iconOrPicture')} <span className="text-gray-400 font-normal">({t('admin.optional')})</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                {t('admin.iconPictureHelp')}
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

            {menuItem.item_type === 'prepared' && <>
            {/* Selected Ingredients */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('admin.selectedIngredients')}
                </label>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {menuItem.ingredients.length} selected
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
            </>}

            {/* Allergen Information */}
            <Card className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('admin.allergenInformation')}
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

            {menuItem.item_type === 'packaged_product' && (
              <Card className="p-6 space-y-5">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('admin.dietaryClaims')}</h2>
                  <p className="mt-1 text-xs text-gray-500">{t('admin.dietaryClaimsHelp')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Vegan', 'Vegetarian', 'Gluten-Free', 'Halal', 'Kosher', 'Organic', 'Lactose-Free', 'Coeliac-Friendly'].map(claim => (
                    <button key={claim} type="button" onClick={() => setMenuItem(current => ({ ...current, dietary: current.dietary.includes(claim) ? current.dietary.filter(value => value !== claim) : [...current.dietary, claim] }))} className={`rounded-full border px-3 py-1.5 text-sm ${menuItem.dietary.includes(claim) ? 'border-[#42b8ac] bg-[#42b8ac]/10 text-[#0f766e]' : 'border-gray-300 text-gray-600'}`}>{claim}</button>
                  ))}
                </div>
                <DatasheetUploader entityType="menu_item" onFilesChange={setDatasheets} />
              </Card>
            )}

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
            <Card className="p-6 sticky top-6">
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
                  <h2 className="text-lg font-semibold text-[#003842] dark:text-[#42b8ac]">Select Ingredients</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Choose ingredients for your menu item</p>
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
                  placeholder="Search ingredients..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredIngredients.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {t('admin.noIngredientsFound')}
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
                {t('admin.done')}
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
          setMenuItem(current => ({ ...current, name: scanData.name || current.name, description: scanData.description || current.description, allergen_warnings: scanData.allergen_warnings || current.allergen_warnings }))
          setShowScan(false)
        }}
      />
    </>
  )
}
