-- Regular ingredients remain complete inventory records. Incomplete work and
-- evidence live separately, inaccessible to browser database roles and every
-- existing inventory/report/recipe/customer-menu query.
create table public.ingredient_drafts (
  id uuid primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  version integer not null default 1 check (version > 0),
  ingredient_id uuid references public.ingredients(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ingredient_drafts_open_business_idx on public.ingredient_drafts(business_id, updated_at desc) where ingredient_id is null;
create index ingredient_drafts_ingredient_idx on public.ingredient_drafts(ingredient_id);
alter table public.ingredient_drafts enable row level security;
revoke all on public.ingredient_drafts from public, anon, authenticated;
grant select, insert, update on public.ingredient_drafts to service_role;

insert into storage.buckets(id,name,public,file_size_limit)
values ('ingredient-draft-documents','ingredient-draft-documents',false,3145728);
create policy ingredient_draft_documents_server_only on storage.objects as restrictive
for all to anon, authenticated using (bucket_id <> 'ingredient-draft-documents') with check (bucket_id <> 'ingredient-draft-documents');

create table public.ingredient_draft_documents (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.ingredient_drafts(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size bigint not null check (file_size between 1 and 3145728),
  file_type text not null,
  supplier_name text,
  version text,
  next_review_date date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index ingredient_draft_documents_parent_idx on public.ingredient_draft_documents(draft_id);
create index ingredient_draft_documents_business_idx on public.ingredient_draft_documents(business_id);
alter table public.ingredient_draft_documents enable row level security;
revoke all on public.ingredient_draft_documents from public, anon, authenticated;
grant select, insert, update, delete on public.ingredient_draft_documents to service_role;

-- Serialize evidence changes with activation. A late upload cannot attach to an
-- already activated draft, and cross-business associations fail closed.
create function public.guard_regular_ingredient_draft_document() returns trigger
language plpgsql security invoker set search_path='' as $$
declare parent public.ingredient_drafts; doc public.ingredient_draft_documents;
begin
  if TG_OP='UPDATE' and old.created_by is not null and new.created_by is null
    and (to_jsonb(new)-'created_by')=(to_jsonb(old)-'created_by') then return new; end if;
  if TG_OP='DELETE' then doc:=old; else doc:=new; end if;
  select * into parent from public.ingredient_drafts where id=doc.draft_id for update;
  if not found and TG_OP='DELETE' then return old; end if;
  if parent.business_id is distinct from doc.business_id or parent.ingredient_id is not null then
    raise exception 'draftConflict';
  end if;
  if TG_OP='UPDATE' and (new.id<>old.id or new.draft_id<>old.draft_id or new.business_id<>old.business_id or new.storage_path<>old.storage_path) then
    raise exception 'draftConflict';
  end if;
  if TG_OP='INSERT' and (select count(*) from public.ingredient_draft_documents where draft_id=doc.draft_id)>=5 then raise exception 'draftConflict'; end if;
  if TG_OP='DELETE' then return old; else return new; end if;
end;
$$;
revoke all on function public.guard_regular_ingredient_draft_document() from public, anon, authenticated;
grant execute on function public.guard_regular_ingredient_draft_document() to service_role;
create trigger guard_regular_ingredient_draft_document before insert or update or delete on public.ingredient_draft_documents
for each row execute function public.guard_regular_ingredient_draft_document();

create function public.save_regular_ingredient_draft(p_id uuid,p_business uuid,p_actor uuid,p_version integer,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare d public.ingredient_drafts;
begin
  if not exists(select 1 from public.user_businesses where user_id=p_actor and business_id=p_business and role in ('owner','manager','staff')) then raise exception 'draftForbidden'; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or length(btrim(p_payload->>'name')) not between 1 and 200 or p_payload->>'name' is null then raise exception 'draftConflict'; end if;
  if p_version=0 then
    insert into public.ingredient_drafts(id,business_id,payload,created_by,updated_by) values(p_id,p_business,p_payload,p_actor,p_actor) on conflict(id) do nothing;
  end if;
  select * into d from public.ingredient_drafts where id=p_id and business_id=p_business for update;
  if not found then raise exception 'draftNotFound'; end if;
  if d.ingredient_id is not null then return to_jsonb(d); end if;
  -- Identical retries are harmless, including a lost create response.
  if d.payload=p_payload then return to_jsonb(d); end if;
  if d.version<>p_version then raise exception 'draftConflict'; end if;
  update public.ingredient_drafts set payload=p_payload,version=version+1,updated_at=now(),updated_by=p_actor where id=d.id returning * into d;
  return to_jsonb(d);
end;
$$;
revoke all on function public.save_regular_ingredient_draft(uuid,uuid,uuid,integer,jsonb) from public, anon, authenticated;
grant execute on function public.save_regular_ingredient_draft(uuid,uuid,uuid,integer,jsonb) to service_role;

create function public.activate_regular_ingredient_draft(p_id uuid,p_business uuid,p_actor uuid,p_version integer,p_payload jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare d public.ingredient_drafts; ingredient uuid; supplier uuid; entry record; profile jsonb; profiles jsonb := '{}'::jsonb; key text;
begin
  if not exists(select 1 from public.user_businesses where user_id=p_actor and business_id=p_business and role in ('owner','manager','staff')) then raise exception 'draftForbidden'; end if;
  select * into d from public.ingredient_drafts where id=p_id and business_id=p_business for update;
  if not found then raise exception 'draftNotFound'; end if;
  if d.ingredient_id is not null then return d.ingredient_id; end if;
  if d.version<>p_version then raise exception 'draftConflict'; end if;
  -- API constructs canonical values from the stored draft and checks subtype
  -- consistency and supplier review. This RPC is executable only by service_role.
  foreach key in array array['cereals_gluten','crustaceans','eggs','fish','peanuts','soybeans','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs'] loop
    if coalesce(p_payload->'allergen_warnings'->>key,'') not in ('none','contains','may_contain','traces','not_suitable','cross_contamination') then raise exception 'completeIngredient'; end if;
  end loop;
  if coalesce((p_payload->'allergen_warnings'->>'assessment_incomplete')::boolean,false) then raise exception 'completeIngredient'; end if;
  -- Serialize supplier lookup/creation for concurrent draft activations.
  perform 1 from public.businesses where id=p_business for update;
  insert into public.ingredients(business_id,name,description,category,allergen_warnings,suppliers,certifications,supplier_profiles,preferred_review_months,status,compliance,created_by)
  values(p_business,p_payload->>'name',p_payload->>'description',p_payload->>'category',p_payload->'allergen_warnings',
    array(select jsonb_array_elements_text(p_payload->'suppliers')),array(select jsonb_array_elements_text(p_payload->'certifications')),
    '{}'::jsonb,(p_payload->>'preferred_review_months')::integer,'active','compliant',p_actor) returning id into ingredient;
  for entry in select * from jsonb_each(p_payload->'supplier_profiles') loop
    profile:=entry.value;
    if profile->>'assessment_status' is distinct from 'assessed' then raise exception 'completeIngredient'; end if;
    select id into supplier from public.suppliers where business_id=p_business and lower(btrim(name))=lower(btrim(profile->>'supplier_name')) order by id limit 1;
    if supplier is null then
      insert into public.suppliers(business_id,name,created_by) values(p_business,profile->>'supplier_name',p_actor) returning id into supplier;
    end if;
    profiles:=profiles || jsonb_build_object(entry.key,profile || jsonb_build_object('supplier_id',supplier));
    insert into public.ingredient_supplier_variants(business_id,ingredient_id,supplier_id,brand,allergen_warnings,certifications,assessment_status,notes,last_reviewed_at,created_by)
    values(p_business,ingredient,supplier,coalesce(profile->>'brand',''),profile->'allergen_warnings',array(select jsonb_array_elements_text(profile->'certifications')),
      'assessed',coalesce(profile->>'notes',''),(profile->>'last_reviewed_at')::timestamptz,p_actor);
  end loop;
  update public.ingredients set supplier_profiles=profiles where id=ingredient;
  insert into public.datasheets(business_id,ingredient_id,file_name,file_path,file_size,file_type,supplier_name,version,next_review_date,notes,status,created_by)
  select p_business,ingredient,file_name,'/api/ingredient-draft-documents/' || id::text,file_size,file_type,supplier_name,version,next_review_date,notes,'active',p_actor
    from public.ingredient_draft_documents where draft_id=d.id and business_id=p_business;
  insert into public.audit_log(business_id,entity_type,entity_id,entity_name,action,changes,changed_by)
  values(p_business,'ingredient',ingredient,p_payload->>'name','created','[]'::jsonb,p_actor);
  update public.ingredient_drafts set ingredient_id=ingredient,version=version+1,updated_at=now(),updated_by=p_actor where id=d.id;
  return ingredient;
end;
$$;
revoke all on function public.activate_regular_ingredient_draft(uuid,uuid,uuid,integer,jsonb) from public, anon, authenticated;
grant execute on function public.activate_regular_ingredient_draft(uuid,uuid,uuid,integer,jsonb) to service_role;
