import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { getDraft, QuickAddError, type QuickAddContext } from '@/lib/server/quick-add'

export const PHOTO_BUCKET = 'quick-add-photos'
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024
export const photoColumns = 'id,draft_id,business_id,content_hash,byte_size,state,created_at'
export type DraftPhoto = {
  id: string; draft_id: string; business_id: string; content_hash: string
  byte_size: number; state: 'pending' | 'ready' | 'removed'; created_at: string
}
export const photoPath = (photo: DraftPhoto) => `${photo.business_id}/${photo.draft_id}/${photo.id}.jpg`
export const publicPhoto = (photo: DraftPhoto) => ({ id: photo.id, state: photo.state, created_at: photo.created_at })

export async function editablePhotoDraft(context: QuickAddContext, id: string) {
  const draft = await getDraft(context, id)
  if (draft.status !== 'draft') throw new QuickAddError('editConflict', 409)
}

export function photoQuery(context: QuickAddContext, draftId: string) {
  return context.supabase.from('quick_add_photos').select(photoColumns)
    .eq('business_id', context.businessId).eq('draft_id', draftId)
}

export function photoDbError(error: { message?: string } | null) {
  if (!error) return
  if (error.message?.includes('photoLimit')) throw new QuickAddError('photoLimit', 409)
  if (error.message?.includes('photoDraftConflict')) throw new QuickAddError('editConflict', 409)
  throw error
}

// Stream with a hard limit, including requests without a trustworthy Content-Length.
export async function readPhoto(request: Request) {
  if (Number(request.headers.get('content-length')) > MAX_PHOTO_BYTES) throw new QuickAddError('photoTooLarge', 413)
  const reader = request.body?.getReader()
  if (!reader) throw new QuickAddError('photoInvalid', 400)
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_PHOTO_BYTES) { await reader.cancel(); throw new QuickAddError('photoTooLarge', 413) }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  return normalizePhoto(Buffer.concat(chunks))
}

export async function normalizePhoto(input: Buffer) {
  if (!input.length) throw new QuickAddError('photoInvalid', 400)
  if (input.length > MAX_PHOTO_BYTES) throw new QuickAddError('photoTooLarge', 413)
  try {
    const image = sharp(input, { limitInputPixels: 50_000_000, failOn: 'warning' })
    const metadata = await image.metadata()
    if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages || 1) > 1) {
      throw new QuickAddError('photoFormat', 415)
    }
    // Decode fully, honour camera orientation, strip EXIF/GPS and encode a safe still image.
    const bytes = await image.rotate().resize({ width: 3200, height: 3200, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#fff' }).jpeg({ quality: 90 }).toBuffer()
    if (bytes.length > MAX_PHOTO_BYTES) throw new QuickAddError('photoTooLarge', 413)
    return { bytes, hash: createHash('sha256').update(input).digest('hex') }
  } catch (error) {
    if (error instanceof QuickAddError) throw error
    throw new QuickAddError('photoInvalid', 400)
  }
}
