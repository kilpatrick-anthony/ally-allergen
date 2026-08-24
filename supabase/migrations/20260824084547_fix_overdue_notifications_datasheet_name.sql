create or replace function public.get_overdue_notifications(
  p_business_id uuid,
  p_user_id uuid
)
returns table (
  entity_type text,
  entity_id uuid,
  entity_name text,
  days_overdue integer,
  frequency_days integer
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  datasheet_freq text;
  ingredient_freq text;
  menu_freq text;
  supplier_freq text;
  datasheet_days integer := 30;
  ingredient_days integer := 30;
  menu_days integer := 30;
  supplier_days integer := 30;
begin
  case
    when datasheet_freq = '2 weeks' then datasheet_days := 14;
    when datasheet_freq = '1 month' then datasheet_days := 30;
    when datasheet_freq = '3 months' then datasheet_days := 90;
    when datasheet_freq = '1 year' then datasheet_days := 365;
    else datasheet_days := 30;
  end case;

  case
    when ingredient_freq = '2 weeks' then ingredient_days := 14;
    when ingredient_freq = '1 month' then ingredient_days := 30;
    when ingredient_freq = '3 months' then ingredient_days := 90;
    when ingredient_freq = '1 year' then ingredient_days := 365;
    else ingredient_days := 30;
  end case;

  case
    when menu_freq = '2 weeks' then menu_days := 14;
    when menu_freq = '1 month' then menu_days := 30;
    when menu_freq = '3 months' then menu_days := 90;
    when menu_freq = '1 year' then menu_days := 365;
    else menu_days := 30;
  end case;

  case
    when supplier_freq = '2 weeks' then supplier_days := 14;
    when supplier_freq = '1 month' then supplier_days := 30;
    when supplier_freq = '3 months' then supplier_days := 90;
    when supplier_freq = '1 year' then supplier_days := 365;
    else supplier_days := 30;
  end case;

  return query
  select
    'datasheet'::text,
    d.id,
    d.file_name,
    extract(epoch from (now() - coalesce(n.last_reviewed_at, n.last_updated_at)))::integer / 86400,
    datasheet_days
  from public.datasheets d
  left join public.notifications n
    on n.entity_type = 'datasheet'
    and n.entity_id = d.id
  where d.business_id = p_business_id
    and d.status = 'active'
    and (
      n.last_reviewed_at is null
      or n.last_reviewed_at < now() - interval '1 day' * datasheet_days
    )
    and n.last_updated_at < now() - interval '1 day' * datasheet_days

  union all

  select
    'ingredient'::text,
    i.id,
    i.name,
    extract(epoch from (now() - coalesce(n.last_reviewed_at, n.last_updated_at)))::integer / 86400,
    ingredient_days
  from public.ingredients i
  left join public.notifications n
    on n.entity_type = 'ingredient'
    and n.entity_id = i.id
  where i.business_id = p_business_id
    and (
      n.last_reviewed_at is null
      or n.last_reviewed_at < now() - interval '1 day' * ingredient_days
    )
    and n.last_updated_at < now() - interval '1 day' * ingredient_days

  union all

  select
    'menu_item'::text,
    m.id,
    m.name,
    extract(epoch from (now() - coalesce(n.last_reviewed_at, n.last_updated_at)))::integer / 86400,
    menu_days
  from public.menu_items m
  left join public.notifications n
    on n.entity_type = 'menu_item'
    and n.entity_id = m.id
  where m.business_id = p_business_id
    and (
      n.last_reviewed_at is null
      or n.last_reviewed_at < now() - interval '1 day' * menu_days
    )
    and n.last_updated_at < now() - interval '1 day' * menu_days

  union all

  select
    'supplier'::text,
    s.id,
    s.name,
    extract(epoch from (now() - coalesce(n.last_reviewed_at, n.last_updated_at)))::integer / 86400,
    supplier_days
  from public.suppliers s
  left join public.notifications n
    on n.entity_type = 'supplier'
    and n.entity_id = s.id
  where s.business_id = p_business_id
    and (
      n.last_reviewed_at is null
      or n.last_reviewed_at < now() - interval '1 day' * supplier_days
    )
    and n.last_updated_at < now() - interval '1 day' * supplier_days;
end;
$$;

revoke all on function public.get_overdue_notifications(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_overdue_notifications(uuid, uuid)
  to service_role;
