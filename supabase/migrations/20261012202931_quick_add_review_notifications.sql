create table public.quick_add_review_notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  draft_id uuid not null references public.quick_add_drafts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz,
  email_claimed_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (draft_id, user_id)
);

create index quick_add_review_notifications_user_unread_idx
  on public.quick_add_review_notifications (user_id, business_id, created_at desc)
  where read_at is null;

create index quick_add_review_notifications_email_idx
  on public.quick_add_review_notifications (draft_id, business_id, email_sent_at, email_claimed_at);

alter table public.quick_add_review_notifications enable row level security;
revoke all on public.quick_add_review_notifications from public, anon, authenticated, service_role;
grant select, insert, update on public.quick_add_review_notifications to service_role;

comment on table public.quick_add_review_notifications is
  'Per-reviewer in-app and email delivery state for Quick Add drafts submitted for review.';

create or replace function public.claim_quick_add_review_emails(
  p_draft uuid,
  p_business uuid
)
returns table (notification_id uuid, user_id uuid)
language sql
security invoker
set search_path = public
as $$
  update public.quick_add_review_notifications as notification
  set email_claimed_at = now()
  where draft_id = p_draft
    and business_id = p_business
    and email_sent_at is null
    and (email_claimed_at is null or email_claimed_at < now() - interval '5 minutes')
  returning notification.id, notification.user_id;
$$;

revoke all on function public.claim_quick_add_review_emails(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.claim_quick_add_review_emails(uuid, uuid) to service_role;
