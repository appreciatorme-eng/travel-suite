-- Security diagnostics helper for admin observability.
create or replace function public.get_rls_diagnostics()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  result jsonb;
begin
  with required_tables as (
    select unnest(array[
      'trips',
      'itineraries',
      'workflow_stage_events',
      'crm_contacts',
      'workflow_notification_rules',
      'notification_logs',
      'notification_queue',
      'invoices',
      'invoice_payments',
      'notification_delivery_status',
      'trip_location_shares',
      'trip_location_share_access_logs'
    ]) as table_name
  ),
  table_stats as (
    select
      rt.table_name,
      coalesce(c.relrowsecurity, false) as rls_enabled,
      coalesce((
        select count(*)
        from pg_policies p
        where p.schemaname = 'public'
          and p.tablename = rt.table_name
      ), 0)::int as policy_count
    from required_tables rt
    left join pg_class c on c.relname = rt.table_name
    left join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  ),
  required_policies as (
    select * from (values
      ('trips', 'Admins can manage org trips'),
      ('itineraries', 'Admins can view org itineraries'),
      ('workflow_stage_events', 'Admins can manage workflow stage events'),
      ('crm_contacts', 'Admins can manage crm contacts'),
      ('workflow_notification_rules', 'Admins can manage workflow notification rules'),
      ('notification_queue', 'Admins can view notification queue'),
      ('notification_queue', 'Admins can manage notification queue'),
      ('invoices', 'Admins can manage invoices'),
      ('invoice_payments', 'Admins can manage invoice payments'),
      ('notification_delivery_status', 'Admins can manage notification delivery status')
    ) as t(table_name, policy_name)
  ),
  policy_checks as (
    select
      rp.table_name,
      rp.policy_name,
      exists(
        select 1
        from pg_policies p
        where p.schemaname = 'public'
          and p.tablename = rp.table_name
          and p.policyname = rp.policy_name
      ) as present
    from required_policies rp
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'tables_expected', (select count(*) from table_stats),
      'tables_with_rls', (select count(*) from table_stats where rls_enabled),
      'missing_policy_count', (select count(*) from policy_checks where not present)
    ),
    'tables', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'table_name', table_name,
        'rls_enabled', rls_enabled,
        'policy_count', policy_count
      ) order by table_name), '[]'::jsonb)
      from table_stats
    ),
    'required_policies', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'table_name', table_name,
        'policy_name', policy_name,
        'present', present
      ) order by table_name, policy_name), '[]'::jsonb)
      from policy_checks
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_rls_diagnostics() to authenticated;
grant execute on function public.get_rls_diagnostics() to service_role;
