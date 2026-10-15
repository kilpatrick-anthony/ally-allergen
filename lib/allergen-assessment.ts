import { ALLERGEN_LIST, computeWorstCaseAllergens, type AllergenWarnings, worstCaseLevel, type AllergenLevel } from '@/types/allergen'

const levels = new Set(['none', 'contains', 'may_contain', 'traces', 'not_suitable', 'cross_contamination'])

export function unansweredAllergenCount(value: unknown): number {
  const warnings = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return ALLERGEN_LIST.filter(({ id }) => !levels.has(warnings[id] as string)).length
}

export function isAllergenAssessmentComplete(value: unknown): boolean {
  if (unansweredAllergenCount(value) !== 0 || (value as AllergenWarnings)?.assessment_incomplete) return false
  const warnings = value as AllergenWarnings
  return (['cereals_gluten', 'nuts'] as const).every(key => {
    const subtypes = warnings[`${key}_levels`]
    if (subtypes === undefined) return true // Retain support for legacy broad declarations.
    if (!subtypes || typeof subtypes !== 'object' || Array.isArray(subtypes)) return false
    const values = Object.values(subtypes)
    if (values.some(level => !levels.has(level))) return false
    const worst = values.reduce<AllergenLevel>((current, level) => worstCaseLevel(current, level), 'none')
    return worst === warnings[key]
  })
}

export function mergeAllergenAssessments(profiles: AllergenWarnings[]): AllergenWarnings {
  const warnings = computeWorstCaseAllergens(profiles)
  if (!profiles.length || profiles.some(profile => !isAllergenAssessmentComplete(profile))) {
    warnings.assessment_incomplete = true
  }
  return warnings
}

export function isIngredientAssessmentComplete(warnings: unknown, profiles: unknown): boolean {
  if (!isAllergenAssessmentComplete(warnings)) return false
  if (!profiles) return true
  if (typeof profiles !== 'object' || Array.isArray(profiles)) return false
  return Object.values(profiles).every(profile => profile &&
    profile.assessment_status === 'assessed' && isAllergenAssessmentComplete(profile.allergen_warnings))
}
