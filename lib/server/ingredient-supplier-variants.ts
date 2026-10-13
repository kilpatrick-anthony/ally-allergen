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
  const { data: existing, error: existingError } = await supabase
    .from('ingredient_supplier_variants')
    .select('id')
    .eq('business_id', businessId)
    .eq('ingredient_id', ingredientId)

  if (existingError) throw existingError

  const existingIds = new Set((existing || []).map((variant: { id: string }) => variant.id))
  const desiredVariantIds = new Set(
    Object.values(profiles).flatMap((profile) =>
      profile.variant_id && existingIds.has(profile.variant_id) ? [profile.variant_id] : []
    )
  )

  const obsoleteIds = (existing || [])
    .filter((variant: { id: string }) => !desiredVariantIds.has(variant.id))
    .map((variant: { id: string }) => variant.id)

  if (obsoleteIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('ingredient_supplier_variants')
      .delete()
      .in('id', obsoleteIds)

    if (deleteError) throw deleteError
  }

  const rows = Object.entries(profiles).flatMap(([profileKey, profile]) => {
    const supplierName = (profile.supplier_name || profileKey).trim()
    const supplier = supplierRecords.get(supplierName)
    if (!supplier) return []
    return {
      ...(profile.variant_id && existingIds.has(profile.variant_id) ? { id: profile.variant_id } : {}),
      business_id: businessId,
      ingredient_id: ingredientId,
      supplier_id: supplier.id,
      brand: typeof profile?.brand === 'string' ? profile.brand.trim().slice(0, 200) : '',
      allergen_warnings: profile?.allergen_warnings || {},
      certifications: profile?.certifications || [],
      assessment_status: profile?.assessment_status || 'needs_review',
      notes: profile?.notes || '',
      last_reviewed_at: profile?.last_reviewed_at || null,
      created_by: userId,
      updated_at: new Date().toISOString(),
    }
  })

  const existingRows = rows.filter((row) => 'id' in row)
  const newRows = rows.filter((row) => !('id' in row))

  if (existingRows.length > 0) {
    const { error: upsertError } = await supabase
      .from('ingredient_supplier_variants')
      .upsert(existingRows, { onConflict: 'id' })

    if (upsertError) throw upsertError
  }

  if (newRows.length > 0) {
    const { error: insertError } = await supabase
      .from('ingredient_supplier_variants')
      .insert(newRows)

    if (insertError) throw insertError
  }
}
