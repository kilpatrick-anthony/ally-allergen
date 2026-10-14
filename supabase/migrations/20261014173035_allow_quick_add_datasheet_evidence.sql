-- A checked private product datasheet can supply the evidence instead of a
-- packaging photo. Preserve the existing transition function and its other
-- validation, atomic promotion, live role checks and idempotency behavior.
do $migration$
declare
  definition text;
  photo_only text := $old$if not exists(select 1 from public.quick_add_photos where draft_id=d.id and state='ready') then raise exception 'missingEvidence'; end if;$old$;
  pending_photos text := $old$if exists(select 1 from public.quick_add_photos where draft_id=d.id and state='pending') then raise exception 'pendingPhotos'; end if;$old$;
begin
  definition := pg_get_functiondef('public.transition_quick_add(uuid,uuid,uuid,uuid,text,integer,jsonb,text)'::regprocedure);
  if position(photo_only in definition)=0 or position(pending_photos in definition)=0 then
    raise exception 'Unexpected Quick Add transition definition; inspect before changing evidence checks';
  end if;
  definition := replace(definition, photo_only, $new$if not exists(select 1 from public.quick_add_photos where draft_id=d.id and business_id=d.business_id and state='ready')
      and not exists(select 1 from public.quick_add_datasheets where draft_id=d.id and business_id=d.business_id and state='ready')
      then raise exception 'missingEvidence'; end if;$new$);
  definition := replace(definition, pending_photos, $new$if exists(select 1 from public.quick_add_photos where draft_id=d.id and business_id=d.business_id and state='pending')
      or exists(select 1 from public.quick_add_datasheets where draft_id=d.id and business_id=d.business_id and state='pending')
      then raise exception 'pendingPhotos'; end if;$new$);
  execute definition;
end;
$migration$;

revoke all on function public.transition_quick_add(uuid,uuid,uuid,uuid,text,integer,jsonb,text) from public, anon, authenticated;
grant execute on function public.transition_quick_add(uuid,uuid,uuid,uuid,text,integer,jsonb,text) to service_role;
