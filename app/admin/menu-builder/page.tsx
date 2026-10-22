// app/admin/menu-builder/page.tsx - List View Only
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ManagementListHeader } from '@/components/admin/ManagementListHeader'
import { listContextHref } from '@/lib/list-navigation'
import { useNotification } from '@/lib/hooks/useNotification'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { Plus, Search, Trash2, Edit, ChefHat, FilterIcon, ChevronDown, SortAsc, SortDesc, Grid, List, Package, MapPin, Eye, Building, Copy } from 'lucide-react'

import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import AllergenWarningDisplay from '@/components/kiosk/AllergenWarningDisplay'
import type { AllergenWarnings } from '@/types/allergen'
import { compareDateAdded } from '@/lib/regular-list-actions'
import { useContentPermissions } from '@/lib/hooks/useContentPermissions'

// Types
interface MenuItem {
  id: string
  createdAt: string | null
  name: string
  description: string
  category: string
  site_id?: string | null
  icon?: string
  allergen_warnings: AllergenWarnings
  dietary: string[]
  ingredients: string[]
  status: 'active' | 'inactive' | 'archived'
  item_type?: 'prepared' | 'packaged_product'
}

interface SiteOption {
  id: string
  name: string
}

function normalizeMenuItem(item: any): MenuItem {
  return {
    id: item.id, createdAt: item.created_at || null, name: item.name,
    description: item.description || '', category: item.category || '',
    site_id: item.site_id ?? null, icon: item.icon || '',
    allergen_warnings: item.allergen_warnings || {} as AllergenWarnings,
    dietary: Array.isArray(item.dietary) ? item.dietary : [],
    ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
    status: item.status || (item.is_active ? 'active' : 'inactive'),
    item_type: item.item_type || 'prepared',
  }
}

const isImageIcon = (icon?: string) => Boolean(icon && /^https?:\/\//.test(icon))

function MenuItemIcon({ icon, size = 'md' }: { icon?: string; size?: 'sm' | 'md' }) {
  const iconSize = size === 'sm' ? 'h-9 w-9 text-2xl' : 'h-10 w-10 text-3xl'
  const chefSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  return (
    <div className={`flex ${iconSize} items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[#42b8ac] to-[#003842] shrink-0`}>
      {icon ? (
        isImageIcon(icon) ? (
          <img src={icon} alt="" className="h-full w-full object-cover" />
        ) : (
          <span>{icon}</span>
        )
      ) : (
        <ChefHat className={`${chefSize} text-white`} />
      )}
    </div>
  )
}

export default function MenuBuilderPage() {
  const { canDeleteContent } = useContentPermissions()
  const { t } = useTranslation()
  const { showNotification } = useNotification()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [sites, setSites] = useState<SiteOption[]>([])
  const [ingredientCount, setIngredientCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | string>('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [listReady, setListReady] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSearchTerm(params.get('q') || '')
    if (['active', 'inactive'].includes(params.get('status') || '')) setStatusFilter(params.get('status')!)
    if (['prepared', 'packaged_product'].includes(params.get('type') || '')) setTypeFilter(params.get('type')!)
    if (params.get('scope')) setScopeFilter(params.get('scope')!)
    if (params.get('category')) setCategoryFilter(params.get('category')!)
    if (params.get('view') === 'list') setViewMode('list')
    if (params.get('sort') === 'date') setSortBy('date')
    if (params.get('direction') === 'desc') setSortDir('desc')
    setShowFilters(params.get('filters') === '1')
    setListReady(true)
  }, [])

  const listStateParams = new URLSearchParams()
  if (showFilters) listStateParams.set('filters', '1')
  if (searchTerm) listStateParams.set('q', searchTerm)
  if (statusFilter !== 'all') listStateParams.set('status', statusFilter)
  if (typeFilter !== 'all') listStateParams.set('type', typeFilter)
  if (scopeFilter !== 'all') listStateParams.set('scope', scopeFilter)
  if (categoryFilter !== 'all') listStateParams.set('category', categoryFilter)
  if (viewMode !== 'grid') listStateParams.set('view', viewMode)
  if (sortBy !== 'name') listStateParams.set('sort', sortBy)
  if (sortDir !== 'asc') listStateParams.set('direction', sortDir)
  const menuListReturnPath = `/admin/menu-builder${listStateParams.size ? `?${listStateParams}` : ''}`
  useEffect(() => {
    if (listReady) window.history.replaceState(window.history.state, '', menuListReturnPath)
  }, [listReady, menuListReturnPath])
  const newMenuItemHref = `/admin/menu-builder/new?returnTo=${encodeURIComponent(menuListReturnPath)}`

  const fetchData = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const responses = await Promise.all([
        fetch('/api/menu-items', { cache: 'no-store' }),
        fetch('/api/sites', { cache: 'no-store' }),
        fetch('/api/ingredients?count_only=true', { cache: 'no-store' }),
      ])
      if (responses.some(response => !response.ok)) throw new Error('Could not load menu data')
      const [menuData, sitesData, ingredientsData] = await Promise.all(responses.map(response => response.json()))
      if (!Array.isArray(menuData.menuItems) || !Array.isArray(sitesData.sites) || typeof ingredientsData.count !== 'number') {
        throw new Error('Unexpected menu data')
      }
      setMenuItems(menuData.menuItems.map(normalizeMenuItem))
      setSites(sitesData.sites.map((site: any) => ({ id: site.id, name: site.name })))
      setIngredientCount(ingredientsData.count)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchData() }, [fetchData])

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
      return matchesSearch && matchesScope && matchesCategory &&
        (statusFilter === 'all' || item.status === statusFilter) &&
        (typeFilter === 'all' || item.item_type === typeFilter)
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name)
      } else if (sortBy === 'date') {
        return compareDateAdded(a.createdAt, b.createdAt, sortDir) || a.name.localeCompare(b.name)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

  const hasFilters = Boolean(searchTerm || scopeFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all')
  const clearFilters = () => { setSearchTerm(''); setScopeFilter('all'); setCategoryFilter('all'); setStatusFilter('all'); setTypeFilter('all') }

  const stats = {
    total: menuItems.length,
    ingredients: ingredientCount,
    sites: sites.length,
  }

  // Get unique categories for filter dropdown
  const uniqueMenuCategories = Array.from(
    new Set(menuItems.map(i => i.category).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b))

  // Group filtered items by category
  const groupedMenuItems = filteredItems.reduce((acc, item) => {
    const cat = sortBy === 'date' ? t('allItems') : item.category || t('admin.uncategorized')
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {} as Record<string, typeof filteredItems>)

  const menuCategoryOrder = Object.keys(groupedMenuItems).sort((a, b) => {
    const uncategorizedLabel = t('admin.uncategorized')
    if (a === uncategorizedLabel) return 1
    if (b === uncategorizedLabel) return -1
    return a.localeCompare(b)
  })

  const handleDuplicate = async (item: MenuItem) => {
    try {
      const sourceResponse = await fetch(`/api/menu-items/${item.id}`)
      const sourceData = await sourceResponse.json()
      if (!sourceResponse.ok) throw new Error(sourceData.error || t('menuBuilderPortal.duplicateFailed'))
      const original = sourceData.menuItem
      const response = await fetch('/api/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...original,
          id: undefined,
          duplicate_from_id: item.id,
          name: `${t('menuBuilderPortal.copyOf')} ${item.name}`,
          status: 'active',
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || t('menuBuilderPortal.duplicateFailed'))

      const refreshResponse = await fetch('/api/menu-items', { cache: 'no-store' })
      const refreshData = await refreshResponse.json()
      if (!refreshResponse.ok) {
        setLoadError(true)
        throw new Error(refreshData.error || 'Menu item duplicated, but the list could not be refreshed')
      }

      setMenuItems((refreshData.menuItems || []).map(normalizeMenuItem))
      showNotification(t('menuBuilderPortal.duplicated'), 'success')
    } catch (error: any) {
      showNotification(error?.message || t('menuBuilderPortal.duplicateFailed'), 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('menuBuilderPortal.deleteConfirm'))) return
    
    try {
      const response = await fetch(`/api/menu-items/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('menuBuilderPortal.deleteFailed'))
      }
      setMenuItems(menuItems.filter(item => item.id !== id))
    } catch (error: any) {
      console.error('Error deleting menu item:', error)
      showNotification(error?.message || t('menuBuilderPortal.deleteFailed'), 'error')
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

  if (loadError && menuItems.length === 0) return (
    <Container><h1 className="mb-6 text-3xl font-bold">{t('admin.menuBuilder')}</h1>
      <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-950">
        <p>{t('regularLists.loadFailed')}</p><Button className="mt-3" onClick={() => fetchData()}>{t('regularLists.retry')}</Button>
      </div>
    </Container>
  )

  return (
    <Container>
      <ManagementListHeader title={t('admin.menuBuilder')} description={t('admin.menuBuilderDesc')} icon={ChefHat} stats={[{ label: t('admin.menuItemsStat'), value: stats.total }, { label: t('admin.ingredients'), value: stats.ingredients }, { label: t('admin.sites'), value: stats.sites, href: '/admin/sites' }]} />
      {loadError && <div role="alert" className="mb-4 rounded-lg border border-amber-300 p-4">
        <p>{t('regularLists.loadFailed')}</p><Button onClick={() => fetchData()}>{t('regularLists.retry')}</Button>
      </div>}
      {/* Search and Filters */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            <div className="relative w-full min-w-0 basis-full md:w-auto md:flex-1 md:basis-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                aria-label={t('admin.searchMenuItems')}
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
              {t('admin.filters')}
              {showFilters ? <ChevronDown className="ml-1 h-4 w-4 rotate-180" /> : <ChevronDown className="ml-1 h-4 w-4" />}
            </Button>

            <div className="flex items-center border-l pl-4">
              <button
                aria-label={t('regularLists.gridView')}
                aria-pressed={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-l-lg ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                aria-label={t('regularLists.listView')}
                aria-pressed={viewMode === 'list'}
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-r-lg ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-1 border-l pl-4">
              <select
                aria-label={t('regularLists.sortBy')}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
              >
                <option value="name">{t('admin.name')}</option>
                <option value="date">{t('admin.dateAdded')}</option>
              </select>
              <button
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                title={sortDir === 'asc' ? t('admin.ascending') : t('admin.descending')}
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
                <label htmlFor="menu-status" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.status')}</label>
                <select id="menu-status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="all">{t('admin.allStatus')}</option>
                  <option value="active">{t('admin.active')}</option>

                </select>
              </div>
              <div>
                <label htmlFor="menu-type" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('regularLists.itemType')}</label>
                <select id="menu-type" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="all">{t('regularLists.allTypes')}</option>
                  <option value="prepared">{t('regularLists.preparedFilter')}</option>
                  <option value="packaged_product">{t('regularLists.boughtInFilter')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('admin.scope')}
                </label>
                <select
                  aria-label={t('admin.scope')}
                  value={scopeFilter}
                  onChange={(e) => setScopeFilter(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                >
                  <option value="all">{t('admin.allScopes')}</option>
                  <option value="global">{t('admin.globalOnly')}</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('admin.category')}
                </label>
                <select
                  aria-label={t('admin.category')}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                >
                  <option value="all">{t('admin.allCategories')}</option>
                  {uniqueMenuCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="uncategorized">{t('admin.uncategorized')}</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600 dark:text-gray-300">
        <p role="status">{t('regularLists.showing').replace('{visible}', String(filteredItems.length)).replace('{total}', String(menuItems.length))}</p>
        {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>{t('admin.clearFilters')}</Button>}
      </div>
      {/* Menu Items */}
      <Card>
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <ChefHat className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('admin.noMenuItemsFound')}</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {hasFilters ? t('tryAdjustingFilters') : t('admin.createFirstMenuItemDesc')}
            </p>


          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-6 space-y-8" data-no-translate>
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
                className="border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 flex flex-col [content-visibility:auto] [contain-intrinsic-size:auto_240px]"
              >
                {/* Tile Header */}
                <div className="p-5 flex items-start gap-3">
                  <MenuItemIcon icon={item.icon} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate" title={item.name}>
                      {item.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <Badge variant={item.site_id ? 'primary' : 'default'}>
                        {item.site_id
                          ? (sites.find((site) => site.id === item.site_id)?.name || t('admin.siteSpecificLabel'))
                          : t('admin.globalLabel')}
                      </Badge>
                      <Badge variant={item.status === 'active' ? 'success' : 'warning'}>
                        {t(`admin.${item.status}`)}
                      </Badge>
                      {item.item_type === 'packaged_product' && (
                        <Badge variant="warning">{t('admin.packaged')}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tile Body */}
                <div className="px-5 flex-1 flex flex-col gap-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 min-h-[2.5rem]">
                    {item.description || t('admin.noDescriptionProvided')}
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
                    {item.ingredients.length} {t('admin.ingredientCountLabel')}
                  </span>
                  <div className="flex items-center gap-1">
                    <Link href={listContextHref(`/admin/menu-builder/${item.id}`, menuListReturnPath)}>
                      <Button variant="ghost" size="sm" icon={<Eye className="h-4 w-4" />} title={t('admin.view')} />
                    </Link>
                    <Link href={listContextHref(`/admin/menu-builder/${item.id}/edit`, menuListReturnPath)}>
                      <Button variant="ghost" size="sm" icon={<Edit className="h-4 w-4" />} title={t('admin.edit')} />
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Copy className="h-4 w-4" />}
                      onClick={() => handleDuplicate(item)}
                      title={t('admin.duplicate')}
                    />
                    {canDeleteContent && (
                      <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => handleDelete(item.id)} title={t('admin.delete')} />
                    )}
                  </div>
                </div>
              </div>
            ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto" data-no-translate>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">{t('admin.name')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">{t('admin.itemDescription')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">{t('admin.scope')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">{t('admin.status')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">{t('admin.allergens')}</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">{t('admin.actions')}</th>
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
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-3 min-w-0">
                        <MenuItemIcon icon={item.icon} size="sm" />
                        <span className="truncate">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">{item.description}</td>
                    <td className="px-6 py-4 text-sm">
                      <Badge variant={item.site_id ? 'primary' : 'default'}>
                        {item.site_id ? sites.find(s => s.id === item.site_id)?.name || t('admin.siteSpecificLabel') : t('admin.globalLabel')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Badge variant={item.status === 'active' ? 'success' : 'warning'}>
                        {t(`admin.${item.status}`)}
                      </Badge>
                      {item.item_type === 'packaged_product' && (
                        <span className="ml-2"><Badge variant="warning">{t('admin.packaged')}</Badge></span>
                      )}
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
                        <Link href={listContextHref(`/admin/menu-builder/${item.id}`, menuListReturnPath)}>
                          <Button variant="ghost" size="sm" icon={<Eye className="h-4 w-4" />} title={t('admin.view')} />
                        </Link>
                        <Link href={listContextHref(`/admin/menu-builder/${item.id}/edit`, menuListReturnPath)}>
                          <Button variant="ghost" size="sm" icon={<Edit className="h-4 w-4" />} title={t('admin.edit')} />
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Copy className="h-4 w-4" />}
                          onClick={() => handleDuplicate(item)}
                          title={t('admin.duplicate')}
                        />
                        {canDeleteContent && (
                          <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => handleDelete(item.id)} title={t('admin.delete')} />
                        )}
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
