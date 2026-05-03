// app/admin/menu-builder/[id]/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useNotification } from '@/lib/hooks/useNotification'
import { 
  Package, ArrowLeft, Edit, Trash2, AlertCircle, Check,
  Leaf, Apple, WheatOff, Moon, Star, Sprout, Globe, Droplets, ShieldCheck, Truck, FileText, Download, ExternalLink, X, CircleDot
} from 'lucide-react'

import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ALLERGEN_LIST } from '@/types/allergen'

export default function ViewMenuItemPage() {
  const { showNotification } = useNotification()
  const router = useRouter()
  const params = useParams()
  const menuItemId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [menuItem, setMenuItem] = useState<any>(null)
  const [ingredients, setIngredients] = useState<any[]>([])
  const [datasheets, setDatasheets] = useState<any[]>([])
  const [ingredientDatasheets, setIngredientDatasheets] = useState<any[]>([])
  const [loadingDatasheets, setLoadingDatasheets] = useState(true)

  const certificationOptions = [
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch menu item
        const response = await fetch(`/api/menu-items/${menuItemId}`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch menu item')
        }
        
        console.log('Menu item data:', data.menuItem)
        console.log('Allergen warnings:', data.menuItem.allergen_warnings)
        setMenuItem(data.menuItem)
        
        // Fetch ingredients
        const ingredientsResponse = await fetch('/api/ingredients')
        const ingredientsData = await ingredientsResponse.json()
        
        if (ingredientsResponse.ok) {
          const selectedIngredients = (ingredientsData.ingredients || []).filter((ing: any) =>
            data.menuItem.ingredients?.includes(ing.id)
          )
          setIngredients(selectedIngredients)
        }
        
        // Fetch datasheets
        setLoadingDatasheets(true)
        const datasheetsResponse = await fetch(`/api/datasheets?menu_item_id=${menuItemId}`)
        const datasheetsData = await datasheetsResponse.json()
        
        if (datasheetsResponse.ok) {
          setDatasheets(datasheetsData.datasheets || [])
        }

        // Fetch ingredient datasheets
        if (data.menuItem.ingredients && data.menuItem.ingredients.length > 0) {
          const ingDatasheetsResponse = await fetch(`/api/datasheets?ingredientIds=${data.menuItem.ingredients.join(',')}`)
          const ingDatasheetsData = await ingDatasheetsResponse.json()
          if (ingDatasheetsResponse.ok) {
            setIngredientDatasheets(ingDatasheetsData.datasheets || [])
          }
        }
        
      } catch (error: any) {
        console.error('Error fetching menu item:', error)
        showNotification('Failed to load menu item', 'error')
      } finally {
        setLoading(false)
        setLoadingDatasheets(false)
      }
    }
    
    fetchData()
  }, [menuItemId])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this menu item?')) {
      return
    }

    try {
      const response = await fetch(`/api/menu-items/${menuItemId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete menu item')
      }

      router.push('/admin/menu-builder')
    } catch (error: any) {
      console.error('Error deleting menu item:', error)
      showNotification(error.message || 'Failed to delete menu item', 'error')
    }
  }

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      Leaf, Apple, WheatOff, Moon, Star, Sprout, Globe, Droplets, ShieldCheck, CircleDot
    }
    return icons[iconName] || AlertCircle
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
            <p className="text-gray-600 dark:text-gray-400">Loading menu item...</p>
          </div>
        </div>
      </Container>
    )
  }

  if (!menuItem) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Menu item not found</p>
            <Link href="/admin/menu-builder">
              <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} className="mt-4">
                Back to Menu Builder
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    )
  }

  const allergenWarnings = menuItem.allergen_warnings || {}
  const activeAllergens = Object.entries(allergenWarnings)
    .filter(([key, value]) => value !== 'none' && !key.endsWith('_levels') && !key.endsWith('_types'))
    .map(([key, value]) => {
      // Check if this allergen has sub-levels
      const levelsKey = `${key}_levels`
      const hasSubLevels = allergenWarnings[levelsKey]
      
      if (hasSubLevels && typeof hasSubLevels === 'object') {
        // Extract sub-allergens that are not 'none'
        const subAllergens: any[] = []
        Object.entries(hasSubLevels).forEach(([subKey, subValue]: [string, any]) => {
          if (subValue !== 'none') {
            subAllergens.push({
              name: subKey.replace(/_/g, ' '),
              level: subValue
            })
          }
        })
        return { key, value, subAllergens }
      }
      
      return { key, value }
    })

  return (
    <Container>
      <div className="mb-6">
        <Link href="/admin/menu-builder">
          <Button variant="ghost" icon={<ArrowLeft />}>
            Back to Menu Builder
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="p-3 bg-gradient-to-br from-[#42b8ac] to-[#003842] rounded-xl flex-shrink-0">
            <Package className="h-8 w-8 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#003842] truncate">{menuItem.name}</h1>
            <p className="text-gray-600">
              Created {new Date(menuItem.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <Link href={`/admin/menu-builder/${menuItemId}/edit`}>
            <Button icon={<Edit />} className="bg-[#42b8ac] text-white hover:bg-[#3a9d95]">
              Edit
            </Button>
          </Link>
          <Button 
            variant="outline"
            onClick={handleDelete}
            icon={<Trash2 />}
            className="text-red-600 hover:text-red-700 hover:border-red-300"
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <h2 className="text-xl font-semibold text-[#003842] mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-lg text-gray-900 mt-1">{menuItem.name}</p>
              </div>

              {menuItem.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-900 mt-1 whitespace-pre-wrap">{menuItem.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <p className="text-gray-900 mt-1">{menuItem.category || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge
                      variant={
                        menuItem.status === 'active' ? 'success' :
                        menuItem.status === 'draft' ? 'warning' :
                        'default'
                      }
                    >
                      {menuItem.status || 'draft'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Allergen Information */}
          <Card>
            <h2 className="text-xl font-semibold text-[#003842] mb-4">Allergen Information</h2>
            
            {activeAllergens.length === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <Check className="h-5 w-5 text-green-600" />
                <span className="text-green-800 font-medium">No allergens present</span>
              </div>
            ) : (
              <div className="space-y-3">
                {activeAllergens.map(({ key, value, subAllergens }: any) => {
                  const allergenData = ALLERGEN_LIST.find(a => 
                    a.id === key || a.name.toLowerCase().replace(/\s+/g, '_') === key
                  )
                  
                  if (!allergenData) return null

                  const Icon = getIconComponent(allergenData.icon)
                  
                  // Helper to get color based on allergen level
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
                  
                  return (
                    <div key={key} className="space-y-2">
                      <div
                        className="flex items-center justify-between p-4 rounded-lg border-2"
                        style={{
                          borderColor: allergenData.color,
                          backgroundColor: `${allergenData.color}15`
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5" style={{ color: allergenData.color }} />
                          <span className="font-medium" style={{ color: allergenData.color }}>
                            {allergenData.name}
                          </span>
                        </div>
                        {!subAllergens && (
                          <Badge
                            variant={
                              value === 'contains' ? 'error' :
                              value === 'may_contain' ? 'warning' :
                              'default'
                            }
                          >
                            {value === 'contains' ? 'Contains' : 
                             value === 'may_contain' ? 'May Contain' : 
                             value === 'traces' ? 'May Contain Traces' :
                             value === 'cross_contamination' ? 'Cross-Contamination Risk' :
                             'Processed In Facility'}
                          </Badge>
                        )}
                      </div>
                      
                      {subAllergens && subAllergens.length > 0 && (
                        <div className="ml-8 space-y-2">
                          {subAllergens.map((sub: any, subIndex: number) => {
                            const severityColor = getSeverityColor(sub.level);
                            return (
                              <div
                                key={subIndex}
                                className="flex items-center justify-between p-3 rounded-lg border-2"
                                style={{
                                  borderColor: severityColor,
                                  backgroundColor: `${severityColor}15`
                                }}
                              >
                                <span className="font-medium text-sm" style={{ color: severityColor }}>
                                  ↳ {sub.name.charAt(0).toUpperCase() + sub.name.slice(1)}
                                </span>
                                <Badge
                                  variant={
                                    sub.level === 'contains' ? 'error' :
                                    sub.level === 'may_contain' ? 'warning' :
                                    'default'
                                  }
                                >
                                  {sub.level === 'contains' ? 'Contains' : 
                                   sub.level === 'may_contain' ? 'May Contain' : 
                                   sub.level === 'traces' ? 'May Contain Traces' :
                                   sub.level === 'cross_contamination' ? 'Cross-Contamination Risk' :
                                   'Not Suitable'}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Ingredients */}
          {ingredients && ingredients.length > 0 && (
            <Card>
              <h2 className="text-xl font-semibold text-[#003842] mb-4">Ingredients</h2>
              
              <div className="space-y-2">
                {ingredients.map((ingredient: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{ingredient.name}</p>
                      {ingredient.suppliers && ingredient.suppliers.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {ingredient.suppliers.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Datasheets */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#003842]">Product Datasheets</h2>
              <Link href={`/admin/menu-builder/${menuItemId}/edit`}>
                <Button variant="ghost" size="sm">
                  Upload
                </Button>
              </Link>
            </div>
            
            {loadingDatasheets ? (
              <div className="text-center py-8">
                <p className="text-gray-600 text-sm">Loading datasheets...</p>
              </div>
            ) : datasheets.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 text-sm mb-2">No datasheets uploaded</p>
                <p className="text-gray-500 text-xs">
                  Edit this menu item to add specification sheets
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {datasheets.map((datasheet: any) => (
                  <div
                    key={datasheet.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {datasheet.file_name}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span>{(datasheet.file_size / 1024 / 1024).toFixed(2)} MB</span>
                          {datasheet.supplier_name && (
                            <>
                              <span>•</span>
                              <span>{datasheet.supplier_name}</span>
                            </>
                          )}
                          {datasheet.version && (
                            <>
                              <span>•</span>
                              <span>v{datasheet.version}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={datasheet.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        title="View/Download"
                      >
                        <ExternalLink className="h-4 w-4 text-gray-600" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ingredient datasheets */}
            {ingredientDatasheets.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-600 mb-3">From Linked Ingredients</h3>
                <div className="space-y-3">
                  {ingredientDatasheets.map((datasheet: any) => {
                    const ingredient = ingredients.find((ing: any) => ing.id === datasheet.ingredient_id)
                    return (
                      <div
                        key={datasheet.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <FileText className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {datasheet.file_name}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                              {ingredient && <span className="text-purple-600">{ingredient.name}</span>}
                              {ingredient && <span>•</span>}
                              <span>{(datasheet.file_size / 1024 / 1024).toFixed(2)} MB</span>
                              {datasheet.supplier_name && (
                                <>
                                  <span>•</span>
                                  <span>{datasheet.supplier_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={datasheet.file_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                            title="View/Download"
                          >
                            <ExternalLink className="h-4 w-4 text-gray-600" />
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dietary Attributes */}
          <Card>
            <h2 className="text-xl font-semibold text-[#003842] mb-4">Dietary Attributes</h2>
            
            <div className="space-y-2">
              {(!menuItem.dietary || menuItem.dietary.length === 0) ? (
                <p className="text-sm text-gray-500">No dietary attributes set</p>
              ) : (
                menuItem.dietary.map((dietary: string, index: number) => {
                  const certData = certificationOptions.find(c => c.name === dietary)
                  
                  if (certData) {
                    const Icon = certData.icon
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg border-2"
                        style={{
                          borderColor: certData.color,
                          backgroundColor: `${certData.color}15`,
                          color: certData.color
                        }}
                      >
                        {typeof Icon === 'function' && React.createElement(Icon as React.ComponentType<{className: string}>, { className: 'h-5 w-5' })}
                        <span className="font-medium">{dietary}</span>
                      </div>
                    )
                  }
                  
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <span className="font-medium text-gray-700">{dietary}</span>
                    </div>
                  )
                })
              )}
            </div>
          </Card>

          {/* Metadata */}
          <Card>
            <h2 className="text-xl font-semibold text-[#003842] mb-4">Metadata</h2>
            
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-gray-500">Created</label>
                <p className="text-gray-900 mt-1">
                  {new Date(menuItem.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-gray-500">Last Updated</label>
                <p className="text-gray-900 mt-1">
                  {new Date(menuItem.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Container>
  )
}
