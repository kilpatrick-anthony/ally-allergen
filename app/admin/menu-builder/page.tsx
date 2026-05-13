// app/admin/menu-builder/page.tsx - List View Only
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useNotification } from '@/lib/hooks/useNotification'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { Plus, Search, Trash2, Edit, ChefHat, FilterIcon, ChevronDown, SortAsc, SortDesc, Grid, List, Package, MapPin, Eye, Building, Copy } from 'lucide-react'

import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import AllergenWarningDisplay from '@/components/kiosk/AllergenWarningDisplay'
import type { AllergenWarnings } from '@/types/allergen'

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

interface SiteOption {
  id: string
  name: string
}

export default function MenuBuilderPage() {
    const { t } = useTranslation()
  const { showNotification } = useNotification()
  const [loading, setLoading] = useState(true)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [sites, setSites] = useState<SiteOption[]>([])
  const [ingredients, setIngredients] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | string>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

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

  // Load menu items, sites, and ingredients
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [menuResponse, sitesResponse, ingredientsResponse] = await Promise.all([
          fetch('/api/menu-items'),
          fetch('/api/sites'),
          fetch('/api/ingredients')
        ])

        const menuData = await menuResponse.json()
        if (menuResponse.ok) {
          const mappedMenuItems = (menuData.menuItems || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description || '',
            category: item.category || '',
            site_id: item.site_id ?? null,
            allergen_warnings: item.allergen_warnings || { ...defaultWarnings },
            dietary: Array.isArray(item.dietary) ? item.dietary : [],
            ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
            status: item.status || (item.is_active ? 'active' : 'draft')
          }))
          setMenuItems(mappedMenuItems)
        }

        const sitesData = await sitesResponse.json()
        if (sitesResponse.ok) {
          const mappedSites = (sitesData.sites || []).map((site: any) => ({
            id: site.id,
            name: site.name
          }))
          setSites(mappedSites)
        }

        const ingredientsData = await ingredientsResponse.json()
        if (ingredientsResponse.ok) {
          setIngredients(ingredientsData.ingredients || [])
        }
      } catch (error: any) {
        console.error('Error loading menu builder data:', error)
        setMenuItems([])
        setSites([])
        setIngredients([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter and sort
  const filteredItems = menuItems
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesScope = scopeFilter === 'all' ||
        (scopeFilter === 'global' && !item.site_id) ||
        (scopeFilter !== 'all' && item.site_id === scopeFilter)
      const matchesCategory = categoryFilter === 'all' ||
        (categoryFilter === 'uncategorized' ? !item.category : item.category === categoryFilter)
      return matchesSearch && matchesScope && matchesCategory
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name)
      } else if (sortBy === 'date') {
        // For date, compare by ID as a proxy (assuming newer items have later IDs)
        cmp = a.id.localeCompare(b.id)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

  const stats = {
    total: menuItems.length,
    ingredients: ingredients.length,
    sites: sites.length,
  }

  // Get unique categories for filter dropdown
  const uniqueMenuCategories = Array.from(
    new Set(menuItems.map(i => i.category).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b))

  // Group filtered items by category
  const groupedMenuItems = filteredItems.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {} as Record<string, typeof filteredItems>)

  const menuCategoryOrder = Object.keys(groupedMenuItems).sort((a, b) => {
    if (a === 'Uncategorized') return 1
    if (b === 'Uncategorized') return -1
    return a.localeCompare(b)
  })

  const handleDuplicate = async (item: MenuItem) => {
    try {
      const response = await fetch('/api/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item,
          id: undefined,
          name: `Copy of ${item.name}`,
          status: 'draft',
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to duplicate')
      const newItem: MenuItem = {
        ...item,
        id: data.menuItem?.id || data.id,
        name: `Copy of ${item.name}`,
        status: 'draft',
      }
      setMenuItems(prev => [...prev, newItem])
      showNotification('Menu item duplicated', 'success')
    } catch (error: any) {
      showNotification('Failed to duplicate: ' + error?.message, 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return
    
    try {
      const response = await fetch(`/api/menu-items/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete menu item')
      }
      setMenuItems(menuItems.filter(item => item.id !== id))
    } catch (error: any) {
      console.error('Error deleting menu item:', error)
      showNotification('Failed to delete menu item: ' + error?.message, 'error')
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
    <Container>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-teal-400 to-teal-600 dark:from-teal-500 dark:to-gray-700 rounded-lg">
            <ChefHat className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('admin.menuBuilder')}</h1>
            <p className="text-gray-600 dark:text-gray-300">{t('admin.menuBuilderDesc')}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href="/admin/menu-builder/new" className="block">
          <Card className="hover:shadow-lg transition-all hover:border-emerald-500 hover:bg-gradient-to-br hover:from-emerald-500 hover:to-emerald-600 group cursor-pointer p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-white transition-colors">{t('admin.addNew')}</p>
                <p className="text-2xl font-bold text-[#003842] dark:text-[#42b8ac] mt-1 group-hover:text-white transition-colors">+</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg group-hover:shadow-lg group-hover:ring-2 group-hover:ring-emerald-600 transition-all">
                <Plus className="h-6 w-6 text-white transition-colors" />
              </div>
            </div>
            <div className="mt-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors">{t('admin.createMenu')}</div>
            </div>
          </Card>
        </Link>

        <Card className="hover:shadow-lg transition-all hover:border-[#42b8ac] hover:bg-gradient-to-br hover:from-[#42b8ac] hover:to-[#36948a] group cursor-pointer p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-white transition-colors">Menu Items</p>
              <p className="text-2xl font-bold text-[#003842] dark:text-[#42b8ac] mt-1 group-hover:text-white transition-colors">{stats.total}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-[#42b8ac] to-[#36948a] rounded-lg group-hover:shadow-lg group-hover:ring-2 group-hover:ring-[#42b8ac] transition-all">
              <ChefHat className="h-6 w-6 text-white transition-colors" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors">Total managed items</div>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-all hover:border-amber-500 hover:bg-gradient-to-br hover:from-amber-500 hover:to-amber-600 group cursor-pointer p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-white transition-colors">Ingredients</p>
              <p className="text-2xl font-bold text-[#003842] dark:text-[#42b8ac] mt-1 group-hover:text-white transition-colors">{stats.ingredients}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg group-hover:shadow-lg group-hover:ring-2 group-hover:ring-amber-600 transition-all">
              <Package className="h-6 w-6 text-white transition-colors" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors">Available ingredients</div>
          </div>
        </Card>

        <Link href="/admin/sites" className="block">
          <Card className="hover:shadow-lg transition-all hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-500 hover:to-blue-600 group cursor-pointer p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-white transition-colors">Sites</p>
              <p className="text-2xl font-bold text-[#003842] dark:text-[#42b8ac] mt-1 group-hover:text-white transition-colors">{stats.sites}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg group-hover:shadow-lg group-hover:ring-2 group-hover:ring-blue-600 transition-all">
              <Building className="h-6 w-6 text-white transition-colors" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors">Managed sites</div>
          </div>
        </Card>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('admin.searchMenuItems')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
              />
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              icon={<FilterIcon className="h-4 w-4" />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
              {showFilters ? <ChevronDown className="ml-1 h-4 w-4 rotate-180" /> : <ChevronDown className="ml-1 h-4 w-4" />}
            </Button>

            <div className="flex items-center border-l pl-4">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-l-lg ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-r-lg ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-1 border-l pl-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
              >
                <option value="name">Name</option>
                <option value="date">Date Added</option>
              </select>
              <button
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortDir === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Scope
                </label>
                <select
                  value={scopeFilter}
                  onChange={(e) => setScopeFilter(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                >
                  <option value="all">All scopes</option>
                  <option value="global">Global only</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                >
                  <option value="all">All categories</option>
                  {uniqueMenuCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="uncategorized">Uncategorized</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Menu Items */}
      <Card>
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <ChefHat className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No menu items found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchTerm || scopeFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first menu item to get started'}
            </p>
            <Link href="/admin/menu-builder/new">
              <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
                Create First Menu Item
              </Button>
            </Link>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-6 space-y-8">
            {menuCategoryOrder.map(cat => (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{cat}</h3>
                  <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-0.5">{groupedMenuItems[cat].length}</span>
                  <div className="flex-1 border-t border-gray-200 dark:border-gray-700 ml-1" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedMenuItems[cat].map((item) => (
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
                    <Link href={`/admin/menu-builder/${item.id}`}>
                      <Button variant="ghost" size="sm" icon={<Eye className="h-4 w-4" />} title="View" />
                    </Link>
                    <Link href={`/admin/menu-builder/${item.id}/edit`}>
                      <Button variant="ghost" size="sm" icon={<Edit className="h-4 w-4" />} title="Edit" />
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Copy className="h-4 w-4" />}
                      onClick={() => handleDuplicate(item)}
                      title="Duplicate"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 className="h-4 w-4" />}
                      onClick={() => handleDelete(item.id)}
                      title="Delete"
                    />
                  </div>
                </div>
              </div>
            ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Description</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Scope</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Allergens</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {menuCategoryOrder.map(cat => (
                  <React.Fragment key={cat}>
                    <tr>
                      <td colSpan={6} className="px-6 py-2 bg-gray-50 dark:bg-gray-700/50">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          {cat}
                          <span className="ml-2 text-gray-400 font-normal normal-case tracking-normal">({groupedMenuItems[cat].length})</span>
                        </span>
                      </td>
                    </tr>
                {groupedMenuItems[cat].map((item, idx) => (
                  <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">{item.description}</td>
                    <td className="px-6 py-4 text-sm">
                      <Badge variant={item.site_id ? 'primary' : 'default'}>
                        {item.site_id ? sites.find(s => s.id === item.site_id)?.name || 'Site-specific' : 'Global'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Badge variant={item.status === 'active' ? 'success' : 'warning'}>
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="max-w-xs">
                        <AllergenWarningDisplay
                          warnings={item.allergen_warnings}
                          compact={true}
                          showNone={false}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/menu-builder/${item.id}`}>
                          <Button variant="ghost" size="sm" icon={<Eye className="h-4 w-4" />} title="View" />
                        </Link>
                        <Link href={`/admin/menu-builder/${item.id}/edit`}>
                          <Button variant="ghost" size="sm" icon={<Edit className="h-4 w-4" />} title="Edit" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Copy className="h-4 w-4" />}
                          onClick={() => handleDuplicate(item)}
                          title="Duplicate"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 className="h-4 w-4" />}
                          onClick={() => handleDelete(item.id)}
                          title="Delete"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Container>
  )
}
