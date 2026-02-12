update public.profiles
set
    lifecycle_stage = coalesce(nullif(lifecycle_stage, ''), 'lead'),
    lead_status = coalesce(nullif(lead_status, ''), 'new'),
    client_tag = coalesce(nullif(client_tag, ''), 'standard')
where role = 'client';

