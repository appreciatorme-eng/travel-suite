-- Configurable notification toggles for lifecycle stage transitions
create table if not exists public.workflow_notification_rules (
    id uuid default gen_random_uuid() primary key,
    organization_id uuid references public.organizations(id) on delete cascade,
    lifecycle_stage text not null,
    notify_client boolean not null default true,
    updated_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_workflow_notification_rules_org
    on public.workflow_notification_rules(organization_id, lifecycle_stage);
create unique index if not exists uq_workflow_notification_rules_org_stage
    on public.workflow_notification_rules(organization_id, lifecycle_stage);

alter table public.workflow_notification_rules enable row level security;

create policy "Admins can manage workflow notification rules"
    on public.workflow_notification_rules for all
    using (
        exists (
            select 1
            from public.profiles
            where profiles.id = auth.uid()
              and profiles.role = 'admin'
        )
    );
