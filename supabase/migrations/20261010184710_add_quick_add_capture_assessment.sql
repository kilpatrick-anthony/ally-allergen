-- Optional unverified label details captured before photo upload.
alter table public.quick_add_drafts
  add column allergen_warnings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(allergen_warnings)='object' and octet_length(allergen_warnings::text)<=20000),
  add column dietary_tags text[] not null default array[]::text[]
    check (cardinality(dietary_tags)<=9 and array_position(dietary_tags,null) is null and
      dietary_tags <@ array['Vegan','Vegetarian','Gluten-Free','Halal','Kosher','Organic','Fair Trade','Lactose-Free','Coeliac-Friendly']::text[]);

create or replace function public.transition_quick_add(
  p_draft uuid, p_business uuid, p_actor uuid, p_request uuid,
  p_action text, p_version integer, p_review jsonb default null, p_note text default ''
) returns public.quick_add_drafts
language plpgsql security invoker set search_path = '' as $$
declare
  d public.quick_add_drafts; h public.quick_add_history;
  actor_role text; actor_name text; request_value jsonb;
  r jsonb; warnings jsonb; levels jsonb; allergen text; subtype text; subtypes text[];
  allowed_levels text[] := array['none','cross_contamination','traces','may_contain','not_suitable','contains'];
  all_allergens text[] := array['cereals_gluten','crustaceans','eggs','fish','peanuts','soybeans','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs'];
  worst integer; chosen_supplier uuid; chosen_site uuid; supplier_name text;
  destination uuid; review_months integer; selected_tags text[]; photo record; event_note text;
begin
  select role, coalesce(nullif(display_name,''),'Team member') into actor_role, actor_name
    from public.user_businesses where user_id=p_actor and business_id=p_business for share;
  if actor_role is null or actor_role not in ('owner','manager','staff') then raise exception 'forbidden'; end if;
  select * into d from public.quick_add_drafts where id=p_draft and business_id=p_business for update;
  if not found or (actor_role='staff' and d.created_by is distinct from p_actor) then raise exception 'notFound'; end if;
  if p_action is null or p_action not in ('submit','withdraw','return','review','approve') or p_version is null then raise exception 'invalid'; end if;
  if p_action in ('return','review','approve') and actor_role not in ('owner','manager') then raise exception 'forbidden'; end if;
  request_value := jsonb_build_object('action',p_action,'version',p_version,'review',p_review,'note',p_note);
  select * into h from public.quick_add_history where id=p_request;
  if found then
    if h.draft_id<>p_draft or h.business_id<>p_business or h.actor_id is distinct from p_actor or h.request<>request_value then raise exception 'editConflict'; end if;
    return d;
  end if;
  if d.version<>p_version or d.status='approved' then raise exception 'editConflict'; end if;
  event_note := btrim(coalesce(p_note,''));
  if length(event_note)>2000 then raise exception 'invalid'; end if;

  if p_action='submit' then
    if d.status<>'draft' then raise exception 'editConflict'; end if;
    if exists(select 1 from public.quick_add_photos where draft_id=d.id and state='pending') then raise exception 'pendingPhotos'; end if;
    -- Capture values are suggestions; the reviewer must verify the label evidence.
    if d.review = '{}'::jsonb then
      d.review := jsonb_build_object('allergen_warnings',d.allergen_warnings,'dietary_tags',to_jsonb(d.dietary_tags));
    end if;
    d.status := 'ready_for_review'; d.submitted_at := now(); d.submitted_by := p_actor; d.return_note := '';
  elsif p_action='withdraw' then
    if d.status<>'ready_for_review' or d.created_by is distinct from p_actor then raise exception 'forbidden'; end if;
    d.status := 'draft';
  elsif p_action='return' then
    if d.status<>'ready_for_review' then raise exception 'editConflict'; end if;
    if event_note='' then raise exception 'returnNoteRequired'; end if;
    d.status := 'draft'; d.return_note := event_note;
  elsif p_action='review' then
    if d.status<>'ready_for_review' or jsonb_typeof(p_review) is distinct from 'object' or pg_column_size(p_review)>50000 then raise exception 'invalid'; end if;
    d.review := p_review;
  elsif p_action='approve' then
    if d.status<>'ready_for_review' then raise exception 'editConflict'; end if;
    r := d.review; warnings := r->'allergen_warnings';
    if jsonb_typeof(warnings) is distinct from 'object' then raise exception 'missingAllergens'; end if;
    foreach allergen in array all_allergens loop
      if coalesce(warnings->>allergen,'') <> all(allowed_levels) then raise exception 'missingAllergens'; end if;
    end loop;
    if exists(select 1 from jsonb_object_keys(warnings) as k(key) where key <> all(all_allergens || array['cereals_gluten_levels','nuts_levels'])) then raise exception 'invalid'; end if;
    foreach allergen in array array['cereals_gluten','nuts'] loop
      subtypes := case when allergen='cereals_gluten' then array['barley','oats','rye','wheat'] else array['almonds','brazil_nuts','cashews','hazelnuts','macadamia','pecans','pistachios','walnuts'] end;
      levels := warnings->(allergen || '_levels');
      if warnings->>allergen='none' then
        if levels is not null and (jsonb_typeof(levels)<>'object' or exists(select 1 from jsonb_each_text(levels) as l where l.value<>'none')) then raise exception 'missingAllergens'; end if;
        levels := '{}'::jsonb;
        foreach subtype in array subtypes loop levels := levels || jsonb_build_object(subtype,'none'); end loop;
      else
        if jsonb_typeof(levels) is distinct from 'object' then raise exception 'missingAllergens'; end if;
        worst := 1;
        foreach subtype in array subtypes loop
          if coalesce(levels->>subtype,'') <> all(allowed_levels) then raise exception 'missingAllergens'; end if;
          worst := greatest(worst,array_position(allowed_levels,levels->>subtype));
        end loop;
        if allowed_levels[worst]<>warnings->>allergen then raise exception 'missingAllergens'; end if;
      end if;
      if exists(select 1 from jsonb_object_keys(levels) as k(key) where key <> all(subtypes)) then raise exception 'invalid'; end if;
      warnings := warnings || jsonb_build_object(allergen || '_levels', levels);
    end loop;
    if r->>'evidence_checked' is distinct from 'true' then raise exception 'missingEvidence'; end if;
    if not exists(select 1 from public.quick_add_photos where draft_id=d.id and state='ready') then raise exception 'missingEvidence'; end if;
    if exists(select 1 from public.quick_add_photos where draft_id=d.id and state='pending') then raise exception 'pendingPhotos'; end if;
    chosen_supplier := nullif(r->>'supplier_id','')::uuid;
    select name into supplier_name from public.suppliers where id=chosen_supplier and business_id=p_business for share;
    if not found then raise exception 'missingSupplier'; end if;
    review_months := (r->>'preferred_review_months')::integer;
    if review_months is null or review_months not between 1 and 36 then raise exception 'invalid'; end if;
    if length(coalesce(r->>'description',''))>2000 or length(coalesce(r->>'category',''))>200 or length(coalesce(r->>'ingredient_declaration',''))>10000 then raise exception 'invalid'; end if;
    if jsonb_typeof(coalesce(r->'dietary_tags','[]'::jsonb)) is distinct from 'array' then raise exception 'invalid'; end if;
    if exists(select 1 from jsonb_array_elements(coalesce(r->'dietary_tags','[]'::jsonb)) as t(value)
      where jsonb_typeof(value)<>'string' or (value#>>'{}') <> all(array['Vegan','Vegetarian','Gluten-Free','Halal','Kosher','Organic','Fair Trade','Lactose-Free','Coeliac-Friendly'])) then raise exception 'invalid'; end if;
    select coalesce(array_agg(distinct value order by value),array[]::text[]) into selected_tags
      from jsonb_array_elements_text(coalesce(r->'dietary_tags','[]'::jsonb)) as t(value);
    if cardinality(selected_tags)>0 and r->>'dietary_checked' is distinct from 'true' then raise exception 'missingDietaryCheck'; end if;
    if d.kind='ingredient' then
      insert into public.ingredients(business_id,name,description,category,allergen_warnings,suppliers,certifications,
        supplier_profiles,preferred_review_months,status,compliance,created_by,last_reviewed_at)
      values(p_business,d.name,coalesce(r->>'description',''),coalesce(r->>'category',''),warnings,array[supplier_name],selected_tags,
        jsonb_build_object(supplier_name,jsonb_build_object('supplier_id',chosen_supplier,'allergen_warnings',warnings,'certifications',to_jsonb(selected_tags),'assessment_status','assessed','last_reviewed_at',now(),'notes',d.notes)),
        review_months,'active','warning',p_actor,now()) returning id into destination;
      insert into public.ingredient_supplier_variants(business_id,ingredient_id,supplier_id,allergen_warnings,certifications,assessment_status,notes,last_reviewed_at,created_by)
        values(p_business,destination,chosen_supplier,warnings,selected_tags,'assessed',d.notes,now(),p_actor);
      d.ingredient_id := destination;
    else
      if btrim(coalesce(r->>'ingredient_declaration',''))='' or r->>'label_checked' is distinct from 'true' then raise exception 'missingLabel'; end if;
      if coalesce(r->>'scope','') not in ('site','global') then raise exception 'missingScope'; end if;
      if r->>'scope'='site' then
        chosen_site := nullif(r->>'site_id','')::uuid;
        perform 1 from public.sites where id=chosen_site and business_id=p_business for share;
        if not found then raise exception 'locationUnavailable'; end if;
      end if;
      insert into public.menu_items(business_id,name,description,category,allergen_warnings,dietary,site_id,is_global,visibility,
        is_active,item_type,supplier_id,ingredient_declaration,label_verified_at,label_verified_by,last_reviewed_at,preferred_review_months)
        values(p_business,d.name,coalesce(r->>'description',''),coalesce(r->>'category',''),warnings,selected_tags,chosen_site,chosen_site is null,
          case when chosen_site is null then 'global' else 'site-specific' end,false,'packaged_product',chosen_supplier,r->>'ingredient_declaration',now(),p_actor,now(),review_months)
        returning id into destination;
      d.menu_item_id := destination;
    end if;
    -- Evidence remains private; these relative URLs require a current business session.
    for photo in select * from public.quick_add_photos where draft_id=d.id and state='ready' loop
      insert into public.datasheets(business_id,ingredient_id,menu_item_id,file_name,file_path,file_size,file_type,supplier_name,next_review_date,status,created_by)
        values(p_business,d.ingredient_id,d.menu_item_id,'Label photo.jpg','/api/quick-add-evidence/' || photo.id::text,
          photo.byte_size,'image/jpeg',supplier_name,(now()+make_interval(months=>review_months))::date,'active',p_actor);
    end loop;
    insert into public.audit_log(business_id,entity_type,entity_id,entity_name,action,changes,changed_by)
      values(p_business,case when d.kind='ingredient' then 'ingredient' else 'menu_item' end,destination,d.name,'created',
        jsonb_build_array(jsonb_build_object('field','quick_add_draft','label','Quick Add capture','from','(empty)','to',d.id::text)),p_actor);
    d.status := 'approved'; d.approved_at := now(); d.approved_by := p_actor;
  end if;
  -- Invalidate review confirmations after a submission/return/withdraw cycle.
  if p_action in ('submit','withdraw','return') and d.review<>'{}'::jsonb then
    d.review := d.review || '{"evidence_checked":false,"label_checked":false,"dietary_checked":false}'::jsonb;
  end if;
  update public.quick_add_drafts set status=d.status,review=d.review,submitted_at=d.submitted_at,submitted_by=d.submitted_by,
    approved_at=d.approved_at,approved_by=d.approved_by,return_note=d.return_note,ingredient_id=d.ingredient_id,menu_item_id=d.menu_item_id,
    version=version+1,updated_at=now(),updated_by=p_actor where id=d.id returning * into d;
  insert into public.quick_add_history(id,draft_id,business_id,actor_id,actor_name,action,request,note)
    values(p_request,d.id,p_business,p_actor,actor_name,p_action,request_value,event_note);
  return d;
end;
$$;
revoke all on function public.transition_quick_add(uuid,uuid,uuid,uuid,text,integer,jsonb,text) from public, anon, authenticated;
grant execute on function public.transition_quick_add(uuid,uuid,uuid,uuid,text,integer,jsonb,text) to service_role;
