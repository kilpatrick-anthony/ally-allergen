-- Managers can correct the delivery context while completing a submitted review.
-- The location travels in the audited review payload; this trigger keeps the
-- queue's first-class site_id in sync without widening direct table access.
create function public.quick_add_sync_review_location()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  requested_site uuid;
begin
  if new.status = 'ready_for_review' and new.review ? 'delivery_site_id' then
    begin
      requested_site := nullif(new.review->>'delivery_site_id', '')::uuid;
    exception when invalid_text_representation then
      raise exception 'locationUnavailable';
    end;
    if requested_site is not null and not exists (
      select 1 from public.sites
      where id = requested_site and business_id = new.business_id
    ) then
      raise exception 'locationUnavailable';
    end if;
    new.site_id := requested_site;
  end if;
  return new;
end;
$$;

revoke all on function public.quick_add_sync_review_location() from public, anon, authenticated;

create trigger quick_add_sync_review_location
before update of review on public.quick_add_drafts
for each row execute function public.quick_add_sync_review_location();
