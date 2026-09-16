-- =============================================================================
-- Migration: 0013_early_access_table.sql
-- Description: Creates the early_access table for storing early-access requests,
--              migrates any legacy emails from subscriptions.razorpay_customer_id,
--              configures RLS policies, and enforces workspace uniqueness.
-- =============================================================================

-- 1. Create early_access table
create table if not exists public.early_access (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  selected_plan text not null,
  created_at    timestamptz not null default now(),
  constraint early_access_workspace_unique unique (workspace_id)
);

-- 2. Performance indexes
create index if not exists idx_early_access_workspace_id on public.early_access(workspace_id);
create index if not exists idx_early_access_email on public.early_access(email);

-- 3. Enable Row Level Security (RLS)
alter table public.early_access enable row level security;

-- Policy: Workspace members can view early access records for their workspace
drop policy if exists "early_access_workspace_member_select" on public.early_access;
create policy "early_access_workspace_member_select" on public.early_access
  for select using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = early_access.workspace_id
      and wm.user_id = auth.uid()
    )
  );

-- Policy: Workspace members can create early access records for their workspace
drop policy if exists "early_access_workspace_member_insert" on public.early_access;
create policy "early_access_workspace_member_insert" on public.early_access
  for insert with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = early_access.workspace_id
      and wm.user_id = auth.uid()
    )
  );

-- Policy: Workspace members can update early access records for their workspace
drop policy if exists "early_access_workspace_member_update" on public.early_access;
create policy "early_access_workspace_member_update" on public.early_access
  for update using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = early_access.workspace_id
      and wm.user_id = auth.uid()
    )
  );

-- 4. Safe Migration: Backfill any early access email stored in subscriptions.razorpay_customer_id
insert into public.early_access (email, workspace_id, selected_plan, created_at)
select 
  s.razorpay_customer_id as email,
  s.workspace_id,
  coalesce(s.razorpay_subscription_id, s.plan_id, '1-site') as selected_plan,
  s.created_at
from public.subscriptions s
where s.razorpay_customer_id is not null 
  and s.razorpay_customer_id like '%@%'
on conflict (workspace_id) do update
set email = excluded.email,
    selected_plan = excluded.selected_plan;

-- 5. Clean out email addresses from subscriptions.razorpay_customer_id (preserving valid non-email customer IDs)
update public.subscriptions
set razorpay_customer_id = null
where razorpay_customer_id is not null
  and razorpay_customer_id like '%@%';

-- 6. Notify PostgREST to reload schema cache
notify pgrst, 'reload schema';
