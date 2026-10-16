import { NextRequest, NextResponse } from 'next/server'
import { ingredientDraftAccess, ingredientDraftError, validDraftId } from '@/lib/server/ingredient-drafts'
import { ingredientDraftDocumentMetadata } from '@/lib/ingredient-draft-schema'
import { createHash } from 'node:crypto'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await ingredientDraftAccess()
  if (access.error) return access.error
  const { id } = await params
  if (!validDraftId(id)) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  const { data: draft } = await access.db.from('ingredient_drafts').select('id, ingredient_id').eq('id', id).eq('business_id', access.businessId).maybeSingle()
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  if (draft.ingredient_id) return ingredientDraftError({ message: 'draftConflict' })
  const form = await request.formData()
  const file = form.get('file')
  const uploadId = form.get('upload_id')
  const metadata = ingredientDraftDocumentMetadata.safeParse(Object.fromEntries(['supplier_name', 'version', 'next_review_date', 'notes'].map(key => [key, form.get(key) || null])))
  if (!(file instanceof File) || !file.size || file.size > 3145728 || file.name.length > 200 || !/\.(pdf|docx?|xlsx?|jpe?g|png)$/i.test(file.name) || typeof uploadId !== 'string' || !validDraftId(uploadId) || !metadata.success) return NextResponse.json({ error: 'Invalid document (maximum 3 MB)' }, { status: 400 })
  const bytes = Buffer.from(await file.arrayBuffer())
  const hash = createHash('sha256').update(bytes).digest('hex')
  const path = `${access.businessId}/${id}/${uploadId}/${hash}`
  // Stable upload IDs and content hashes recover an upload whose response was
  // lost without storing a second file or creating a second evidence record.
  const { data: previous } = await access.db.from('ingredient_draft_documents').select('*').eq('id', uploadId).eq('business_id', access.businessId).eq('draft_id', id).maybeSingle()
  const values = { ...metadata.data, next_review_date: metadata.data.next_review_date || null }
  if (previous) {
    if (previous.storage_path !== path) return ingredientDraftError({ message: 'draftConflict' })
    const { data, error } = await access.db.from('ingredient_draft_documents').update(values).eq('id', uploadId).eq('business_id', access.businessId).select().single()
    if (error) return ingredientDraftError(error)
    return NextResponse.json({ datasheet: data })
  }
  const bucket = access.db.storage.from('ingredient-draft-documents')
  const upload = await bucket.upload(path, bytes, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (upload.error && !['409', 'Duplicate'].includes(String(upload.error.statusCode)) && !upload.error.message.toLowerCase().includes('already exists')) return NextResponse.json({ error: 'Could not upload draft document' }, { status: 500 })
  const { data, error } = await access.db.from('ingredient_draft_documents').insert({
    id: uploadId, draft_id: id, business_id: access.businessId, storage_path: path,
    file_name: file.name, file_size: file.size, file_type: file.type || 'application/octet-stream', created_by: access.userId, ...values,
  }).select().single()
  if (error) {
    // A concurrent duplicate insert may have succeeded. Never remove storage
    // here: another acknowledged request may already reference the same object.
    const { data: recovered } = await access.db.from('ingredient_draft_documents').select('*').eq('id', uploadId).eq('draft_id', id).eq('business_id', access.businessId).maybeSingle()
    if (recovered?.storage_path === path) return NextResponse.json({ datasheet: recovered })
    return ingredientDraftError(error)
  }
  return NextResponse.json({ datasheet: data })
}
