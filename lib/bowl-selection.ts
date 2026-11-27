import { evaluateAllergen, type AllergenSelection } from '@/lib/allergen-assessment'
import type { AllergenWarnings } from '@/types/allergen'

export type BowlIngredient = {
  id: string
  name: string
  warnings: Partial<AllergenWarnings>
  dietary: readonly string[]
}

export type BowlGroup = {
  name: string
  kind: 'required' | 'optional' | 'multiple'
  options: readonly BowlIngredient[]
  defaults: readonly string[]
}

export type BowlChoices = Record<string, readonly string[]>

export function defaultBowlChoices(groups: readonly BowlGroup[]): BowlChoices {
  return Object.fromEntries(groups.map(group => [group.name, group.defaults]))
}

export function evaluateBowl(
  groups: readonly BowlGroup[],
  choices: BowlChoices,
  allergens: readonly AllergenSelection[],
) {
  const selected: BowlIngredient[] = []
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
    const results = selected.map(ingredient => ({ ingredient, assessment: evaluateAllergen(ingredient.warnings, allergen) }))
    const warnings = results.flatMap(({ ingredient, assessment }) =>
      assessment.status === 'warning' ? [{ ingredient, level: assessment.level }] : [])
    const incomplete = results.flatMap(({ ingredient, assessment }) =>
      assessment.status === 'incomplete' ? [ingredient] : [])
    return { allergen, warnings, incomplete }
  })

  const ready = selected.length > 0 && unresolvedGroups.length === 0
  const dietary = ready
    ? [...new Set(selected[0].dietary)].filter(label => selected.every(ingredient => ingredient.dietary.includes(label)))
    : []

  return { selected, unresolvedGroups, assessments, dietary, ready }
}
