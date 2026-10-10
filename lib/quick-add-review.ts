import { z } from 'zod'
import { ALLERGEN_LIST, GLUTEN_TYPES, TREE_NUT_TYPES } from '@/types/allergen'

export const reviewLevels = ['none', 'cross_contamination', 'traces', 'may_contain', 'not_suitable', 'contains'] as const
export const reviewFields = z.object({
  supplier_id: z.string().uuid().nullable(),
  description: z.string().trim().max(2000),
  category: z.string().trim().max(200),
  allergen_warnings: z.record(z.string(), z.union([z.enum(reviewLevels), z.record(z.string(), z.enum(reviewLevels))])),
  preferred_review_months: z.number().int().min(1).max(36),
  ingredient_declaration: z.string().trim().max(10000),
  scope: z.enum(['', 'site', 'global']),
  site_id: z.string().uuid().nullable(),
  label_checked: z.boolean(),
  evidence_checked: z.boolean(),
}).strict()
export type QuickAddReview = z.infer<typeof reviewFields>
export const blankReview = (supplierId: string | null = null, siteId: string | null = null): QuickAddReview => ({
  supplier_id: supplierId, description: '', category: '', allergen_warnings: {}, preferred_review_months: 12,
  ingredient_declaration: '', scope: '', site_id: siteId, label_checked: false, evidence_checked: false,
})
export function missingReviewDetails(review: Partial<QuickAddReview>, kind: string) {
  const missing: string[] = []
  if (!review.supplier_id) missing.push('missingSupplier')
  if (!review.evidence_checked) missing.push('missingEvidence')
  const warnings = review.allergen_warnings || {}
  const groups = [{ key: 'cereals_gluten', entries: GLUTEN_TYPES }, { key: 'nuts', entries: TREE_NUT_TYPES }]
  if (ALLERGEN_LIST.some(item => !reviewLevels.includes(warnings[item.id] as typeof reviewLevels[number])) ||
      groups.some(({ key, entries }) => {
        const levels = warnings[`${key}_levels`]
        if (warnings[key] === 'none') return typeof levels === 'object' && Object.values(levels).some(level => level !== 'none')
        if (!levels || typeof levels !== 'object' || entries.some(item => !reviewLevels.includes(levels[item.key]))) return true
        const worst = entries.reduce((value, item) => Math.max(value, reviewLevels.indexOf(levels[item.key])), 0)
        return reviewLevels[worst] !== warnings[key]
      })) missing.push('missingAllergens')
  if (kind === 'packaged_product') {
    if (!review.ingredient_declaration?.trim() || !review.label_checked) missing.push('missingLabel')
    if (!review.scope || (review.scope === 'site' && !review.site_id)) missing.push('missingScope')
  }
  return missing
}
