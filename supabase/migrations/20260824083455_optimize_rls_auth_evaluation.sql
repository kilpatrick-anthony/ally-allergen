-- Wrap stable Auth helpers in scalar subqueries so PostgreSQL evaluates them
-- once per statement instead of once for every candidate row.
do $$
declare
  policy_row record;
  optimized_using text;
  optimized_check text;
  alter_sql text;
begin
  for policy_row in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        (coalesce(qual, '') ~ 'auth\.(uid|role)\(\)'
          and coalesce(qual, '') !~* 'select[[:space:]]+auth\.(uid|role)\(\)')
        or
        (coalesce(with_check, '') ~ 'auth\.(uid|role)\(\)'
          and coalesce(with_check, '') !~* 'select[[:space:]]+auth\.(uid|role)\(\)')
      )
  loop
    optimized_using := policy_row.qual;
    optimized_check := policy_row.with_check;

    if optimized_using is not null
       and optimized_using !~* 'select[[:space:]]+auth\.(uid|role)\(\)' then
      optimized_using := replace(optimized_using, 'auth.uid()', '(select auth.uid())');
      optimized_using := replace(optimized_using, 'auth.role()', '(select auth.role())');
    end if;

    if optimized_check is not null
       and optimized_check !~* 'select[[:space:]]+auth\.(uid|role)\(\)' then
      optimized_check := replace(optimized_check, 'auth.uid()', '(select auth.uid())');
      optimized_check := replace(optimized_check, 'auth.role()', '(select auth.role())');
    end if;

    alter_sql := format(
      'alter policy %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );

    if optimized_using is not null then
      alter_sql := alter_sql || format(' using (%s)', optimized_using);
    end if;

    if optimized_check is not null then
      alter_sql := alter_sql || format(' with check (%s)', optimized_check);
    end if;

    execute alter_sql;
  end loop;
end
$$;
