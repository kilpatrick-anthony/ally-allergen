import { createServiceClient } from '@/lib/supabase/server'

export type MenuItemType = 'prepared' | 'packaged_product'

const nullableText = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null

export async function buildProductFields(
  supabase: ReturnType<typeof createServiceClient>,
  businessId: string,
  userId: string,
  body: Record<string, any>
) {
  const itemType: MenuItemType = body.item_type === 'packaged_product' ? 'packaged_product' : 'prepared'

  if (itemType === 'prepared') {
    return {
      item_type: itemType, supplier_id: null, manufacturer: null,
      product_code: null, barcode: null, ingredient_declaration: null,
      label_verified_at: null, label_verified_by: null,
    }
  }

  const supplierId = nullableText(body.supplier_id)
  if (supplierId) {
    const { data: supplier, error } = await supabase
      .from('suppliers').select('id').eq('id', supplierId).eq('business_id', businessId).maybeSingle()
    if (error || !supplier) throw new Error('Selected supplier is not available to this business')
  }

  let labelVerifiedAt: string | null = null
  if (body.label_verified_at) {
    const date = new Date(body.label_verified_at)
    if (Number.isNaN(date.getTime())) throw new Error('Label verification date is invalid')
    labelVerifiedAt = date.toISOString()
  }

  return {
    item_type: itemType,
    supplier_id: supplierId,
    manufacturer: nullableText(body.manufacturer),
    product_code: nullableText(body.product_code),
    barcode: nullableText(body.barcode),
    ingredient_declaration: nullableText(body.ingredient_declaration),
    label_verified_at: labelVerifiedAt,
    label_verified_by: labelVerifiedAt ? userId : null,
  }
}
