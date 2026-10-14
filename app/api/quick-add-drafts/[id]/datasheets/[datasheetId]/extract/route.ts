import { NextRequest, NextResponse } from 'next/server'
import { hasAiGatewayCredentials } from '@/lib/server/ai-gateway'
import { getDraft, quickAddContext, quickAddFailure, QuickAddError, requireDraftId } from '@/lib/server/quick-add'
import { datasheetPath, datasheetQuery, MAX_DATASHEET_BYTES, QUICK_ADD_DATASHEET_BUCKET, type DraftDatasheet } from '@/lib/server/quick-add-datasheets'
import { extractDatasheetSuggestions } from '@/lib/server/quick-add-datasheet-extraction'

export const runtime = 'nodejs'
export const maxDuration = 60
type Route = { params: Promise<{ id: string; datasheetId: string }> }

export async function POST(request: NextRequest, route: Route) {
  try {
    const context = await quickAddContext()
    const { id, datasheetId } = await route.params
    requireDraftId(id); requireDraftId(datasheetId)
    const draft = await getDraft(context, id)
    if (draft.status !== 'draft') throw new QuickAddError('editConflict', 409)
    if (draft.kind === 'prepared_item') throw new QuickAddError('invalid', 400)
    const { data, error } = await datasheetQuery(context, id).eq('id', datasheetId).eq('state', 'ready').maybeSingle()
    if (error) throw error
    if (!data) throw new QuickAddError('notFound', 404)
    const item = data as DraftDatasheet
    if (item.byte_size > MAX_DATASHEET_BYTES) throw new QuickAddError('datasheetTooLarge', 413)
    if (item.content_type === 'application/msword') throw new QuickAddError('datasheetLegacyWord', 422)
    if (!hasAiGatewayCredentials(request)) throw new QuickAddError('datasheetExtractionUnavailable', 503)
    const downloaded = await context.supabase.storage.from(QUICK_ADD_DATASHEET_BUCKET).download(datasheetPath(item))
    if (downloaded.error) throw downloaded.error
    const bytes = Buffer.from(await downloaded.data.arrayBuffer())
    if (bytes.length > MAX_DATASHEET_BYTES) throw new QuickAddError('datasheetTooLarge', 413)
    const suggestions = await extractDatasheetSuggestions(bytes, item, request)
    // Never write model output into the draft. The user must inspect and apply it.
    return NextResponse.json({ suggestions }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return quickAddFailure(error) }
}
