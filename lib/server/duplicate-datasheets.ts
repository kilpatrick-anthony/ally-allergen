import type { createServiceClient } from '@/lib/supabase/server'

type DB = ReturnType<typeof createServiceClient>

/** Read source documents only after checking the source belongs to this business. */
export async function sourceDatasheets(db: DB, businessId: string, entity: 'ingredient' | 'menu_item', sourceId: unknown) {
  if (sourceId === undefined) return []
  if (typeof sourceId !== 'string' || !/^[0-9a-f-]{36}$/i.test(sourceId)) throw new Error('Invalid duplicate source')
  const table = entity === 'ingredient' ? 'ingredients' : 'menu_items'
  const { data: source, error } = await db.from(table).select('id').eq('id', sourceId).eq('business_id', businessId).maybeSingle()
  if (error || !source) throw new Error('Duplicate source is unavailable')
  let query = db.from('datasheets').select('*').eq('business_id', businessId).eq('status', 'active')
  query = entity === 'ingredient' ? query.eq('ingredient_id', sourceId)
    : query.or(`menu_item_id.eq.${sourceId},notes.ilike.%[MENU_ITEM_REF:${sourceId}]%`)
  const result = await query
  if (result.error) throw new Error('Could not load source datasheets')
  return result.data || []
}

/** Independent metadata records share the immutable uploaded file. Deleting a
 * document removes its metadata only, so either item can manage its own copy. */
export async function copyDatasheets(db: DB, businessId: string, entity: 'ingredient' | 'menu_item', targetId: string, userId: string, sheets: Record<string, any>[]) {
  if (!sheets.length) return
  const rows = sheets.map(sheet => ({
    business_id: businessId,
    ingredient_id: entity === 'ingredient' ? targetId : null,
    menu_item_id: entity === 'menu_item' ? targetId : null,
    file_name: sheet.file_name, file_path: sheet.file_path,
    file_size: sheet.file_size, file_type: sheet.file_type,
    supplier_name: sheet.supplier_name, version: sheet.version,
    notes: typeof sheet.notes === 'string' ? sheet.notes.replace(/\[MENU_ITEM_REF:[^\]]+\]/g, '').trim() : null,
    status: 'active', created_by: userId,
  }))
  const { error } = await db.from('datasheets').insert(rows)
  if (error) throw new Error('Could not copy datasheets')
}
