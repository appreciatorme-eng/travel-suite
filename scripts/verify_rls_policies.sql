-- Travel Suite RLS verification script
-- Run in Supabase SQL Editor (connected to project: rtdjmykkgmirxdyfckqi)

-- 1) Ensure RLS is enabled on critical tables
with expected_tables as (
  select unnest(array[
    'trips',
    'itineraries',
    'workflow_stage_events',
    'crm_contacts',
    'workflow_notification_rules',
    'notification_logs',
    'notification_queue',
    'invoices',
    'invoice_payments'
  ]) as table_name
)
select
  e.table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from expected_tables e
left join pg_class c on c.relname = e.table_name
left join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
order by e.table_name;

-- 2) Show active policies for critical tables
select
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'trips',
    'itineraries',
    'workflow_stage_events',
    'crm_contacts',
    'workflow_notification_rules',
    'notification_logs',
    'notification_queue',
    'invoices',
    'invoice_payments'
  )
order by tablename, policyname;

-- 3) Validate helper function exists
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'is_org_admin';

-- 4) Minimal policy name regression guard (fails if missing)
do $$
declare
  missing text[];
begin
  select array_agg(required.policy_name)
  into missing
  from (
    values
      ('trips', 'Admins can manage org trips'),
      ('itineraries', 'Admins can view org itineraries'),
      ('workflow_stage_events', 'Admins can manage workflow stage events'),
      ('crm_contacts', 'Admins can manage crm contacts'),
      ('workflow_notification_rules', 'Admins can manage workflow notification rules'),
      ('notification_queue', 'Admins can view notification queue'),
      ('notification_queue', 'Admins can manage notification queue'),
      ('invoices', 'Admins can manage invoices'),
      ('invoice_payments', 'Admins can manage invoice payments')
  ) as required(table_name, policy_name)
  left join pg_policies p
    on p.schemaname = 'public'
   and p.tablename = required.table_name
   and p.policyname = required.policy_name
  where p.policyname is null;

  if missing is not null then
    raise exception 'Missing required policies: %', array_to_string(missing, ', ');
  end if;
end $$;

-- 5) Optional runtime check template
-- Replace placeholders with real profile ids from DIFFERENT organizations.
-- This confirms cross-org denial at query layer for non-service-role sessions.
--
-- begin;
--   select set_config('request.jwt.claim.role', 'authenticated', true);
--   select set_config('request.jwt.claim.sub', '<ADMIN_USER_ID_ORG_A>', true);
--
--   -- Should return only org A rows
--   select id, organization_id from public.crm_contacts order by created_at desc limit 20;
--
--   -- Should fail/return 0 rows when targeting org B row id
--   select * from public.crm_contacts where id = '<CONTACT_ID_FROM_ORG_B>';
-- rollback;
