import { createHash } from 'node:crypto'
import { bowlConfiguration, bowlConfigurationIssue, bowlOptionIngredientIds, type BowlConfiguration, type BowlOptionConfiguration } from '@/lib/bowl-configuration'
import { ingredientAssessmentIssues, ingredientAssessmentWarnings, mergeAllergenAssessments, type IngredientAssessmentSource } from '@/lib/allergen-assessment'
import type { BowlIngredient, PublishedBowl } from '@/lib/bowl-selection'
import type { AllergenWarnings } from '@/types/allergen'

type Variant = {
  supplier: string | null
  brand: string | null
  status: string
  warnings: Partial<AllergenWarnings> | null
  certifications: string[] | null
}

type Ingredient = IngredientAssessmentSource & {
  id: string
  name: string
  certifications: string[] | null
  allergen_warnings: Partial<AllergenWarnings> | null
  supplier_profiles?: Record<string, {
    allergen_warnings?: Partial<AllergenWarnings>
    certifications?: string[]
    assessment_status?: string
  }> | null
  variants: Variant[]
}

export type BowlSource = {
  configuration: unknown
  recipe: string[]
  ingredients: Ingredient[]
}

export function validateBowlSource(source: BowlSource): { error: string } | { config: BowlConfiguration } {
  const config = bowlConfiguration.safeParse(source.configuration)
  if (!config.success) return { error: 'Complete the bowl configuration.' }
  const available = new Set(source.ingredients.map(ingredient => ingredient.id))
  const error = bowlConfigurationIssue(config.data, source.recipe, available)
  return error ? { error } : { config: config.data }
}

export function reviewBowlSource(source: BowlSource) {
  const validated = validateBowlSource(source)
  if ('error' in validated) return { problems: [{ kind: 'bowl_configuration' as const, message: validated.error }] }

  const problems = source.ingredients.flatMap(ingredient => {
    const { id: ingredientId, name: ingredientName } = ingredient
    return [
      ...ingredientAssessmentIssues(ingredient),
      ...Object.entries(ingredient.supplier_profiles || {}).flatMap(([variant, profile]) =>
        profile?.assessment_status && profile.assessment_status !== 'assessed'
          ? [{ kind: 'incomplete' as const, variant }] : []),
      ...ingredient.variants.flatMap(variant => {
        const label = [variant.supplier, variant.brand].filter(Boolean).join(' · ')
        return ingredientAssessmentIssues({
          allergen_warnings: variant.warnings,
          status: variant.supplier && variant.status === 'assessed' ? 'active' : 'review',
        }).map(issue => ({ ...issue, variant: label || 'Supplier variant' }))
      }),
    ].map(issue => ({ ...issue, ingredientId, ingredientName }))
  })

  const ingredients = new Map(source.ingredients.map(ingredient => {
    const legacyProfiles = Object.values(ingredient.supplier_profiles || {})
    const supplierProfiles = [
      ...legacyProfiles.map(profile => ({
        warnings: profile?.allergen_warnings ?? {},
        certifications: profile?.certifications,
      })),
      ...ingredient.variants.map(variant => ({
        warnings: variant.warnings ?? {},
        certifications: variant.certifications,
      })),
    ]
    const assessment = ingredientAssessmentWarnings({
      ...ingredient,
      supplier_profiles: Object.fromEntries(supplierProfiles.map((profile, index) => [index, { allergen_warnings: profile.warnings }])),
    })
    const result: BowlIngredient = {
      id: ingredient.id,
      name: ingredient.name,
      warnings: assessment,
      ...(supplierProfiles.length > 0 && {
        recordedWarnings: [ingredient.allergen_warnings ?? {}, ...supplierProfiles.map(profile => profile.warnings)],
      }),
      dietary: (ingredient.certifications || []).filter(claim =>
        supplierProfiles.every(profile => profile.certifications?.includes(claim))),
    }
    return [ingredient.id, result]
  }))

  const { fixed, groups } = validated.config
  const resolve = (ids: readonly string[]) => ids.map(id => ingredients.get(id)!)
  const resolveOption = (option: BowlOptionConfiguration): BowlIngredient => {
    if (typeof option === 'string') return ingredients.get(option)!
    const linked = resolve(bowlOptionIngredientIds(option))
    const [primary] = linked
    const name = option.label || primary.name
    if (linked.length === 1) return { ...primary, name }

    return {
      id: primary.id,
      name,
      linkedIngredients: linked.map(({ id, name }) => ({ id, name })),
      warnings: mergeAllergenAssessments(linked.map(ingredient => ingredient.warnings)),
      recordedWarnings: linked.flatMap(ingredient => [ingredient.warnings, ...(ingredient.recordedWarnings || [])]),
      dietary: primary.dietary.filter(claim => linked.every(ingredient => ingredient.dietary.includes(claim))),
    }
  }
  const bowl: PublishedBowl = {
    fixed: resolve(fixed),
    groups: groups.map(group => ({ ...group, options: group.options.map(resolveOption) })),
    // Force re-review and a new version even when changed evidence yields the same customer wording.
    sourceVersion: createHash('sha256').update(JSON.stringify(source)).digest('hex'),
  }
  return { bowl, problems }
}
