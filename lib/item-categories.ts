export const DEFAULT_INGREDIENT_CATEGORIES = [
  'Dairy', 'Dairy Alternative', 'Fruit', 'Grain', 'Nut', 'Oil',
  'Other', 'Protein', 'Seed', 'Spice', 'Spread', 'Sweetener', 'Vegetable',
] as const

export const DEFAULT_MENU_CATEGORIES = [
  'Breakfast', 'Desserts', 'Drinks', 'Lunch', 'Mains',
  'Sides', 'Snacks', 'Specials', 'Starters',
] as const

export function mergeCategories(defaults: readonly string[], saved: unknown) {
  const values = Array.isArray(saved) ? saved.filter((value): value is string => typeof value === 'string' && !!value.trim()) : []
  return [...new Set([...defaults, ...values.map(value => value.trim())])].sort((left, right) => left.localeCompare(right))
}
