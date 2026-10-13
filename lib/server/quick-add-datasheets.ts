import { createHash } from 'node:crypto'
import { getDraft, QuickAddError, type QuickAddContext } from '@/lib/server/quick-add'

export const QUICK_ADD_DATASHEET_BUCKET = 'quick-add-datasheets'
export const MAX_DATASHEET_BYTES = 6 * 1024 * 1024
export const datasheetColumns = 'id,draft_id,business_id,file_name,content_type,content_hash,byte_size,state,created_at'
export type DraftDatasheet = {
  id: string; draft_id: string; business_id: string; file_name: string; content_type: string
  content_hash: string; byte_size: number; state: 'pending' | 'ready' | 'removed'; created_at: string
}

const types = {
  'application/pdf': { extension: 'pdf', valid: (bytes: Buffer) => bytes.subarray(0, 5).toString() === '%PDF-' },
  'application/msword': { extension: 'doc', valid: (bytes: Buffer) => bytes.subarray(0, 8).equals(Buffer.from([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1])) },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { extension: 'docx', valid: (bytes: Buffer) => bytes[0] === 0x50 && bytes[1] === 0x4b && bytes.includes(Buffer.from('[Content_Types].xml')) && bytes.includes(Buffer.from('word/')) },
} as const

export const datasheetPath = (item: DraftDatasheet) => `${item.business_id}/${item.draft_id}/${item.id}.${types[item.content_type as keyof typeof types]?.extension || 'bin'}`
export const publicDatasheet = (item: DraftDatasheet) => ({ id: item.id, file_name: item.file_name, content_type: item.content_type, byte_size: item.byte_size, state: item.state, created_at: item.created_at })
export const datasheetQuery = (context: QuickAddContext, draftId: string) => context.supabase.from('quick_add_datasheets').select(datasheetColumns).eq('business_id', context.businessId).eq('draft_id', draftId)

export async function editableDatasheetDraft(context: QuickAddContext, id: string) {
  const draft = await getDraft(context, id)
  if (draft.status !== 'draft') throw new QuickAddError('editConflict', 409)
}

export function datasheetDbError(error: { message?: string } | null) {
  if (!error) return
  if (error.message?.includes('datasheetLimit')) throw new QuickAddError('datasheetLimit', 409)
  if (error.message?.includes('datasheetDraftConflict')) throw new QuickAddError('editConflict', 409)
  throw error
}

export async function readDatasheet(request: Request) {
  if (Number(request.headers.get('content-length')) > MAX_DATASHEET_BYTES) throw new QuickAddError('datasheetTooLarge', 413)
  const contentType = (request.headers.get('content-type') || '').split(';')[0]
  const validator = types[contentType as keyof typeof types]
  if (!validator) throw new QuickAddError('datasheetFormat', 415)
  const encodedName = request.headers.get('x-file-name') || ''
  let fileName = ''
  try { fileName = decodeURIComponent(encodedName).replace(/[\u0000-\u001f\u007f]/g, '').split(/[\\/]/).pop()?.trim() || '' } catch {}
  if (!fileName || fileName.length > 200) throw new QuickAddError('datasheetInvalid', 400)
  const reader = request.body?.getReader()
  if (!reader) throw new QuickAddError('datasheetInvalid', 400)
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_DATASHEET_BYTES) { await reader.cancel(); throw new QuickAddError('datasheetTooLarge', 413) }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = Buffer.concat(chunks)
  if (!bytes.length || !validator.valid(bytes)) throw new QuickAddError('datasheetFormat', 415)
  if (bytes.length > MAX_DATASHEET_BYTES) throw new QuickAddError('datasheetTooLarge', 413)
  return { bytes, fileName, contentType, hash: createHash('sha256').update(bytes).digest('hex') }
}
