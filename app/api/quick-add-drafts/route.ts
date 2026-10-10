import { isDeepStrictEqual } from 'node:util'
import { NextRequest, NextResponse } from 'next/server'
import { createDraftInput, draftColumns, quickAddContext, quickAddFailure, QuickAddError, validateDraftReferences, visibleDrafts } from '@/lib/server/quick-add'

export async function GET(request: NextRequest) {
  try {
    const context = await quickAddContext()
    const offset = Number(request.nextUrl.searchParams.get('offset') || 0)
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000) throw new QuickAddError('invalid', 400)
    const status = request.nextUrl.searchParams.get('status') || ''
    if (status && !['draft', 'ready_for_review', 'approved'].includes(status)) throw new QuickAddError('invalid', 400)
    let query = visibleDrafts(context)
    if (status) query = query.eq('status', status)
    const { data, error } = await query.order('created_at', { ascending: false })
      .order('id', { ascending: false }).range(offset, offset + 50)
    if (error) throw error
    const [authors, sites] = await Promise.all([
      context.supabase.from('user_businesses').select('user_id,display_name').eq('business_id', context.businessId),
      context.supabase.from('sites').select('id,name').eq('business_id', context.businessId),
    ])
    if (authors.error) throw authors.error
    if (sites.error) throw sites.error
    const names = new Map((authors.data || []).map(row => [row.user_id, row.display_name]))
    const locations = new Map((sites.data || []).map(row => [row.id, row.name]))
    return NextResponse.json({ drafts: (data || []).slice(0, 50).map(draft => ({ ...draft, author_name: names.get(draft.created_by) || '', site_name: locations.get(draft.site_id) || '' })), nextOffset: (data || []).length > 50 ? offset + 50 : null })
  } catch (error) { return quickAddFailure(error) }
}

export async function POST(request: NextRequest) {
  try {
    const context = await quickAddContext()
    const parsed = createDraftInput.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw new QuickAddError('invalid', 400)
    const { id, ...input } = parsed.data
    const fields = { allergen_warnings: {}, dietary_tags: [], ...await validateDraftReferences(context, input) }
    const findReplay = async () => {
      const { data, error } = await visibleDrafts(context).eq('id', id).eq('created_by', context.userId).maybeSingle()
      if (error) throw error
      if (!data) return null
      // A request ID belongs to one captured product. Never overwrite it on retry.
      if ((Object.keys(fields) as Array<keyof typeof fields>).some(key => !isDeepStrictEqual(data[key], fields[key]))) throw new QuickAddError('saveConflict', 409)
      return data
    }
    const existing = await findReplay()
    if (existing) return NextResponse.json({ draft: existing })
    const { data, error } = await context.supabase.from('quick_add_drafts').insert({
      ...fields, id, business_id: context.businessId, created_by: context.userId, updated_by: context.userId,
    }).select(draftColumns).single()
    if (error?.code === '23505') {
      const replay = await findReplay()
      if (replay) return NextResponse.json({ draft: replay })
      throw new QuickAddError('saveConflict', 409)
    }
    if (error) throw error
    return NextResponse.json({ draft: data }, { status: 201 })
  } catch (error) { return quickAddFailure(error) }
}
