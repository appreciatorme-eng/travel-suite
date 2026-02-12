-- Pickup reminder queue extensions + assignment triggers

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists public.notification_queue (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade,
    trip_id uuid references public.trips(id) on delete cascade,
    notification_type text not null check (notification_type in (
        'daily_briefing', 'trip_reminder', 'driver_assigned',
        'pickup_reminder', 'custom'
    )),
    recipient_phone text,
    recipient_type text check (recipient_type in ('client', 'driver', 'admin')),
    channel_preference text default 'whatsapp_first',
    idempotency_key text,
    scheduled_for timestamptz not null,
    payload jsonb not null default '{}'::jsonb,
    status text default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    attempts integer default 0,
    last_attempt_at timestamptz,
    processed_at timestamptz,
    error_message text,
    created_at timestamptz default now()
);

alter table public.notification_queue enable row level security;

create index if not exists idx_notification_queue_scheduled on public.notification_queue(scheduled_for, status);
create index if not exists idx_notification_queue_user on public.notification_queue(user_id);
create index if not exists idx_notification_queue_trip on public.notification_queue(trip_id);

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'notification_queue'
          and policyname = 'Admins can view notification queue'
    ) then
        create policy "Admins can view notification queue"
            on public.notification_queue for select
            using (
                exists (
                    select 1 from public.profiles
                    where profiles.id = auth.uid()
                      and profiles.role = 'admin'
                )
            );
    end if;

    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'notification_queue'
          and policyname = 'Admins can manage notification queue'
    ) then
        create policy "Admins can manage notification queue"
            on public.notification_queue for all
            using (
                exists (
                    select 1 from public.profiles
                    where profiles.id = auth.uid()
                      and profiles.role = 'admin'
                )
            );
    end if;
end $$;

alter table public.notification_queue
    add column if not exists recipient_phone text,
    add column if not exists recipient_type text,
    add column if not exists channel_preference text default 'whatsapp_first',
    add column if not exists idempotency_key text;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'notification_queue_recipient_type_check'
    ) then
        alter table public.notification_queue
            add constraint notification_queue_recipient_type_check
            check (recipient_type is null or recipient_type in ('client', 'driver', 'admin'));
    end if;
end $$;

create unique index if not exists idx_notification_queue_idempotency
    on public.notification_queue(idempotency_key)
    where idempotency_key is not null;

create or replace function public.queue_pickup_reminders_from_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
    trip_rec record;
    driver_rec record;
    pickup_ts timestamptz;
    reminder_ts timestamptz;
    pickup_time_text text;
    pickup_location_text text;
    destination_text text;
begin
    select
        t.id,
        t.client_id,
        t.start_date,
        i.trip_title,
        coalesce(i.destination, '') as destination,
        p.full_name as client_name,
        coalesce(p.phone_normalized, p.phone, '') as client_phone
    into trip_rec
    from public.trips t
    left join public.itineraries i on i.id = t.itinerary_id
    left join public.profiles p on p.id = t.client_id
    where t.id = new.trip_id;

    if not found then
        return new;
    end if;

    -- Cancel pending reminders if assignment is incomplete.
    if new.pickup_time is null then
        update public.notification_queue
        set
            status = 'cancelled',
            processed_at = now(),
            error_message = 'Pickup time removed by assignment update'
        where idempotency_key in (
            new.id::text || ':client:pickup',
            new.id::text || ':driver:pickup'
        )
        and status in ('pending', 'processing');

        return new;
    end if;

    pickup_ts := (
        (trip_rec.start_date::date + (new.day_number - 1))::timestamp
        + new.pickup_time
    )::timestamptz;

    reminder_ts := greatest(pickup_ts - interval '60 minutes', now());
    pickup_time_text := to_char(new.pickup_time, 'HH24:MI');
    pickup_location_text := coalesce(nullif(new.pickup_location, ''), 'Hotel lobby');
    destination_text := coalesce(nullif(trip_rec.destination, ''), 'your destination');

    insert into public.notification_queue (
        user_id,
        trip_id,
        notification_type,
        recipient_phone,
        recipient_type,
        scheduled_for,
        payload,
        status,
        idempotency_key
    )
    values (
        trip_rec.client_id,
        new.trip_id,
        'pickup_reminder',
        nullif(trip_rec.client_phone, ''),
        'client',
        reminder_ts,
        jsonb_build_object(
            'title', 'Pickup Reminder',
            'body', format(
                'Your pickup is in 1 hour (%s) at %s for Day %s.',
                pickup_time_text,
                pickup_location_text,
                new.day_number
            ),
            'template_key', 'pickup_reminder_client',
            'template_vars', jsonb_build_object(
                'pickup_time', pickup_time_text,
                'pickup_location', pickup_location_text,
                'day_number', new.day_number,
                'destination', destination_text,
                'trip_title', coalesce(trip_rec.trip_title, destination_text)
            ),
            'trip_id', new.trip_id::text,
            'day_number', new.day_number,
            'pickup_time', pickup_time_text,
            'pickup_location', pickup_location_text,
            'destination', destination_text,
            'trip_title', coalesce(trip_rec.trip_title, destination_text),
            'recipient', 'client'
        ),
        'pending',
        new.id::text || ':client:pickup'
    )
    on conflict (idempotency_key)
    do update set
        user_id = excluded.user_id,
        recipient_phone = excluded.recipient_phone,
        scheduled_for = excluded.scheduled_for,
        payload = excluded.payload,
        status = 'pending',
        attempts = 0,
        error_message = null,
        last_attempt_at = null,
        processed_at = null;

    if new.external_driver_id is not null then
        select
            d.full_name,
            d.phone
        into driver_rec
        from public.external_drivers d
        where d.id = new.external_driver_id;

        insert into public.notification_queue (
            user_id,
            trip_id,
            notification_type,
            recipient_phone,
            recipient_type,
            scheduled_for,
            payload,
            status,
            idempotency_key
        )
        values (
            null,
            new.trip_id,
            'pickup_reminder',
            coalesce(driver_rec.phone, ''),
            'driver',
            reminder_ts,
            jsonb_build_object(
                'title', 'Upcoming Pickup',
                'body', format(
                    'Pickup in 1 hour (%s) at %s. Client: %s.',
                    pickup_time_text,
                    pickup_location_text,
                    coalesce(trip_rec.client_name, 'Client')
                ),
                'template_key', 'pickup_reminder_driver',
                'template_vars', jsonb_build_object(
                    'pickup_time', pickup_time_text,
                    'pickup_location', pickup_location_text,
                    'day_number', new.day_number,
                    'client_name', coalesce(trip_rec.client_name, 'Client'),
                    'destination', destination_text,
                    'trip_title', coalesce(trip_rec.trip_title, destination_text)
                ),
                'trip_id', new.trip_id::text,
                'day_number', new.day_number,
                'pickup_time', pickup_time_text,
                'pickup_location', pickup_location_text,
                'destination', destination_text,
                'trip_title', coalesce(trip_rec.trip_title, destination_text),
                'recipient', 'driver'
            ),
            'pending',
            new.id::text || ':driver:pickup'
        )
        on conflict (idempotency_key)
        do update set
            recipient_phone = excluded.recipient_phone,
            scheduled_for = excluded.scheduled_for,
            payload = excluded.payload,
            status = 'pending',
            attempts = 0,
            error_message = null,
            last_attempt_at = null,
            processed_at = null;
    else
        update public.notification_queue
        set
            status = 'cancelled',
            processed_at = now(),
            error_message = 'Driver removed from assignment'
        where idempotency_key = new.id::text || ':driver:pickup'
        and status in ('pending', 'processing');
    end if;

    return new;
end;
$function$;

create or replace function public.cancel_pickup_reminders_on_assignment_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
    update public.notification_queue
    set
        status = 'cancelled',
        processed_at = now(),
        error_message = 'Assignment deleted'
    where idempotency_key in (
        old.id::text || ':client:pickup',
        old.id::text || ':driver:pickup'
    )
    and status in ('pending', 'processing');

    return old;
end;
$function$;

drop trigger if exists trg_queue_pickup_reminders on public.trip_driver_assignments;
create trigger trg_queue_pickup_reminders
after insert or update of pickup_time, pickup_location, external_driver_id, day_number
on public.trip_driver_assignments
for each row
execute function public.queue_pickup_reminders_from_assignment();

drop trigger if exists trg_cancel_pickup_reminders_delete on public.trip_driver_assignments;
create trigger trg_cancel_pickup_reminders_delete
after delete
on public.trip_driver_assignments
for each row
execute function public.cancel_pickup_reminders_on_assignment_delete();
