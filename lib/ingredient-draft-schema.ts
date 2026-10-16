import { z } from 'zod'
import { ALLERGEN_LIST, type AllergenWarnings } from '@/types/allergen'

const level = z.enum(['none', 'contains', 'may_contain', 'traces', 'not_suitable', 'cross_contamination'])
// Missing answers remain missing. The legacy warning type requires all answers;
// activation separately verifies completeness before treating them as assessed.
const warnings = z.object({
  ...Object.fromEntries(ALLERGEN_LIST.map(({ id }) => [id, level.optional()])),
  cereals_gluten_types: z.array(z.enum(['wheat','rye','barley','oats','spelt','kamut'])).max(6).optional(),
  nuts_types: z.array(z.enum(['almonds','hazelnuts','walnuts','cashews','pecans','brazil_nuts','pistachios','macadamia'])).max(8).optional(),
  cereals_gluten_levels: z.record(z.string().max(100), level).optional(),
  nuts_levels: z.record(z.string().max(100), level).optional(),
  assessment_incomplete: z.boolean().optional(),
}).transform(value => value as unknown as AllergenWarnings)
const names = z.array(z.string().trim().min(1).max(200)).max(100)
const profile = z.object({
  supplier_name: z.string().trim().min(1).max(200).optional(),
  brand: z.string().max(200).optional(),
  allergen_warnings: warnings,
  certifications: names,
  assessment_status: z.enum(['needs_review', 'assessed']).optional(),
  notes: z.string().max(10000).optional(),
  last_reviewed_at: z.iso.datetime({ offset: true }).nullable().optional(),
})
// Strip IDs supplied by the browser. Activation resolves supplier IDs within
// the live business; drafts never write to inventory or supplier tables.
export const ingredientDraftPayload = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(10000).default(''),
  category: z.string().max(200).default(''),
  suppliers: names.default([]),
  certifications: names.default([]),
  allergen_warnings: warnings.prefault({}),
  supplier_profiles: z.record(z.string().max(200), profile).refine(v => Object.keys(v).length <= 100).default({}),
  preferred_review_months: z.number().int().min(1).max(36).default(12),
})
export const ingredientDraftSave = z.object({
  version: z.number().int().nonnegative(),
  payload: ingredientDraftPayload,
})
export const ingredientDraftDocumentMetadata = z.object({
  supplier_name: z.string().max(200).nullable().optional(),
  version: z.string().max(100).nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
  next_review_date: z.union([z.iso.date(), z.literal('')]).nullable().optional(),
}).strict()

export type IngredientDraftPayload = z.infer<typeof ingredientDraftPayload>
