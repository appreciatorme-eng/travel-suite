-- Add tenant ownership to workflow stage events for strict API filtering
alter table public.workflow_stage_events
    add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

update public.workflow_stage_events e
set organization_id = p.organization_id
from public.profiles p
where e.profile_id = p.id
  and e.organization_id is null;

create index if not exists idx_workflow_stage_events_org_created
    on public.workflow_stage_events(organization_id, created_at desc);

-- Add tenant ownership to trips for direct org-level filtering in admin APIs
alter table public.trips
    add column if not exists organization_id uuid references public.organizations(id) on delete set null;

update public.trips t
set organization_id = p.organization_id
from public.profiles p
where t.client_id = p.id
  and t.organization_id is null;

create index if not exists idx_trips_organization_created
    on public.trips(organization_id, created_at desc);
