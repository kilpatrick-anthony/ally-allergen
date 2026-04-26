// app/admin/menu-builder/new/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, X, Plus, ScanLine,
  Leaf, Apple, WheatOff, Moon, Star, Sprout, Globe, Droplets, ShieldCheck, FileText, CheckCircle
} from 'lucide-react'

import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import AllergenWarningSelector from '@/components/admin/AllergenWarningSelector'
import AllergenWarningDisplay from '@/components/kiosk/AllergenWarningDisplay'
import DatasheetUploader from '@/components/admin/DatasheetUploader'
import { LabelScanModal } from '@/components/admin/LabelScanModal'
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
}

interface Ingredient {
  id: string
  name: string
  allergen_warnings: AllergenWarnings
  suppliers: string[]
}

interface SiteOption {
  id: string
  name: string
}

export default function NewMenuItemPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [sites, setSites] = useState<SiteOption[]>([])
  const [showIngredientSelector, setShowIngredientSelector] = useState(false)
  const [datasheets, setDatasheets] = useState<any[]>([])
  const [showScan, setShowScan] = useState(false)
  const [customDietaryInput, setCustomDietaryInput] = useState('')
  const [showCustomDietaryInput, setShowCustomDietaryInput] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [loadingIngredientDatasheets, setLoadingIngredientDatasheets] = useState(false)

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
  })

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

  // Load ingredients and sites
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [ingredientResponse, sitesResponse] = await Promise.all([
          fetch('/api/ingredients'),
          fetch('/api/sites')
        ])

        const ingredientData = await ingredientResponse.json()
        if (ingredientResponse.ok) {
          const mappedIngredients = (ingredientData.ingredients || []).map((ingredient: any) => ({
            id: ingredient.id,
            name: ingredient.name,
            allergen_warnings: ingredient.allergen_warnings || { ...defaultWarnings },
            suppliers: ingredient.suppliers || []
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
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Load ingredient datasheets
  useEffect(() => {
    if (menuItem.ingredients.length === 0) {
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
  }, [menuItem.ingredients])

  const addCustomDietary = () => {
    if (customDietaryInput.trim() && !menuItem.dietary.includes(customDietaryInput.trim())) {
      const newDietary = [...menuItem.dietary, customDietaryInput.trim()]
      setMenuItem({ ...menuItem, dietary: newDietary })
      setCustomDietaryInput('')
      setShowCustomDietaryInput(false)
    }
  }

  const removeCustomDietary = (dietary: string) => {
    setMenuItem({
      ...menuItem,
      dietary: menuItem.dietary.filter(d => d !== dietary)
    })
  }

  const isCustomDietary = (dietary: string) => {
    return !dietaryOptions.some(opt => opt.name === dietary)
  }

  const handleIngredientSelect = (ingredientId: string) => {
    const updatedIngredients = menuItem.ingredients.includes(ingredientId)
      ? menuItem.ingredients.filter(id => id !== ingredientId)
      : [...menuItem.ingredients, ingredientId]

    const profiles = updatedIngredients
      .map(id => ingredients.find(i => i.id === id)?.allergen_warnings)
      .filter((w): w is AllergenWarnings => !!w)

    setMenuItem({
      ...menuItem,
      ingredients: updatedIngredients,
      allergen_warnings: profiles.length > 0
        ? computeWorstCaseAllergens(profiles)
        : menuItem.allergen_warnings,
    })
  }

  const filteredIngredients = ingredients.filter(ing =>
    ing.name.toLowerCase().includes(ingredientSearch.toLowerCase())
  )

  const handleSave = async () => {
    if (!menuItem.name || !menuItem.description) {
      setSaveStatus('error')
      setSaveMessage('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)
      setSaveStatus('saving')
      setSaveMessage('Saving menu item...')

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
        throw new Error(data.error || 'Failed to save menu item')
      }

      const itemId = data.menuItem?.id || data.id

      // Upload datasheets if any
      if (datasheets.length > 0) {
        try {
          setSaveMessage('Uploading datasheets...')
          const uploadPromises = datasheets
            .filter((datasheet) => datasheet.file)
            .map(async (datasheet) => {
              const fileName = datasheet.file_name || datasheet.file?.name || 'datasheet'
              const formData = new FormData()
              formData.append('file', datasheet.file)
              formData.append('menu_item_id', itemId)
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
                throw new Error(uploadData.error || `Failed to upload ${fileName}`)
              }
              return uploadData
            })

          await Promise.all(uploadPromises)
          setDatasheets([])
        } catch (uploadError: any) {
          console.error('Error uploading datasheets:', uploadError)
          setSaveStatus('error')
          setSaveMessage(uploadError?.message || 'Failed to upload datasheets')
          return
        }
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
      setSaveMessage(error?.message || 'Failed to save menu item')
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
            Create New Menu Item
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Add a new item to your menu with allergen tracking
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Menu Item Name */}
            <Card className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Menu Item Name *
              </label>
              <input
                type="text"
                value={menuItem.name}
                onChange={(e) => setMenuItem({ ...menuItem, name: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., Acai Power Bowl"
              />
            </Card>

            {/* Site Scope */}
            <Card className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Site Scope
              </label>
              <select
                value={menuItem.site_id ?? 'global'}
                onChange={(e) => setMenuItem({ 
                  ...menuItem, 
                  site_id: e.target.value === 'global' ? null : e.target.value 
                })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="global">Global (all sites)</option>
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
                Category
              </label>
              <input
                type="text"
                list="menu-item-categories"
                value={menuItem.category}
                onChange={(e) => setMenuItem({ ...menuItem, category: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., Starters, Mains, Desserts"
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
                Description *
              </label>
              <textarea
                value={menuItem.description}
                onChange={(e) => setMenuItem({ ...menuItem, description: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe the menu item..."
              />
            </Card>

            {/* Dietary Attributes */}
            <Card className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Dietary Attributes & Certifications
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
                        {typeof dietary.icon === 'function' && React.createElement(dietary.icon as React.ComponentType<{className: string}>, { className: 'h-5 w-5 text-white' })}
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
                + Add Custom Attribute
              </button>

              {showCustomDietaryInput && (
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={customDietaryInput}
                    onChange={(e) => setCustomDietaryInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomDietary()}
                    placeholder="Enter custom attribute"
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                  />
                  <Button
                    variant="primary"
                    onClick={addCustomDietary}
                    disabled={!customDietaryInput.trim()}
                  >
                    Add
                  </Button>
                </div>
              )}

              {menuItem.dietary.filter(d => isCustomDietary(d)).length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Attributes:</p>
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
                Allergen Information
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Set allergen levels for this menu item. If you select ingredients above, levels are calculated automatically and can be adjusted here.
              </p>
              <AllergenWarningSelector
                value={menuItem.allergen_warnings}
                onChange={(warnings) => setMenuItem({ ...menuItem, allergen_warnings: warnings })}
              />
            </Card>

            {/* Selected Ingredients */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Selected Ingredients
                </label>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {menuItem.ingredients.length} selected
                </span>
              </div>

              <div className="min-h-[100px] border border-gray-300 dark:border-gray-600 rounded-lg p-4 mb-4 bg-gray-50 dark:bg-gray-800">
                {menuItem.ingredients.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                    No ingredients selected
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
                {menuItem.ingredients.length === 0 ? 'Add Ingredients' : 'Add More Ingredients'}
              </Button>
            </Card>

            {/* Datasheets */}
            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Menu Item Specific Datasheets
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Upload datasheets specific to this menu item
              </p>
              <DatasheetUploader
                entityType="menu_item"
                onFilesChange={setDatasheets}
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
            <Card className="p-6 sticky top-6">
              <Button
                onClick={handleSave}
                variant="primary"
                icon={<Save className="h-4 w-4" />}
                fullWidth
                size="lg"
                disabled={saving || !menuItem.name || !menuItem.description}
              >
                {saving ? 'Saving...' : 'Save Menu Item'}
              </Button>
              <Link href="/admin/menu-builder">
                <Button
                  variant="outline"
                  fullWidth
                  size="lg"
                  className="mt-3"
                >
                  Cancel
                </Button>
              </Link>
            </Card>

            {/* Final Allergen Summary */}
            <Card className="p-6 border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-emerald-600 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">Allergen Summary</h3>
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
                    <span className="ml-3 text-gray-900 dark:text-white">{ingredient.name}</span>
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
