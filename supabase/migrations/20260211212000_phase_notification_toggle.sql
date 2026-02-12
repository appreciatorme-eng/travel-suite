alter table public.profiles
    add column if not exists phase_notifications_enabled boolean not null default true;

update public.profiles
set phase_notifications_enabled = true
where phase_notifications_enabled is null;

