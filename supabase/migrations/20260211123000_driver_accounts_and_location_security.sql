-- Driver account mapping + stronger location publish authorization.

create table if not exists public.driver_accounts (
    id uuid default gen_random_uuid() primary key,
    external_driver_id uuid references public.external_drivers(id) on delete cascade not null unique,
    profile_id uuid references public.profiles(id) on delete cascade not null unique,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.driver_accounts enable row level security;

create index if not exists idx_driver_accounts_profile on public.driver_accounts(profile_id);

drop policy if exists "Admins can manage driver accounts" on public.driver_accounts;
create policy "Admins can manage driver accounts"
    on public.driver_accounts for all
    using (
        exists (
            select 1
            from public.profiles
            where profiles.id = auth.uid()
              and profiles.role = 'admin'
        )
    );

drop policy if exists "Drivers can view own mapping" on public.driver_accounts;
create policy "Drivers can view own mapping"
    on public.driver_accounts for select
    using (profile_id = auth.uid());

drop trigger if exists set_updated_at_driver_accounts on public.driver_accounts;
create trigger set_updated_at_driver_accounts
    before update on public.driver_accounts
    for each row
    execute function public.handle_updated_at();

create or replace function public.can_publish_driver_location(target_trip_id uuid, actor_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select
      exists (
          select 1
          from public.trips t
          where t.id = target_trip_id
            and t.driver_id = actor_user_id
      )
      or exists (
          select 1
          from public.trip_driver_assignments a
          join public.driver_accounts da
            on da.external_driver_id = a.external_driver_id
           and da.is_active = true
          where a.trip_id = target_trip_id
            and da.profile_id = actor_user_id
      );
$$;

drop policy if exists "Drivers can insert their own locations" on public.driver_locations;
create policy "Drivers can insert assigned trip locations"
    on public.driver_locations for insert
    with check (
        auth.uid() = driver_id
        and public.can_publish_driver_location(trip_id, auth.uid())
    );
