import { computeWorstCaseAllergens, type AllergenWarnings } from '@/types/allergen'

export type SupplierAssessmentStatus = 'needs_review' | 'assessed'

export type SupplierSafetyProfile = {
  variant_id?: string
  supplier_id?: string
  supplier_name?: string
  brand?: string
  allergen_warnings: AllergenWarnings
  certifications: string[]
  assessment_status?: SupplierAssessmentStatus
  notes?: string
  last_reviewed_at?: string | null
}

export type SupplierProfileMap = Record<string, SupplierSafetyProfile>

export function normalizeSupplierNames(suppliers: string[]): string[] {
  const names: string[] = []
  const seen = new Set<string>()

  for (const supplier of suppliers) {
    const trimmed = supplier.trim()
    const key = trimmed.toLocaleLowerCase()
    if (trimmed && !seen.has(key)) {
      names.push(trimmed)
      seen.add(key)
    }
  }

  return names
}

export function buildCompleteSupplierProfiles(
  suppliers: string[],
  profiles: SupplierProfileMap | undefined,
  fallbackAllergens: AllergenWarnings,
  fallbackCertifications: string[]
): SupplierProfileMap {
  const existingEntries = Object.entries(profiles || {})
  if (existingEntries.length > 0) {
    return Object.fromEntries(existingEntries.flatMap(([profileKey, existing]) => {
      const supplierName = (existing.supplier_name || profileKey).trim()
      if (!supplierName) return []
      return [[profileKey, {
        variant_id: existing.variant_id,
        supplier_id: existing.supplier_id,
        supplier_name: supplierName,
        brand: typeof existing.brand === 'string' ? existing.brand.trim().slice(0, 200) : '',
        allergen_warnings: existing.allergen_warnings || fallbackAllergens,
        certifications: Array.isArray(existing.certifications) ? existing.certifications : fallbackCertifications,
        assessment_status: existing.assessment_status || 'needs_review',
        notes: existing.notes || '',
        last_reviewed_at: existing.last_reviewed_at || null,
      } satisfies SupplierSafetyProfile]]
    }))
  }

  return Object.fromEntries(
    normalizeSupplierNames(suppliers).map((supplierName) => {
      const existing = profiles?.[supplierName]
      return [supplierName, {
        supplier_name: supplierName,
        supplier_id: existing?.supplier_id,
        brand: typeof existing?.brand === 'string' ? existing.brand.trim().slice(0, 200) : '',
        allergen_warnings: existing?.allergen_warnings || fallbackAllergens,
        certifications: Array.isArray(existing?.certifications)
          ? existing.certifications
          : fallbackCertifications,
        assessment_status: existing?.assessment_status || 'needs_review',
        notes: existing?.notes || '',
        last_reviewed_at: existing?.last_reviewed_at || null,
      } satisfies SupplierSafetyProfile]
    })
  )
}

export function deriveEffectiveIngredientSafety(profiles: SupplierProfileMap) {
  const values = Object.values(profiles)

  if (values.length === 0) {
    return null
  }

  const allergenProfiles = values.map((profile) => profile.allergen_warnings).filter(Boolean)
  const certificationProfiles = values.map((profile) => profile.certifications || [])

  return {
    allergen_warnings: allergenProfiles.length > 0
      ? computeWorstCaseAllergens(allergenProfiles)
      : ({} as AllergenWarnings),
    certifications: certificationProfiles.length > 0
      ? certificationProfiles.reduce((common, certifications) =>
          common.filter((certification) => certifications.includes(certification))
        )
      : [],
  }
}

export function profilesFromVariantRows(rows: any[]): SupplierProfileMap {
  return Object.fromEntries(
    rows.flatMap((row) => {
      const supplier = Array.isArray(row.supplier) ? row.supplier[0] : row.supplier
      const supplierName = supplier?.name?.trim()
      if (!supplierName) return []

      return [[row.id, {
        variant_id: row.id,
        supplier_id: row.supplier_id,
        supplier_name: supplierName,
        brand: typeof row.brand === 'string' ? row.brand : '',
        allergen_warnings: row.allergen_warnings || {},
        certifications: Array.isArray(row.certifications) ? row.certifications : [],
        assessment_status: row.assessment_status === 'assessed' ? 'assessed' : 'needs_review',
        notes: row.notes || '',
        last_reviewed_at: row.last_reviewed_at || null,
      } satisfies SupplierSafetyProfile]]
    })
  )
}
