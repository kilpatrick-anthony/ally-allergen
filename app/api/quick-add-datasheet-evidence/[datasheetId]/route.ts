import { NextRequest, NextResponse } from 'next/server'
import { quickAddContext, quickAddFailure, QuickAddError, requireDraftId } from '@/lib/server/quick-add'
import { datasheetPath, QUICK_ADD_DATASHEET_BUCKET, type DraftDatasheet } from '@/lib/server/quick-add-datasheets'

export async function GET(_request: NextRequest, route: { params: Promise<{ datasheetId: string }> }) {
  try {
    const context = await quickAddContext()
    const { datasheetId } = await route.params
    requireDraftId(datasheetId)
    const { data, error } = await context.supabase.from('quick_add_datasheets').select('*').eq('id', datasheetId).eq('business_id', context.businessId).eq('state', 'ready').maybeSingle()
    if (error) throw error
    if (!data) throw new QuickAddError('notFound', 404)
    const item = data as DraftDatasheet
    const { data: draft, error: draftError } = await context.supabase.from('quick_add_drafts').select('id,ingredient_id,menu_item_id').eq('id', item.draft_id).eq('business_id', context.businessId).eq('status', 'approved').maybeSingle()
    if (draftError) throw draftError
    if (!draft || (!draft.ingredient_id && !draft.menu_item_id)) throw new QuickAddError('notFound', 404)
    const download = await context.supabase.storage.from(QUICK_ADD_DATASHEET_BUCKET).download(datasheetPath(item))
    if (download.error) throw download.error
    const safeName = item.file_name.replace(/["\\\r\n]/g, '_')
    return new NextResponse(download.data, { headers: { 'Content-Type': item.content_type, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': `attachment; filename="${safeName}"` } })
  } catch (error) { return quickAddFailure(error) }
}
