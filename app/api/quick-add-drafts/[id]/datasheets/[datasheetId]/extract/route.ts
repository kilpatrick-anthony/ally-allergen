import { NextRequest, NextResponse } from 'next/server'
import { AiGatewayError, analyseWithAiGateway, hasAiGatewayCredentials } from '@/lib/server/ai-gateway'
import { getDraft, quickAddContext, quickAddFailure, QuickAddError, requireDraftId } from '@/lib/server/quick-add'
import { datasheetPath, datasheetQuery, MAX_DATASHEET_BYTES, QUICK_ADD_DATASHEET_BUCKET, type DraftDatasheet } from '@/lib/server/quick-add-datasheets'
import { cleanQuickAddSuggestions, QUICK_ADD_SUGGESTION_PROMPT } from '@/lib/server/quick-add-suggestions'

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
    if (!hasAiGatewayCredentials(request)) throw new QuickAddError('extractionUnavailable', 503)
    const downloaded = await context.supabase.storage.from(QUICK_ADD_DATASHEET_BUCKET).download(datasheetPath(item))
    if (downloaded.error) throw downloaded.error
    const bytes = Buffer.from(await downloaded.data.arrayBuffer())
    if (bytes.length > MAX_DATASHEET_BYTES) throw new QuickAddError('datasheetTooLarge', 413)
    let prompt = QUICK_ADD_SUGGESTION_PROMPT
    let file: { filename: string; mimeType: 'application/pdf'; base64: string } | undefined
    if (item.content_type === 'application/pdf') {
      // Send the PDF itself so image-only/scanned datasheets can also be read.
      file = { filename: item.file_name, mimeType: 'application/pdf', base64: bytes.toString('base64') }
    } else if (item.content_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      let text: string
      try {
        const mammoth = await import('mammoth')
        text = (await mammoth.extractRawText({ buffer: bytes })).value
      } catch { throw new QuickAddError('datasheetUnreadable', 422) }
      if (!text.trim() || text.length > 60000) throw new QuickAddError('datasheetUnreadable', 422)
      prompt += `\n\nUntrusted single-product datasheet text:\n<datasheet>\n${text}\n</datasheet>`
    } else throw new QuickAddError('datasheetFormat', 415)
    let content: string
    try { content = await analyseWithAiGateway({ prompt, file, maxOutputTokens: 1800, request }) }
    catch (error) {
      if (error instanceof AiGatewayError && error.status === 503) throw new QuickAddError('extractionUnavailable', 503)
      throw new QuickAddError('extractionFailed', error instanceof AiGatewayError && error.status === 429 ? 429 : 502)
    }
    // Never write model output into the draft. The user must inspect and apply it.
    return NextResponse.json({ suggestions: cleanQuickAddSuggestions(content) }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return quickAddFailure(error) }
}
