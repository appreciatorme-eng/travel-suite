-- Track client lifecycle transitions (Kanban movement audit)
create table if not exists public.workflow_stage_events (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid references public.profiles(id) on delete cascade not null,
    from_stage text not null,
    to_stage text not null,
    changed_by uuid references public.profiles(id) on delete set null,
    notes text,
    created_at timestamptz default now()
);

alter table public.workflow_stage_events enable row level security;

create index if not exists idx_workflow_stage_events_profile on public.workflow_stage_events(profile_id, created_at desc);

create policy "Admins can manage workflow stage events"
    on public.workflow_stage_events for all
    using (
        exists (
            select 1
            from public.profiles
            where profiles.id = auth.uid()
              and profiles.role = 'admin'
        )
    );

create policy "Users can view own workflow stage events"
    on public.workflow_stage_events for select
    using (auth.uid() = profile_id);

