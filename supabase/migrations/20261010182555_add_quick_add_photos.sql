-- Private evidence for delivery captures, accessed only through the session API.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quick-add-photos', 'quick-add-photos', false, 4194304, array['image/jpeg']);

-- Restrictive policy protects this bucket even if a broad permissive policy is added later.
create policy quick_add_photos_server_only on storage.objects as restrictive
for all to anon, authenticated
using (bucket_id <> 'quick-add-photos') with check (bucket_id <> 'quick-add-photos');

create table public.quick_add_photos (
  id uuid primary key,
  draft_id uuid not null references public.quick_add_drafts(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  byte_size integer not null check (byte_size between 1 and 4194304),
  state text not null default 'pending' check (state in ('pending', 'ready', 'removed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index quick_add_photos_draft_idx on public.quick_add_photos(draft_id, created_at, id);
create index quick_add_photos_business_idx on public.quick_add_photos(business_id);
create index quick_add_photos_creator_idx on public.quick_add_photos(created_by);
alter table public.quick_add_photos enable row level security;
revoke all on public.quick_add_photos from public, anon, authenticated, service_role;
grant select, insert, update on public.quick_add_photos to service_role;

-- Serialize attachment mutations with draft transitions. Pending uploads count
-- toward the limit; retries reuse the same ID. Removed IDs cannot be reused.
create function public.guard_quick_add_photo() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare parent_business uuid; parent_status text;
begin
  -- FK cleanup may remove an uploader without changing immutable evidence.
  if TG_OP = 'UPDATE' and old.created_by is not null and new.created_by is null
    and (to_jsonb(new) - 'created_by') = (to_jsonb(old) - 'created_by') then return new; end if;
  select business_id, status into parent_business, parent_status
    from public.quick_add_drafts where id = new.draft_id for update;
  if parent_business is distinct from new.business_id or parent_status is distinct from 'draft' then
    raise exception 'photoDraftConflict' using errcode = 'P0001';
  end if;
  if TG_OP = 'INSERT' then
    if new.state <> 'pending' then raise exception 'photoDraftConflict'; end if;
    if (select count(*) from public.quick_add_photos where draft_id = new.draft_id and state <> 'removed') >= 12 then
      raise exception 'photoLimit' using errcode = 'P0001';
    end if;
  else
    if new.id <> old.id or new.draft_id <> old.draft_id or new.business_id <> old.business_id
      or new.content_hash <> old.content_hash or new.byte_size <> old.byte_size
      or (old.state = 'removed' and new.state <> 'removed')
      or (old.state = 'ready' and new.state = 'pending') then
      raise exception 'photoDraftConflict' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_quick_add_photo() from public, anon, authenticated;
grant execute on function public.guard_quick_add_photo() to service_role;
create trigger guard_quick_add_photo before insert or update on public.quick_add_photos
for each row execute function public.guard_quick_add_photo();

comment on table public.quick_add_photos is 'Private Quick Add label evidence. Pending uploads are not evidence. Removed rows prevent retry resurrection; remove objects through the Storage API.';
