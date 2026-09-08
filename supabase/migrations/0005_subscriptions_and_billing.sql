-- =============================================================================
-- Migration: 0005_subscriptions_and_billing.sql
-- Description: Subscriptions and billing invoices tables with RLS policies.
-- =============================================================================

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade unique,
  plan_id text not null default 'starter' check (plan_id in ('starter', 'growth', 'enterprise')),
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled', 'trialing')),
  razorpay_customer_id text,
  razorpay_subscription_id text,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '30 days'),
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_workspace_id on subscriptions(workspace_id);
create index if not exists idx_subscriptions_razorpay_subscription_id on subscriptions(razorpay_subscription_id);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  subscription_id uuid references subscriptions(id) on delete set null,
  razorpay_payment_id text,
  razorpay_invoice_id text,
  amount numeric not null,
  currency text not null default 'USD',
  status text not null default 'paid' check (status in ('paid', 'pending', 'failed')),
  paid_at timestamptz default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_invoices_workspace_id on invoices(workspace_id);

alter table subscriptions enable row level security;
alter table invoices enable row level security;

-- RLS: Workspace members can view subscriptions for their workspace
drop policy if exists "subscriptions_workspace_member_select" on subscriptions;
create policy "subscriptions_workspace_member_select" on subscriptions
  for select using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = subscriptions.workspace_id
      and wm.user_id = auth.uid()
    )
  );

-- RLS: Workspace admin/owner can update subscriptions
drop policy if exists "subscriptions_workspace_admin_modify" on subscriptions;
create policy "subscriptions_workspace_admin_modify" on subscriptions
  for all using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = subscriptions.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
    )
  );

-- RLS: Workspace members can view invoices
drop policy if exists "invoices_workspace_member_select" on invoices;
create policy "invoices_workspace_member_select" on invoices
  for select using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = invoices.workspace_id
      and wm.user_id = auth.uid()
    )
  );