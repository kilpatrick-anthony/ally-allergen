import { isAllergenAssessmentComplete, isIngredientAssessmentComplete } from '@/lib/allergen-assessment'
import { labelRecipeIngredients, looseFoodAllergenStatements, ppdsLabelLayoutInput, specificAllergens, validatePrecaution, type PpdsLabelInput } from '@/lib/ppds'
import { makePpdsLabelPdf, type PpdsPrintLabel } from '@/lib/pdf/ppds-label'
import type { AllergenWarnings } from '@/types/allergen'

type Ingredient = {
  id: string
  name: string
  status: string
  allergen_warnings: AllergenWarnings
  supplier_profiles?: unknown
  suppliers?: string[]
}
type Variant = {
  variant: {
    id: string
    ingredient_id: string
    brand?: string
    assessment_status: string
    allergen_warnings: AllergenWarnings
  }
  supplier: { id: string; name: string }
}
type Specification = {
  id: string
  ingredient_id: string | null
  menu_item_id: string | null
  supplier_name: string | null
  file_name: string
  file_path: string
  version: string | null
  next_review_date: string | null
  status: string
}

export interface PpdsSource {
  item: {
    id: string; name: string; item_type: string; supplier_id: string | null; allergen_warnings: AllergenWarnings;
    ingredient_declaration: string | null;
  }
  directSupplier: { id: string; name: string } | null
  recipeLinkCount: number
  ingredients: { ingredient: Ingredient; link: unknown }[]
  variants: Variant[]
  specifications: Specification[]
}

export type StoredPpdsLabel = { input: PpdsLabelInput; rendered: PpdsPrintLabel }

function londonDate() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts()
  const part = (type: string) => parts.find(value => value.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

function matchesSupplier(spec: Specification, name: string) {
  return spec.supplier_name?.trim().toLowerCase() === name.trim().toLowerCase()
}

export function ppdsReviewSources(source: PpdsSource) {
  const ingredientSources = source.ingredients.map(({ ingredient }) => ingredient)
  const rows = ingredientSources.length ? ingredientSources : [{ id: source.item.id, name: source.item.name }]
  return rows.map(row => {
    const ingredient = 'status' in row ? row : null
    const specifications = source.specifications
      .filter(spec => ingredientSources.length ? spec.ingredient_id === row.id : spec.menu_item_id === row.id)
    const variants = source.variants.filter(({ variant }) => variant.ingredient_id === row.id).map(({ variant, supplier }) => {
      const assessmentComplete = isAllergenAssessmentComplete(variant.allergen_warnings)
      const assessed = variant.assessment_status === 'assessed' && assessmentComplete
      const allergens = assessmentComplete ? specificAllergens(variant.allergen_warnings) : []
      return {
        id: variant.id,
        name: [supplier.name, variant.brand].filter(Boolean).join(' · '),
        assessed,
        assessmentComplete,
        allergens,
        containedAllergens: assessed ? allergens.filter(entry => entry.level === 'contains').map(entry => entry.name) : [],
        documentIds: specifications.filter(spec => matchesSupplier(spec, supplier.name)).map(spec => spec.id),
      }
    })
    const assessment = ingredient ? ingredient.allergen_warnings : source.item.allergen_warnings
    const assessed = ingredient
      ? ingredient.status === 'active' && isIngredientAssessmentComplete(assessment, ingredient.supplier_profiles)
      : isAllergenAssessmentComplete(assessment)
    const allergens = !variants.length && assessed ? specificAllergens(assessment) : []
    return {
      id: row.id,
      name: row.name,
      variants,
      active: !ingredient || ingredient.status === 'active',
      assessed,
      allergens,
      containedAllergens: allergens.filter(entry => entry.level === 'contains').map(entry => entry.name),
      documents: specifications.map(spec => ({
        id: spec.id, name: spec.file_name, supplier: spec.supplier_name, version: spec.version, reviewDate: spec.next_review_date,
        href: spec.file_path?.startsWith('/api/') || spec.file_path?.startsWith('https://') ? spec.file_path : null,
        current: currentSpecification(spec),
        canSetReviewDate: spec.status === 'active' && Boolean(spec.file_path),
      })),
    }
  })
}

export type PpdsReviewSources = ReturnType<typeof ppdsReviewSources>

export function canCreateLooseFoodLabel(source: PpdsSource) {
  return source.item.item_type !== 'packaged_product' && source.recipeLinkCount > 0 &&
    source.ingredients.length === source.recipeLinkCount
}

export function buildLooseFoodAllergenLabel(source: PpdsSource, selections: { sourceId: string; variantId: string }[], {
  confirmedVariantIds = [], ingredients,
}: { confirmedVariantIds?: string[]; ingredients?: string } = {}) {
  if (!canCreateLooseFoodLabel(source)) throw new Error('An allergen-only label requires a complete linked recipe for food served loose.')
  const foodName = ppdsLabelLayoutInput.shape.foodName.safeParse(source.item.name)
  if (!foodName.success) throw new Error('Use a menu item name that can be printed on the label.')

  const rows = ppdsReviewSources(source)
  const confirmed = new Set(confirmedVariantIds)
  const variantsBySource = new Map<string, Set<string>>()
  for (const { sourceId, variantId } of selections) {
    const row = rows.find(entry => entry.id === sourceId)
    if (!row?.variants.some(variant => variant.id === variantId)) {
      throw new Error('Select supplier variants from this recipe.')
    }
    const selected = variantsBySource.get(sourceId) ?? new Set<string>()
    selected.add(variantId)
    variantsBySource.set(sourceId, selected)
  }
  const allergens = rows.flatMap(row => {
    if (!row.active) throw new Error(`Use an active recipe ingredient for ${row.name}.`)
    if (!row.variants.length) {
      if (!row.assessed) throw new Error(`Complete the allergen assessment for ${row.name}.`)
      return row.allergens
    }
    const selected = row.variants.filter(variant => variantsBySource.get(row.id)?.has(variant.id))
    if (!selected.length) throw new Error(`Select the supplier variants used for ${row.name}.`)
    if (selected.some(variant => !variant.assessmentComplete || (!variant.assessed && !confirmed.has(variant.id)))) {
      throw new Error(`Complete the selected variant assessments for ${row.name} or confirm the recorded answers against the supplier evidence for this label.`)
    }
    return selected.flatMap(variant => variant.allergens)
  })
  const statements = looseFoodAllergenStatements(allergens)
  if (statements.needsSpecificNames) throw new Error('Identify the specific cereal or tree nut in the selected allergen assessments.')
  return {
    foodName: foodName.data,
    ...statements,
    ingredients: ingredients === undefined ? undefined : labelRecipeIngredients(ingredients, allergens, rows.length),
  }
}

function currentSpecification(spec: Specification) {
  return spec.status === 'active' && Boolean(spec.file_path && spec.next_review_date && spec.next_review_date >= londonDate())
}

export function buildPpdsLabel(source: PpdsSource, input: PpdsLabelInput) {
  if (source.ingredients.length !== source.recipeLinkCount) {
    throw new Error('One or more linked recipe ingredients could not be verified.')
  }
  if (!source.ingredients.length && (!source.item.ingredient_declaration || !source.directSupplier)) {
    throw new Error('Link a complete recipe or a verified product specification before generating a label.')
  }

  const required = ppdsReviewSources(source)
  const selections = new Map<string, PpdsLabelInput['specifications']>()
  for (const choice of input.specifications) {
    const choices = selections.get(choice.sourceId) ?? []
    choices.push(choice)
    selections.set(choice.sourceId, choices)
  }
  if (selections.size !== required.length || required.some(row => !selections.has(row.id))) {
    throw new Error('Select a current specification for every recipe ingredient or product.')
  }

  const assessments = required.flatMap(row => {
    const choices = selections.get(row.id) ?? []
    if (new Set(choices.map(choice => choice.variantId)).size !== choices.length ||
        (!row.variants.length && choices.length !== 1)) {
      throw new Error(`Select one current specification per supplier variant for ${row.name}.`)
    }
    const ingredient = source.ingredients.find(({ ingredient }) => ingredient.id === row.id)?.ingredient
    if (ingredient && ingredient.status !== 'active') {
      throw new Error(`Use an active recipe ingredient for ${row.name}.`)
    }

    return choices.map(choice => {
      const spec = source.specifications.find(specification =>
        specification.id === choice.documentId && row.documents.some(document => document.id === specification.id))
      if (!spec || !currentSpecification(spec)) {
        throw new Error(`Select a current specification with a review date for ${row.name}.`)
      }
      if (!ingredient) {
        if (choice.variantId || !source.directSupplier || !matchesSupplier(spec, source.directSupplier.name)) {
          throw new Error('Select a specification from the supplier recorded on this product.')
        }
        if (!isAllergenAssessmentComplete(source.item.allergen_warnings)) {
          throw new Error('Complete the bought-in product’s allergen assessment before approving a label.')
        }
        return source.item.allergen_warnings
      }
      if (!row.variants.length) {
        if (choice.variantId || (ingredient.suppliers?.length && !ingredient.suppliers.some(name => matchesSupplier(spec, name)))) {
          throw new Error(`Select a specification for a recorded supplier of ${row.name}.`)
        }
        if (!isIngredientAssessmentComplete(ingredient.allergen_warnings, ingredient.supplier_profiles)) {
          throw new Error(`Complete the allergen assessment for ${row.name}.`)
        }
        return ingredient.allergen_warnings
      }

      const chosen = row.variants.find(variant => variant.id === choice.variantId)
      const assessment = source.variants.find(({ variant }) => variant.id === chosen?.id)
      if (!chosen?.assessed || !chosen.documentIds.includes(spec.id) || !assessment) {
        throw new Error(`Choose an assessed supplier variant and its matching specification for ${row.name}.`)
      }
      return assessment.variant.allergen_warnings
    })
  })

  // Examine each source assessment separately so a "contains" warning cannot
  // hide another source's precautionary warning for the same allergen.
  const allergens = assessments.flatMap(specificAllergens)
  const contains = new Set(allergens.filter(({ level }) => level === 'contains').map(({ name }) => name))
  const relevant = allergens.filter(({ name, level }) => level === 'contains' || !contains.has(name))
  const ingredients = labelRecipeIngredients(input.ingredients, relevant, source.ingredients.length)
  validatePrecaution(input.precaution, relevant)
  const rendered: PpdsPrintLabel = {
    foodName: input.foodName, ingredients, precaution: input.precaution, areaCm2: input.areaCm2,
    widthMm: input.widthMm, heightMm: input.heightMm,
  }
  const result = makePpdsLabelPdf(rendered)
  return { label: { input, rendered } as StoredPpdsLabel, ...result }
}
