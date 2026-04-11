// app/admin/ingredients/[id]/edit/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Package, ArrowLeft, Save, X, AlertCircle, Plus, Trash2,
  Leaf, Apple, WheatOff, Moon, Star, Sprout, Globe, Droplets, ShieldCheck
} from 'lucide-react'

import { Container } from '../../../../components/layout/Container'
import { Card } from '../../../../components/layout/Card'
import { Button } from '../../../../components/ui/Button'
import { Badge } from '../../../../components/ui/Badge'
import AllergenWarningSelector from '@/components/admin/AllergenWarningSelector'
import DatasheetUploader from '@/components/admin/DatasheetUploader'
import type { AllergenWarnings } from '@/types/allergen'

export default function EditIngredientPage() {
  const router = useRouter()
  const params = useParams()
  const ingredientId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [datasheets, setDatasheets] = useState<any[]>([])
  const [existingDatasheets, setExistingDatasheets] = useState<any[]>([])
  
  const [ingredient, setIngredient] = useState({
    name: '',
    description: '',
    category: '',
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
    suppliers: [] as string[],
    certifications: [] as string[]
  })

  const [newSupplier, setNewSupplier] = useState('')
  const [customCertInput, setCustomCertInput] = useState('')
  const [showCustomCertInput, setShowCustomCertInput] = useState(false)

  const parseJsonSafely = async (response: Response) => {
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return response.json()
    }
    const text = await response.text()
    return { error: text || 'Unexpected response from server' }
  }

  const categoryOptions = [
    'Fruit',
    'Vegetable',
    'Grain',
    'Protein',
    'Dairy',
    'Dairy Alternative',
    'Spread',
    'Seed',
    'Nut',
    'Spice',
    'Sweetener',
    'Oil',
    'Other'
  ]

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
    const fetchIngredient = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/ingredients/${ingredientId}`)
        const data = await parseJsonSafely(response)
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch ingredient')
        }
        
        console.log('Edit page - Ingredient data:', data.ingredient)
        console.log('Edit page - Allergen warnings:', data.ingredient.allergen_warnings)
        
        setIngredient({
          name: data.ingredient.name,
          description: data.ingredient.description || '',
          category: data.ingredient.category || '',
          allergen_warnings: data.ingredient.allergen_warnings || ingredient.allergen_warnings,
          suppliers: data.ingredient.suppliers || [],
          certifications: data.ingredient.certifications || []
        })

        // Fetch existing datasheets
        const datasheetsResponse = await fetch(`/api/datasheets?ingredient_id=${ingredientId}`)
        const datasheetsData = await parseJsonSafely(datasheetsResponse)
        if (datasheetsResponse.ok) {
          setExistingDatasheets(datasheetsData.datasheets || [])
        }
      } catch (error: any) {
        console.error('Error fetching ingredient:', error)
        alert('Failed to load ingredient')
      } finally {
        setLoading(false)
      }
    }
    
    fetchIngredient()
  }, [ingredientId])

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${ingredient.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/ingredients/${ingredientId}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await parseJsonSafely(response)
        throw new Error(data.error || 'Failed to delete ingredient')
      }
      router.push('/admin/ingredients')
    } catch (error: any) {
      console.error('Error deleting ingredient:', error)
      alert(error.message || 'Failed to delete ingredient')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async () => {
    if (!ingredient.name) {
      alert('Please fill in required field (Name)')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/ingredients/${ingredientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ingredient)
      })
      const data = await parseJsonSafely(response)
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update ingredient')
      }

      // Upload only new datasheets that include a File object
      for (const datasheet of datasheets) {
        if (!datasheet.file) continue

        const fileName = datasheet.file_name || datasheet.file?.name || 'datasheet'
        const formData = new FormData()
        formData.append('file', datasheet.file)
        formData.append('ingredient_id', ingredientId)
        formData.append('supplier_name', datasheet.supplier_name || '')
        formData.append('version', datasheet.version || '')
        if (datasheet.next_review_date) {
          formData.append('next_review_date', datasheet.next_review_date)
        }
        if (datasheet.notes) {
          formData.append('notes', datasheet.notes)
        }

        const uploadResponse = await fetch('/api/upload/datasheet', {
          method: 'POST',
          body: formData
        })

        if (!uploadResponse.ok) {
          const error = await parseJsonSafely(uploadResponse)
          console.error('Failed to upload datasheet:', error)
          alert(`Failed to upload ${fileName}`)
        }
      }

      router.push('/admin/ingredients')
    } catch (error: any) {
      console.error('Error updating ingredient:', error)
      alert(error.message || 'Failed to update ingredient')
    } finally {
      setSaving(false)
    }
  }

  const addSupplier = () => {
    if (newSupplier.trim() && !ingredient.suppliers.includes(newSupplier.trim())) {
      setIngredient(prev => ({
        ...prev,
        suppliers: [...prev.suppliers, newSupplier.trim()]
      }))
      setNewSupplier('')
    }
  }

  const removeSupplier = (supplier: string) => {
    setIngredient(prev => ({
      ...prev,
      suppliers: prev.suppliers.filter(s => s !== supplier)
    }))
  }

  const toggleCertification = (cert: string) => {
    setIngredient(prev => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter(c => c !== cert)
        : [...prev.certifications, cert]
    }))
  }

  const addCustomCertification = () => {
    const trimmed = customCertInput.trim()
    if (trimmed && !ingredient.certifications.includes(trimmed)) {
      setIngredient(prev => ({
        ...prev,
        certifications: [...prev.certifications, trimmed]
      }))
      setCustomCertInput('')
      setShowCustomCertInput(false)
    }
  }

  const removeCertification = (cert: string) => {
    setIngredient(prev => ({
      ...prev,
      certifications: prev.certifications.filter(c => c !== cert)
    }))
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
            <p className="text-gray-600 dark:text-gray-400">Loading ingredient...</p>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <>
      <Container>
        <div className="mb-6">
        <Link href="/admin/ingredients">
          <Button variant="ghost" icon={ArrowLeft}>
            Back to Ingredients
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="p-3 bg-gradient-to-br from-[#42b8ac] to-[#003842] rounded-xl flex-shrink-0">
            <Package className="h-8 w-8 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#003842]">Edit Ingredient</h1>
            <p className="text-gray-600">Update ingredient details and allergen information</p>
          </div>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? 'Deleting...' : 'Delete Ingredient'}
          </button>
          <Button 
            variant="outline" 
            onClick={() => router.push('/admin/ingredients')}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving}
            icon={Save}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <h2 className="text-xl font-semibold text-[#003842] mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ingredient.name}
                  onChange={(e) => setIngredient({ ...ingredient, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                  placeholder="e.g., Almonds"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={ingredient.description}
                  onChange={(e) => setIngredient({ ...ingredient, description: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                  placeholder="Enter ingredient description..."
                />
              </div>
            </div>
          </Card>

          {/* Allergen Information */}
          <Card>
            <h2 className="text-xl font-semibold text-[#003842] mb-4">Allergen Information</h2>
            <AllergenWarningSelector
              value={ingredient.allergen_warnings}
              onChange={(warnings) => setIngredient({ ...ingredient, allergen_warnings: warnings })}
            />
          </Card>

          {/* Suppliers */}
          <Card>
            <h2 className="text-xl font-semibold text-[#003842] mb-4">Suppliers</h2>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSupplier()}
                  placeholder="Add supplier name"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                />
                <Button onClick={addSupplier} icon={Plus}>
                  Add
                </Button>
              </div>

              {ingredient.suppliers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {ingredient.suppliers.map((supplier, index) => (
                    <Badge
                      key={index}
                      variant="default"
                    >
                      {supplier}
                      <button
                        onClick={() => removeSupplier(supplier)}
                        className="hover:text-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Datasheets Section */}
          <Card>
            <h2 className="text-xl font-semibold text-[#003842] mb-4">Product Datasheets</h2>
            <DatasheetUploader 
              existingDatasheets={existingDatasheets}
              onFilesChange={setDatasheets}
              entityType="ingredient"
            />
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dietary Attributes */}
          <Card>
            <h2 className="text-xl font-semibold text-[#003842] mb-4">Dietary Attributes</h2>
            
            <div className="space-y-3">
              {certificationOptions.map((cert) => {
                const Icon = cert.icon
                const isSelected = ingredient.certifications.includes(cert.name)
                
                return (
                  <button
                    key={cert.name}
                    onClick={() => toggleCertification(cert.name)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                      isSelected 
                        ? 'border-current shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{
                      borderColor: isSelected ? cert.color : undefined,
                      backgroundColor: isSelected ? `${cert.color}15` : undefined,
                      color: isSelected ? cert.color : '#6b7280'
                    }}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{cert.name}</span>
                  </button>
                )
              })}

              {/* Custom Certification */}
              {!showCustomCertInput && (
                <button
                  onClick={() => setShowCustomCertInput(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-700 transition-all"
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-medium">Add Custom</span>
                </button>
              )}

              {showCustomCertInput && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCertInput}
                    onChange={(e) => setCustomCertInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomCertification()}
                    placeholder="Custom certification"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                    autoFocus
                  />
                  <Button size="sm" onClick={addCustomCertification}>
                    Add
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      setShowCustomCertInput(false)
                      setCustomCertInput('')
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Display custom certifications */}
              {ingredient.certifications.filter(cert => 
                !certificationOptions.some(opt => opt.name === cert)
              ).map((cert, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border-2 border-gray-300 bg-gray-50"
                >
                  <span className="font-medium text-gray-700">{cert}</span>
                  <button
                    onClick={() => removeCertification(cert)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Container>

    </>
  )
}
