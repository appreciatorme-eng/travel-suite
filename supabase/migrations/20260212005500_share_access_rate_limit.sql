-- Access logs for public live-share endpoint rate limiting.
create table if not exists public.trip_location_share_access_logs (
    id uuid default gen_random_uuid() primary key,
    share_token_hash text not null,
    ip_hash text not null,
    created_at timestamptz default now()
);

create index if not exists idx_trip_share_access_token_ip_created
    on public.trip_location_share_access_logs(share_token_hash, ip_hash, created_at desc);

create index if not exists idx_trip_share_access_created
    on public.trip_location_share_access_logs(created_at desc);

alter table public.trip_location_share_access_logs enable row level security;

create policy "Admins can view share access logs"
    on public.trip_location_share_access_logs for select
    using (
        exists (
            select 1
            from public.profiles
            where profiles.id = auth.uid()
              and profiles.role = 'admin'
        )
    );
