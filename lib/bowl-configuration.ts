import { z } from 'zod'

const id = z.uuid()
const namedOption = z.object({
  id,
  label: z.string().trim().max(120),
  additionalIngredientIds: z.array(id).max(29),
})
const group = z.object({
  name: z.string().trim().min(1).max(60),
  kind: z.enum(['required', 'optional', 'multiple']),
  options: z.array(z.union([id, namedOption])).min(1).max(30),
  defaults: z.array(id).max(30),
})

export const bowlConfiguration = z.object({
  fixed: z.array(id).max(50),
  groups: z.array(group).min(1).max(10),
})

export type BowlConfiguration = z.infer<typeof bowlConfiguration>

export type BowlOptionConfiguration = BowlConfiguration['groups'][number]['options'][number]

export function bowlOptionId(option: BowlOptionConfiguration) {
  return typeof option === 'string' ? option : option.id
}

export function bowlOptionIngredientIds(option: BowlOptionConfiguration) {
  return typeof option === 'string' ? [option] : [option.id, ...option.additionalIngredientIds]
}

export function bowlConfigurationIssue(config: BowlConfiguration, recipe: readonly string[], available: ReadonlySet<string>) {
  const ids = [...config.fixed, ...config.groups.flatMap(group => group.options.flatMap(bowlOptionIngredientIds))]
  if (new Set(ids).size !== ids.length) return 'Use each ingredient only once, as a fixed ingredient or a choice.'
  if (ids.some(id => !available.has(id))) return 'Choose ingredients available to this business for this location.'
  const names = config.groups.map(group => group.name.toLowerCase())
  if (new Set(names).size !== names.length) return 'Give each choice group a different name.'

  for (const { name, kind, options, defaults } of config.groups) {
    const optionIds = new Set(options.map(bowlOptionId))
    if (new Set(defaults).size !== defaults.length || defaults.some(id => !optionIds.has(id)) ||
        (kind === 'required' && defaults.length !== 1) || (kind === 'optional' && defaults.length > 1)) {
      return `Check the default choices in “${name}”.`
    }
  }

  const standard = new Set([...config.fixed, ...config.groups.flatMap(group =>
    group.options.filter(option => group.defaults.includes(bowlOptionId(option))).flatMap(bowlOptionIngredientIds))])
  if (!recipe.length || standard.size !== new Set(recipe).size || recipe.some(id => !standard.has(id))) {
    return 'Fixed ingredients and default choices must match the saved standard recipe exactly.'
  }
  if (!config.fixed.length && !config.groups.some(group => group.kind === 'required')) {
    return 'Add a fixed ingredient or a required choice so every bowl has an ingredient.'
  }
}
