import { sendMail } from '@/lib/email'
import type { QuickAddContext } from '@/lib/server/quick-add'

type ReviewDraft = { id: string; name: string; kind: string }

const kindLabels: Record<string, string> = {
  ingredient: 'ingredient',
  packaged_product: 'bought-in product',
  prepared_item: 'prepared menu item',
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character] || character)
}

export async function notifyQuickAddReviewers(context: QuickAddContext, draft: ReviewDraft) {
  const { data: reviewers, error: reviewerError } = await context.supabase
    .from('user_businesses')
    .select('user_id')
    .eq('business_id', context.businessId)
    .in('role', ['owner', 'manager'])
  if (reviewerError) throw reviewerError
  if (!reviewers?.length) return

  const { error: insertError } = await context.supabase
    .from('quick_add_review_notifications')
    .upsert(
      reviewers.map(({ user_id }) => ({
        business_id: context.businessId, draft_id: draft.id, user_id,
        read_at: null, email_claimed_at: null, email_sent_at: null, created_at: new Date().toISOString(),
      })),
      { onConflict: 'draft_id,user_id' },
    )
  if (insertError) throw insertError

  await deliverQuickAddReviewEmails(context, draft)
}

export async function retryQuickAddReviewEmails(context: QuickAddContext, draft: ReviewDraft) {
  await deliverQuickAddReviewEmails(context, draft)
}

async function deliverQuickAddReviewEmails(context: QuickAddContext, draft: ReviewDraft) {
  const { data: claims, error: claimError } = await context.supabase.rpc('claim_quick_add_review_emails', {
    p_draft: draft.id,
    p_business: context.businessId,
  })
  if (claimError) throw claimError
  if (!claims?.length) return

  const reviewUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://allyjen.ie'}/admin/quick-add?status=ready_for_review&draft=${draft.id}`
  const kind = kindLabels[draft.kind] || 'item'
  await Promise.allSettled(claims.map(async ({ notification_id, user_id }: { notification_id: string; user_id: string }) => {
    try {
      const { data, error } = await context.supabase.auth.admin.getUserById(user_id)
      if (error) throw error
      const email = data.user?.email
      if (!email) throw new Error('Reviewer has no email address')
      await sendMail({
        to: email,
        subject: `${draft.name} is ready for review in AllyJen`,
        text: `${draft.name}, a ${kind}, has been submitted and is ready for review.\n\nReview it in AllyJen: ${reviewUrl}`,
        html: `<p><strong>${escapeHtml(draft.name)}</strong>, a ${escapeHtml(kind)}, has been submitted and is ready for review.</p><p><a href="${reviewUrl}">Review this draft in AllyJen</a></p>`,
      })
      const { error: updateError } = await context.supabase.from('quick_add_review_notifications')
        .update({ email_sent_at: new Date().toISOString() }).eq('id', notification_id).eq('business_id', context.businessId)
      if (updateError) throw updateError
    } catch (error) {
      await context.supabase.from('quick_add_review_notifications')
        .update({ email_claimed_at: null }).eq('id', notification_id).eq('business_id', context.businessId)
      console.error('Quick Add review email failed:', error)
    }
  }))
}

export async function dismissQuickAddReviewNotifications(context: QuickAddContext, draftId: string) {
  const { error } = await context.supabase.from('quick_add_review_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('business_id', context.businessId).eq('draft_id', draftId).is('read_at', null)
  if (error) throw error
}
