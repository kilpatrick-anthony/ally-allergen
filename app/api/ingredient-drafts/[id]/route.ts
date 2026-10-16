import { NextRequest, NextResponse } from 'next/server'
import { ingredientDraftAccess, ingredientDraftError, validDraftId } from '@/lib/server/ingredient-drafts'
import { ingredientDraftSave } from '@/lib/ingredient-draft-schema'

type Context = { params: Promise<{ id: string }> }
export async function GET(_request: NextRequest, { params }: Context) {
  const access = await ingredientDraftAccess()
  if (access.error) return access.error
  const { id } = await params
  if (!validDraftId(id)) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  const { data: draft, error } = await access.db.from('ingredient_drafts').select('*').eq('id', id).eq('business_id', access.businessId).maybeSingle()
  if (error) return NextResponse.json({ error: 'Could not load ingredient draft' }, { status: 500 })
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  const { data: datasheets, error: documentsError } = await access.db.from('ingredient_draft_documents').select('*').eq('draft_id', id).eq('business_id', access.businessId).order('created_at')
  if (documentsError) return NextResponse.json({ error: 'Could not load draft documents' }, { status: 500 })
  return NextResponse.json({ draft, datasheets })
}
export async function PUT(request: NextRequest, { params }: Context) {
  const access = await ingredientDraftAccess()
  if (access.error) return access.error
  const { id } = await params
  const result = ingredientDraftSave.safeParse(await request.json().catch(() => null))
  if (!validDraftId(id) || !result.success) return NextResponse.json({ error: 'Invalid ingredient draft' }, { status: 400 })
  const { data, error } = await access.db.rpc('save_regular_ingredient_draft', {
    p_id: id, p_business: access.businessId, p_actor: access.userId,
    p_version: result.data.version, p_payload: result.data.payload,
  })
  if (error) return ingredientDraftError(error)
  return NextResponse.json({ draft: data })
}
