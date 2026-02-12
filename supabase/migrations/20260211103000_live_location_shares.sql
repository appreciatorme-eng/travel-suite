-- Live location share sessions for client/driver visibility.

create table if not exists public.trip_location_shares (
    id uuid default gen_random_uuid() primary key,
    trip_id uuid references public.trips(id) on delete cascade not null,
    day_number integer,
    share_token text unique not null,
    created_by uuid references public.profiles(id) on delete set null,
    is_active boolean default true,
    expires_at timestamptz default (now() + interval '24 hours'),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.trip_location_shares enable row level security;

create index if not exists idx_trip_location_shares_trip_day
    on public.trip_location_shares(trip_id, day_number);
create index if not exists idx_trip_location_shares_token
    on public.trip_location_shares(share_token);

drop policy if exists "Admins can manage trip location shares" on public.trip_location_shares;
create policy "Admins can manage trip location shares"
    on public.trip_location_shares for all
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

drop policy if exists "Clients can view own trip location shares" on public.trip_location_shares;
create policy "Clients can view own trip location shares"
    on public.trip_location_shares for select
    using (
        exists (
            select 1 from public.trips
            where trips.id = trip_location_shares.trip_id
            and trips.client_id = auth.uid()
        )
    );

drop trigger if exists set_updated_at_trip_location_shares on public.trip_location_shares;
create trigger set_updated_at_trip_location_shares
    before update on public.trip_location_shares
    for each row
    execute function public.handle_updated_at();
