import { NextRequest, NextResponse } from 'next/server'
import { ingredientDraftAccess, ingredientDraftError, validDraftId } from '@/lib/server/ingredient-drafts'
import { ingredientDraftDocumentMetadata } from '@/lib/ingredient-draft-schema'

type Context = { params: Promise<{ id: string }> }
export async function GET(_request: NextRequest, { params }: Context) {
  const access = await ingredientDraftAccess()
  if (access.error) return access.error
  const { id } = await params
  if (!validDraftId(id)) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  const { data: doc } = await access.db.from('ingredient_draft_documents').select('*').eq('id', id).eq('business_id', access.businessId).maybeSingle()
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  const result = await access.db.storage.from('ingredient-draft-documents').download(doc.storage_path)
  if (result.error) return NextResponse.json({ error: 'Could not download document' }, { status: 500 })
  return new NextResponse(result.data, { headers: {
    'Content-Type': doc.file_type, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': `attachment; filename="${doc.file_name.replace(/["\\\r\n]/g, '_')}"`,
  } })
}
export async function PATCH(request: NextRequest, { params }: Context) {
  const access = await ingredientDraftAccess()
  if (access.error) return access.error
  const { id } = await params
  const result = ingredientDraftDocumentMetadata.safeParse(await request.json().catch(() => null))
  if (!validDraftId(id) || !result.success) return NextResponse.json({ error: 'Invalid document metadata' }, { status: 400 })
  const values = { ...result.data, ...(Object.hasOwn(result.data, 'next_review_date') ? { next_review_date: result.data.next_review_date || null } : {}) }
  const { data, error } = await access.db.from('ingredient_draft_documents').update(values).eq('id', id).eq('business_id', access.businessId).select().maybeSingle()
  if (error) return ingredientDraftError(error)
  if (!data) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  return NextResponse.json({ datasheet: data })
}
export async function DELETE(_request: NextRequest, { params }: Context) {
  const access = await ingredientDraftAccess()
  if (access.error) return access.error
  const { id } = await params
  if (!validDraftId(id)) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  // Evidence is hidden immediately. Storage is retained for safe recovery of
  // ambiguous uploads; deleting a draft attachment cannot remove active evidence.
  const { error } = await access.db.from('ingredient_draft_documents').delete().eq('id', id).eq('business_id', access.businessId)
  if (error) return ingredientDraftError(error)
  return NextResponse.json({ success: true })
}
