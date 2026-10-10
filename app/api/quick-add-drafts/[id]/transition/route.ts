import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { reviewFields } from '@/lib/quick-add-review'
import { getDraft, quickAddContext, quickAddFailure, QuickAddError, requireDraftId } from '@/lib/server/quick-add'

const input = z.object({
  request_id: z.string().uuid(), version: z.number().int().min(1).max(2147483646),
  action: z.enum(['submit', 'withdraw', 'return', 'review', 'approve']),
  review: reviewFields.optional(), note: z.string().trim().max(2000).optional(),
}).strict().superRefine((value, context) => {
  if ((value.action === 'review') !== !!value.review) context.addIssue({ code: 'custom', message: 'Review payload required only for review' })
  if (value.action === 'return' && !value.note) context.addIssue({ code: 'custom', message: 'Return note required' })
})

export async function POST(request: NextRequest, route: { params: Promise<{ id: string }> }) {
  try {
    const context = await quickAddContext()
    const { id } = await route.params
    requireDraftId(id)
    const parsed = input.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw new QuickAddError('invalid', 400)
    const values = parsed.data
    if (['return', 'review', 'approve'].includes(values.action) && context.role === 'staff') throw new QuickAddError('forbidden', 403)
    await getDraft(context, id)
    const { error } = await context.supabase.rpc('transition_quick_add', {
      p_draft: id, p_business: context.businessId, p_actor: context.userId, p_request: values.request_id,
      p_action: values.action, p_version: values.version, p_review: values.review || null, p_note: values.note || '',
    })
    if (error) {
      const code = error.message
      const statuses: Record<string, number> = { forbidden: 403, notFound: 404, invalid: 400, editConflict: 409, pendingPhotos: 409,
        returnNoteRequired: 400, missingSupplier: 400, missingEvidence: 400, missingAllergens: 400, missingLabel: 400, missingScope: 400, locationUnavailable: 400 }
      if (statuses[code]) throw new QuickAddError(code, statuses[code])
      throw error
    }
    return NextResponse.json({ draft: await getDraft(context, id) })
  } catch (error) { return quickAddFailure(error) }
}
