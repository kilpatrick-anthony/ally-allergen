import { allergenFields, dietaryTagFields } from '@/lib/quick-add-review'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifySessionToken } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

export class QuickAddError extends Error {
  constructor(public code: string, public status: number) { super(code) }
}

export const draftFields = z.object({
  kind: z.enum(['ingredient', 'packaged_product', 'prepared_item']),
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().max(200).optional(),
  ingredient_ids: z.array(z.string().uuid()).max(100).transform(ids => [...new Set(ids)]).optional(),
  site_id: z.string().uuid().nullable(),
  supplier_id: z.string().uuid().nullable(),
  supplier_name: z.string().trim().max(200),
  allergen_warnings: allergenFields.optional(),
  dietary_tags: dietaryTagFields.optional(),
  notes: z.string().trim().max(2000),
}).strict()

export const createDraftInput = draftFields.extend({ id: z.string().uuid() })
export const updateDraftInput = draftFields.extend({ version: z.number().int().min(1).max(2147483646) })
export const draftColumns = 'id,kind,name,category,ingredient_ids,allergen_warnings,dietary_tags,site_id,supplier_id,supplier_name,notes,status,version,created_by,created_at,updated_at,review,submitted_at,submitted_by,approved_at,approved_by,return_note,ingredient_id,menu_item_id'

export function requireDraftId(id: string) {
  if (!z.string().uuid().safeParse(id).success) throw new QuickAddError('invalid', 400)
}

export async function quickAddContext() {
  const token = (await cookies()).get('auth-token')?.value
  if (!token) throw new QuickAddError('unauthorized', 401)
  const actor = await verifySessionToken(token).catch(() => null)
  if (!actor?.userId) throw new QuickAddError('unauthorized', 401)
  const supabase = createServiceClient()
  const { data: membership, error } = await supabase.from('user_businesses')
    .select('business_id,role').eq('user_id', actor.userId).maybeSingle()
  if (error) throw error
  if (!membership || !['owner', 'manager', 'staff'].includes(membership.role)) {
    throw new QuickAddError('forbidden', 403)
  }
  return { supabase, userId: actor.userId, businessId: membership.business_id as string, role: membership.role as 'owner' | 'manager' | 'staff' }
}

export type QuickAddContext = Awaited<ReturnType<typeof quickAddContext>>

export function visibleDrafts(context: QuickAddContext, countOnly = false) {
  let query = context.supabase.from('quick_add_drafts').select(draftColumns, countOnly ? { count: 'exact', head: true } : {}).eq('business_id', context.businessId)
  if (context.role === 'staff') query = query.eq('created_by', context.userId)
  return query
}

export async function getDraft(context: QuickAddContext, id: string) {
  const { data, error } = await visibleDrafts(context).eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) throw new QuickAddError('notFound', 404)
  return data
}

export async function validateDraftReferences(context: QuickAddContext, input: z.infer<typeof draftFields>) {
  const fields = { ...input }
  fields.ingredient_ids ||= []
  if (fields.kind !== 'prepared_item') fields.ingredient_ids = []
  if (fields.ingredient_ids.length) {
    const { data, error } = await context.supabase.from('ingredients').select('id')
      .eq('business_id', context.businessId).in('id', fields.ingredient_ids)
    if (error) throw error
    if ((data || []).length !== fields.ingredient_ids.length) throw new QuickAddError('ingredientUnavailable', 400)
  }
  if (fields.site_id) {
    const { data, error } = await context.supabase.from('sites').select('id')
      .eq('business_id', context.businessId).eq('id', fields.site_id).maybeSingle()
    if (error) throw error
    if (!data) throw new QuickAddError('locationUnavailable', 400)
  }
  if (fields.supplier_id) {
    const { data, error } = await context.supabase.from('suppliers').select('id,name')
      .eq('business_id', context.businessId).eq('id', fields.supplier_id).maybeSingle()
    if (error) throw error
    if (!data) throw new QuickAddError('supplierUnavailable', 400)
    fields.supplier_name = data.name
  }
  return fields
}

export function quickAddFailure(error: unknown) {
  if (error instanceof QuickAddError) return NextResponse.json({ error: error.code }, { status: error.status })
  console.error('Quick Add request failed:', error)
  return NextResponse.json({ error: 'unavailable' }, { status: 503 })
}
