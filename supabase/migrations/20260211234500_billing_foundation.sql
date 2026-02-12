-- Billing foundation tables for quote/confirmation/payment tracking
create table if not exists public.invoices (
    id uuid default gen_random_uuid() primary key,
    organization_id uuid references public.organizations(id) on delete cascade not null,
    trip_id uuid references public.trips(id) on delete set null,
    client_id uuid references public.profiles(id) on delete set null,
    invoice_number text not null,
    currency text not null default 'USD',
    subtotal_amount numeric(12,2) not null default 0,
    tax_amount numeric(12,2) not null default 0,
    total_amount numeric(12,2) not null default 0,
    paid_amount numeric(12,2) not null default 0,
    balance_amount numeric(12,2) not null default 0,
    status text not null default 'draft' check (status in ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled')),
    due_date date,
    issued_at timestamptz,
    paid_at timestamptz,
    metadata jsonb default '{}'::jsonb,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique (organization_id, invoice_number)
);

create index if not exists idx_invoices_org_status_created
    on public.invoices(organization_id, status, created_at desc);

create index if not exists idx_invoices_trip
    on public.invoices(trip_id);

create table if not exists public.invoice_payments (
    id uuid default gen_random_uuid() primary key,
    organization_id uuid references public.organizations(id) on delete cascade not null,
    invoice_id uuid references public.invoices(id) on delete cascade not null,
    amount numeric(12,2) not null,
    currency text not null default 'USD',
    method text,
    reference text,
    payment_date timestamptz not null default now(),
    status text not null default 'completed' check (status in ('pending', 'completed', 'failed', 'refunded')),
    notes text,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz default now()
);

create index if not exists idx_invoice_payments_invoice
    on public.invoice_payments(invoice_id, payment_date desc);

create index if not exists idx_invoice_payments_org_created
    on public.invoice_payments(organization_id, created_at desc);

alter table public.invoices enable row level security;
alter table public.invoice_payments enable row level security;

create policy "Admins can manage invoices"
    on public.invoices for all
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
              and profiles.role = 'admin'
              and profiles.organization_id = invoices.organization_id
        )
    );

create policy "Admins can manage invoice payments"
    on public.invoice_payments for all
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
              and profiles.role = 'admin'
              and profiles.organization_id = invoice_payments.organization_id
        )
    );
