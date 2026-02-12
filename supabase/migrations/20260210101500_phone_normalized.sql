alter table public.profiles
    add column if not exists phone_normalized text;

create index if not exists profiles_phone_normalized_idx
    on public.profiles (phone_normalized);
