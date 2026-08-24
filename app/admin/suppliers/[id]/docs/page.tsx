// app/admin/suppliers/[id]/docs/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, AlertCircle, Download, Upload, Eye } from 'lucide-react'

import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import DatasheetUploader from '@/components/admin/DatasheetUploader'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface Supplier {
  id: string
  name: string
}

interface Datasheet {
  id: string
  file_name: string
  file_path: string
  file_type: string
  uploaded_at?: string
  created_at?: string
  supplier_name?: string | null
  ingredient_id?: string | null
  version?: string | null
  next_review_date?: string | null
  notes?: string | null
}

interface UploadFile {
  file?: File
  file_name: string
  file_size: number
  file_type: string
  supplier_name?: string
  version?: string
  next_review_date?: string
  notes?: string
}

interface IngredientSummary {
  id: string
  name?: string
  suppliers: string[]
}

export default function SupplierDocsPage() {
  const { t, language } = useTranslation()
  const params = useParams()
  const supplierId = params.id as string

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [datasheets, setDatasheets] = useState<Datasheet[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingUploads, setPendingUploads] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [ingredientNameLookup, setIngredientNameLookup] = useState<Record<string, string>>({})
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, 'queued' | 'uploading' | 'uploaded' | 'error'>>({})
  const [uploaderKey, setUploaderKey] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const supplierResponse = await fetch(`/api/suppliers/${supplierId}`)
        const supplierData = await supplierResponse.json()

        if (!supplierResponse.ok) {
          throw new Error(supplierData.error || 'Failed to fetch supplier')
        }

        const supplierRecord = supplierData.supplier as Supplier
        setSupplier(supplierRecord)

        const [datasheetsResponse, ingredientsResponse] = await Promise.all([
          fetch('/api/datasheets'),
          fetch('/api/ingredients')
        ])

        const datasheetsData = await datasheetsResponse.json()
        const ingredientsData = await ingredientsResponse.json()

        if (!datasheetsResponse.ok) {
          throw new Error(datasheetsData.error || 'Failed to fetch datasheets')
        }

        if (!ingredientsResponse.ok) {
          throw new Error(ingredientsData.error || 'Failed to fetch ingredients')
        }

        const supplierName = supplierRecord.name.trim().toLowerCase()
        const ingredientLookup = new Map<string, string[]>(
          (ingredientsData.ingredients || []).map((ingredient: IngredientSummary) => [
            ingredient.id,
            ingredient.suppliers || []
          ])
        )
        const ingredientNameLookup = (ingredientsData.ingredients || []).reduce(
          (acc: Record<string, string>, ingredient: IngredientSummary) => {
            acc[String(ingredient.id)] = ingredient.name || t('supplierPortal.unknownIngredient')
            return acc
          },
          {}
        )

        setIngredientNameLookup(ingredientNameLookup)

        const filtered = (datasheetsData.datasheets || []).filter((sheet: Datasheet) => {
          const sheetSupplier = sheet.supplier_name?.trim().toLowerCase() || ''
          if (sheetSupplier !== '' && sheetSupplier === supplierName) {
            return true
          }

          if (!sheet.ingredient_id) {
            return false
          }

          const ingredientSuppliers = (ingredientLookup.get(sheet.ingredient_id) || []) as string[]
          return ingredientSuppliers.some((supplier) => supplier.trim().toLowerCase() === supplierName)
        })

        setDatasheets(filtered)
      } catch (error: any) {
        console.error('Error fetching supplier documents:', error)
        setSupplier(null)
        setDatasheets([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supplierId, t])

  const getUploadKey = (file: UploadFile, index: number) => {
    return `${file.file_name}-${file.file_size}-${index}`
  }

  const applySupplierNameToUploads = (files: UploadFile[], supplierName: string) => {
    const normalizedName = supplierName.trim()
    if (!normalizedName) {
      return files
    }

    return files.map((file) => {
      const currentSupplier = typeof file.supplier_name === 'string' ? file.supplier_name.trim() : ''
      if (currentSupplier) {
        return file
      }
      return { ...file, supplier_name: normalizedName }
    })
  }

  const refreshDatasheets = async (supplierName: string) => {
    const [datasheetsResponse, ingredientsResponse] = await Promise.all([
      fetch('/api/datasheets'),
      fetch('/api/ingredients')
    ])

    const datasheetsData = await datasheetsResponse.json()
    const ingredientsData = await ingredientsResponse.json()

    if (!datasheetsResponse.ok) {
      throw new Error(datasheetsData.error || 'Failed to fetch datasheets')
    }

    if (!ingredientsResponse.ok) {
      throw new Error(ingredientsData.error || 'Failed to fetch ingredients')
    }

    const normalizedSupplier = supplierName.trim().toLowerCase()
    const ingredientLookup = new Map(
      (ingredientsData.ingredients || []).map((ingredient: IngredientSummary) => [
        ingredient.id,
        ingredient.suppliers || []
      ])
    )
    const ingredientNameLookup = (ingredientsData.ingredients || []).reduce(
      (acc: Record<string, string>, ingredient: IngredientSummary) => {
        acc[String(ingredient.id)] = ingredient.name || t('supplierPortal.unknownIngredient')
        return acc
      },
      {}
    )

    setIngredientNameLookup(ingredientNameLookup)

    const filtered = (datasheetsData.datasheets || []).filter((sheet: Datasheet) => {
      const sheetSupplier = sheet.supplier_name?.trim().toLowerCase() || ''
      if (sheetSupplier !== '' && sheetSupplier === normalizedSupplier) {
        return true
      }

      if (!sheet.ingredient_id) {
        return false
      }

      const ingredientSuppliers = (ingredientLookup.get(sheet.ingredient_id) || []) as string[]
      return ingredientSuppliers.some((name) => name.trim().toLowerCase() === normalizedSupplier)
    })

    setDatasheets(filtered)
  }

  const handleUpload = async () => {
    if (!supplier || pendingUploads.length === 0) {
      return
    }

    try {
      setUploading(true)
      setUploadStatuses((prev) => {
        const next = { ...prev }
        pendingUploads.forEach((file, index) => {
          next[getUploadKey(file, index)] = 'uploading'
        })
        return next
      })

      const uploads = pendingUploads.map(async (datasheet, index) => {
        if (!datasheet.file) {
          return
        }

        const formData = new FormData()
        formData.append('file', datasheet.file)
        formData.append('supplier_name', datasheet.supplier_name || supplier.name)

        if (datasheet.version) formData.append('version', datasheet.version)
        if (datasheet.next_review_date) formData.append('next_review_date', datasheet.next_review_date)
        if (datasheet.notes) formData.append('notes', datasheet.notes)

        const response = await fetch('/api/upload/datasheet', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          setUploadStatuses((prev) => ({
            ...prev,
            [getUploadKey(datasheet, index)]: 'error'
          }))
          throw new Error(t('supplierPortal.uploadError'))
        }

        setUploadStatuses((prev) => ({
          ...prev,
          [getUploadKey(datasheet, index)]: 'uploaded'
        }))
      })

      await Promise.all(uploads)
      setPendingUploads([])
      setUploadStatuses({})
      setUploaderKey((prev) => prev + 1)
      await refreshDatasheets(supplier.name)
    } catch (error: any) {
      console.error('Error uploading supplier documents:', error)
      setUploadStatuses((prev) => {
        const next = { ...prev }
        Object.keys(next).forEach((key) => {
          if (next[key] === 'uploading') {
            next[key] = 'error'
          }
        })
        return next
      })
      alert(error.message || t('supplierPortal.uploadError'))
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    if (!supplier) {
      return
    }

    if (pendingUploads.length === 0 || uploading) {
      return
    }

    handleUpload()
  }, [pendingUploads, supplier, uploading])

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(t('supplierPortal.downloadError'))
      }
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (error) {
      console.error('Download failed:', error)
      alert(t('supplierPortal.downloadError'))
    }
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
            <p className="text-gray-600">{t('supplierPortal.loadingDocuments')}</p>
          </div>
        </div>
      </Container>
    )
  }

  if (!supplier) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">{t('supplierPortal.supplierNotFound')}</p>
            <Link href="/admin/suppliers">
              <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} className="mt-4">
                {t('supplierPortal.backToSuppliers')}
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div className="py-8">
        <Link href={`/admin/suppliers/${supplierId}`}>
          <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />}>
            {t('supplierPortal.backToSupplier')}
          </Button>
        </Link>

        <Card className="mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-100 rounded-lg">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#003842] dark:text-white">{t('supplierPortal.supplierDocuments')}</h1>
              <p className="text-gray-600">{supplier.name}</p>
            </div>
          </div>

          <div className="mb-8 border border-gray-200 rounded-xl p-5 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('supplierPortal.uploadDocuments')}</h2>
                <p className="text-sm text-gray-600">{t('supplierPortal.attachDocuments')}</p>
              </div>
              <Badge variant="info">{t('supplierPortal.autoUploadEnabled')}</Badge>
            </div>
            <DatasheetUploader
              key={uploaderKey}
              entityType="ingredient"
              existingDatasheets={pendingUploads as any[]}
              onFilesChange={(files) => {
                const normalizedFiles = applySupplierNameToUploads(files as UploadFile[], supplier.name)
                setPendingUploads(normalizedFiles)
                const statusMap: Record<string, 'queued' | 'uploading' | 'uploaded' | 'error'> = {}
                normalizedFiles.forEach((file, index) => {
                  statusMap[getUploadKey(file, index)] = 'queued'
                })
                setUploadStatuses(statusMap)
              }}
              maxFiles={10}
            />
            {(pendingUploads.length > 0 || uploading) && (
              <div className="mt-4 space-y-2">
                {pendingUploads.map((file, index) => {
                  const key = getUploadKey(file, index)
                  const status = uploadStatuses[key] || 'queued'
                  const statusLabel = status === 'queued'
                    ? t('supplierPortal.queued')
                    : status === 'uploading'
                      ? t('supplierPortal.uploading')
                      : status === 'uploaded'
                        ? t('supplierPortal.uploaded')
                        : t('supplierPortal.failed')

                  return (
                    <div key={key} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
                      <p className="text-sm text-gray-700 truncate">{file.file_name}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`inline-flex h-2 w-2 rounded-full ${
                            status === 'uploaded'
                              ? 'bg-emerald-500'
                              : status === 'error'
                                ? 'bg-red-500'
                                : status === 'uploading'
                                  ? 'bg-blue-500 animate-pulse'
                                  : 'bg-amber-400'
                          }`}
                        />
                        <span className="text-gray-600">{statusLabel}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {datasheets.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('supplierPortal.noDocuments')}</h2>
              <p className="text-gray-600 mb-6">
                {t('supplierPortal.documentsAppearHere')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {datasheets.map((sheet) => {
                const ingredientKey = sheet.ingredient_id ? String(sheet.ingredient_id) : ''
                const ingredientLabel = ingredientKey
                  ? ingredientNameLookup[ingredientKey] || t('supplierPortal.unknownIngredient')
                  : t('supplierPortal.direct')
                const tagVariant = ingredientKey ? 'info' : 'success'

                return (
                  <div key={sheet.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-gray-900">{sheet.file_name}</p>
                        {sheet.version && <Badge variant="info">v{sheet.version}</Badge>}
                        <Badge variant={tagVariant}>{ingredientLabel}</Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {sheet.file_type || 'application/pdf'}
                        {sheet.next_review_date ? ` • ${t('supplierPortal.review')} ${new Date(sheet.next_review_date).toLocaleDateString(language)}` : ''}
                      </p>
                      {sheet.notes && <p className="text-sm text-gray-600 mt-1">{sheet.notes}</p>}
                    </div>
                    <div className="mt-3 md:mt-0">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Download className="h-4 w-4" />}
                          onClick={() => handleDownload(sheet.file_path, sheet.file_name)}
                        >
                          {t('corePortal.download')}
                        </Button>
                        <a href={sheet.file_path} target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="sm" icon={<Eye className="h-4 w-4" />}>
                            {t('admin.view')}
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </Container>
  )
}
