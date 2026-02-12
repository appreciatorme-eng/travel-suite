create table if not exists public.crm_contacts (
    id uuid default gen_random_uuid() primary key,
    organization_id uuid references public.organizations(id) on delete cascade not null,
    full_name text not null,
    email text,
    phone text,
    phone_normalized text,
    source text default 'manual',
    notes text,
    converted_profile_id uuid references public.profiles(id) on delete set null,
    converted_at timestamptz,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_crm_contacts_org_created
    on public.crm_contacts(organization_id, created_at desc);

create index if not exists idx_crm_contacts_org_phone
    on public.crm_contacts(organization_id, phone_normalized);

create index if not exists idx_crm_contacts_org_email
    on public.crm_contacts(organization_id, lower(email));

alter table public.crm_contacts enable row level security;

create policy "Admins can manage crm contacts"
    on public.crm_contacts for all
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
              and profiles.role = 'admin'
        )
    );

