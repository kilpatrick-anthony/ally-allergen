import { NextRequest, NextResponse } from 'next/server'
import { getDraft, quickAddContext, quickAddFailure, QuickAddError, requireDraftId } from '@/lib/server/quick-add'
import { datasheetColumns, datasheetDbError, datasheetPath, datasheetQuery, editableDatasheetDraft, publicDatasheet, QUICK_ADD_DATASHEET_BUCKET, readDatasheet, type DraftDatasheet } from '@/lib/server/quick-add-datasheets'

export const runtime = 'nodejs'
type Route = { params: Promise<{ id: string; datasheetId: string }> }

async function access(route: Route, editable = false) {
  const context = await quickAddContext()
  const { id, datasheetId } = await route.params
  requireDraftId(id); requireDraftId(datasheetId)
  if (editable) await editableDatasheetDraft(context, id); else await getDraft(context, id)
  return { context, id, datasheetId }
}

export async function GET(_request: NextRequest, route: Route) {
  try {
    const { context, id, datasheetId } = await access(route)
    const { data, error } = await datasheetQuery(context, id).eq('id', datasheetId).eq('state', 'ready').maybeSingle()
    if (error) throw error
    if (!data) throw new QuickAddError('notFound', 404)
    const item = data as DraftDatasheet
    const download = await context.supabase.storage.from(QUICK_ADD_DATASHEET_BUCKET).download(datasheetPath(item))
    if (download.error) throw download.error
    const safeName = item.file_name.replace(/["\\\r\n]/g, '_')
    return new NextResponse(download.data, { headers: { 'Content-Type': item.content_type, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': `attachment; filename="${safeName}"` } })
  } catch (error) { return quickAddFailure(error) }
}

export async function PUT(request: NextRequest, route: Route) {
  try {
    const { context, id, datasheetId } = await access(route, true)
    const { bytes, fileName, contentType, hash } = await readDatasheet(request)
    let { data: item, error } = await datasheetQuery(context, id).eq('id', datasheetId).maybeSingle()
    if (error) throw error
    if (!item) {
      const inserted = await context.supabase.from('quick_add_datasheets').insert({ id: datasheetId, draft_id: id, business_id: context.businessId, file_name: fileName, content_type: contentType, content_hash: hash, byte_size: bytes.length, created_by: context.userId }).select(datasheetColumns).single()
      if (inserted.error?.code === '23505') {
        const retry = await datasheetQuery(context, id).eq('id', datasheetId).maybeSingle(); if (retry.error) throw retry.error; item = retry.data
      } else { datasheetDbError(inserted.error); item = inserted.data }
    }
    if (!item || item.content_hash !== hash || item.file_name !== fileName || item.state === 'removed') throw new QuickAddError('datasheetConflict', 409)
    if (item.state === 'ready') return NextResponse.json({ datasheet: publicDatasheet(item as DraftDatasheet) })
    const bucket = context.supabase.storage.from(QUICK_ADD_DATASHEET_BUCKET)
    const uploaded = await bucket.upload(datasheetPath(item as DraftDatasheet), bytes, { contentType, upsert: false })
    if (uploaded.error && !['409','Duplicate'].includes(String(uploaded.error.statusCode))) throw uploaded.error
    const updated = await context.supabase.from('quick_add_datasheets').update({ state: 'ready' }).eq('id', datasheetId).eq('draft_id', id).eq('business_id', context.businessId).eq('state', 'pending').select(datasheetColumns).maybeSingle()
    datasheetDbError(updated.error)
    if (updated.data) return NextResponse.json({ datasheet: publicDatasheet(updated.data as DraftDatasheet) })
    throw new QuickAddError('datasheetConflict', 409)
  } catch (error) { return quickAddFailure(error) }
}

export async function DELETE(_request: NextRequest, route: Route) {
  try {
    const { context, id, datasheetId } = await access(route, true)
    const { data, error } = await datasheetQuery(context, id).eq('id', datasheetId).maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ removed: true })
    const removed = await context.supabase.from('quick_add_datasheets').update({ state: 'removed' }).eq('id', datasheetId).eq('draft_id', id).eq('business_id', context.businessId)
    datasheetDbError(removed.error)
    const cleanup = await context.supabase.storage.from(QUICK_ADD_DATASHEET_BUCKET).remove([datasheetPath(data as DraftDatasheet)])
    if (cleanup.error) throw cleanup.error
    return NextResponse.json({ removed: true })
  } catch (error) { return quickAddFailure(error) }
}
