import {
  ALLERGEN_LIST, GLUTEN_TYPES, TREE_NUT_TYPES, worstCaseLevel,
  type AllergenAssessmentKey, type AllergenId, type AllergenLevel, type AllergenWarnings,
  type GlutenType, type TreeNutType,
} from '@/types/allergen'

const levels = new Set(['none', 'contains', 'may_contain', 'traces', 'not_suitable', 'cross_contamination'])
const subtypeKeys = {
  cereals_gluten: [...GLUTEN_TYPES.map(({ key }) => key), 'spelt', 'kamut'] as GlutenType[],
  nuts: TREE_NUT_TYPES.map(({ key }) => key),
}

export type AllergenSelection =
  | { allergen: AllergenId; subtype?: undefined }
  | { allergen: 'cereals_gluten'; subtype: GlutenType }
  | { allergen: 'nuts'; subtype: TreeNutType }

export type AllergenAssessment =
  | { status: 'clear' | 'incomplete' }
  | { status: 'warning'; level: Exclude<AllergenLevel, 'none'> }

const selections: AllergenSelection[] = [
  ...ALLERGEN_LIST.map(({ id }) => ({ allergen: id })),
  ...subtypeKeys.cereals_gluten.map(subtype => ({ allergen: 'cereals_gluten' as const, subtype })),
  ...subtypeKeys.nuts.map(subtype => ({ allergen: 'nuts' as const, subtype })),
]

const assessmentKeys = new Set(selections.map(selection => selection.subtype ?? selection.allergen))

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function level(value: unknown): AllergenLevel | undefined {
  return levels.has(value as string) ? value as AllergenLevel : undefined
}

function subtypeDetails(
  warnings: Record<string, unknown>, allergen: keyof typeof subtypeKeys, legacy: Record<string, unknown> | undefined
) {
  const nested = warnings[`${allergen}_levels`]
  const stored = nested === undefined ? legacy?.[`${allergen}_levels`] : nested
  const map = record(stored)
  const entries = Object.entries(map || {})
  const keys: readonly string[] = subtypeKeys[allergen]
  const valid = Boolean(map && entries.every(([key, value]) => keys.includes(key) && level(value)))
  const worst = entries.reduce<AllergenLevel>((current, [, value]) => worstCaseLevel(current, level(value) ?? 'none'), 'none')
  const legacyTypes = warnings[`${allergen}_types`] ?? legacy?.[`${allergen}_types`]
  const listed = Array.isArray(legacyTypes) && legacyTypes.length > 0 && legacyTypes.every(key => keys.includes(key))
    ? legacyTypes : undefined
  return { stored, map, valid, worst, listed }
}

/** Legacy true flags are declarations. False flags can be defaults and do not establish an assessment. */
export function evaluateAllergen(value: unknown, selection: AllergenSelection, legacyFields?: unknown): AllergenAssessment {
  const warnings = record(value) || {}
  const legacy = record(legacyFields)
  const { allergen, subtype } = selection
  const answer = level(warnings[allergen])
  const legacyWarning = legacy?.[`contains_${allergen}`] === true
  const scope = warnings.assessment_indeterminate
  const hasKnownScope = Array.isArray(scope) && scope.every(key => assessmentKeys.has(key)) &&
    (scope.length > 0 || !warnings.assessment_incomplete)
  const indeterminate = hasKnownScope
    ? scope.includes(allergen) || (subtype !== undefined && scope.includes(subtype))
    : Boolean(warnings.assessment_incomplete)

  if (allergen === 'nuts' || allergen === 'cereals_gluten') {
    const details = subtypeDetails(warnings, allergen, legacy)
    const broad = legacyWarning ? 'contains' : answer
    if (subtype === undefined) {
      const known = worstCaseLevel(broad ?? 'none', details.worst)
      if (known !== 'none') return { status: 'warning', level: known }
      if (details.stored !== undefined && !details.valid) return { status: 'incomplete' }
    } else {
      const explicit = level(details.map?.[subtype])
      if (explicit && explicit !== 'none') return { status: 'warning', level: explicit }
      if (broad && broad !== 'none' && details.stored === undefined && details.listed?.includes(subtype)) {
        return { status: 'warning', level: broad }
      }
      const unscopedLegacyRollup = !hasKnownScope && broad && broad !== 'none' &&
        Array.isArray(legacy?.ingredient_names) && legacy.ingredient_names.length > 0
      if (indeterminate || unscopedLegacyRollup || !broad) return { status: 'incomplete' }
      // The editor stores only positive subtype answers. The populated map must
      // account for the broad warning before an omitted subtype can be cleared.
      if (details.stored !== undefined) {
        return { status: details.valid && details.worst === broad ? 'clear' : 'incomplete' }
      }
      const hasConsistentDetail = broad === 'none' ? !details.listed : Boolean(details.listed)
      return { status: hasConsistentDetail ? 'clear' : 'incomplete' }
    }
  }

  if (legacyWarning) return { status: 'warning', level: 'contains' }
  if (answer && answer !== 'none') return { status: 'warning', level: answer }
  return { status: answer === 'none' && !indeterminate ? 'clear' : 'incomplete' }
}

export function evaluateAllergenSelections(value: unknown, selected: readonly AllergenSelection[], legacyFields?: unknown) {
  const assessments = selected.map(selection => evaluateAllergen(value, selection, legacyFields))
  return {
    matches: assessments.every(assessment => assessment.status === 'clear'),
    incomplete: assessments.some(assessment => assessment.status === 'incomplete'),
  }
}

export function hasIncompleteSubtypeAssessment(value: unknown, allergen: 'nuts' | 'cereals_gluten', legacyFields?: unknown) {
  return selections.some(selection => selection.subtype && selection.allergen === allergen &&
    evaluateAllergen(value, selection, legacyFields).status === 'incomplete')
}

export type AllergenAnswerIssue = {
  allergen?: AllergenId
  kind: 'missing' | 'invalid' | 'inconsistent_subtypes' | 'incomplete'
}

export function allergenAnswerIssues(value: unknown): AllergenAnswerIssue[] {
  const warnings = record(value) || {}
  const issues: AllergenAnswerIssue[] = []
  for (const { id } of ALLERGEN_LIST) {
    if (!level(warnings[id])) issues.push({ allergen: id, kind: warnings[id] == null || warnings[id] === '' ? 'missing' : 'invalid' })
    if (id !== 'nuts' && id !== 'cereals_gluten') continue
    const details = subtypeDetails(warnings, id, undefined)
    if (warnings[`${id}_levels`] !== undefined && (!details.valid || details.worst !== warnings[id])) {
      issues.push({ allergen: id, kind: 'inconsistent_subtypes' })
    }
  }
  if (warnings.assessment_incomplete) issues.push({ kind: 'incomplete' })
  return issues
}

export function unansweredAllergenCount(value: unknown): number {
  const warnings = record(value) || {}
  return ALLERGEN_LIST.filter(({ id }) => !level(warnings[id])).length
}

export function isAllergenAssessmentComplete(value: unknown): boolean {
  return allergenAnswerIssues(value).length === 0
}

/** Pass the actual selected ingredient assessments to derive a customized recipe. */
export function mergeAllergenAssessments(profiles: readonly unknown[]): AllergenWarnings {
  const warnings = {} as AllergenWarnings
  const indeterminate: AllergenAssessmentKey[] = []
  if (!profiles.length) return { ...warnings, assessment_incomplete: true }

  for (const selection of selections) {
    let worst: AllergenLevel = 'none'
    let incomplete = false
    for (const profile of profiles) {
      const assessment = evaluateAllergen(profile, selection)
      if (assessment.status === 'warning') worst = worstCaseLevel(worst, assessment.level)
      if (assessment.status === 'incomplete') incomplete = true
    }
    const { allergen, subtype } = selection
    if (incomplete) indeterminate.push(subtype ?? allergen)
    if (!subtype) {
      warnings[allergen] = worst
    } else if (worst !== 'none') {
      const key = `${allergen}_levels` as const
      const map: Partial<Record<GlutenType | TreeNutType, AllergenLevel>> = warnings[key] ??= {}
      map[subtype] = worst
    }
  }
  // Save an empty scope for fully resolved subtype rollups so cached clients
  // can distinguish them from older merges that lost broad-source coverage.
  if (indeterminate.length || warnings.nuts !== 'none' || warnings.cereals_gluten !== 'none') {
    warnings.assessment_indeterminate = indeterminate
  }
  if (profiles.some(profile => !isAllergenAssessmentComplete(profile))) warnings.assessment_incomplete = true
  return warnings
}

/** Keep any additional declarations from the saved legacy dish record. */
export function retainRecordedAllergenWarnings(derived: AllergenWarnings, saved: unknown): AllergenWarnings {
  // Only known warnings contribute. Missing saved answers cannot override
  // assessment evidence from the linked ingredients.
  const declarations = {} as AllergenWarnings
  for (const { id } of ALLERGEN_LIST) declarations[id] = 'none'
  let hasAdditionalWarnings = false
  for (const selection of selections) {
    const recorded = evaluateAllergen(saved, selection)
    if (recorded.status !== 'warning') continue
    const current = evaluateAllergen(derived, selection)
    if (current.status === 'warning' && worstCaseLevel(current.level, recorded.level) === current.level) continue
    hasAdditionalWarnings = true
    const { allergen, subtype } = selection
    if (!subtype) {
      declarations[allergen] = recorded.level
    } else {
      const map: Partial<Record<GlutenType | TreeNutType, AllergenLevel>> = declarations[`${allergen}_levels`] ??= {}
      map[subtype] = recorded.level
      declarations[allergen] = worstCaseLevel(declarations[allergen], recorded.level)
    }
  }
  return hasAdditionalWarnings ? mergeAllergenAssessments([derived, declarations]) : derived
}

export function isIngredientAssessmentComplete(warnings: unknown, profiles: unknown): boolean {
  if (!isAllergenAssessmentComplete(warnings)) return false
  if (!profiles) return true
  const entries = record(profiles)
  return Boolean(entries && Object.values(entries).every(profile =>
    isAllergenAssessmentComplete(record(profile)?.allergen_warnings)))
}

export type IngredientAssessmentSource = {
  allergen_warnings?: unknown
  supplier_profiles?: unknown
  status?: string | null
}

function supplierAssessments(profiles: unknown) {
  return Object.entries(record(profiles) || {}).map(([key, value]) => {
    const profile = record(value)
    const supplier = typeof profile?.supplier_name === 'string' ? profile.supplier_name : key
    const brand = typeof profile?.brand === 'string' ? profile.brand : ''
    return { variant: [supplier, brand].filter(Boolean).join(' · '), warnings: profile?.allergen_warnings }
  })
}

export function ingredientAssessmentWarnings(source: IngredientAssessmentSource): AllergenWarnings {
  const base = record(source.allergen_warnings) || {}
  const variants = supplierAssessments(source.supplier_profiles).map(({ warnings }) => warnings)
  const invalidProfiles = Boolean(source.supplier_profiles && !record(source.supplier_profiles))
  if (invalidProfiles || (source.status != null && source.status !== 'active')) {
    // Keep recorded warnings even if the source cannot substantiate a clear answer.
    const merged = mergeAllergenAssessments([base, ...variants, undefined])
    merged.assessment_incomplete = true
    return merged
  }
  // A legacy ingredient rollup can be reconstructed when the stored variant
  // answers explain its incomplete flag and account for its recorded warnings.
  const { assessment_incomplete, ...unflagged } = base
  const reconstructed = variants.length ? mergeAllergenAssessments(variants) : undefined
  const canReconstruct = assessment_incomplete && base.assessment_indeterminate === undefined &&
    reconstructed?.assessment_incomplete && unansweredAllergenCount(base) === 0 &&
    selections.every(selection => {
      const saved = evaluateAllergen(unflagged, selection)
      const fromVariants = evaluateAllergen(reconstructed, selection)
      return saved.status !== 'warning' || (fromVariants.status === 'warning' && fromVariants.level === saved.level)
    })
  return canReconstruct ? reconstructed : mergeAllergenAssessments([base, ...variants])
}

export type IngredientAssessmentIssue = {
  variant?: string
  kind: AllergenAnswerIssue['kind'] | 'invalid_profiles' | 'inactive' | 'unavailable'
  allergen?: AllergenId
  status?: string
}

export function ingredientAssessmentIssues(source: IngredientAssessmentSource): IngredientAssessmentIssue[] {
  const issues: IngredientAssessmentIssue[] = allergenAnswerIssues(source.allergen_warnings)
  if (source.status !== 'active') issues.push({ kind: 'inactive', status: source.status || undefined })
  if (source.supplier_profiles && !record(source.supplier_profiles)) issues.push({ kind: 'invalid_profiles' })
  for (const { variant, warnings } of supplierAssessments(source.supplier_profiles)) {
    issues.push(...allergenAnswerIssues(warnings).map(issue => ({ ...issue, variant })))
  }
  return issues
}
