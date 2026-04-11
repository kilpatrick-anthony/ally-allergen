// app/admin/menu-builder/page.tsx - VERTICAL LAYOUT VERSION
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Search, Filter, Trash2, Edit, Save, X, ChefHat, AlertCircle, Leaf, Heart, CheckCircle, Apple, WheatOff, Moon, Star, Sprout, Globe, Dna, MapPin, FileText, Shield, ScanLine, Eye } from 'lucide-react'

// Import design system components - NOTE: using ../../ because we're in app/admin/menu-builder/
import { Container } from '../../components/layout/Container'
import { Card } from '../../components/layout/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import AllergenWarningSelector from '@/components/admin/AllergenWarningSelector'
import AllergenWarningDisplay from '@/components/kiosk/AllergenWarningDisplay'
import DatasheetUploader from '@/components/admin/DatasheetUploader'
import DatasheetViewer from '@/components/admin/DatasheetViewer'
import type { AllergenWarnings } from '@/types/allergen'
import { computeWorstCaseAllergens } from '@/types/allergen'
import { LabelScanModal } from '@/components/admin/LabelScanModal'

// Types
interface MenuItem {
  id: string
  name: string
  description: string
  category: string
  site_id?: string | null
  allergen_warnings: AllergenWarnings
  dietary: string[]
  ingredients: string[]
  status: 'active' | 'draft' | 'archived'
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

export default function MenuBuilderPage() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [sites, setSites] = useState<SiteOption[]>([])
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [showIngredientSelector, setShowIngredientSelector] = useState(false)
  const [showBuilderModal, setShowBuilderModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [menuItemSearch, setMenuItemSearch] = useState('')
  const [menuItemSort, setMenuItemSort] = useState<'newest' | 'name-asc' | 'name-desc'>('newest')
  const [menuItemScopeFilter, setMenuItemScopeFilter] = useState<'all' | 'global' | string>('all')
  const [customDietaryInput, setCustomDietaryInput] = useState('')
  const [showCustomDietaryInput, setShowCustomDietaryInput] = useState(false)
  const [datasheets, setDatasheets] = useState<any[]>([])
  const [ingredientDatasheets, setIngredientDatasheets] = useState<any[]>([])
  const [showScan, setShowScan] = useState(false)
  const [loadingIngredientDatasheets, setLoadingIngredientDatasheets] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const [viewingItem, setViewingItem] = useState<MenuItem | null>(null)
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    description: '',
    category: '',
    site_id: null as string | null,
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
    dietary: [] as string[],
    ingredients: [] as string[],
  })

  const dietaryOptions = [
    { name: 'Vegan', color: '#16a34a', icon: Leaf },
    { name: 'Vegetarian', color: '#84cc16', icon: Apple },
    { name: 'Gluten-Free', color: '#f59e0b', icon: WheatOff },
    { name: 'Halal', color: '#10b981', icon: Moon },
    { name: 'Kosher', color: '#3b82f6', icon: Star },
    { name: 'Organic', color: '#22c55e', icon: Sprout },
    { name: 'Fair Trade', color: '#8b5cf6', icon: Globe },
    { name: 'Non-GMO', color: '#06b6d4', icon: Dna },
    { name: 'Locally Sourced', color: '#ec4899', icon: MapPin }
  ]

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

  const allergenLabelMap: Record<keyof AllergenWarnings, string> = {
    cereals_gluten: 'Gluten',
    crustaceans: 'Crustaceans',
    eggs: 'Eggs',
    fish: 'Fish',
    peanuts: 'Peanuts',
    soybeans: 'Soybeans',
    milk: 'Milk',
    nuts: 'Nuts',
    celery: 'Celery',
    mustard: 'Mustard',
    sesame: 'Sesame',
    sulphites: 'Sulphites',
    lupin: 'Lupin',
    molluscs: 'Molluscs',
    cereals_gluten_types: 'Gluten Types',
    nuts_types: 'Nut Types',
    cereals_gluten_levels: 'Gluten Levels',
    nuts_levels: 'Nut Levels'
  }

  const getIngredientAllergens = (warnings?: AllergenWarnings) => {
    if (!warnings) return []
    return (Object.keys(allergenLabelMap) as Array<keyof AllergenWarnings>)
      .filter((key) => !key.toString().endsWith('_types'))
      .filter((key) => warnings[key] && warnings[key] !== 'none')
      .map((key) => allergenLabelMap[key])
  }

  const selectedIngredientIds = editingItem ? editingItem.ingredients : newMenuItem.ingredients

  const selectedSiteId = editingItem ? editingItem.site_id ?? null : newMenuItem.site_id

  const handleSiteScopeChange = (value: string) => {
    const nextSiteId = value === 'global' ? null : value
    if (editingItem) {
      setEditingItem({ ...editingItem, site_id: nextSiteId })
    } else {
      setNewMenuItem({ ...newMenuItem, site_id: nextSiteId })
    }
  }

  const closeBuilderModal = () => {
    setShowBuilderModal(false)
    setEditingItem(null)
    setNewMenuItem({
      name: '',
      description: '',
      category: '',
      site_id: menuItemScopeFilter === 'global' ? null : menuItemScopeFilter === 'all' ? null : menuItemScopeFilter,
      allergen_warnings: { ...defaultWarnings },
      dietary: [],
      ingredients: [],
    })
    setSaveStatus('idle')
    setSaveMessage('')
  }

  const openBuilderForNew = () => {
    setEditingItem(null)
    setNewMenuItem({
      name: '',
      description: '',
      category: '',
      site_id: menuItemScopeFilter === 'global' ? null : menuItemScopeFilter === 'all' ? null : menuItemScopeFilter,
      allergen_warnings: { ...defaultWarnings },
      dietary: [],
      ingredients: [],
    })
    setShowBuilderModal(true)
  }

  useEffect(() => {
    if (selectedIngredientIds.length === 0) {
      setIngredientDatasheets([])
      return
    }

    const fetchIngredientDatasheets = async () => {
      try {
        setLoadingIngredientDatasheets(true)
        const params = new URLSearchParams({
          ingredientIds: selectedIngredientIds.join(',')
        })
        const response = await fetch(`/api/datasheets?${params.toString()}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch datasheets')
        }

        setIngredientDatasheets(data.datasheets || [])
      } catch (error: any) {
        console.error('Error loading ingredient datasheets:', error)
        setIngredientDatasheets([])
      } finally {
        setLoadingIngredientDatasheets(false)
      }
    }

    fetchIngredientDatasheets()
  }, [selectedIngredientIds])

  const addCustomDietary = () => {
    const currentDietary = editingItem ? editingItem.dietary : newMenuItem.dietary;
    if (customDietaryInput.trim() && !currentDietary.includes(customDietaryInput.trim())) {
      const newDietary = [...currentDietary, customDietaryInput.trim()];
      if (editingItem) {
        setEditingItem({...editingItem, dietary: newDietary})
      } else {
        setNewMenuItem({...newMenuItem, dietary: newDietary})
      }
      setCustomDietaryInput('')
      setShowCustomDietaryInput(false)
    }
  }

  const removeCustomDietary = (cert: string) => {
    if (editingItem) {
      setEditingItem({
        ...editingItem,
        dietary: editingItem.dietary.filter(d => d !== cert)
      })
    } else {
      setNewMenuItem({
        ...newMenuItem,
        dietary: newMenuItem.dietary.filter(d => d !== cert)
      })
    }
  }

  const isCustomDietary = (dietary: string) => {
    return !dietaryOptions.some(opt => opt.name === dietary)
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [menuResponse, ingredientResponse, sitesResponse] = await Promise.all([
          fetch('/api/menu-items'),
          fetch('/api/ingredients'),
          fetch('/api/sites')
        ])

        const menuData = await menuResponse.json()
        if (!menuResponse.ok) {
          console.error('Error loading menu items:', menuData.error || 'Failed to fetch menu items')
          setMenuItems([])
        } else {
          const mappedMenuItems = (menuData.menuItems || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description || '',
            category: item.category || '',
            site_id: item.site_id ?? null,
            allergen_warnings: item.allergen_warnings || { ...defaultWarnings },
            dietary: Array.isArray(item.dietary) ? item.dietary : [],
            ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
            status: item.is_active ? 'active' : 'draft'
          }))
          setMenuItems(mappedMenuItems)
        }

        const ingredientData = await ingredientResponse.json()
        if (!ingredientResponse.ok) {
          console.error('Error loading ingredients:', ingredientData.error || 'Failed to fetch ingredients')
          setIngredients([])
        } else {
          const mappedIngredients = (ingredientData.ingredients || []).map((ingredient: any) => ({
            id: ingredient.id,
            name: ingredient.name,
            allergen_warnings: ingredient.allergen_warnings || { ...defaultWarnings },
            suppliers: ingredient.suppliers || []
          }))
          setIngredients(mappedIngredients)
        }

        const sitesData = await sitesResponse.json()
        if (!sitesResponse.ok) {
          console.error('Error loading sites:', sitesData.error || 'Failed to fetch sites')
          setSites([])
        } else {
          const mappedSites = (sitesData.sites || []).map((site: any) => ({
            id: site.id,
            name: site.name
          }))
          setSites(mappedSites)
        }
      } catch (error: any) {
        console.error('Error loading menu builder data:', error)
        setMenuItems([])
        setIngredients([])
        setSites([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    const siteParam = searchParams.get('site_id')
    if (!siteParam) return
    setMenuItemScopeFilter(siteParam)
    setNewMenuItem((prev) => ({
      ...prev,
      site_id: siteParam
    }))
  }, [searchParams])

  useEffect(() => {
    const itemParam = searchParams.get('item_id')
    if (!itemParam || menuItems.length === 0) return
    const match = menuItems.find((item) => item.id === itemParam)
    if (match) {
      setEditingItem(match)
      setShowBuilderModal(true)
    }
  }, [searchParams, menuItems])

  const handleSaveMenuItem = async () => {
    const payload = editingItem
      ? {
          ...editingItem,
          status: editingItem.status || 'active'
        }
      : {
          ...newMenuItem,
          status: 'active'
        }

    try {
      setSaveStatus('saving')
      setSaveMessage('Saving menu item...')
      const response = await fetch(
        editingItem ? `/api/menu-items/${editingItem.id}` : '/api/menu-items',
        {
          method: editingItem ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save menu item')
      }

      const savedItem = data.menuItem
        ? {
            id: data.menuItem.id,
            name: data.menuItem.name,
            description: data.menuItem.description || '',
            category: data.menuItem.category || '',
            site_id: data.menuItem.site_id ?? payload.site_id ?? null,
            allergen_warnings: data.menuItem.allergen_warnings || { ...defaultWarnings },
            dietary: Array.isArray(data.menuItem.dietary) ? data.menuItem.dietary : payload.dietary || [],
            ingredients: Array.isArray(data.menuItem.ingredients) ? data.menuItem.ingredients : payload.ingredients || [],
            status: (data.menuItem.status === 'active' || data.menuItem.status === 'archived') ? data.menuItem.status : 'draft' as 'active' | 'draft' | 'archived'
          }
        : {
            ...payload,
            id: data.id || `temp-${Date.now()}`, // Fallback ID for new items
            status: 'draft' as 'active' | 'draft' | 'archived'
          }

      const itemId = data.menuItem?.id || savedItem.id
      let uploadErrorMessage: string | null = null

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
          console.error('Error uploading menu item datasheets:', uploadError)
          uploadErrorMessage = uploadError?.message || 'Failed to upload datasheets'
        }
      }

      if (editingItem) {
        setMenuItems(menuItems.map(item => item.id === editingItem.id ? savedItem : item))
        setEditingItem(null)
      } else {
        setMenuItems([savedItem, ...menuItems])
      }

      setNewMenuItem({
        name: '',
        description: '',
        category: '',
        site_id: menuItemScopeFilter === 'global'
          ? null
          : menuItemScopeFilter === 'all'
            ? null
            : menuItemScopeFilter,
        allergen_warnings: { ...defaultWarnings },
        dietary: [],
        ingredients: [],
      })

      if (uploadErrorMessage) {
        setSaveStatus('error')
        setSaveMessage(uploadErrorMessage)
      } else {
        setSaveStatus('success')
        setSaveMessage('Menu item saved.')
      }
    } catch (error: any) {
      console.error('Error saving menu item:', error)
      setSaveStatus('error')
      setSaveMessage(error?.message || 'Failed to save menu item.')
    }
  }

  const handleDeleteMenuItem = async (id: string) => {
    try {
      const response = await fetch(`/api/menu-items/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete menu item')
      }
      setMenuItems(menuItems.filter(item => item.id !== id))
    } catch (error: any) {
      console.error('Error deleting menu item:', error)
    }
  }

  const handleIngredientSelect = (ingredientId: string) => {
    if (editingItem) {
      const updatedIngredients = editingItem.ingredients.includes(ingredientId)
        ? editingItem.ingredients.filter(id => id !== ingredientId)
        : [...editingItem.ingredients, ingredientId]

      const profiles = updatedIngredients
        .map(id => ingredients.find(i => i.id === id)?.allergen_warnings)
        .filter((w): w is AllergenWarnings => !!w)

      setEditingItem({
        ...editingItem,
        ingredients: updatedIngredients,
        allergen_warnings: profiles.length > 0
          ? computeWorstCaseAllergens(profiles)
          : editingItem.allergen_warnings,
      })
    } else {
      const updatedIngredients = newMenuItem.ingredients.includes(ingredientId)
        ? newMenuItem.ingredients.filter(id => id !== ingredientId)
        : [...newMenuItem.ingredients, ingredientId]

      const profiles = updatedIngredients
        .map(id => ingredients.find(i => i.id === id)?.allergen_warnings)
        .filter((w): w is AllergenWarnings => !!w)

      setNewMenuItem({
        ...newMenuItem,
        ingredients: updatedIngredients,
        allergen_warnings: profiles.length > 0
          ? computeWorstCaseAllergens(profiles)
          : newMenuItem.allergen_warnings,
      })
    }
  }

  const filteredIngredients = ingredients.filter(ingredient => {
    const matchesSearch = ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const filteredMenuItems = menuItems
    .filter((item) => {
      const search = menuItemSearch.toLowerCase()
      if (!search) return true
      return (
        item.name.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search)
      )
    })
    .filter((item) => {
      if (menuItemScopeFilter === 'all') return true
      if (menuItemScopeFilter === 'global') return !item.site_id
      return item.site_id === menuItemScopeFilter
    })
    .slice()
    .sort((a, b) => {
      if (menuItemSort === 'name-asc') {
        return a.name.localeCompare(b.name)
      }
      if (menuItemSort === 'name-desc') {
        return b.name.localeCompare(a.name)
      }
      return 0
    })

  const availableIngredientCount = filteredIngredients.length

  const menuItemStats = {
    total: menuItems.length,
    active: menuItems.filter(item => item.status === 'active').length,
    draft: menuItems.filter(item => item.status === 'draft').length,
    global: menuItems.filter(item => !item.site_id).length,
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative h-12 w-12 mx-auto mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading menu builder...</p>
        </div>
      </div>
    )
  }

  return (
    <>
    <Container>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-teal-400 to-teal-600 dark:from-teal-500 dark:to-gray-700 rounded-lg">
            <ChefHat className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Menu Builder</h1>
              {editingItem && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  Editing: {editingItem.name}
                </span>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-300">Create and manage menu items with allergen tracking</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8 xl:grid-cols-[1fr_280px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Menu items</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{menuItemStats.total}</p>
              </div>
              <Badge variant="primary">Total</Badge>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Global</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{menuItemStats.global}</p>
              </div>
              <Badge variant="default">Global</Badge>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Active</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{menuItemStats.active}</p>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Draft</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{menuItemStats.draft}</p>
              </div>
              <Badge variant="warning">Draft</Badge>
            </div>
          </Card>
        </div>

        <Card className="p-6 flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[#003842] dark:text-[#42b8ac]">Quick Actions</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">Create a new item or filter your menu items.</p>
          </div>
          <div className="flex flex-col gap-3">
            <Button variant="primary" icon={Plus} onClick={openBuilderForNew}>
              Create New Menu Item
            </Button>
            <Button variant="outline" onClick={() => setMenuItemScopeFilter('all')}>
              Show all items
            </Button>
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={menuItemSearch}
                onChange={(e) => setMenuItemSearch(e.target.value)}
                placeholder="Search menu items..."
                className="pl-9 pr-3 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              value={menuItemScopeFilter}
              onChange={(e) => setMenuItemScopeFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All scopes</option>
              <option value="global">Global only</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
            <select
              value={menuItemSort}
              onChange={(e) => setMenuItemSort(e.target.value as typeof menuItemSort)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
            >
              <option value="newest">Newest</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* TOP SECTION: Create/Edit Menu Item */}
      {showBuilderModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
          <div className="mx-auto w-full max-w-6xl rounded-3xl bg-white dark:bg-gray-950 shadow-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 p-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#003842] dark:text-[#42b8ac]">
                  {editingItem ? 'Edit Menu Item' : 'Create New Menu Item'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {editingItem ? 'Update the details for this item' : 'Add a new item to your menu'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={closeBuilderModal}>
                  Close
                </Button>
                <button
                  type="button"
                  onClick={() => setShowScan(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#42b8ac] to-[#003842] text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-md"
                >
                  <ScanLine className="h-4 w-4" />
                  Scan Label
                </button>
              </div>
            </div>
            <div className="p-6">
          <div className="space-y-6">
            {/* Menu Item Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Menu Item Name *
              </label>
              <input
                type="text"
                value={editingItem ? editingItem.name : newMenuItem.name}
                onChange={(e) => editingItem
                  ? setEditingItem({...editingItem, name: e.target.value})
                  : setNewMenuItem({...newMenuItem, name: e.target.value})
                }
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:placeholder-gray-400"
                placeholder="e.g., Acai Power Bowl"
              />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Site Scope
                </label>
                <select
                  value={selectedSiteId ?? 'global'}
                  onChange={(e) => handleSiteScopeChange(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                >
                  <option value="global">Global (all sites)</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>

            {/* Dietary Attributes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Dietary Attributes & Certifications
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {dietaryOptions.map(dietary => {
                  const currentDietary = editingItem ? editingItem.dietary : newMenuItem.dietary;
                  const isSelected = currentDietary.includes(dietary.name);
                  const IconComponent = dietary.icon;
                  
                  return (
                    <button
                      key={dietary.name}
                      type="button"
                      onClick={() => {
                        const newDietary = isSelected
                          ? currentDietary.filter(d => d !== dietary.name)
                          : [...currentDietary, dietary.name];
                        
                        if (editingItem) {
                          setEditingItem({...editingItem, dietary: newDietary})
                        } else {
                          setNewMenuItem({...newMenuItem, dietary: newDietary})
                        }
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
                          flex items-center justify-center w-12 h-12 rounded-lg transition-all
                          ${isSelected 
                            ? 'scale-100' 
                            : 'group-hover:scale-110'
                          }
                          group-hover:shadow-lg
                        `}
                        style={{ backgroundColor: dietary.color }}
                      >
                        <IconComponent className="h-6 w-6 text-white" />
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
                  );
                })}
                  
                  {/* Custom Dietary Card */}
                  <button
                    type="button"
                    onClick={() => setShowCustomDietaryInput(!showCustomDietaryInput)}
                    className={`
                      relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                      ${showCustomDietaryInput
                        ? 'border-gray-400 shadow-md bg-gray-50 dark:bg-gray-700'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 hover:shadow-lg bg-white dark:bg-gray-800'
                      }
                      group cursor-pointer
                    `}
                  >
                    <div
                      className={`
                        flex items-center justify-center w-12 h-12 rounded-lg transition-all bg-gray-500
                        ${showCustomDietaryInput
                          ? 'scale-100'
                          : 'group-hover:scale-110'
                        }
                        group-hover:shadow-lg
                      `}
                    >
                      <Plus className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-center text-gray-700 dark:text-gray-300">
                      Custom
                    </span>
                  </button>
                </div>

                {/* Custom Dietary Input */}
                {showCustomDietaryInput && (
                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      value={customDietaryInput}
                      onChange={(e) => setCustomDietaryInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCustomDietary()}
                      placeholder="Enter custom dietary attribute"
                      className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
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
                
                {/* Display Custom Dietary Attributes */}
                {(() => {
                  const currentDietary = editingItem ? editingItem.dietary : newMenuItem.dietary;
                  const customItems = currentDietary.filter(d => isCustomDietary(d));
                  if (customItems.length === 0) return null;
                  
                  return (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Dietary Attributes:</p>
                      <div className="flex flex-wrap gap-2">
                        {customItems.map(dietary => (
                          <span
                            key={dietary}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium"
                          >
                            {dietary}
                            <button
                              type="button"
                              onClick={() => removeCustomDietary(dietary)}
                              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={editingItem ? editingItem.description : newMenuItem.description}
                onChange={(e) => editingItem
                  ? setEditingItem({...editingItem, description: e.target.value})
                  : setNewMenuItem({...newMenuItem, description: e.target.value})
                }
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:placeholder-gray-400"
                placeholder="Describe the menu item..."
              />
            </div>

            {/* Selected Ingredients */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Selected Ingredients
                </label>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {(editingItem ? editingItem.ingredients : newMenuItem.ingredients).length} selected
                </span>
              </div>

              <div className="min-h-[100px] border border-gray-300 dark:border-gray-600 rounded-lg p-4 mb-4">
                {(editingItem ? editingItem.ingredients : newMenuItem.ingredients).length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                    No ingredients selected. Click "Add Ingredients" to select ingredients.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(editingItem ? editingItem.ingredients : newMenuItem.ingredients).map(ingredientId => {
                      const ingredient = ingredients.find(i => i.id === ingredientId)
                      return ingredient ? (
                        <div
                          key={ingredient.id}
                          className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg"
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
                icon={Plus}
                fullWidth
              >
                {newMenuItem.ingredients.length === 0 ? 'Add Ingredients' : 'Add More Ingredients'}
              </Button>
            </div>

            {/* Auto-detected Allergens from Ingredients - temporarily commented out */}
        </div>

              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">
                  Datasheets from Ingredients
                </h3>
              </div>
              <p className="text-sm text-blue-700 mb-4">
                These datasheets are inherited from the ingredients in this menu item. They are for reference only.
              </p>
              <div className="text-sm text-blue-700">Loading datasheets...</div>
            </div>

          {/* Upload menu-item-specific datasheets */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Menu Item Specific Datasheets
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Upload datasheets specific to this menu item (e.g., preparation instructions, final product specifications, nutritional analysis)
            </p>
            <DatasheetUploader
              entityType="menu_item"
              onFilesChange={setDatasheets}
              maxFiles={5}
              compact={false}
            />
          </div>

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t dark:border-gray-700">
            {saveStatus !== 'idle' && (
              <div
                className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
                  saveStatus === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : saveStatus === 'error'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-blue-200 bg-blue-50 text-blue-700'
                }`}
              >
                {saveMessage}
              </div>
            )}
            <Button
              onClick={handleSaveMenuItem}
              variant="primary"
              icon={Save}
              fullWidth
              size="lg"
              disabled={
                saveStatus === 'saving' ||
                (editingItem 
                  ? !editingItem.name || !editingItem.description
                  : !newMenuItem.name || !newMenuItem.description
                )
              }
            >
              {saveStatus === 'saving'
                ? 'Saving...'
                : editingItem
                  ? 'Update Menu Item'
                  : 'Save Menu Item'}
            </Button>
          </div>
        </div>

        {/* Final Combined Allergen Summary */}
      <Card className="mb-8 bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-300">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-emerald-600 rounded-lg">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-900">Final Allergen Summary</h3>
              <p className="text-sm text-emerald-800">Combined view: Ingredients + Additional Warnings</p>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <AllergenWarningDisplay 
              warnings={(() => {
                const ingredientAllergens = (newMenuItem.ingredients || []).reduce((acc, ingredientId) => {
                      const ingredient = ingredients.find(i => i.id === ingredientId)
                      if (ingredient) {
                        Object.keys(ingredient.allergen_warnings).forEach((key) => {
                          const allergenKey = key as keyof AllergenWarnings
                          const currentLevel = acc[allergenKey]
                          const ingredientLevel = ingredient.allergen_warnings[allergenKey]
                          
                          if (ingredientLevel === 'contains' || 
                              (currentLevel !== 'contains' && ingredientLevel === 'not_suitable') ||
                              (currentLevel !== 'contains' && currentLevel !== 'not_suitable' && ingredientLevel === 'may_contain') ||
                              (currentLevel !== 'contains' && currentLevel !== 'not_suitable' && currentLevel !== 'may_contain' && ingredientLevel === 'traces') ||
                              (currentLevel === 'none' && ingredientLevel !== 'none')) {
                            acc[allergenKey] = ingredientLevel as any
                          }
                        })
                      }
                      return acc
                    }, {
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
                    } as AllergenWarnings)
                  
                  // Then merge with additional manual warnings (manual takes priority)
                  const manualWarnings = editingItem ? editingItem.allergen_warnings : newMenuItem.allergen_warnings
                  const combined = { ...ingredientAllergens }
                  
                  Object.keys(manualWarnings).forEach((key) => {
                    const allergenKey = key as keyof AllergenWarnings
                    const manualLevel = manualWarnings[allergenKey]
                    const ingredientLevel = combined[allergenKey]
                    
                    // Manual warning overrides if it's more severe or specifically set
                    if (manualLevel && manualLevel !== 'none') {
                      if (manualLevel === 'contains' || 
                          (ingredientLevel !== 'contains' && manualLevel === 'not_suitable') ||
                          (ingredientLevel !== 'contains' && ingredientLevel !== 'not_suitable' && manualLevel === 'may_contain') ||
                          (ingredientLevel !== 'contains' && ingredientLevel !== 'not_suitable' && ingredientLevel !== 'may_contain' && manualLevel === 'traces') ||
                          (ingredientLevel === 'none')) {
                        combined[allergenKey] = manualLevel as any
                      }
                    }
                  })
                  
                  return combined
                })()}
              compact={false}
            />
            <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-sm text-emerald-900">
                <strong>Note:</strong> This is the final allergen information that will be displayed to customers. It combines allergens from your selected ingredients with any additional warnings you've specified.
              </p>
            </div>
          </div>
        </div>
      </Card>
          </div>
        </div>
      </div>
      )}

      {/* Menu Items Grid */}
      <Card className="mb-8">
        <div className="p-6 border-b dark:border-gray-700">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#003842] dark:text-[#42b8ac]">Menu Items</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">All items in your menu</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={menuItemSearch}
                  onChange={(e) => setMenuItemSearch(e.target.value)}
                  placeholder="Search menu items..."
                  className="pl-9 pr-3 py-2 w-full sm:w-64 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
              <select
                value={menuItemScopeFilter}
                onChange={(e) => setMenuItemScopeFilter(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All scopes</option>
                <option value="global">Global only</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
              <select
                value={menuItemSort}
                onChange={(e) => setMenuItemSort(e.target.value as typeof menuItemSort)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
              >
                <option value="newest">Newest</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
              </select>
              <Badge variant="primary">
                {filteredMenuItems.length} items
              </Badge>
            </div>
          </div>
        </div>

        {filteredMenuItems.length === 0 ? (
          <div className="p-6 text-center">
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <ChefHat className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No menu items yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {menuItemSearch ? 'Try adjusting your search' : 'Create your first menu item to get started'}
            </p>
            <Button
              variant="primary"
              icon={Plus}
              onClick={openBuilderForNew}
            >
              Create First Menu Item
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredMenuItems.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 flex flex-col"
              >
                {/* Tile Header */}
                <div className="p-5 flex items-start gap-3">
                  <div className="p-2 bg-gradient-to-br from-[#42b8ac] to-[#003842] rounded-lg shrink-0">
                    <ChefHat className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate" title={item.name}>
                      {item.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <Badge variant={item.site_id ? 'primary' : 'default'}>
                        {item.site_id
                          ? (sites.find((site) => site.id === item.site_id)?.name || 'Site-specific')
                          : 'Global'}
                      </Badge>
                      <Badge variant={item.status === 'active' ? 'success' : 'warning'}>
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Tile Body */}
                <div className="px-5 flex-1 flex flex-col gap-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 min-h-[2.5rem]">
                    {item.description || 'No description provided.'}
                  </p>

                  <div>
                    <AllergenWarningDisplay
                      warnings={item.allergen_warnings}
                      compact={true}
                      showNone={true}
                    />
                  </div>
                </div>

                {/* Tile Footer */}
                <div className="px-5 py-3 mt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {item.ingredients.length} ingredient{item.ingredients.length !== 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Eye}
                      onClick={() => setViewingItem(item)}
                      title="View"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Edit}
                      onClick={() => {
                        setEditingItem(item)
                        setShowBuilderModal(true)
                      }}
                      title="Edit"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={() => handleDeleteMenuItem(item.id)}
                      title="Delete"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Menu Item View Modal - temporarily commented out */}
      {/* {viewingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 p-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#003842] dark:text-[#42b8ac]">{viewingItem.name}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">Menu item details</p>
              </div>
              <Button variant="ghost" onClick={() => setViewingItem(null)}>
                Close
              </Button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Status</p>
                  <Badge variant={viewingItem.status === 'active' ? 'success' : 'warning'}>{viewingItem.status}</Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Scope</p>
                  <Badge variant={viewingItem.site_id ? 'primary' : 'default'}>
                    {viewingItem.site_id
                      ? (sites.find((site) => site.id === viewingItem.site_id)?.name || 'Site-specific')
                      : 'Global'}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{viewingItem.description || 'No description provided.'}</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Ingredients</h3>
                  <div className="space-y-2">
                    {(viewingItem.ingredients.length > 0 ? viewingItem.ingredients : ['No ingredients selected']).map((ingredientId) => {
                      const ingredient = ingredients.find((ingredient) => ingredient.id === ingredientId)
                      return (
                        <div key={ingredientId} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                          {ingredient ? ingredient.name : ingredientId}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Allergen warnings</h3>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                    <AllergenWarningDisplay warnings={viewingItem.allergen_warnings} compact={false} showNone={true} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )} */}

      {/* Ingredient Selector Modal */}
      {showIngredientSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-[#003842] dark:text-[#42b8ac]">Select Ingredients</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Choose ingredients for your menu item</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowIngredientSelector(false)}
                  >
                    Submit
                  </Button>
                  <button
                    onClick={() => setShowIngredientSelector(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-b dark:border-gray-700">
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search ingredients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  />
                </div>
              </div>

            </div>

            <div className="p-6 overflow-y-auto max-h-[40vh]">
              {filteredIngredients.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No ingredients found</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchTerm
                      ? 'Try adjusting your search'
                      : 'No ingredients available'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredIngredients.map(ingredient => {
                    const isSelected = (editingItem ? editingItem.ingredients : newMenuItem.ingredients).includes(ingredient.id)
                    return (
                      <div
                        key={ingredient.id}
                        onClick={() => handleIngredientSelect(ingredient.id)}
                        className={`
                          p-4 border rounded-lg cursor-pointer transition-all
                          ${isSelected
                            ? 'border-[#42b8ac] bg-[#f0f9f8] dark:bg-teal-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }
                        `}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{ingredient.name}</h4>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {ingredient.suppliers.length} supplier{ingredient.suppliers.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="p-1 bg-[#42b8ac] rounded-full">
                              <div className="h-2 w-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {getIngredientAllergens(ingredient.allergen_warnings).map(allergen => (
                            <Badge key={allergen} variant="error" size="sm">
                              {allergen}
                            </Badge>
                          ))}
                          {getIngredientAllergens(ingredient.allergen_warnings).length === 0 && (
                            <Badge variant="success" size="sm">
                              No Allergens
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-6 border-t dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredIngredients.length} ingredients available
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSearchTerm('')
                    }}
                  >
                    Clear Search
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setShowIngredientSelector(false)}
                  >
                    Submit
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Container>

    <LabelScanModal
      open={showScan}
      onClose={() => setShowScan(false)}
      onAccept={(data) => {
        if (editingItem) {
          setEditingItem(prev => prev ? {
            ...prev,
            name: data.name || prev.name,
            allergen_warnings: data.allergen_warnings,
          } : prev)
        } else {
          setNewMenuItem(prev => ({
            ...prev,
            name: data.name || prev.name,
            allergen_warnings: data.allergen_warnings,
          }))
        }
      }}
    />
    </>
  )
}