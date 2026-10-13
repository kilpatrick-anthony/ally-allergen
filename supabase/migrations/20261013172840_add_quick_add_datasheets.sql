-- Private optional datasheets attached to Quick Add captures.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quick-add-datasheets', 'quick-add-datasheets', false, 6291456,
  array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create policy quick_add_datasheets_server_only on storage.objects as restrictive
for all to anon, authenticated
using (bucket_id <> 'quick-add-datasheets') with check (bucket_id <> 'quick-add-datasheets');

create table public.quick_add_datasheets (
  id uuid primary key,
  draft_id uuid not null references public.quick_add_drafts(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  file_name text not null check (char_length(file_name) between 1 and 200),
  content_type text not null check (content_type in ('application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  byte_size integer not null check (byte_size between 1 and 6291456),
  state text not null default 'pending' check (state in ('pending','ready','removed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index quick_add_datasheets_draft_idx on public.quick_add_datasheets(draft_id,created_at,id);
create index quick_add_datasheets_business_idx on public.quick_add_datasheets(business_id);
alter table public.quick_add_datasheets enable row level security;
revoke all on public.quick_add_datasheets from public, anon, authenticated, service_role;
grant select, insert, update on public.quick_add_datasheets to service_role;

create function public.guard_quick_add_datasheet() returns trigger
language plpgsql security invoker set search_path='' as $$
declare parent_business uuid; parent_status text;
begin
  if TG_OP='UPDATE' and old.created_by is not null and new.created_by is null
    and (to_jsonb(new)-'created_by')=(to_jsonb(old)-'created_by') then return new; end if;
  select business_id,status into parent_business,parent_status
    from public.quick_add_drafts where id=new.draft_id for update;
  if parent_business is distinct from new.business_id or parent_status is distinct from 'draft' then
    raise exception 'datasheetDraftConflict' using errcode='P0001';
  end if;
  if TG_OP='INSERT' then
    if new.state<>'pending' then raise exception 'datasheetDraftConflict'; end if;
    if (select count(*) from public.quick_add_datasheets where draft_id=new.draft_id and state<>'removed')>=3 then
      raise exception 'datasheetLimit' using errcode='P0001'; end if;
  elsif new.id<>old.id or new.draft_id<>old.draft_id or new.business_id<>old.business_id
    or new.file_name<>old.file_name or new.content_type<>old.content_type
    or new.content_hash<>old.content_hash or new.byte_size<>old.byte_size
    or (old.state='removed' and new.state<>'removed') or (old.state='ready' and new.state='pending') then
    raise exception 'datasheetDraftConflict' using errcode='P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_quick_add_datasheet() from public, anon, authenticated;
grant execute on function public.guard_quick_add_datasheet() to service_role;
create trigger guard_quick_add_datasheet before insert or update on public.quick_add_datasheets
for each row execute function public.guard_quick_add_datasheet();

-- Once approved, expose each private attachment through the authenticated
-- evidence endpoint and register it against the resulting live record.
create function public.promote_quick_add_datasheets() returns trigger
language plpgsql security invoker set search_path='' as $$
declare attachment public.quick_add_datasheets; review_months integer;
begin
  if old.status is distinct from 'approved' and new.status='approved' then
    review_months := greatest(1,least(36,coalesce((new.review->>'preferred_review_months')::integer,12)));
    for attachment in select * from public.quick_add_datasheets where draft_id=new.id and state='ready' loop
      insert into public.datasheets(business_id,ingredient_id,menu_item_id,file_name,file_path,file_size,file_type,
        supplier_name,next_review_date,status,created_by)
      values(new.business_id,new.ingredient_id,new.menu_item_id,attachment.file_name,
        '/api/quick-add-datasheet-evidence/' || attachment.id::text,attachment.byte_size,attachment.content_type,
        nullif(new.supplier_name,''),(now()+make_interval(months=>review_months))::date,'active',new.approved_by);
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function public.promote_quick_add_datasheets() from public, anon, authenticated;
grant execute on function public.promote_quick_add_datasheets() to service_role;
create trigger promote_quick_add_datasheets after update of status on public.quick_add_drafts
for each row execute function public.promote_quick_add_datasheets();

comment on table public.quick_add_datasheets is 'Private optional datasheets attached to Quick Add captures.';
