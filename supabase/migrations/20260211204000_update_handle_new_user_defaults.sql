create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
    insert into public.profiles (id, email, full_name, avatar_url, lead_status, lifecycle_stage, client_tag)
    values (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url',
        'new',
        'lead',
        'standard'
    );
    return new;
end;
$$;

