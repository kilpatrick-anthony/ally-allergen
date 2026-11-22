import { z } from 'zod'
import { ALLERGEN_LIST, type AllergenId, type AllergenLevel, type AllergenWarnings } from '@/types/allergen'

export const ppdsAnswers = z.object({
  packer: z.enum(['same_business', 'other_business', 'uncertain']),
  place: z.enum(['same_site', 'mobile_or_temporary', 'different_fixed_site', 'uncertain']),
  enclosed: z.enum(['yes', 'no', 'uncertain']),
  timing: z.enum(['before_choice', 'after_choice', 'uncertain']),
  sales: z.enum(['in_person', 'remote_only', 'both', 'uncertain']),
}).strict()

export type PpdsAnswers = z.infer<typeof ppdsAnswers>
export type PpdsClassification = 'loose' | 'distance' | 'ppds' | 'review' | 'ingredient_label'

export function classifyPpds(answers: PpdsAnswers): PpdsClassification {
  if (Object.values(answers).includes('uncertain') || answers.packer === 'other_business') return 'review'
  if (answers.enclosed === 'yes' && answers.timing === 'before_choice' && answers.place === 'different_fixed_site') return 'review'
  if (answers.sales === 'remote_only') return 'distance'
  if (answers.enclosed === 'no' || answers.timing === 'after_choice') return 'loose'
  return 'ppds'
}

export const PPDS_CLASSIFICATIONS: Record<PpdsClassification, { title: string; detail: string }> = {
  loose: { title: 'Loose or made to order', detail: 'Use the location allergen guide for in-person orders.' },
  distance: { title: 'Distance selling only', detail: 'Share allergen information before purchase and again at delivery. Use the location link and the item’s delivery slip.' },
  ppds: { title: 'Prepacked for direct sale (PPDS)', detail: 'Use an approved on-pack label for in-person sales. For remote orders, also make allergen information available before purchase and at delivery.' },
  review: { title: 'Product needs a separate review', detail: 'Check the applicable prepacked food rules or confirm how this product is packed and sold before choosing a label.' },
  ingredient_label: { title: 'Optional ingredient label', detail: 'This is an ingredient declaration, not a complete food package label or a check of all local requirements.' },
}

function labelText(max: number) {
  return z.string().trim().min(1).max(max).regex(/^[\u0020-\u007e\u00a0-\u00ff‘’“”–—]+$/,
    'Use characters that the label font can print.')
}

export const PPDS_LABEL_SIZE = { minimumWidthMm: 20, minimumHeightMm: 15, defaultWidthMm: 50, defaultHeightMm: 30 }

export const ppdsLabelLayoutInput = z.object({
  foodName: labelText(160),
  ingredients: labelText(2400),
  precaution: z.union([labelText(200), z.literal('')]),
  areaCm2: z.number().min(10).max(10000),
  widthMm: z.number().min(PPDS_LABEL_SIZE.minimumWidthMm).max(200).default(PPDS_LABEL_SIZE.defaultWidthMm),
  heightMm: z.number().min(PPDS_LABEL_SIZE.minimumHeightMm).max(280).default(PPDS_LABEL_SIZE.defaultHeightMm),
}).strict()

export const ppdsLabelInput = ppdsLabelLayoutInput.extend({
  specifications: z.array(z.object({
    sourceId: z.string().uuid(),
    documentId: z.string().uuid(),
    variantId: z.string().uuid().nullable(),
  })).min(1).max(100),
  recipeVerified: z.literal(true),
  templateSuitable: z.literal(true),
}).strict()

export const ppdsLabelDraftLayoutInput = ppdsLabelLayoutInput.extend({
  ingredients: z.union([labelText(2400), z.literal('')]),
})

export const ppdsLabelSourceSelection = z.object({
  sourceId: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
}).strict()

export type PpdsLabelInput = z.infer<typeof ppdsLabelInput>
export interface LabelTextRun { text: string; bold: boolean }
type LabelSourceSelection = z.infer<typeof ppdsLabelSourceSelection>
type LabelAllergenSource = { id: string; name: string; containedAllergens?: string[] }

export function selectedLabelAllergenSources(
  sources: (LabelAllergenSource & { variants: LabelAllergenSource[] })[],
  selections: LabelSourceSelection[],
) {
  return sources.flatMap(source => source.variants.length
    ? source.variants.filter(variant => selections.some(selection =>
      selection.sourceId === source.id && selection.variantId === variant.id))
      .map(variant => ({ ...variant, name: `${source.name} · ${variant.name}` }))
    : [source])
}

type SpecificAllergen = { id: AllergenId; name: string; level: AllergenLevel }

const specificNames: Partial<Record<AllergenId, Record<string, string>>> = {
  cereals_gluten: { wheat: 'wheat', rye: 'rye', barley: 'barley', oats: 'oats', spelt: 'spelt wheat', kamut: 'Khorasan wheat' },
  nuts: {
    almonds: 'almonds', hazelnuts: 'hazelnuts', walnuts: 'walnuts', cashews: 'cashews', pecans: 'pecans',
    brazil_nuts: 'Brazil nuts', pistachios: 'pistachios', macadamia: 'macadamia nuts',
  },
}

export function specificAllergens(warnings: AllergenWarnings): SpecificAllergen[] {
  return ALLERGEN_LIST.flatMap(({ id, name }) => {
    const level = warnings[id]
    if (!level || level === 'none') return []
    if (id === 'nuts' || id === 'cereals_gluten') {
      const details = Object.entries(warnings[`${id}_levels`] || {})
      const types = details.length ? details : (warnings[`${id}_types`] || []).map(key => [key, level] as const)
      const active = types.flatMap(([key, severity]) => severity !== 'none' && specificNames[id]?.[key]
        ? [{ id, name: specificNames[id][key], level: severity }]
        : [])
      if (active.length && active.some(allergen => allergen.level === level)) return active
    }
    return [{ id, name: id === 'cereals_gluten' ? 'cereals containing gluten' : name.toLowerCase(), level }]
  })
}

const allergenTerms: Record<string, RegExp> = {
  wheat: /wheat(?:s)?/i,
  rye: /rye/i,
  barley: /barley/i,
  oats: /oats?/i,
  'spelt wheat': /spelt wheat|spelt \(wheat\)/i,
  'Khorasan wheat': /(?:khorasan|kamut) wheat|(?:khorasan|kamut) \(wheat\)/i,
  almonds: /almonds?/i,
  hazelnuts: /hazelnuts?/i,
  walnuts: /walnuts?/i,
  cashews: /cashews?(?: nuts?)?/i,
  pecans: /pecans?(?: nuts?)?/i,
  'Brazil nuts': /brazil nuts?/i,
  pistachios: /pistachios?(?: nuts?)?/i,
  'macadamia nuts': /macadamias?(?: nuts?)?|queensland nuts?/i,
  crustaceans: /crustaceans?/i,
  eggs: /eggs?/i,
  fish: /fish/i,
  peanuts: /peanuts?|groundnuts?/i,
  soybeans: /soybeans?|soya beans?|soy beans?|soya|soy/i,
  milk: /(?<!\b(?:coconut|soy|soya|oat|almond|rice|cashew|hazelnut|pea|hemp|flax|sesame|pistachio|macadamia|plant-based)[ -]+)milk/i,
  celery: /celery/i,
  mustard: /mustard/i,
  'sesame seeds': /sesame(?: seeds?)?/i,
  'sulphur dioxide and sulphites': /sulphur dioxide|(?:meta|bi)?sulphites?|sulfur dioxide|(?:meta|bi)?sulfites?/i,
  lupin: /lupins?/i,
  molluscs: /mollus[ck]s?/i,
}

function termPattern(term: RegExp) {
  return `(?<![\\p{L}\\p{N}])(?:${term.source})(?![\\p{L}\\p{N}])`
}

function hasTerm(text: string, term: RegExp) {
  return new RegExp(termPattern(term), 'iu').test(text)
}

export function missingDeclaredAllergens(declaration: string, names: string[]) {
  return names.filter(name => allergenTerms[name] && !hasTerm(declaration, allergenTerms[name]))
}

export function isSingleAllergenName(declaration: string, names: string[]) {
  return names.some(name => allergenTerms[name] &&
    new RegExp(`^(?:${allergenTerms[name].source})[.,;]*$`, 'iu').test(declaration.trim()))
}

/** Preserve the operator's declaration and emphasise repeated allergen names wherever they appear. */
export function labelIngredients(declaration: string, required: SpecificAllergen[]): LabelTextRun[] {
  if (/(?:^ingredients\s*:|\b(?:may contain|not suitable for)\b)/i.test(declaration)) {
    throw new Error('Enter the ingredients only. Put any precautionary statement in its own field.')
  }
  if (/(?:^|[.;])\s*contains\s*:/i.test(declaration)) {
    throw new Error('Name contained allergens within the ingredients list where they occur.')
  }

  const open = declaration.match(/[([]/g)?.length || 0
  const close = declaration.match(/[)\]]/g)?.length || 0
  if (open !== close) throw new Error('Check the brackets around compound ingredients.')

  const names = [...new Set(required.filter(allergen => allergen.level === 'contains').map(allergen => allergen.name))]
  for (const name of names) {
    const term = allergenTerms[name]
    if (!term) throw new Error('Confirm the specific cereal or nut in the verified allergen assessment.')
    if (!hasTerm(declaration, term)) {
      throw new Error(`Name ${name} in the declaration, including in compound ingredients where it occurs.`)
    }
  }

  // Detect a printed declaration that disagrees with the selected source data.
  // The operator reviews ingredient names and allergen derivatives in context.
  for (const [name, term] of Object.entries(allergenTerms)) {
    if (names.includes(name) || (name === 'wheat' &&
        (names.includes('spelt wheat') || names.includes('Khorasan wheat')))) continue
    if (hasTerm(declaration, term)) throw new Error(`Check the declaration for ${name} against the verified source assessments.`)
  }

  return emphasiseDeclaredAllergens(declaration, names)
}

export function emphasiseDeclaredAllergens(declaration: string, names: string[]): LabelTextRun[] {
  const pattern = [...new Set(names)].filter(name => allergenTerms[name]).map(name => allergenTerms[name])
    .sort((a, b) => b.source.length - a.source.length)
    .map(termPattern).join('|')
  if (!pattern) return [{ text: declaration, bold: false }]

  const runs: LabelTextRun[] = []
  let offset = 0
  for (const match of declaration.matchAll(new RegExp(pattern, 'giu'))) {
    if (match.index > offset) runs.push({ text: declaration.slice(offset, match.index), bold: false })
    runs.push({ text: match[0], bold: true })
    offset = match.index + match[0].length
  }
  if (offset < declaration.length) runs.push({ text: declaration.slice(offset), bold: false })
  return runs
}

export function validatePrecaution(statement: string, allergens: SpecificAllergen[]) {
  if (statement && !/^may contain\s+\S/i.test(statement)) {
    throw new Error('Start the separate precautionary statement with “May contain”.')
  }
  const cautions = allergens.filter(allergen => allergen.level !== 'contains')
  if (cautions.some(({ name }) => !statement || !allergenTerms[name] || !hasTerm(statement, allergenTerms[name]))) {
    throw new Error('Check the separate precautionary statement against the verified source assessments. Use specific cereal and nut names.')
  }
}
