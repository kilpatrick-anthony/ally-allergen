import { createServiceClient } from '@/lib/supabase/server'
import {
  normalizeSupplierNames,
  type SupplierProfileMap,
} from '@/lib/ingredient-supplier-profiles'

type ServiceClient = ReturnType<typeof createServiceClient>

type SupplierRecord = {
  id: string
  name: string
}

export async function ensureSupplierRecords(
  supabase: ServiceClient,
  businessId: string,
  supplierNames: string[],
  userId: string
): Promise<Map<string, SupplierRecord>> {
  const names = normalizeSupplierNames(supplierNames)
  if (names.length === 0) return new Map()

  const { data: existing, error: existingError } = await supabase
    .from('suppliers')
    .select('id, name')
    .eq('business_id', businessId)

  if (existingError) throw existingError

  const byName = new Map<string, SupplierRecord>(
    (existing || []).map((supplier: SupplierRecord) => [supplier.name.trim().toLocaleLowerCase(), supplier])
  )
  const missingNames = names.filter((name) => !byName.has(name.toLocaleLowerCase()))

  if (missingNames.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from('suppliers')
      .insert(missingNames.map((name) => ({
        business_id: businessId,
        name,
        contact: '',
        phone: '',
        email: '',
        website: '',
        notes: '',
        ingredient_count: 0,
        created_by: userId,
      })))
      .select('id, name')

    if (insertError) throw insertError

    for (const supplier of inserted || []) {
      byName.set(supplier.name.trim().toLocaleLowerCase(), supplier)
    }
  }

  return new Map(
    names.flatMap((name) => {
      const supplier = byName.get(name.toLocaleLowerCase())
      return supplier ? [[name, supplier] as const] : []
    })
  )
}

export async function syncIngredientSupplierVariants(
  supabase: ServiceClient,
  businessId: string,
  ingredientId: string,
  supplierRecords: Map<string, SupplierRecord>,
  profiles: SupplierProfileMap,
  userId: string
) {
  const desiredSupplierIds = new Set(Array.from(supplierRecords.values(), (supplier) => supplier.id))
  const { data: existing, error: existingError } = await supabase
    .from('ingredient_supplier_variants')
    .select('id, supplier_id')
    .eq('business_id', businessId)
    .eq('ingredient_id', ingredientId)

  if (existingError) throw existingError

  const obsoleteIds = (existing || [])
    .filter((variant: { id: string; supplier_id: string }) => !desiredSupplierIds.has(variant.supplier_id))
    .map((variant: { id: string }) => variant.id)

  if (obsoleteIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('ingredient_supplier_variants')
      .delete()
      .in('id', obsoleteIds)

    if (deleteError) throw deleteError
  }

  const rows = Array.from(supplierRecords.entries()).map(([supplierName, supplier]) => {
    const profile = profiles[supplierName]
    return {
      business_id: businessId,
      ingredient_id: ingredientId,
      supplier_id: supplier.id,
      allergen_warnings: profile?.allergen_warnings || {},
      certifications: profile?.certifications || [],
      assessment_status: profile?.assessment_status || 'needs_review',
      notes: profile?.notes || '',
      last_reviewed_at: profile?.last_reviewed_at || null,
      created_by: userId,
      updated_at: new Date().toISOString(),
    }
  })

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from('ingredient_supplier_variants')
      .upsert(rows, { onConflict: 'ingredient_id,supplier_id' })

    if (upsertError) throw upsertError
  }
}
