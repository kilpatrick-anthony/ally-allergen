import type { AllergenWarnings } from '@/types/allergen'
import { computeWorstCaseAllergens } from '@/types/allergen'

const STANDARD_DIETARY = new Set([
  'Vegan', 'Vegetarian', 'Gluten-Free', 'Halal', 'Kosher', 'Organic',
  'Fair Trade', 'Lactose-Free', 'Coeliac-Friendly',
])

type SupabaseClient = any

export function normalizeIngredientIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((id): id is string => typeof id === 'string' && id.trim() !== '')))
}

export async function deriveMenuItemSafety(
  supabase: SupabaseClient,
  businessId: string,
  ingredientIds: string[],
  requestedWarnings: AllergenWarnings,
  requestedDietary: string[]
) {
  if (ingredientIds.length === 0) {
    return { allergenWarnings: requestedWarnings, dietary: requestedDietary }
  }

  const { data, error } = await supabase
    .from('ingredients')
    .select('id, allergen_warnings, certifications')
    .eq('business_id', businessId)
    .in('id', ingredientIds)

  if (error) throw new Error(`Could not validate ingredients: ${error.message}`)
  if ((data || []).length !== ingredientIds.length) {
    throw new Error('One or more selected ingredients do not belong to this business')
  }

  const ingredientRows = data || []
  const certificationSets: string[][] = ingredientRows.map((row: any) =>
    Array.isArray(row.certifications) ? row.certifications : []
  )
  const inheritedDietary = certificationSets.length === 0
    ? []
    : certificationSets.reduce((common, certifications) =>
        common.filter((certification) => certifications.includes(certification))
      )
  const customDietary = requestedDietary.filter((label) => !STANDARD_DIETARY.has(label))

  return {
    allergenWarnings: computeWorstCaseAllergens(
      ingredientRows.map((row: any) => (row.allergen_warnings || {}) as AllergenWarnings)
    ),
    dietary: Array.from(new Set([...inheritedDietary, ...customDietary])),
  }
}

export async function replaceMenuItemIngredients(
  supabase: SupabaseClient,
  menuItemId: string,
  ingredientIds: string[]
) {
  const { error: deleteError } = await supabase
    .from('menu_item_ingredients')
    .delete()
    .eq('menu_item_id', menuItemId)

  if (deleteError) throw new Error(`Could not update ingredient links: ${deleteError.message}`)
  if (ingredientIds.length === 0) return

  const { error: insertError } = await supabase
    .from('menu_item_ingredients')
    .insert(ingredientIds.map((ingredientId) => ({
      menu_item_id: menuItemId,
      ingredient_id: ingredientId,
      quantity: '',
      is_optional: false,
    })))

  if (insertError) throw new Error(`Could not update ingredient links: ${insertError.message}`)
}
