'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, Edit, FileText, Globe, Mail, MessageSquare, Package, Phone, Truck } from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import AllergenWarningDisplay from '@/components/kiosk/AllergenWarningDisplay'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface Supplier {
  id: string
  name: string
  contact: string
  phone: string
  email: string
  website: string
  ingredient_count: number
}

interface SupplierNote {
  id: string
  note: string
  created_at: string
}

interface SupplierIngredientVariant {
  ingredient_id: string
  allergen_warnings: Record<string, unknown>
  assessment_status: 'needs_review' | 'assessed'
  ingredient: { id: string; name: string; category?: string } | Array<{ id: string; name: string; category?: string }>
}

export default function SupplierDetailPage() {
  const supplierId = useParams().id as string
  const { t, language } = useTranslation()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [ingredients, setIngredients] = useState<SupplierIngredientVariant[]>([])
  const [notes, setNotes] = useState<SupplierNote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        setLoading(true)
        const [supplierResponse, notesResponse] = await Promise.all([
          fetch(`/api/suppliers/${supplierId}`),
          fetch(`/api/suppliers/${supplierId}/notes`),
        ])
        const [supplierData, notesData] = await Promise.all([supplierResponse.json(), notesResponse.json()])
        if (!supplierResponse.ok) throw new Error(supplierData.error || 'Failed to fetch supplier')
        setSupplier(supplierData.supplier)
        setIngredients(supplierData.ingredients || [])
        setNotes(notesResponse.ok ? notesData.notes || [] : [])
      } catch (error) {
        console.error('Error fetching supplier:', error)
        setSupplier(null)
      } finally {
        setLoading(false)
      }
    }
    fetchSupplier()
  }, [supplierId])

  if (loading) {
    return <Container><div className="flex min-h-[60vh] items-center justify-center text-center"><div><div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#42b8ac]/20 border-t-[#42b8ac]" /><p className="text-gray-600">{t('supplierPortal.loadingSupplier')}</p></div></div></Container>
  }

  if (!supplier) {
    return <Container><div className="flex min-h-[60vh] items-center justify-center text-center"><div><AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" /><p className="text-gray-600">{t('supplierPortal.supplierNotFound')}</p><Link href="/admin/suppliers"><Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} className="mt-4">{t('supplierPortal.backToSuppliers')}</Button></Link></div></div></Container>
  }

  return (
    <Container>
      <div className="py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/admin/suppliers"><Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />}>{t('supplierPortal.backToSuppliers')}</Button></Link>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/suppliers/${supplierId}/edit`}><Button variant="outline" icon={<Edit className="h-4 w-4" />}>{t('supplierPortal.editSupplier')}</Button></Link>
            <Link href={`/admin/suppliers/${supplierId}/docs`}><Button variant="primary" icon={<FileText className="h-4 w-4" />}>{t('supplierPortal.documents')}</Button></Link>
          </div>
        </div>

        <Card className="mt-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-3"><Truck className="h-6 w-6 text-blue-600" /></div>
            <div className="min-w-0"><h1 className="truncate text-3xl font-bold text-[#003842] dark:text-white">{supplier.name}</h1><p className="text-sm text-gray-500">{t(supplier.ingredient_count === 1 ? 'supplierPortal.linkedIngredient' : 'supplierPortal.linkedIngredients', { count: supplier.ingredient_count })}</p></div>
          </div>
          <dl className="mt-6 grid gap-4 border-t border-gray-200 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('supplierPortal.contact')}</dt><dd className="mt-1 text-sm text-gray-900">{supplier.contact || t('supplierPortal.notSet')}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('supplierPortal.phone')}</dt><dd className="mt-1 flex items-center gap-2 text-sm text-gray-900"><Phone className="h-4 w-4 text-gray-400" />{supplier.phone || t('supplierPortal.notSet')}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('admin.email')}</dt><dd className="mt-1 flex items-center gap-2 text-sm text-gray-900"><Mail className="h-4 w-4 text-gray-400" />{supplier.email || t('supplierPortal.notSet')}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('messaging.website')}</dt><dd className="mt-1 flex items-center gap-2 text-sm text-gray-900"><Globe className="h-4 w-4 text-gray-400" />{supplier.website || t('supplierPortal.notSet')}</dd></div>
          </dl>
        </Card>

        <Card className="mt-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3"><div className="rounded-lg bg-amber-100 p-2.5"><Package className="h-5 w-5 text-amber-700" /></div><div><h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('supplierPortal.linkedIngredientsTitle')}</h2><p className="text-sm text-gray-600 dark:text-gray-300">{t('supplierPortal.allergenDataDescription')}</p></div></div>
            <Link href="/admin/ingredients/new"><Button variant="outline">{t('supplierPortal.addIngredient')}</Button></Link>
          </div>
          {ingredients.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-10 text-center"><Package className="mx-auto mb-3 h-9 w-9 text-gray-300" /><p className="text-sm font-medium text-gray-700">{t('supplierPortal.noLinkedIngredients')}</p></div>
          ) : (
            <div className="space-y-3">
              {ingredients.map((variant) => {
                const ingredient = Array.isArray(variant.ingredient) ? variant.ingredient[0] : variant.ingredient
                if (!ingredient) return null
                const assessed = variant.assessment_status === 'assessed'
                return (
                  <div key={variant.ingredient_id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0"><Link href={`/admin/ingredients/${ingredient.id}`} className="font-semibold text-[#003842] hover:underline">{ingredient.name}</Link><p className="mt-0.5 text-xs text-gray-500">{ingredient.category || t('uncategorized')}</p></div>
                      <div className="flex items-center gap-2"><Badge variant={assessed ? 'success' : 'warning'}>{assessed ? t('ingredientsPortal.reviewed') : t('ingredientsPortal.needsReview')}</Badge><Link href={`/admin/ingredients/${ingredient.id}/edit`}><Button variant="ghost" size="sm">{t('supplierPortal.editProfile')}</Button></Link></div>
                    </div>
                    <div className="mt-3 border-t border-gray-100 pt-3"><AllergenWarningDisplay warnings={variant.allergen_warnings as any} compact={true} showNone={true} /></div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="mt-6">
          <div className="mb-5 flex items-center gap-3"><div className="rounded-lg bg-emerald-100 p-2.5"><MessageSquare className="h-5 w-5 text-emerald-700" /></div><div><h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('supplierPortal.supplierNotes')}</h2><p className="text-sm text-gray-600 dark:text-gray-300">{t('supplierPortal.manageNotesDescription')}</p></div></div>
          {notes.length === 0 ? <p className="text-sm text-gray-500">{t('supplierPortal.noNotes')}</p> : <div className="space-y-3">{notes.map((note) => <div key={note.id} className="rounded-lg border border-gray-200 p-4"><p className="whitespace-pre-wrap text-sm text-gray-900">{note.note}</p><p className="mt-2 text-xs text-gray-500">{t('ingredientsPortal.created')} {new Date(note.created_at).toLocaleString(language)}</p></div>)}</div>}
        </Card>
      </div>
    </Container>
  )
}
