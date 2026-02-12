-- RLS hardening: enforce organization-scoped admin access in database policies.

create or replace function public.is_org_admin(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
          and p.organization_id = target_org
    );
$$;

drop policy if exists "Admins can manage workflow stage events" on public.workflow_stage_events;
create policy "Admins can manage workflow stage events"
    on public.workflow_stage_events for all
    using (public.is_org_admin(organization_id))
    with check (public.is_org_admin(organization_id));

drop policy if exists "Admins can manage crm contacts" on public.crm_contacts;
create policy "Admins can manage crm contacts"
    on public.crm_contacts for all
    using (public.is_org_admin(organization_id))
    with check (public.is_org_admin(organization_id));

drop policy if exists "Admins can manage workflow notification rules" on public.workflow_notification_rules;
create policy "Admins can manage workflow notification rules"
    on public.workflow_notification_rules for all
    using (public.is_org_admin(organization_id))
    with check (public.is_org_admin(organization_id));

drop policy if exists "Admins can view all notification logs" on public.notification_logs;
create policy "Admins can view all notification logs"
    on public.notification_logs for select
    using (
        exists (
            select 1
            from public.profiles admin
            where admin.id = auth.uid()
              and admin.role = 'admin'
              and admin.organization_id = coalesce(
                  (select t.organization_id from public.trips t where t.id = notification_logs.trip_id),
                  (select p.organization_id from public.profiles p where p.id = notification_logs.recipient_id)
              )
        )
    );

drop policy if exists "Admins can view notification queue" on public.notification_queue;
create policy "Admins can view notification queue"
    on public.notification_queue for select
    using (
        exists (
            select 1
            from public.profiles admin
            where admin.id = auth.uid()
              and admin.role = 'admin'
              and admin.organization_id = coalesce(
                  (select t.organization_id from public.trips t where t.id = notification_queue.trip_id),
                  (select p.organization_id from public.profiles p where p.id = notification_queue.user_id)
              )
        )
    );

drop policy if exists "Admins can manage notification queue" on public.notification_queue;
create policy "Admins can manage notification queue"
    on public.notification_queue for all
    using (
        exists (
            select 1
            from public.profiles admin
            where admin.id = auth.uid()
              and admin.role = 'admin'
              and admin.organization_id = coalesce(
                  (select t.organization_id from public.trips t where t.id = notification_queue.trip_id),
                  (select p.organization_id from public.profiles p where p.id = notification_queue.user_id)
              )
        )
    )
    with check (
        exists (
            select 1
            from public.profiles admin
            where admin.id = auth.uid()
              and admin.role = 'admin'
              and admin.organization_id = coalesce(
                  (select t.organization_id from public.trips t where t.id = notification_queue.trip_id),
                  (select p.organization_id from public.profiles p where p.id = notification_queue.user_id)
              )
        )
    );

create policy "Admins can manage org trips"
    on public.trips for all
    using (public.is_org_admin(organization_id))
    with check (public.is_org_admin(organization_id));

create policy "Admins can view org itineraries"
    on public.itineraries for select
    using (
        exists (
            select 1
            from public.profiles admin
            join public.profiles owner on owner.id = itineraries.user_id
            where admin.id = auth.uid()
              and admin.role = 'admin'
              and admin.organization_id = owner.organization_id
        )
    );

drop policy if exists "Admins can manage invoices" on public.invoices;
create policy "Admins can manage invoices"
    on public.invoices for all
    using (public.is_org_admin(organization_id))
    with check (public.is_org_admin(organization_id));

drop policy if exists "Admins can manage invoice payments" on public.invoice_payments;
create policy "Admins can manage invoice payments"
    on public.invoice_payments for all
    using (public.is_org_admin(organization_id))
    with check (public.is_org_admin(organization_id));
