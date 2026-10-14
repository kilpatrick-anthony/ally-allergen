import { NextRequest, NextResponse } from 'next/server'
import { extractPhotoSuggestions } from '@/lib/server/quick-add-photo-extraction'
import { hasAiGatewayCredentials } from '@/lib/server/ai-gateway'
import { getDraft, quickAddContext, quickAddFailure, QuickAddError, requireDraftId } from '@/lib/server/quick-add'
import { PHOTO_BUCKET, photoPath, photoQuery, type DraftPhoto } from '@/lib/server/quick-add-photos'

export const runtime = 'nodejs'
export const maxDuration = 60
type Route = { params: Promise<{ id: string; photoId: string }> }

export async function POST(request: NextRequest, route: Route) {
  try {
    const context = await quickAddContext()
    const { id, photoId } = await route.params
    requireDraftId(id); requireDraftId(photoId)
    const draft = await getDraft(context, id)
    if (draft.status !== 'draft') throw new QuickAddError('editConflict', 409)
    if (draft.kind === 'prepared_item') throw new QuickAddError('invalid', 400)
    const { data: photo, error } = await photoQuery(context, id).eq('id', photoId).eq('state', 'ready').maybeSingle()
    if (error) throw error
    if (!photo) throw new QuickAddError('notFound', 404)

    if (!hasAiGatewayCredentials(request)) throw new QuickAddError('extractionUnavailable', 503)
    const downloaded = await context.supabase.storage.from(PHOTO_BUCKET).download(photoPath(photo as DraftPhoto))
    if (downloaded.error) throw downloaded.error
    const bytes = Buffer.from(await downloaded.data.arrayBuffer())
    const suggestions = await extractPhotoSuggestions(bytes, request)
    return NextResponse.json({ suggestions }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return quickAddFailure(error) }
}
