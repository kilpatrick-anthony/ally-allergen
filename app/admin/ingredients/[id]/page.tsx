// app/admin/ingredients/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Package, ArrowLeft, Edit, Trash2, AlertCircle, Check,
  Leaf, Apple, WheatOff, Moon, Star, Sprout, Globe, Dna, MapPin, Truck, FileText, Download, ExternalLink, X, CircleDot
} from 'lucide-react'

import { Container } from '../../../components/layout/Container'
import { Card } from '../../../components/layout/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { ALLERGEN_LIST } from '@/types/allergen'

export default function ViewIngredientPage() {
  const router = useRouter()
  const params = useParams()
  const ingredientId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [ingredient, setIngredient] = useState<any>(null)
  const [datasheets, setDatasheets] = useState<any[]>([])
  const [loadingDatasheets, setLoadingDatasheets] = useState(true)

  const certificationOptions = [
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch ingredient
        const response = await fetch(`/api/ingredients/${ingredientId}`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch ingredient')
        }
        
        console.log('Ingredient data:', data.ingredient)
        console.log('Allergen warnings:', data.ingredient.allergen_warnings)
        setIngredient(data.ingredient)
        
        // Fetch datasheets
        setLoadingDatasheets(true)
        const datasheetsResponse = await fetch(`/api/datasheets?ingredient_id=${ingredientId}`)
        const datasheetsData = await datasheetsResponse.json()
        
        if (datasheetsResponse.ok) {
          setDatasheets(datasheetsData.datasheets || [])
        }
        
      } catch (error: any) {
        console.error('Error fetching ingredient:', error)
        alert('Failed to load ingredient')
      } finally {
        setLoading(false)
        setLoadingDatasheets(false)
      }
    }
    
    fetchData()
  }, [ingredientId])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this ingredient?')) {
      return
    }

    try {
      const response = await fetch(`/api/ingredients/${ingredientId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete ingredient')
      }

      router.push('/admin/ingredients')
    } catch (error: any) {
      console.error('Error deleting ingredient:', error)
      alert(error.message || 'Failed to delete ingredient')
    }
  }

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      Leaf, Apple, WheatOff, Moon, Star, Sprout, Globe, Dna, MapPin, CircleDot
    }
    return icons[iconName] || AlertCircle
  }

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">Loading ingredient...</p>
          </div>
        </div>
      </Container>
    )
  }

  if (!ingredient) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Ingredient not found</p>
            <Link href="/admin/ingredients">
              <Button variant="ghost" icon={ArrowLeft} className="mt-4">
                Back to Ingredients
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    )
  }

  const allergenWarnings = ingredient.allergen_warnings || {}
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
        <Link href="/admin/ingredients">
          <Button variant="ghost" icon={ArrowLeft}>
            Back to Ingredients
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-[#42b8ac] to-[#003842] rounded-xl">
            <Package className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#003842]">{ingredient.name}</h1>
            <p className="text-gray-600">
              Created {new Date(ingredient.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={`/admin/ingredients/${ingredientId}/edit`}>
            <Button icon={Edit}>
              Edit
            </Button>
          </Link>
          <Button 
            variant="outline"
            onClick={handleDelete}
            icon={Trash2}
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
                <p className="text-lg text-gray-900 mt-1">{ingredient.name}</p>
              </div>

              {ingredient.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-900 mt-1 whitespace-pre-wrap">{ingredient.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge
                      variant={
                        ingredient.status === 'active' ? 'success' :
                        ingredient.status === 'review' ? 'warning' :
                        'default'
                      }
                    >
                      {ingredient.status || 'active'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Compliance</label>
                  <div className="mt-1">
                    <Badge
                      variant={
                        ingredient.compliance === 'compliant' ? 'success' :
                        ingredient.compliance === 'warning' ? 'warning' :
                        'error'
                      }
                    >
                      {ingredient.compliance || 'compliant'}
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

          {/* Suppliers */}
          {ingredient.suppliers && ingredient.suppliers.length > 0 && (
            <Card>
              <h2 className="text-xl font-semibold text-[#003842] mb-4">Suppliers</h2>
              
              <div className="space-y-2">
                {ingredient.suppliers.map((supplier: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <Truck className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-900">{supplier}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Datasheets */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#003842]">Product Datasheets</h2>
              <Link href={`/admin/ingredients/${ingredientId}/edit`}>
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
                  Edit this ingredient to add specification sheets
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
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dietary Attributes */}
          {ingredient.certifications && ingredient.certifications.length > 0 && (
            <Card>
              <h2 className="text-xl font-semibold text-[#003842] mb-4">Dietary Attributes</h2>
              
              <div className="space-y-2">
                {ingredient.certifications.map((cert: string, index: number) => {
                  const certData = certificationOptions.find(c => c.name === cert)
                  
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
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{cert}</span>
                      </div>
                    )
                  }
                  
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <span className="font-medium text-gray-700">{cert}</span>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <h2 className="text-xl font-semibold text-[#003842] mb-4">Metadata</h2>
            
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-gray-500">Created</label>
                <p className="text-gray-900 mt-1">
                  {new Date(ingredient.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-gray-500">Last Updated</label>
                <p className="text-gray-900 mt-1">
                  {new Date(ingredient.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Container>
  )
}
