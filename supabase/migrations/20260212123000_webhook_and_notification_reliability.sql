create table if not exists public.whatsapp_webhook_events (
    id uuid primary key default gen_random_uuid(),
    provider_message_id text not null unique,
    wa_id text,
    event_type text not null default 'location',
    payload_hash text not null,
    processing_status text not null default 'received',
    reject_reason text,
    metadata jsonb not null default '{}'::jsonb,
    received_at timestamptz not null default now(),
    processed_at timestamptz
);

create index if not exists idx_whatsapp_webhook_events_received_at
    on public.whatsapp_webhook_events (received_at desc);

create index if not exists idx_whatsapp_webhook_events_status
    on public.whatsapp_webhook_events (processing_status, received_at desc);

create table if not exists public.notification_dead_letters (
    id uuid primary key default gen_random_uuid(),
    queue_id uuid not null references public.notification_queue(id) on delete cascade,
    organization_id uuid,
    trip_id uuid,
    user_id uuid,
    recipient_phone text,
    recipient_type text,
    notification_type text not null,
    payload jsonb not null default '{}'::jsonb,
    attempts integer not null default 0,
    error_message text,
    failed_channels text[] not null default '{}'::text[],
    created_at timestamptz not null default now()
);

create index if not exists idx_notification_dead_letters_queue_id
    on public.notification_dead_letters (queue_id);

create index if not exists idx_notification_dead_letters_created_at
    on public.notification_dead_letters (created_at desc);
