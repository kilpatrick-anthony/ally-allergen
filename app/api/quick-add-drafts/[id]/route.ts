import { NextRequest, NextResponse } from 'next/server'
import { draftColumns, getDraft, quickAddContext, quickAddFailure, QuickAddError, requireDraftId, updateDraftInput, validateDraftReferences } from '@/lib/server/quick-add'
import { PHOTO_BUCKET, photoPath, photoQuery, type DraftPhoto } from '@/lib/server/quick-add-photos'
import { datasheetPath, datasheetQuery, QUICK_ADD_DATASHEET_BUCKET, type DraftDatasheet } from '@/lib/server/quick-add-datasheets'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, route: RouteContext) {
  try {
    const context = await quickAddContext()
    const { id } = await route.params
    requireDraftId(id)
    const draft = await getDraft(context, id)
    const { data: history, error } = await context.supabase.from('quick_add_history')
      .select('id,action,actor_name,note,created_at').eq('business_id', context.businessId).eq('draft_id', id).order('created_at')
    if (error) throw error
    return NextResponse.json({ draft, history: history || [], permissions: { canReview: context.role !== 'staff', isCreator: draft.created_by === context.userId } })
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
    const fields = await validateDraftReferences(context, {
      ...input,
      category: input.category ?? existing.category ?? '',
      ingredient_ids: input.ingredient_ids ?? existing.ingredient_ids ?? [],
    })
    let query = context.supabase.from('quick_add_drafts').update({
      ...fields, review: {}, version: version + 1, updated_by: context.userId, updated_at: new Date().toISOString(),
    }).eq('id', id).eq('business_id', context.businessId).eq('status', 'draft').eq('version', version)
    if (context.role === 'staff') query = query.eq('created_by', context.userId)
    const { data, error } = await query.select(draftColumns).maybeSingle()
    if (error) throw error
    if (!data) throw new QuickAddError('editConflict', 409)
    return NextResponse.json({ draft: data })
  } catch (error) { return quickAddFailure(error) }
}

export async function DELETE(_request: NextRequest, route: RouteContext) {
  try {
    const context = await quickAddContext()
    const { id } = await route.params
    requireDraftId(id)
    const draft = await getDraft(context, id)
    const { data: photos, error: photoError } = await photoQuery(context, id)
    if (photoError) throw photoError
    const { data: datasheets, error: datasheetError } = await datasheetQuery(context, id)
    if (datasheetError) throw datasheetError
    let query = context.supabase.from('quick_add_drafts').delete().eq('id', id)
      .eq('business_id', context.businessId).eq('version', draft.version)
    if (context.role === 'staff') query = query.eq('created_by', context.userId)
    const { data: deleted, error } = await query.select('id').maybeSingle()
    if (error) throw error
    if (!deleted) throw new QuickAddError('editConflict', 409)
    const paths = (photos || []).map((photo: DraftPhoto) => photoPath(photo))
    if (paths.length) {
      const cleanup = await context.supabase.storage.from(PHOTO_BUCKET).remove(paths)
      if (cleanup.error) console.error('Quick Add photo cleanup failed:', cleanup.error)
    }
    const datasheetPaths = (datasheets || []).map((item: DraftDatasheet) => datasheetPath(item))
    if (datasheetPaths.length) {
      const cleanup = await context.supabase.storage.from(QUICK_ADD_DATASHEET_BUCKET).remove(datasheetPaths)
      if (cleanup.error) console.error('Quick Add datasheet cleanup failed:', cleanup.error)
    }
    return NextResponse.json({ deleted: true })
  } catch (error) { return quickAddFailure(error) }
}
