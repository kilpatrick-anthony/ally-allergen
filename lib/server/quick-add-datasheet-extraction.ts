import { AI_GATEWAY_MODEL, AiGatewayError, analyseWithAiGateway, hasAiGatewayCredentials } from '@/lib/server/ai-gateway'
import { QuickAddError } from '@/lib/server/quick-add'
import { cleanQuickAddSuggestions, QUICK_ADD_SUGGESTION_PROMPT } from '@/lib/server/quick-add-suggestions'

// Both staged and saved evidence use the same document reader and review rules.
export async function extractDatasheetSuggestions(bytes: Buffer, item: { content_type: string; file_name: string }, request: Request) {
  if (item.content_type === 'application/msword') throw new QuickAddError('datasheetLegacyWord', 422)
  if (!hasAiGatewayCredentials(request)) throw new QuickAddError('datasheetExtractionUnavailable', 503)
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
  try {
    // The total limit includes reasoning tokens. Reserve room for the complete JSON.
    const content = await analyseWithAiGateway({ prompt, file, maxOutputTokens: 4096, reasoningEffort: 'low', request })
    return cleanQuickAddSuggestions(content)
  } catch (error) {
    const status = error instanceof AiGatewayError ? error.status : undefined
    const timeout = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)
    // Keep document contents, filenames, credentials and provider response bodies out of logs.
    console.error('Quick Add datasheet analysis failed', {
      model: AI_GATEWAY_MODEL, status, timeout, contentType: item.content_type, byteSize: bytes.length,
      truncated: error instanceof AiGatewayError && error.message === 'AI Gateway response was truncated',
      invalidSuggestions: error instanceof QuickAddError && error.code === 'extractionFailed',
    })
    if (status === 429) throw new QuickAddError('datasheetExtractionBusy', 429)
    if (timeout) throw new QuickAddError('datasheetExtractionTimeout', 504)
    if (status && [401, 402, 403, 503].includes(status)) throw new QuickAddError('datasheetExtractionUnavailable', 503)
    throw new QuickAddError('datasheetExtractionFailed', 502)
  }
}
