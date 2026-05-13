// app/admin/ingredients/new/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useNotification } from '@/lib/hooks/useNotification'
import { 
  Package, ArrowLeft, Save, X, AlertCircle, Plus, Trash2,
  Leaf, Apple, WheatOff, Moon, Star, Sprout, Globe, Droplets, ShieldCheck, ScanLine,
  ChevronDown, ChevronRight
} from 'lucide-react'

import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import AllergenWarningSelector from '@/components/admin/AllergenWarningSelector'
import DatasheetUploader from '@/components/admin/DatasheetUploader'
import { LabelScanModal } from '@/components/admin/LabelScanModal'
import type { AllergenWarnings } from '@/types/allergen'
import { computeWorstCaseAllergens } from '@/types/allergen'

type SupplierProfile = {
  allergen_warnings: AllergenWarnings
  certifications: string[]
}

export default function NewIngredientPage() {
  const { showNotification } = useNotification()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [datasheets, setDatasheets] = useState<any[]>([])
  const [showScan, setShowScan] = useState(false)
  
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
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [availableSuppliers, setAvailableSuppliers] = useState<string[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [customCertInput, setCustomCertInput] = useState('')
  const [showCustomCertInput, setShowCustomCertInput] = useState(false)

  // Per-supplier profiles
  const defaultAllergenWarnings: AllergenWarnings = {
    cereals_gluten: 'none', crustaceans: 'none', eggs: 'none', fish: 'none',
    peanuts: 'none', soybeans: 'none', milk: 'none', nuts: 'none',
    celery: 'none', mustard: 'none', sesame: 'none', sulphites: 'none',
    lupin: 'none', molluscs: 'none'
  }
  const [supplierProfiles, setSupplierProfiles] = useState<Record<string, SupplierProfile>>({})
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set())

  const parseJsonSafely = async (response: Response) => {
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return response.json()
    }
    const text = await response.text()
    return { error: text || 'Unexpected response from server' }
  }

  const applyDefaultSupplierToDatasheets = (files: any[], suppliers: string[]) => {
    if (suppliers.length !== 1) {
      return files
    }

    const defaultSupplier = suppliers[0].trim()
    if (!defaultSupplier) {
      return files
    }

    return files.map((file) => {
      const currentSupplier = typeof file.supplier_name === 'string' ? file.supplier_name.trim() : ''
      if (currentSupplier) {
        return file
      }
      return { ...file, supplier_name: defaultSupplier }
    })
  }

  useEffect(() => {
    if (datasheets.length === 0) {
      return
    }

    const updated = applyDefaultSupplierToDatasheets(datasheets, ingredient.suppliers)
    const hasChanges = updated.some((file, index) => file.supplier_name !== datasheets[index]?.supplier_name)

    if (hasChanges) {
      setDatasheets(updated)
    }
  }, [ingredient.suppliers, datasheets])

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoadingSuppliers(true)
        
        // Add timeout to prevent hanging
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
        
        const response = await fetch('/api/suppliers', {
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch suppliers')
        }

        const names = (data.suppliers || [])
          .map((supplier: any) => supplier.name)
          .filter((name: string) => typeof name === 'string' && name.trim() !== '')
          .map((name: string) => name.trim())

        const uniqueNames = (Array.from(new Set(names)) as string[]).sort((a, b) => a.localeCompare(b))
        setAvailableSuppliers(uniqueNames)
      } catch (error: any) {
        console.error('Error fetching suppliers:', error)
        // Don't show error to user, just continue with empty suppliers list
        setAvailableSuppliers([])
      } finally {
        setLoadingSuppliers(false)
      }
    }

    fetchSuppliers()
  }, [])

  const DEFAULT_INGREDIENT_CATEGORIES = [
    'Dairy', 'Dairy Alternative', 'Fruit', 'Grain', 'Nut', 'Oil',
    'Other', 'Protein', 'Seed', 'Spice', 'Spread', 'Sweetener', 'Vegetable'
  ]
  const [categoryOptions, setCategoryOptions] = useState<string[]>(DEFAULT_INGREDIENT_CATEGORIES)

  useEffect(() => {
    fetch('/api/ingredients/categories')
      .then(r => r.ok ? r.json() : { categories: [] })
      .then(({ categories }: { categories: string[] }) => {
        const merged = [...new Set([...DEFAULT_INGREDIENT_CATEGORIES, ...(categories || [])])].sort()
        setCategoryOptions(merged)
      })
      .catch(() => {})
  }, [])

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

  const handleSave = async () => {
    if (!ingredient.name) {
      showNotification('Please fill in required field (Name)', 'error')
      return
    }

    setSaving(true)
    
    try {
      console.log('Saving ingredient:', ingredient)
      
      const response = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ingredient, supplier_profiles: supplierProfiles })
      })

      const result = await parseJsonSafely(response)

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save ingredient')
      }

      const ingredientId = result.ingredient.id
      console.log('✅ Ingredient saved:', result.ingredient)

      // Upload datasheets if any
      if (datasheets.length > 0) {
        console.log('📤 Uploading', datasheets.length, 'datasheets...')
        
        const uploadPromises = datasheets.map(async (datasheet) => {
          if (!datasheet.file) return
          
          const formData = new FormData()
          formData.append('file', datasheet.file)
          formData.append('ingredient_id', ingredientId)
          if (datasheet.supplier_name) formData.append('supplier_name', datasheet.supplier_name)
          if (datasheet.version) formData.append('version', datasheet.version)
          if (datasheet.next_review_date) formData.append('next_review_date', datasheet.next_review_date)
          if (datasheet.notes) formData.append('notes', datasheet.notes)

          const uploadResponse = await fetch('/api/upload/datasheet', {
            method: 'POST',
            body: formData
          })

          if (!uploadResponse.ok) {
            const errorData = await parseJsonSafely(uploadResponse)
            console.error('Failed to upload:', datasheet.file_name, errorData)
            throw new Error(`Failed to upload ${datasheet.file_name}`)
          }

          return parseJsonSafely(uploadResponse)
        })

        await Promise.all(uploadPromises)
        console.log('✅ All datasheets uploaded')
      }

      showNotification('Ingredient saved successfully!', 'success')
      router.push('/admin/ingredients')
    } catch (error: any) {
      console.error('Error saving ingredient:', error)
      showNotification(error.message || 'Failed to save ingredient', 'error')
    } finally {
      setSaving(false)
    }
  }

  const addSupplierByName = (supplierName: string) => {
    const trimmed = supplierName.trim()
    if (trimmed && !ingredient.suppliers.includes(trimmed)) {
      setIngredient({
        ...ingredient,
        suppliers: [...ingredient.suppliers, trimmed]
      })
      setExpandedSuppliers(prev => { const next = new Set(prev); next.add(trimmed); return next })
    }
  }

  const addSupplier = () => {
    if (!newSupplier.trim()) {
      return
    }
    addSupplierByName(newSupplier)
    setNewSupplier('')
  }

  const removeSupplier = (supplier: string) => {
    setIngredient({
      ...ingredient,
      suppliers: ingredient.suppliers.filter(s => s !== supplier)
    })
    setSupplierProfiles(prev => { const { [supplier]: _, ...rest } = prev; return rest })
    setExpandedSuppliers(prev => { const next = new Set(prev); next.delete(supplier); return next })
  }

  const toggleSupplierExpanded = (name: string) => {
    setExpandedSuppliers(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const updateSupplierProfile = (name: string, updates: Partial<SupplierProfile>) => {
    setSupplierProfiles(prev => ({
      ...prev,
      [name]: { ...(prev[name] || { allergen_warnings: { ...defaultAllergenWarnings }, certifications: [] }), ...updates }
    }))
  }

  const toggleCertification = (cert: string) => {
    if (ingredient.certifications.includes(cert)) {
      setIngredient({
        ...ingredient,
        certifications: ingredient.certifications.filter(c => c !== cert)
      })
    } else {
      setIngredient({
        ...ingredient,
        certifications: [...ingredient.certifications, cert]
      })
    }
  }

  const addCustomCertification = () => {
    if (customCertInput.trim() && !ingredient.certifications.includes(customCertInput.trim())) {
      setIngredient({
        ...ingredient,
        certifications: [...ingredient.certifications, customCertInput.trim()]
      })
      setCustomCertInput('')
      setShowCustomCertInput(false)
    }
  }

  const removeCustomCertification = (cert: string) => {
    setIngredient({
      ...ingredient,
      certifications: ingredient.certifications.filter(c => c !== cert)
    })
  }

  const isCustomCertification = (cert: string) => {
    return !certificationOptions.some(opt => opt.name === cert)
  }

  const handleScanAccept = (data: { name: string; description: string; allergen_warnings: AllergenWarnings }) => {
    setIngredient(prev => ({
      ...prev,
      name: data.name || prev.name,
      ...(data.description ? { description: data.description } : {}),
      allergen_warnings: data.allergen_warnings,
    }))
  }

  return (
    <>
      <Container>
        <div className="py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/admin/ingredients"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Ingredients
          </Link>
          
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-[#42b8ac] to-[#003842] rounded-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-[#003842] dark:text-white">Add New Ingredient</h1>
                  <p className="text-gray-600">
                    Create a new ingredient with allergen information
                  </p>
                </div>
              </div>
            </div>
            {/* Scan Label button hidden until feature is ready */}
            {false && (
            <button
              type="button"
              onClick={() => setShowScan(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#42b8ac] to-[#003842] text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-md"
            >
              <ScanLine className="h-4 w-4" />
              Scan Label
            </button>
            )}
          </div>
        </div>

        {/* Basic Information */}
        <Card className="mb-8">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-[#003842] dark:text-[#42b8ac]">Basic Information</h2>
            <p className="text-sm text-gray-600">Enter the ingredient details</p>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              {/* Ingredient Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ingredient Name *
                </label>
                <input
                  type="text"
                  value={ingredient.name}
                  onChange={(e) => setIngredient({...ingredient, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                  placeholder="e.g., Acai Berry"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  list="ingredient-categories"
                  value={ingredient.category}
                  onChange={(e) => setIngredient({...ingredient, category: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                  placeholder="e.g., Dairy, Produce, Dry Goods"
                />
                <datalist id="ingredient-categories">
                  {categoryOptions.map(opt => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              </div>

              {/* Certifications */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Certifications & Dietary Attributes
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {certificationOptions.map(cert => {
                    const isSelected = ingredient.certifications.includes(cert.name);
                    const IconComponent = cert.icon;
                    
                    return (
                      <button
                        key={cert.name}
                        type="button"
                        onClick={() => toggleCertification(cert.name)}
                        className={`
                          relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                          ${isSelected
                            ? 'border-opacity-100 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
                          }
                          group cursor-pointer
                        `}
                        style={{
                          borderColor: isSelected ? cert.color : undefined,
                          backgroundColor: isSelected ? `${cert.color}15` : '#fff'
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
                          style={{ backgroundColor: cert.color }}
                        >
                          {typeof cert.icon === 'function' && React.createElement(cert.icon as React.ComponentType<{className: string}>, { className: 'h-6 w-6 text-white' })}
                        </div>
                        <span 
                          className={`text-xs font-semibold text-center transition-colors ${
                            isSelected ? 'text-gray-900' : 'text-gray-700'
                          }`}
                        >
                          {cert.name}
                        </span>
                        {isSelected && (
                          <div 
                            className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: cert.color }}
                          >
                            <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                  
                  {/* Custom Certification Card */}
                  <button
                    type="button"
                    onClick={() => setShowCustomCertInput(!showCustomCertInput)}
                    className={`
                      relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                      ${showCustomCertInput
                        ? 'border-gray-400 shadow-md bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-lg bg-white'
                      }
                      group cursor-pointer
                    `}
                  >
                    <div 
                      className={`
                        flex items-center justify-center w-12 h-12 rounded-lg transition-all bg-gray-500
                        ${showCustomCertInput 
                          ? 'scale-100' 
                          : 'group-hover:scale-110'
                        }
                        group-hover:shadow-lg
                      `}
                    >
                      <Plus className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-center text-gray-700">
                      Custom
                    </span>
                  </button>
                </div>
                
                {/* Custom Certification Input */}
                {showCustomCertInput && (
                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      value={customCertInput}
                      onChange={(e) => setCustomCertInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCustomCertification()}
                      placeholder="Enter custom certification"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                    />
                    <Button
                      variant="primary"
                      onClick={addCustomCertification}
                      disabled={!customCertInput.trim()}
                    >
                      Add
                    </Button>
                  </div>
                )}
                
                {/* Display Custom Certifications */}
                {ingredient.certifications.filter(cert => isCustomCertification(cert)).length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Custom Certifications:</p>
                    <div className="flex flex-wrap gap-2">
                      {ingredient.certifications.filter(cert => isCustomCertification(cert)).map(cert => (
                        <span
                          key={cert}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
                        >
                          {cert}
                          <button
                            type="button"
                            onClick={() => removeCustomCertification(cert)}
                            className="text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={ingredient.description}
                  onChange={(e) => setIngredient({...ingredient, description: e.target.value})}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                  placeholder="Describe the ingredient..."
                />
              </div>

              {/* Supplier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <p className="text-xs text-gray-500 mb-2">Add one or more suppliers for this ingredient. Each supplier can have its own allergen and dietary profile — the worst-case allergen data across all suppliers is used for reports and the kiosk.</p>
                <div className="mb-3">
                  <select
                    value={selectedSupplier}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val) {
                        addSupplierByName(val)
                        setSelectedSupplier('')
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                  >
                    <option value="">
                      {loadingSuppliers ? 'Loading suppliers...' : 'Select existing supplier'}
                    </option>
                    {availableSuppliers.map((supplier) => (
                      <option key={supplier} value={supplier}>
                        {supplier}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500 mb-1">Or create a new supplier:</p>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSupplier()}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                    placeholder="Type new supplier name..."
                  />
                  <Button
                    onClick={addSupplier}
                    variant="outline"
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Add
                  </Button>
                </div>
                
                {ingredient.suppliers.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {ingredient.suppliers.map(supplier => (
                      <div key={supplier} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-gray-50">
                          <span className="font-medium text-gray-800">{supplier}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleSupplierExpanded(supplier)}
                              className="flex items-center gap-1 text-xs text-[#42b8ac] hover:text-[#003842] transition-colors"
                            >
                              {expandedSuppliers.has(supplier)
                                ? <><ChevronDown className="h-4 w-4" /><span>Hide profile</span></>
                                : <><ChevronRight className="h-4 w-4" /><span>Set allergens &amp; certs</span></>}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSupplier(supplier)}
                              className="text-gray-500 hover:text-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        {expandedSuppliers.has(supplier) && (
                          <div className="p-4 border-t border-gray-200 space-y-5">
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Allergens for {supplier}</h4>
                              <AllergenWarningSelector
                                value={supplierProfiles[supplier]?.allergen_warnings || { ...defaultAllergenWarnings }}
                                onChange={(warnings) => updateSupplierProfile(supplier, { allergen_warnings: warnings })}
                              />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Dietary certifications for {supplier}</h4>
                              <div className="space-y-2">
                                {certificationOptions.map((cert) => {
                                  const Icon = cert.icon
                                  const isSelected = (supplierProfiles[supplier]?.certifications || []).includes(cert.name)
                                  return (
                                    <button
                                      key={cert.name}
                                      type="button"
                                      onClick={() => {
                                        const current = supplierProfiles[supplier]?.certifications || []
                                        updateSupplierProfile(supplier, {
                                          certifications: isSelected
                                            ? current.filter(c => c !== cert.name)
                                            : [...current, cert.name]
                                        })
                                      }}
                                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border-2 transition-all text-sm ${
                                        isSelected ? 'border-current shadow-sm' : 'border-gray-200 hover:border-gray-300'
                                      }`}
                                      style={{
                                        borderColor: isSelected ? cert.color : undefined,
                                        backgroundColor: isSelected ? `${cert.color}15` : undefined,
                                        color: isSelected ? cert.color : '#6b7280'
                                      }}
                                    >
                                      {React.createElement(Icon as React.ComponentType<{className: string}>, { className: 'h-4 w-4' })}
                                      <span className="font-medium">{cert.name}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Allergen Information — hidden when suppliers have their own profiles */}
        {ingredient.suppliers.length === 0 && (
        <Card className="mb-8">
          <div className="p-6 border-b">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#003842]" />
              <div>
                <h2 className="text-lg font-semibold text-[#003842] dark:text-[#42b8ac]">Allergen Information</h2>
                <p className="text-sm text-gray-600">
                  Specify allergen warnings for this ingredient
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <AllergenWarningSelector
              value={ingredient.allergen_warnings}
              onChange={(warnings) => setIngredient({...ingredient, allergen_warnings: warnings})}
            />
          </div>
        </Card>
        )}

        {/* Product Datasheets */}
        <Card className="mb-8">
          <div className="p-6 border-b">
            <div>
              <h2 className="text-lg font-semibold text-[#003842] dark:text-[#42b8ac]">Product Datasheets</h2>
              <p className="text-sm text-gray-600">
                Upload product specification sheets, compliance certificates, and allergen statements
              </p>
            </div>
          </div>

          <div className="p-6">
            <DatasheetUploader
              entityType="ingredient"
              onFilesChange={(files) => setDatasheets(applyDefaultSupplierToDatasheets(files, ingredient.suppliers))}
              maxFiles={5}
            />
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-start gap-4">
          <Link href="/admin/ingredients">
            <Button variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            variant="primary"
            icon={<Save className="h-4 w-4" />}
            onClick={handleSave}
            disabled={saving || !ingredient.name}
          >
            {saving ? 'Saving...' : 'Save Ingredient'}
          </Button>
        </div>
      </div>
    </Container>

    <LabelScanModal
      open={showScan}
      onClose={() => setShowScan(false)}
      onAccept={handleScanAccept}
    />
    </>
  )
}
