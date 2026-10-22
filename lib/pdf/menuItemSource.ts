/** Source details belong on bought-in items; recipes already list ingredients. */
export function menuItemSourceLines(item: { item_type?: string; ingredients?: unknown[]; ingredient_names?: string[]; supplier_name?: string | null; manufacturer?: string | null }): string[] {
  if (item.item_type !== 'packaged_product' || item.ingredients?.length || item.ingredient_names?.length) return []
  return [item.supplier_name?.trim() ? `Supplier: ${item.supplier_name.trim()}` : '', item.manufacturer?.trim() ? `Brand: ${item.manufacturer.trim()}` : ''].filter(Boolean)
}
