import { NextRequest, NextResponse } from 'next/server'
import { quickAddContext, quickAddFailure, QuickAddError, requireDraftId } from '@/lib/server/quick-add'
import { PHOTO_BUCKET, photoPath } from '@/lib/server/quick-add-photos'

// Evidence on an approved ingredient/product follows its business access, even
// when its original capture was created by another staff member.
export async function GET(_request: NextRequest, route: { params: Promise<{ photoId: string }> }) {
  try {
    const context = await quickAddContext()
    const { photoId } = await route.params
    requireDraftId(photoId)
    const { data: photo, error } = await context.supabase.from('quick_add_photos').select('*')
      .eq('id', photoId).eq('business_id', context.businessId).eq('state', 'ready').maybeSingle()
    if (error) throw error
    if (!photo) throw new QuickAddError('notFound', 404)
    const { data: draft, error: draftError } = await context.supabase.from('quick_add_drafts').select('id,ingredient_id,menu_item_id')
      .eq('id', photo.draft_id).eq('business_id', context.businessId).eq('status', 'approved').maybeSingle()
    if (draftError) throw draftError
    if (!draft || (!draft.ingredient_id && !draft.menu_item_id)) throw new QuickAddError('notFound', 404)
    const { data, error: storageError } = await context.supabase.storage.from(PHOTO_BUCKET).download(photoPath(photo))
    if (storageError) throw storageError
    return new NextResponse(data, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline; filename="label.jpg"' } })
  } catch (error) { return quickAddFailure(error) }
}
