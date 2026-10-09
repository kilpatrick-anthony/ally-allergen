import { NextRequest, NextResponse } from 'next/server'
import { draftColumns, getDraft, quickAddContext, quickAddFailure, QuickAddError, requireDraftId, updateDraftInput, validateDraftReferences } from '@/lib/server/quick-add'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, route: RouteContext) {
  try {
    const context = await quickAddContext()
    const { id } = await route.params
    requireDraftId(id)
    return NextResponse.json({ draft: await getDraft(context, id) })
  } catch (error) { return quickAddFailure(error) }
}

export async function PATCH(request: NextRequest, route: RouteContext) {
  try {
    const context = await quickAddContext()
    const { id } = await route.params
    requireDraftId(id)
    const parsed = updateDraftInput.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw new QuickAddError('invalid', 400)
    const existing = await getDraft(context, id)
    const { version, ...input } = parsed.data
    if (existing.status !== 'draft' || existing.version !== version) throw new QuickAddError('editConflict', 409)
    const fields = await validateDraftReferences(context, input)
    let query = context.supabase.from('quick_add_drafts').update({
      ...fields, version: version + 1, updated_by: context.userId, updated_at: new Date().toISOString(),
    }).eq('id', id).eq('business_id', context.businessId).eq('status', 'draft').eq('version', version)
    if (context.role === 'staff') query = query.eq('created_by', context.userId)
    const { data, error } = await query.select(draftColumns).maybeSingle()
    if (error) throw error
    if (!data) throw new QuickAddError('editConflict', 409)
    return NextResponse.json({ draft: data })
  } catch (error) { return quickAddFailure(error) }
}
