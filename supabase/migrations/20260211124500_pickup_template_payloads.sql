-- Add template metadata into queued pickup reminder payloads.

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
        select d.full_name, d.phone
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
