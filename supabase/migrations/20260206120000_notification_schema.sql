
-- Push Tokens Table
create table if not exists public.push_tokens (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) not null,
    fcm_token text not null,
    platform text not null check (platform in ('ios', 'android')),
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists push_tokens_user_id_idx on public.push_tokens(user_id);
create unique index if not exists push_tokens_user_platform_idx on public.push_tokens(user_id, platform);

alter table public.push_tokens enable row level security;

create policy "Users can insert own tokens"
    on public.push_tokens for insert
    with check ( auth.uid() = user_id );

create policy "Users can update own tokens"
    on public.push_tokens for update
    using ( auth.uid() = user_id );

create policy "Users can delete own tokens"
    on public.push_tokens for delete
    using ( auth.uid() = user_id );

create policy "Users can view own tokens"
    on public.push_tokens for select
    using ( auth.uid() = user_id );


-- Notification Logs Table
create table if not exists public.notification_logs (
    id uuid default gen_random_uuid() primary key,
    trip_id uuid references public.trips(id),
    recipient_id uuid references public.profiles(id),
    recipient_phone text,
    recipient_type text check (recipient_type in ('client', 'driver')),
    notification_type text not null,
    title text,
    body text,
    status text default 'pending' check (status in ('pending', 'sent', 'delivered', 'failed')),
    external_id text,
    error_message text,
    sent_at timestamptz,
    created_at timestamptz default now()
);

alter table public.notification_logs enable row level security;

create policy "Admins can view all logs"
    on public.notification_logs for select
    using ( 
        exists (
            select 1 from public.profiles
            where public.profiles.id = auth.uid()
            and public.profiles.role = 'admin'
        )
    );

create policy "Admins can insert logs"
    on public.notification_logs for insert
    with check ( 
        exists (
            select 1 from public.profiles
            where public.profiles.id = auth.uid()
            and public.profiles.role = 'admin'
        )
    );

create policy "Users can view their own notifications"
    on public.notification_logs for select
    using ( auth.uid() = recipient_id );
