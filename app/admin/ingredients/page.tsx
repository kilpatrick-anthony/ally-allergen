// app/admin/ingredients/page.tsx - Enhanced with Design System
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useNotification } from '@/lib/hooks/useNotification'
import { 
  Package, Plus, Search, Filter, Edit, Trash2, 
  AlertCircle, Check, X, ChevronRight, Download,
  BarChart, Shield, Eye, Copy, Tag, Grid, List,
  SortAsc, SortDesc, MoreVertical, Upload, FileText,
  ChevronDown, Filter as FilterIcon, Leaf, Heart, 
  Flame, Droplet, Utensils, Zap, Apple, WheatOff, 
  Moon, Star, Sprout, Globe, Wheat, 
  Shell, Egg, Fish, TreeDeciduous, Carrot, Sparkles, Flower2, Nut, Milk, Truck, CircleDot,
  Bean, Salad, Sun, Circle, Beaker, Snail, Droplets, ShieldCheck
} from 'lucide-react'

// Import design system components
import { Container } from '../../components/layout/Container'
import { Card } from '../../components/layout/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { ALLERGEN_LIST } from '@/types/allergen'
import DatasheetViewer from '@/components/admin/DatasheetViewer'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { checkIngredientCompliance } from '@/lib/compliance'

// No mock data - production ready

interface SubAllergen {
  name: string
  level: string
  parent: string
}

interface Allergen {
  name: string
  level: string
  subAllergens?: SubAllergen[]
}

interface Ingredient {
  id: string
  name: string
  suppliers: string[]
  allergens: Allergen[]
  certifications: string[]
  status: 'active' | 'review' | 'archived'
  lastUpdated: string
  createdBy: string
  compliance: 'compliant' | 'warning' | 'error'
}

const allergenTypes = [
  '1. Cereals containing gluten',
  '2. Crustaceans',
  '3. Eggs',
  '4. Fish',
  '5. Peanuts',
  '6. Soybeans',
  '7. Milk',
  '8. Nuts',
  '9. Celery',
  '10. Mustard',
  '11. Sesame seeds',
  '12. Sulphur dioxide and sulphites',
  '13. Lupin',
  '14. Molluscs'
]

const dietaryAttributes = [
  { id: 'vegan', name: 'Vegan', icon: Leaf, color: '#16a34a' },
  { id: 'vegetarian', name: 'Vegetarian', icon: Apple, color: '#84cc16' },
  { id: 'gluten-free', name: 'Gluten-Free', icon: WheatOff, color: '#f59e0b' },
  { id: 'halal', name: 'Halal', icon: Moon, color: '#10b981' },
  { id: 'kosher', name: 'Kosher', icon: Star, color: '#3b82f6' },
  { id: 'organic', name: 'Organic', icon: Sprout, color: '#22c55e' },
  { id: 'fair-trade', name: 'Fair Trade', icon: Globe, color: '#8b5cf6' },
  { id: 'lactose-free', name: 'Lactose-Free', icon: Droplets, color: '#06b6d4' },
  { id: 'coeliac-friendly', name: 'Coeliac-Friendly', icon: ShieldCheck, color: '#ec4899' },
]

// Helper to get icon component from name
const getIconComponent = (iconName: string) => {
  const icons: Record<string, any> = {
    Wheat, Shell, Egg, Fish, Nut, Sprout, Milk, TreeDeciduous,
    Carrot, Droplet, Sparkles, Flame, Flower2, Leaf, Apple, WheatOff,
    Moon, Star, Globe, Droplets, ShieldCheck, CircleDot,
    Bean, Salad, Sun, Circle, Beaker, Snail
  };
  return icons[iconName] || AlertCircle;
};

export default function IngredientsPage() {
  const { showNotification } = useNotification()
  const { t } = useTranslation()
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAllergen, setSelectedAllergen] = useState('all')
  const [selectedCertification, setSelectedCertification] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'status' | 'compliance'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [showDatasheetModal, setShowDatasheetModal] = useState(false)
  const [selectedIngredientForDatasheets, setSelectedIngredientForDatasheets] = useState<any>(null)
  const [datasheets, setDatasheets] = useState<any[]>([])
  const [loadingDatasheets, setLoadingDatasheets] = useState(false)

  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        setLoading(true)
        console.log('📥 Fetching ingredients...')
        
        const response = await fetch('/api/ingredients')
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch ingredients')
        }
        
        console.log('✅ Ingredients loaded:', data.ingredients?.length || 0)
        
        // Map the data to match the component's expected format
        const mappedIngredients = (data.ingredients || []).map((ing: any) => {
          // Calculate compliance dynamically
          const datasheetCount = (ing.datasheets && ing.datasheets[0]?.count) || 0
          
          const complianceResult = checkIngredientCompliance(
            {
              id: ing.id,
              name: ing.name,
              status: ing.status || 'active',
              last_reviewed_at: ing.last_reviewed_at,
              preferred_review_months: ing.preferred_review_months || 3,
              suppliers: ing.suppliers || [],
              has_datasheets: datasheetCount > 0
            },
            {
              compliance_review_days: 90 // Default, will be updated from business settings
            }
          )
          
          return {
            id: ing.id,
            name: ing.name,
            suppliers: ing.suppliers || [],
            allergens: ing.allergen_warnings ? 
              (() => {
                const warnings = ing.allergen_warnings
                const allergenList: any[] = []
                
                // Handle regular allergens
                Object.entries(warnings).forEach(([key, value]) => {
                  if (value !== 'none' && !key.endsWith('_levels') && !key.endsWith('_types')) {
                    // Check if this allergen has sub-levels
                    const levelsKey = `${key}_levels`
                    const hasSubLevels = warnings[levelsKey]
                    
                    if (hasSubLevels && typeof hasSubLevels === 'object') {
                      // Extract sub-allergens that are not 'none'
                      const subAllergens: any[] = []
                      Object.entries(hasSubLevels).forEach(([subKey, subValue]: [string, any]) => {
                        if (subValue !== 'none') {
                          subAllergens.push({
                            name: subKey.replace(/_/g, ' '),
                            level: subValue,
                            parent: key
                          })
                        }
                      })
                      if (subAllergens.length > 0) {
                        allergenList.push({
                          name: key.replace(/_/g, ' '),
                          level: value,
                          subAllergens
                        })
                      }
                    } else {
                      // Regular allergen without sub-levels
                      allergenList.push({
                        name: key.replace(/_/g, ' '),
                        level: value
                      })
                    }
                  }
                })
                
                return allergenList
              })() : [],
            certifications: ing.certifications || [],
            status: ing.status || 'active',
            lastUpdated: new Date(ing.updated_at || ing.created_at).toLocaleDateString(),
            createdBy: ing.created_by || 'system',
            compliance: complianceResult.status
          }
        })
        
        setIngredients(mappedIngredients)
      } catch (error: any) {
        console.error('❌ Error fetching ingredients:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchIngredients()
  }, [])

  // Filter ingredients based on search and filters
  const filteredIngredients = ingredients.filter(ingredient => {
    const matchesSearch = ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAllergen = selectedAllergen === 'all' || 
                           ingredient.allergens.some(a => a.name === selectedAllergen)
    const matchesCertification = selectedCertification === 'all' || 
                                ingredient.certifications.includes(selectedCertification)
    const matchesStatus = selectedStatus === 'all' || ingredient.status === selectedStatus
    
    return matchesSearch && matchesAllergen && matchesCertification && matchesStatus
  })

  const sortedIngredients = [...filteredIngredients].sort((a, b) => {
    let cmp = 0
    if (sortBy === 'name') {
      cmp = a.name.localeCompare(b.name)
    } else if (sortBy === 'date') {
      cmp = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()
    } else if (sortBy === 'status') {
      cmp = a.status.localeCompare(b.status)
    } else if (sortBy === 'compliance') {
      const order = { compliant: 0, warning: 1, error: 2 }
      cmp = (order[a.compliance] ?? 0) - (order[b.compliance] ?? 0)
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  // Stats
  const stats = {
    total: ingredients.length,
    active: ingredients.filter(i => i.status === 'active').length,
    withAllergens: ingredients.filter(i => i.allergens.length > 0 && i.allergens[0] !== 'None').length,
    suppliers: (() => {
      const uniqueSuppliers: string[] = []
      ingredients.forEach(ingredient => {
        ingredient.suppliers.forEach(supplier => {
          const normalizedSupplier = supplier.trim()
          if (normalizedSupplier !== '' && !uniqueSuppliers.includes(normalizedSupplier)) {
            uniqueSuppliers.push(normalizedSupplier)
          }
        })
      })
      return uniqueSuppliers.length
    })(),
    inReview: ingredients.filter(i => i.status === 'review').length,
    compliant: ingredients.filter(i => i.compliance === 'compliant').length,
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ingredient?')) return
    
    try {
      const response = await fetch(`/api/ingredients/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete ingredient')
      }
      setIngredients(ingredients.filter(ing => ing.id !== id))
    } catch (error: any) {
      console.error('Error deleting ingredient:', error)
      showNotification('Failed to delete ingredient: ' + error?.message, 'error')
    }
  }

  // Handle bulk actions
  const handleBulkDelete = () => {
    if (selectedIngredients.length > 0) {
      setIngredients(ingredients.filter(i => !selectedIngredients.includes(i.id)))
      setSelectedIngredients([])
    }
  }

  const handleBulkArchive = () => {
    if (selectedIngredients.length > 0) {
      setIngredients(ingredients.map(i => 
        selectedIngredients.includes(i.id) ? { ...i, status: 'archived' } : i
      ))
      setSelectedIngredients([])
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative h-12 w-12 mx-auto mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading ingredients...</p>
        </div>
      </div>
    )
  }

  return (
    <Container>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-teal-400 to-teal-600 dark:from-teal-500 dark:to-gray-700 rounded-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('admin.ingredientsManagement')}</h1>
                <p className="text-gray-600 dark:text-gray-300">
                  {t('admin.manageAllergenIngredients')}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary" icon={Package}>
              {stats.total} {t('admin.totalIngredients')}
            </Badge>
            <Badge variant={stats.withAllergens > 0 ? 'warning' : 'success'} icon={Shield}>
              {stats.withAllergens} {t('admin.withAllergens')}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href="/admin/ingredients/new" className="block">
          <Card className="hover:shadow-lg transition-all hover:border-emerald-500 hover:bg-gradient-to-br hover:from-emerald-500 hover:to-emerald-600 group cursor-pointer">
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
              <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors">{t('admin.createNewIngredient')}</div>
            </div>
          </Card>
        </Link>

        <Card className="hover:shadow-lg transition-all hover:border-[#42b8ac] hover:bg-gradient-to-br hover:from-[#42b8ac] hover:to-[#36948a] group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-white transition-colors">{t('admin.ingredients')}</p>
              <p className="text-2xl font-bold text-[#003842] dark:text-[#42b8ac] mt-1 group-hover:text-white transition-colors">{stats.total}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-[#42b8ac] to-[#36948a] rounded-lg group-hover:shadow-lg group-hover:ring-2 group-hover:ring-[#42b8ac] transition-all">
              <Package className="h-6 w-6 text-white transition-colors" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors">{t('admin.totalManagedIngredients')}</div>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-all hover:border-amber-500 hover:bg-gradient-to-br hover:from-amber-500 hover:to-amber-600 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-white transition-colors">{t('admin.allergens')}</p>
              <p className="text-2xl font-bold text-[#003842] dark:text-[#42b8ac] mt-1 group-hover:text-white transition-colors">{stats.withAllergens}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg group-hover:shadow-lg group-hover:ring-2 group-hover:ring-amber-600 transition-all">
              <AlertCircle className="h-6 w-6 text-white transition-colors" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors">{t('admin.requireSpecialHandling')}</div>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-all hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-500 hover:to-blue-600 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-white transition-colors">{t('admin.suppliers')}</p>
              <p className="text-2xl font-bold text-[#003842] dark:text-[#42b8ac] mt-1 group-hover:text-white transition-colors">{stats.suppliers}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg group-hover:shadow-lg group-hover:ring-2 group-hover:ring-blue-600 transition-all">
              <Truck className="h-6 w-6 text-white transition-colors" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors">{t('admin.activeSuppliers')}</div>
          </div>
        </Card>

      </div>

      {/* Actions Bar */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('admin.searchIngredients')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
              />
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              icon={FilterIcon}
              onClick={() => setShowFilters(!showFilters)}
            >
              {t('admin.filters')}
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

          <div className="flex items-center gap-3 flex-shrink-0">{selectedIngredients.length > 0 && (
              <div className="flex items-center gap-2 mr-4">
                <span className="text-sm text-gray-600">
                  {selectedIngredients.length} {t('admin.selected')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIngredients([])}
                >
                  {t('admin.clear')}
                </Button>
              </div>
            )}

          </div>
        </div>

        {/* Filter Panel - Extended */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {t('admin.allergens')}
                </label>
                <select
                  value={selectedAllergen}
                  onChange={(e) => setSelectedAllergen(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                >
                  <option value="all">{t('admin.allAllergens')}</option>
                  {allergenTypes.map(allergen => (
                    <option key={allergen} value={allergen}>{allergen}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {t('admin.dietaryAttributes')}
                </label>
                <select
                  value={selectedCertification}
                  onChange={(e) => setSelectedCertification(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                >
                  <option value="all">{t('admin.allAttributes')}</option>
                  {dietaryAttributes.map(attr => (
                    <option key={attr.id} value={attr.name}>{attr.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {t('admin.status')}
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                >
                  <option value="all">{t('admin.allStatus')}</option>
                  <option value="active">{t('admin.active')}</option>
                  <option value="review">{t('admin.inReview')}</option>
                  <option value="archived">{t('admin.archived')}</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedAllergen('all')
                  setSelectedCertification('all')
                  setSelectedStatus('all')
                }}
              >
                {t('admin.clearFilters')}
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowFilters(false)}
              >
                {t('admin.applyFilters')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Bulk Actions */}
      {selectedIngredients.length > 0 && (
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-blue-900">
                  {selectedIngredients.length} {t('admin.ingredients')} {t('admin.selected')}
                </h3>
                <p className="text-sm text-blue-700">
                  {t('admin.applyActionsToSelected')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={Eye}
                onClick={() => {
                  // Handle bulk view
                }}
              >
                {t('admin.view')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={Copy}
                onClick={() => {
                  // Handle bulk duplicate
                }}
              >
                {t('admin.duplicate')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={FileText}
                onClick={handleBulkArchive}
              >
                {t('admin.archive')}
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={handleBulkDelete}
              >
                {t('admin.delete')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Ingredients Table - Updated */}
      <Card>
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="w-12 text-left py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selectedIngredients.length === sortedIngredients.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIngredients(sortedIngredients.map(i => i.id))
                      } else {
                        setSelectedIngredients([])
                      }
                    }}
                    className="rounded border-gray-300 text-[#42b8ac] focus:ring-[#42b8ac]"
                  />
                </th>
                <th className="w-1/4 text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.ingredient')}</th>
                <th className="w-1/4 text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.allergens')}</th>
                <th className="w-1/4 text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.dietaryAttributes')}</th>
                <th className="w-1/6 text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.suppliers')}</th>
                <th className="w-20 text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.status')}</th>
                <th className="w-24 text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {sortedIngredients.map((ingredient) => (
                <tr
                  key={ingredient.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="w-12 py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIngredients.includes(ingredient.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIngredients([...selectedIngredients, ingredient.id])
                        } else {
                          setSelectedIngredients(selectedIngredients.filter(id => id !== ingredient.id))
                        }
                      }}
                      className="rounded border-gray-300 text-[#42b8ac] focus:ring-[#42b8ac]"
                    />
                  </td>
                  <td className="w-1/4 py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        ingredient.compliance === 'compliant' ? 'bg-emerald-100 dark:bg-emerald-900/20' :
                        ingredient.compliance === 'warning' ? 'bg-amber-100 dark:bg-amber-900/20' :
                        'bg-red-100 dark:bg-red-900/20'
                      }`}>
                        <Package className={`h-5 w-5 ${
                          ingredient.compliance === 'compliant' ? 'text-emerald-600' :
                          ingredient.compliance === 'warning' ? 'text-amber-600' :
                          'text-red-600'
                        }`} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{ingredient.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {t('admin.updated')} {ingredient.lastUpdated}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="w-1/4 py-3 px-4">
                    <div className="flex flex-wrap gap-1.5 max-w-full overflow-hidden">
                      {ingredient.allergens.length === 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          <Check className="h-3 w-3" />
                          {t('admin.none')}
                        </span>
                      ) : (
                      ingredient.allergens.map((allergen: any, index: number) => {
                        // Helper to get color based on allergen level - each level has distinct color (lighter shades)
                        const getSeverityColor = (level: string) => {
                          switch(level) {
                            case 'contains': return '#fca5a5'; // red-300
                            case 'may_contain': return '#fdba74'; // orange-300
                            case 'not_suitable': return '#c4b5fd'; // violet-300
                            case 'traces': return '#67e8f9'; // cyan-300
                            case 'cross_contamination': return '#f59e0b'; // amber-500
                            default: return '#6b7280'; // gray-500
                          }
                        };
                        
                        // If allergen is a string (legacy), handle it
                        if (typeof allergen === 'string') {
                          const allergenData = ALLERGEN_LIST.find(a => 
                            a.name === allergen || 
                            a.name.toLowerCase().includes(allergen.toLowerCase()) ||
                            allergen.toLowerCase().includes(a.name.toLowerCase())
                          );
                          
                          if (allergen === 'None') {
                            return (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                              >
                                <Check className="h-3 w-3" />
                                {t('admin.none')}
                              </span>
                            );
                          }
                          
                          if (allergenData) {
                            const IconComponent = getIconComponent(allergenData.icon);
                            return (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border-2"
                                style={{
                                  borderColor: allergenData.color,
                                  backgroundColor: `${allergenData.color}15`,
                                  color: allergenData.color
                                }}
                              >
                                <IconComponent className="h-3 w-3" />
                                {allergen}
                              </span>
                            );
                          }
                          return null;
                        }
                        
                        // New object format with severity levels
                        const allergenData = ALLERGEN_LIST.find(a => 
                          a.id === allergen.name.replace(/ /g, '_') ||
                          a.name.toLowerCase() === allergen.name.toLowerCase()
                        );
                        
                        if (allergen.subAllergens) {
                          // Has sub-allergens - show parent with children
                          const IconComponent = allergenData ? getIconComponent(allergenData.icon) : AlertCircle;
                          const baseColor = allergenData?.color || '#6b7280';
                          
                          return (
                            <div key={index} className="flex flex-col gap-1">
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border-2"
                                style={{
                                  borderColor: baseColor,
                                  backgroundColor: `${baseColor}15`,
                                  color: baseColor
                                }}
                              >
                                <IconComponent className="h-3 w-3" />
                                {allergenData?.name || allergen.name}
                              </span>
                              <div className="flex flex-wrap gap-1 ml-3">
                                {allergen.subAllergens.map((sub: any, subIndex: number) => {
                                  const severityColor = getSeverityColor(sub.level);
                                  return (
                                    <span
                                      key={subIndex}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border"
                                      style={{
                                        borderColor: severityColor,
                                        backgroundColor: `${severityColor}15`,
                                        color: severityColor
                                      }}
                                      title={`${sub.level.replace('_', ' ')}`}
                                    >
                                      ↳ {sub.name}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                        
                        // Regular allergen without sub-allergens
                        if (allergenData) {
                          const IconComponent = getIconComponent(allergenData.icon);
                          const baseColor = allergenData.color;
                          return (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border-2"
                              style={{
                                borderColor: baseColor,
                                backgroundColor: `${baseColor}15`,
                                color: baseColor
                              }}
                              title={allergen.level.replace('_', ' ')}
                            >
                              <IconComponent className="h-3 w-3" />
                              {allergenData.name}
                            </span>
                          );
                        }
                        
                        return (
                          <Badge key={index} variant="warning" size="sm">
                            {typeof allergen === 'string' ? allergen : allergen.name}
                          </Badge>
                        );
                      })
                      )}
                    </div>
                  </td>
                  <td className="w-1/4 py-3 px-4">
                    <div className="flex flex-wrap gap-1.5 max-w-full overflow-hidden">
                      {ingredient.certifications.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">None listed</span>
                      ) : (
                      ingredient.certifications.map((cert, index) => {
                        const attr = dietaryAttributes.find(a => 
                          a.name === cert ||
                          a.name.toLowerCase().replace('-', ' ') === cert.toLowerCase().replace('-', ' ')
                        );
                        
                        if (attr) {
                          const IconComponent = attr.icon;
                          return (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border-2"
                              style={{
                                borderColor: attr.color,
                                backgroundColor: `${attr.color}15`,
                                color: attr.color
                              }}
                            >
                              <IconComponent className="h-3 w-3" />
                              {cert}
                            </span>
                          );
                        }
                        
                        return (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          >
                            {cert}
                          </span>
                        );
                      })
                      )}
                    </div>
                  </td>
                  <td className="w-1/6 py-3 px-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {ingredient.suppliers.length} {t('admin.supplier')}{ingredient.suppliers.length !== 1 ? 's' : ''}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {ingredient.suppliers.slice(0, 2).join(', ')}
                      {ingredient.suppliers.length > 2 && '...'}
                    </div>
                  </td>
                  <td className="w-20 py-3 px-4">
                    <Badge
                      variant={
                        ingredient.status === 'active' ? 'success' :
                        ingredient.status === 'review' ? 'warning' :
                        'default'
                      }
                    >
                      {ingredient.status}
                    </Badge>
                  </td>
                  <td className="w-24 py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Link href={`/admin/ingredients/${ingredient.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Eye}
                          title={t('admin.viewIngredient')}
                        />
                      </Link>
                      <Link href={`/admin/ingredients/${ingredient.id}/edit`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Edit}
                          title={t('admin.editIngredient')}
                        />
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleDelete(ingredient.id)}
                        title={t('admin.deleteIngredient')}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {sortedIngredients.map((ingredient) => (
            <div
              key={ingredient.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 flex flex-col h-full"
            >
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-[#42b8ac] to-[#003842] rounded-lg">
                      <Package className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{ingredient.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{ingredient.lastUpdated}</p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {ingredient.suppliers.length > 0 ? ingredient.suppliers.join(', ') : 'No suppliers'}
                </p>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-2 block">Allergens</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ingredient.allergens.length === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        <Check className="h-3 w-3" />
                        None
                      </span>
                    ) : (
                      ingredient.allergens.slice(0, 3).map((allergen, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                          {allergen.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1 pt-4 border-t dark:border-gray-700 mt-4">
                <Link href={`/admin/ingredients/${ingredient.id}`}>
                  <Button variant="ghost" size="sm" icon={Eye} title={t('admin.view')} />
                </Link>
                <Link href={`/admin/ingredients/${ingredient.id}/edit`}>
                  <Button variant="ghost" size="sm" icon={Edit} title={t('admin.edit')} />
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  onClick={() => handleDelete(ingredient.id)}
                  title={t('admin.delete')}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {sortedIngredients.length === 0 && (
        <div className="text-center py-12">
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Package className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('admin.noIngredientsFound')}</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchTerm || selectedAllergen !== 'all' 
              ? t('admin.tryAdjustingSearch')
              : t('admin.getStartedFirstIngredient')}
          </p>
          <Link href="/admin/ingredients/new">
            <Button variant="primary" icon={Plus}>
              {t('admin.addFirstIngredient')}
            </Button>
          </Link>
        </div>
      )}
    </Card>

      {/* Datasheet Modal */}
      {showDatasheetModal && selectedIngredientForDatasheets && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.productDatasheets')}</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {selectedIngredientForDatasheets.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDatasheetModal(false)
                  setSelectedIngredientForDatasheets(null)
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingDatasheets ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">{t('admin.loadingDatasheets')}</p>
                </div>
              ) : datasheets.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('admin.noDatasheets')}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {t('admin.noDatasheetsUploaded')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('admin.uploadDatasheetsDesc')}
                  </p>
                </div>
              ) : (
                <DatasheetViewer
                  datasheets={datasheets}
                  entityType="ingredient"
                  entityName={selectedIngredientForDatasheets.name}
                  onDownload={async (datasheet) => {
                    if (datasheet.file_path) {
                      try {
                        const response = await fetch(datasheet.file_path)
                        const blob = await response.blob()
                        const url = window.URL.createObjectURL(blob)
                        const link = document.createElement('a')
                        link.href = url
                        link.download = datasheet.file_name || 'datasheet.pdf'
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                        window.URL.revokeObjectURL(url)
                      } catch (error) {
                        console.error('Download failed:', error)
                        showNotification(t('admin.failedToDownload'), 'error')
                      }
                    }
                  }}
                  onPreview={(datasheet) => {
                    if (datasheet.file_path) {
                      window.open(datasheet.file_path, '_blank')
                    }
                  }}
                  onMarkReviewed={(datasheet) => console.log('Mark reviewed:', datasheet)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}
