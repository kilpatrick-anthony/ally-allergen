import type { createServiceClient } from '@/lib/supabase/server'
import { recordedDatasheetSupplier, soleIngredientSupplier } from '@/lib/datasheet-supplier'

type Datasheet = {
  supplier_name?: string | null
  ingredient_id?: string | null
  menu_item_id?: string | null
  notes?: string | null
}
const menuId = (sheet: Datasheet) => sheet.menu_item_id || sheet.notes?.match(/\[MENU_ITEM_REF:([0-9a-f-]{36})\]/i)?.[1]

/** Read-only display fallback; never assign one of several possible suppliers.
 * Keep it separate from supplier_name so editing other metadata does not turn
 * an inferred current association into a historical document assertion.
 */
export async function withDatasheetSuppliers<T extends Datasheet>(
  db: ReturnType<typeof createServiceClient>, businessId: string, sheets: T[],
): Promise<(T & { display_supplier_name: string | null })[]> {
  const missing = sheets.filter(sheet => !recordedDatasheetSupplier(sheet.supplier_name))
  const ingredientIds = [...new Set(missing.flatMap(sheet => sheet.ingredient_id ? [sheet.ingredient_id] : []))]
  const menuIds = [...new Set(missing.flatMap(sheet => !sheet.ingredient_id && menuId(sheet) ? [menuId(sheet)!] : []))]
  const [ingredients, menus] = await Promise.all([
    ingredientIds.length ? db.from('ingredients').select('id, suppliers').eq('business_id', businessId).in('id', ingredientIds) : Promise.resolve({ data: [], error: null }),
    menuIds.length ? db.from('menu_items').select('id, item_type, supplier_id').eq('business_id', businessId).in('id', menuIds) : Promise.resolve({ data: [], error: null }),
  ])
  if (ingredients.error) throw ingredients.error
  if (menus.error) throw menus.error
  const ingredientSuppliers = new Map((ingredients.data || []).map(row => [row.id, soleIngredientSupplier(row.suppliers)]))
  const menuSuppliers = new Map((menus.data || []).filter(row => row.item_type === 'packaged').map(row => [row.id, row.supplier_id]))
  const supplierIds = [...new Set([...menuSuppliers.values()].filter((id): id is string => typeof id === 'string' && Boolean(id)))]
  const suppliers = supplierIds.length ? await db.from('suppliers').select('id, name').eq('business_id', businessId).in('id', supplierIds) : { data: [], error: null }
  if (suppliers.error) throw suppliers.error
  const names = new Map((suppliers.data || []).map(row => [row.id, recordedDatasheetSupplier(row.name)]))
  return sheets.map(sheet => ({
    ...sheet,
    display_supplier_name: recordedDatasheetSupplier(sheet.supplier_name)
      || (sheet.ingredient_id ? ingredientSuppliers.get(sheet.ingredient_id) : names.get(menuSuppliers.get(menuId(sheet))))
      || null,
  }))
}
