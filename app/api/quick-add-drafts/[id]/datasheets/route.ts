import { NextRequest, NextResponse } from 'next/server'
import { getDraft, quickAddContext, quickAddFailure, requireDraftId } from '@/lib/server/quick-add'
import { datasheetQuery, publicDatasheet, type DraftDatasheet } from '@/lib/server/quick-add-datasheets'

export async function GET(_request: NextRequest, route: { params: Promise<{ id: string }> }) {
  try {
    const context = await quickAddContext()
    const { id } = await route.params
    requireDraftId(id); await getDraft(context, id)
    const { data, error } = await datasheetQuery(context, id).neq('state', 'removed').order('created_at').order('id')
    if (error) throw error
    return NextResponse.json({ datasheets: (data || []).map((item: DraftDatasheet) => publicDatasheet(item)) }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return quickAddFailure(error) }
}
