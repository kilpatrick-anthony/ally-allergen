import { evaluateAllergen, hasIncompleteSubtypeAssessment, type AllergenSelection } from '@/lib/allergen-assessment'
import { GLUTEN_TYPES, TREE_NUT_TYPES, type AllergenLevel, type AllergenWarnings } from '@/types/allergen'

export type BowlIngredient = {
  id: string
  name: string
  warnings: Partial<AllergenWarnings>
  linkedIngredients?: readonly { id: string; name: string }[]
  recordedWarnings?: readonly Partial<AllergenWarnings>[]
  dietary: readonly string[]
}

export type BowlGroup = {
  name: string
  kind: 'required' | 'optional' | 'multiple'
  options: readonly BowlIngredient[]
  defaults: readonly string[]
}

export type PublishedBowl = {
  fixed: readonly BowlIngredient[]
  groups: readonly BowlGroup[]
  sourceVersion: string
}

export type BowlChoices = Record<string, readonly string[]>

export function defaultBowlChoices(groups: readonly BowlGroup[]): BowlChoices {
  return Object.fromEntries(groups.map(group => [group.name, group.defaults]))
}

export function evaluateBowl(
  groups: readonly BowlGroup[],
  choices: BowlChoices,
  allergens: readonly AllergenSelection[],
  fixed: readonly BowlIngredient[] = [],
) {
  const selected = [...fixed]
  const unresolvedGroups: string[] = []

  for (const group of groups) {
    const ids = new Set(choices[group.name] ?? [])
    const picks = group.options.filter(option => ids.has(option.id))
    if (picks.length !== ids.size ||
        (group.kind === 'required' && picks.length !== 1) ||
        (group.kind === 'optional' && picks.length > 1)) {
      unresolvedGroups.push(group.name)
    }
    selected.push(...picks)
  }

  // Both published ingredient assessments and preview fixtures use the same
  // evaluator as the kiosk. Keep each source so every warning has a name.
  const assessments = allergens.map(allergen => {
    const warnings: { ingredient: BowlIngredient; level: Exclude<AllergenLevel, 'none'>; subtype?: AllergenSelection['subtype'] }[] = []
    const incomplete: BowlIngredient[] = []
    for (const ingredient of selected) {
      const profiles = [ingredient.warnings, ...(ingredient.recordedWarnings || [])]
      const seen = new Set<string>()
      let unresolved = false
      const subtypes = allergen.subtype !== undefined ? [] : subtypesFor(allergen)
      for (const profile of profiles) {
        const answer = evaluateAllergen(profile, allergen)
        const detailed = subtypes.flatMap(selection => {
          const specific = evaluateAllergen(profile, selection)
          return specific.status === 'warning' ? [{ level: specific.level, subtype: selection.subtype }] : []
        })
        if (answer.status === 'warning' && !detailed.some(warning => warning.level === answer.level)) {
          detailed.push({ level: answer.level, subtype: undefined })
        }
        for (const warning of detailed) {
          const key = `${warning.subtype ?? ''}:${warning.level}`
          if (!seen.has(key)) warnings.push({ ingredient, ...warning })
          seen.add(key)
        }
        unresolved ||= answer.status === 'incomplete' ||
          (subtypes.length > 0 && (allergen.allergen === 'nuts' || allergen.allergen === 'cereals_gluten') &&
            hasIncompleteSubtypeAssessment(profile, allergen.allergen))
      }
      if (unresolved) incomplete.push(ingredient)
    }
    return { allergen, warnings, incomplete }
  })

  const ready = selected.length > 0 && unresolvedGroups.length === 0
  const dietary = ready
    ? [...new Set(selected[0].dietary)].filter(label => selected.every(ingredient => supportsDietaryClaim(ingredient, label)))
    : []

  return { selected, unresolvedGroups, assessments, dietary, ready }
}

function subtypesFor({ allergen }: AllergenSelection): AllergenSelection[] {
  if (allergen === 'nuts') return TREE_NUT_TYPES.map(({ key }) => ({ allergen, subtype: key }))
  if (allergen === 'cereals_gluten') return [
    ...GLUTEN_TYPES.map(({ key }) => ({ allergen, subtype: key })),
    { allergen, subtype: 'spelt' }, { allergen, subtype: 'kamut' },
  ]
  return []
}

// Keep recorded claims only when the relevant allergen answers support them.
function supportsDietaryClaim(ingredient: BowlIngredient, claim: string) {
  if (!ingredient.dietary.includes(claim)) return false
  const profiles = [ingredient.warnings, ...(ingredient.recordedWarnings || [])]
  const everyAnswer = (allergen: AllergenSelection['allergen'], allowed: 'clear' | 'composition') =>
    profiles.every(warnings => {
      const answer = evaluateAllergen(warnings, { allergen })
      return answer.status === 'clear' || (allowed === 'composition' && answer.status === 'warning' &&
        answer.level !== 'contains' && answer.level !== 'not_suitable')
    })
  if (claim === 'Gluten-Free' || claim === 'Coeliac-Friendly') return everyAnswer('cereals_gluten', 'clear')
  if (claim === 'Dairy Free' || claim === 'Lactose-Free') return everyAnswer('milk', 'clear')
  if (claim === 'Vegetarian' || claim === 'Vegan') {
    const allergens: AllergenSelection['allergen'][] = ['fish', 'crustaceans', 'molluscs']
    if (claim === 'Vegan') allergens.push('milk', 'eggs')
    return allergens.every(allergen => everyAnswer(allergen, 'composition'))
  }
  return true
}
