-- Prepared menu items are simple recipes assembled from approved ingredients.
alter table public.quick_add_drafts drop constraint quick_add_drafts_kind_check;
alter table public.quick_add_drafts
  add constraint quick_add_drafts_kind_check
    check (kind in ('ingredient', 'packaged_product', 'prepared_item')),
  add column ingredient_ids uuid[] not null default array[]::uuid[]
    check (cardinality(ingredient_ids) <= 100 and array_position(ingredient_ids, null) is null);

comment on column public.quick_add_drafts.ingredient_ids is
  'Existing assessed ingredients suggested for a prepared menu item or simple recipe.';

-- Seed prepared-item review from capture without overwriting manager review work.
create or replace function public.quick_add_copy_category_to_review()
returns trigger
language plpgsql
set search_path = '' as $$
begin
  if new.status = 'ready_for_review' and old.status = 'draft' then
    if not (new.review ? 'category') then
      new.review := new.review || jsonb_build_object('category', new.category);
    end if;
    if new.kind = 'prepared_item' and not (new.review ? 'ingredient_ids') then
      new.review := new.review || jsonb_build_object(
        'ingredient_ids', to_jsonb(new.ingredient_ids),
        'ingredients_checked', false
      );
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.quick_add_copy_category_to_review() from public, anon, authenticated;

-- Prepared approval is separate from label-based approval. It derives safety
-- from live, business-owned ingredient records and creates an inactive item.
create function public.approve_quick_add_prepared(
  p_draft uuid, p_business uuid, p_actor uuid, p_request uuid,
  p_action text, p_version integer, p_review jsonb default null, p_note text default ''
) returns public.quick_add_drafts
language plpgsql security invoker set search_path = '' as $$
declare
  d public.quick_add_drafts; h public.quick_add_history;
  actor_role text; actor_name text; request_value jsonb; r jsonb;
  selected_ids uuid[]; chosen_site uuid; destination uuid; review_months integer;
  warnings jsonb := '{}'::jsonb; subtype_levels jsonb; selected_tags text[];
  allergen text; subtype text; worst integer;
  allowed_levels text[] := array['none','cross_contamination','traces','may_contain','not_suitable','contains'];
  all_allergens text[] := array['cereals_gluten','crustaceans','eggs','fish','peanuts','soybeans','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs'];
  subtypes text[];
begin
  if p_action <> 'approve' or p_review is not null or btrim(coalesce(p_note,'')) <> '' then raise exception 'invalid'; end if;
  select role, coalesce(nullif(display_name,''),'Team member') into actor_role, actor_name
    from public.user_businesses where user_id=p_actor and business_id=p_business for share;
  if actor_role is null or actor_role not in ('owner','manager') then raise exception 'forbidden'; end if;
  select * into d from public.quick_add_drafts where id=p_draft and business_id=p_business for update;
  if not found then raise exception 'notFound'; end if;
  request_value := jsonb_build_object('action',p_action,'version',p_version,'review',p_review,'note',p_note);
  select * into h from public.quick_add_history where id=p_request;
  if found then
    if h.draft_id<>p_draft or h.business_id<>p_business or h.actor_id is distinct from p_actor or h.request<>request_value then raise exception 'editConflict'; end if;
    return d;
  end if;
  if d.kind<>'prepared_item' or d.status<>'ready_for_review' or d.version<>p_version then raise exception 'editConflict'; end if;
  r := d.review;
  if jsonb_typeof(r->'ingredient_ids') is distinct from 'array' or jsonb_array_length(r->'ingredient_ids') not between 1 and 100
     or r->>'ingredients_checked' is distinct from 'true' then raise exception 'missingIngredients'; end if;
  select array_agg(distinct value::uuid order by value::uuid) into selected_ids
    from jsonb_array_elements_text(r->'ingredient_ids') as item(value);
  if cardinality(selected_ids) <> jsonb_array_length(r->'ingredient_ids') then raise exception 'invalid'; end if;
  if (select count(*) from public.ingredients where business_id=p_business and id=any(selected_ids)) <> cardinality(selected_ids)
    then raise exception 'ingredientUnavailable'; end if;
  if btrim(coalesce(r->>'description',''))='' then raise exception 'missingDescription'; end if;
  if length(r->>'description')>2000 or length(coalesce(r->>'category',''))>200 then raise exception 'invalid'; end if;
  review_months := (r->>'preferred_review_months')::integer;
  if review_months is null or review_months not between 1 and 36 then raise exception 'invalid'; end if;
  if coalesce(r->>'scope','') not in ('site','global') then raise exception 'missingScope'; end if;
  if r->>'scope'='site' then
    chosen_site := nullif(r->>'site_id','')::uuid;
    perform 1 from public.sites where id=chosen_site and business_id=p_business for share;
    if not found then raise exception 'locationUnavailable'; end if;
  end if;

  foreach allergen in array all_allergens loop
    select max(coalesce(array_position(allowed_levels, i.allergen_warnings->>allergen),1)) into worst
      from public.ingredients i where i.id=any(selected_ids);
    warnings := warnings || jsonb_build_object(allergen, allowed_levels[worst]);
  end loop;
  foreach allergen in array array['cereals_gluten','nuts'] loop
    subtypes := case when allergen='cereals_gluten'
      then array['barley','oats','rye','wheat']
      else array['almonds','brazil_nuts','cashews','hazelnuts','macadamia','pecans','pistachios','walnuts'] end;
    subtype_levels := '{}'::jsonb;
    foreach subtype in array subtypes loop
      select max(coalesce(array_position(allowed_levels, i.allergen_warnings->(allergen || '_levels')->>subtype),1)) into worst
        from public.ingredients i where i.id=any(selected_ids);
      if worst > 1 then subtype_levels := subtype_levels || jsonb_build_object(subtype,allowed_levels[worst]); end if;
    end loop;
    if subtype_levels <> '{}'::jsonb then warnings := warnings || jsonb_build_object(allergen || '_levels',subtype_levels); end if;
  end loop;
  select coalesce(array_agg(tag order by tag),array[]::text[]) into selected_tags from (
    select tag from public.ingredients i cross join lateral unnest(coalesce(i.certifications,array[]::text[])) tag
      where i.id=any(selected_ids) group by tag having count(distinct i.id)=cardinality(selected_ids)
  ) common_tags;

  insert into public.menu_items(business_id,name,description,category,allergen_warnings,dietary,site_id,is_global,visibility,
    is_active,item_type,supplier_id,last_reviewed_at,preferred_review_months)
    values(p_business,d.name,r->>'description',coalesce(r->>'category',''),warnings,selected_tags,chosen_site,chosen_site is null,
      case when chosen_site is null then 'global' else 'site-specific' end,false,'prepared',null,now(),review_months)
    returning id into destination;
  insert into public.menu_item_ingredients(menu_item_id,ingredient_id,quantity,is_optional)
    select destination,id,'',false from unnest(selected_ids) id;
  insert into public.audit_log(business_id,entity_type,entity_id,entity_name,action,changes,changed_by)
    values(p_business,'menu_item',destination,d.name,'created',
      jsonb_build_array(jsonb_build_object('field','quick_add_draft','label','Quick Add capture','from','(empty)','to',d.id::text)),p_actor);
  d.review := d.review || jsonb_build_object('allergen_warnings',warnings,'dietary_tags',to_jsonb(selected_tags));
  update public.quick_add_drafts set status='approved',review=d.review,approved_at=now(),approved_by=p_actor,menu_item_id=destination,
    version=version+1,updated_at=now(),updated_by=p_actor where id=d.id returning * into d;
  insert into public.quick_add_history(id,draft_id,business_id,actor_id,actor_name,action,request,note)
    values(p_request,d.id,p_business,p_actor,actor_name,'approve',request_value,'');
  return d;
end;
$$;

revoke all on function public.approve_quick_add_prepared(uuid,uuid,uuid,uuid,text,integer,jsonb,text) from public, anon, authenticated;
grant execute on function public.approve_quick_add_prepared(uuid,uuid,uuid,uuid,text,integer,jsonb,text) to service_role;
