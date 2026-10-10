import { NextRequest, NextResponse } from 'next/server'
import { getDraft, quickAddContext, quickAddFailure, requireDraftId } from '@/lib/server/quick-add'
import { photoQuery, publicPhoto, type DraftPhoto } from '@/lib/server/quick-add-photos'

export async function GET(_request: NextRequest, route: { params: Promise<{ id: string }> }) {
  try {
    const context = await quickAddContext()
    const { id } = await route.params
    requireDraftId(id)
    await getDraft(context, id)
    const { data, error } = await photoQuery(context, id).neq('state', 'removed').order('created_at').order('id')
    if (error) throw error
    return NextResponse.json({ photos: (data || []).map((photo: DraftPhoto) => publicPhoto(photo)) }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return quickAddFailure(error) }
}
