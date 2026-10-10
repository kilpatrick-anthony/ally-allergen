import { NextRequest, NextResponse } from 'next/server'
import { getDraft, quickAddContext, quickAddFailure, QuickAddError, requireDraftId } from '@/lib/server/quick-add'
import { editablePhotoDraft, PHOTO_BUCKET, photoColumns, photoDbError, photoPath, photoQuery, publicPhoto, readPhoto, type DraftPhoto } from '@/lib/server/quick-add-photos'

export const runtime = 'nodejs'
type Route = { params: Promise<{ id: string; photoId: string }> }
async function access(route: Route, editable = false) {
  const context = await quickAddContext()
  const { id, photoId } = await route.params
  requireDraftId(id); requireDraftId(photoId)
  if (editable) await editablePhotoDraft(context, id)
  else await getDraft(context, id)
  return { context, id, photoId }
}

export async function GET(_request: NextRequest, route: Route) {
  try {
    const { context, id, photoId } = await access(route)
    const { data: photo, error } = await photoQuery(context, id).eq('id', photoId).eq('state', 'ready').maybeSingle()
    if (error) throw error
    if (!photo) throw new QuickAddError('notFound', 404)
    const download = await context.supabase.storage.from(PHOTO_BUCKET).download(photoPath(photo))
    if (download.error) throw download.error
    return new NextResponse(download.data, { headers: {
      'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline; filename="label.jpg"',
    } })
  } catch (error) { return quickAddFailure(error) }
}

export async function PUT(request: NextRequest, route: Route) {
  try {
    const { context, id, photoId } = await access(route, true)
    const { bytes, hash } = await readPhoto(request)
    let { data: photo, error } = await photoQuery(context, id).eq('id', photoId).maybeSingle()
    if (error) throw error
    if (!photo) {
      const inserted = await context.supabase.from('quick_add_photos').insert({
        id: photoId, draft_id: id, business_id: context.businessId, content_hash: hash,
        byte_size: bytes.length, created_by: context.userId,
      }).select(photoColumns).single()
      if (inserted.error?.code === '23505') {
        const retry = await photoQuery(context, id).eq('id', photoId).maybeSingle()
        if (retry.error) throw retry.error
        photo = retry.data
      } else { photoDbError(inserted.error); photo = inserted.data }
    }
    if (!photo || photo.content_hash !== hash || photo.state === 'removed') throw new QuickAddError('photoConflict', 409)
    if (photo.state === 'ready') return NextResponse.json({ photo: publicPhoto(photo) })
    const bucket = context.supabase.storage.from(PHOTO_BUCKET)
    const uploaded = await bucket.upload(photoPath(photo), bytes, { contentType: 'image/jpeg', upsert: false })
    // A retry can find an object from a successful upload whose final DB write failed.
    if (uploaded.error && !['409', 'Duplicate'].includes(String(uploaded.error.statusCode))) throw uploaded.error
    const updated = await context.supabase.from('quick_add_photos').update({ state: 'ready' })
      .eq('id', photoId).eq('draft_id', id).eq('business_id', context.businessId).eq('state', 'pending')
      .select(photoColumns).maybeSingle()
    photoDbError(updated.error)
    if (updated.data) return NextResponse.json({ photo: publicPhoto(updated.data) })
    const current = await photoQuery(context, id).eq('id', photoId).maybeSingle()
    if (current.error) throw current.error
    if (current.data?.state === 'ready') return NextResponse.json({ photo: publicPhoto(current.data) })
    await bucket.remove([photoPath(photo)])
    throw new QuickAddError('photoConflict', 409)
  } catch (error) { return quickAddFailure(error) }
}

export async function DELETE(_request: NextRequest, route: Route) {
  try {
    const { context, id, photoId } = await access(route, true)
    const { data: photo, error } = await photoQuery(context, id).eq('id', photoId).maybeSingle()
    if (error) throw error
    if (!photo) return NextResponse.json({ removed: true })
    // Tombstone before removing bytes: a lost response or in-flight upload cannot revive the photo.
    const removed = await context.supabase.from('quick_add_photos').update({ state: 'removed' })
      .eq('id', photoId).eq('draft_id', id).eq('business_id', context.businessId)
    photoDbError(removed.error)
    const cleanup = await context.supabase.storage.from(PHOTO_BUCKET).remove([photoPath(photo as DraftPhoto)])
    if (cleanup.error) throw cleanup.error
    return NextResponse.json({ removed: true })
  } catch (error) { return quickAddFailure(error) }
}
