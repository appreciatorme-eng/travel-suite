-- Channel-level delivery tracking for notification queue processing.
create table if not exists public.notification_delivery_status (
    id uuid default gen_random_uuid() primary key,
    organization_id uuid references public.organizations(id) on delete set null,
    queue_id uuid references public.notification_queue(id) on delete cascade,
    trip_id uuid references public.trips(id) on delete set null,
    user_id uuid references public.profiles(id) on delete set null,
    recipient_phone text,
    recipient_type text check (recipient_type in ('client', 'driver', 'admin')),
    channel text not null check (channel in ('whatsapp', 'push', 'email')),
    provider text,
    provider_message_id text,
    notification_type text,
    status text not null check (status in ('queued', 'processing', 'sent', 'failed', 'skipped', 'retrying')),
    attempt_number integer not null default 1,
    error_message text,
    metadata jsonb default '{}'::jsonb,
    sent_at timestamptz,
    failed_at timestamptz,
    created_at timestamptz default now()
);

create index if not exists idx_notification_delivery_status_queue
    on public.notification_delivery_status(queue_id, created_at desc);

create index if not exists idx_notification_delivery_status_status
    on public.notification_delivery_status(status, created_at desc);

create index if not exists idx_notification_delivery_status_org
    on public.notification_delivery_status(organization_id, created_at desc);

create index if not exists idx_notification_delivery_status_trip
    on public.notification_delivery_status(trip_id, created_at desc);

alter table public.notification_delivery_status enable row level security;

create policy "Admins can view notification delivery status"
    on public.notification_delivery_status for select
    using (
        exists (
            select 1
            from public.profiles admin
            where admin.id = auth.uid()
              and admin.role = 'admin'
              and admin.organization_id = coalesce(
                  notification_delivery_status.organization_id,
                  (select t.organization_id from public.trips t where t.id = notification_delivery_status.trip_id),
                  (select p.organization_id from public.profiles p where p.id = notification_delivery_status.user_id)
              )
        )
    );

create policy "Users can view own delivery status"
    on public.notification_delivery_status for select
    using (auth.uid() = user_id);

create policy "Admins can manage notification delivery status"
    on public.notification_delivery_status for all
    using (
        exists (
            select 1
            from public.profiles admin
            where admin.id = auth.uid()
              and admin.role = 'admin'
              and admin.organization_id = coalesce(
                  notification_delivery_status.organization_id,
                  (select t.organization_id from public.trips t where t.id = notification_delivery_status.trip_id),
                  (select p.organization_id from public.profiles p where p.id = notification_delivery_status.user_id)
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
                  notification_delivery_status.organization_id,
                  (select t.organization_id from public.trips t where t.id = notification_delivery_status.trip_id),
                  (select p.organization_id from public.profiles p where p.id = notification_delivery_status.user_id)
              )
        )
    );
