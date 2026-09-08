-- =============================================================================
-- Migration: 0002_workspaces_and_multi_tenancy.sql
-- Description: Establishes the full multi-tenant Workspace architecture.
--              Introduces workspaces, workspace_members (RBAC), and updates
--              websites/projects with workspace isolation and RLS policies.
-- =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- 1. WORKSPACES
-- =============================================================================
create table if not exists workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- =============================================================================
-- 2. WORKSPACE MEMBERS (RBAC: owner, admin, member, viewer)
-- =============================================================================
create table if not exists workspace_members (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at   timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists idx_workspace_members_user on workspace_members(user_id);
create index if not exists idx_workspace_members_ws on workspace_members(workspace_id);

-- =============================================================================
-- 3. WEBSITES (Properties tracked within a workspace)
-- =============================================================================
create table if not exists websites (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  domain       text,
  tracking_id  text not null unique,
  status       text not null default 'active' check (status in ('active', 'paused', 'pending')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index if not exists idx_websites_tracking_id on websites(tracking_id);
create index if not exists idx_websites_workspace_id on websites(workspace_id);

-- Add workspace_id to existing projects table for seamless backwards compatibility
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'projects') then
    if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'workspace_id') then
      alter table projects add column workspace_id uuid references workspaces(id) on delete cascade;
      create index if not exists idx_projects_workspace_id on projects(workspace_id);
    end if;
  end if;
end $$;

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table websites enable row level security;

-- Helper functions for RLS checks
create or replace function is_workspace_member(ws_id uuid)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id
    and user_id = auth.uid()
  );
$$;

-- Workspaces Policies
create policy "workspaces_member_select" on workspaces
  for select using (is_workspace_member(id));

create policy "workspaces_authenticated_insert" on workspaces
  for insert with check (auth.role() = 'authenticated');

create policy "workspaces_owner_admin_update" on workspaces
  for update using (
    exists (
      select 1 from workspace_members
      where workspace_id = id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

create policy "workspaces_owner_delete" on workspaces
  for delete using (
    exists (
      select 1 from workspace_members
      where workspace_id = id
      and user_id = auth.uid()
      and role = 'owner'
    )
  );

-- Workspace Members Policies
create policy "workspace_members_select" on workspace_members
  for select using (is_workspace_member(workspace_id));

create policy "workspace_members_insert" on workspace_members
  for insert with check (
    auth.role() = 'authenticated' or
    exists (
      select 1 from workspace_members
      where workspace_id = workspace_members.workspace_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

-- Websites Policies
create policy "websites_member_select" on websites
  for select using (is_workspace_member(workspace_id));

create policy "websites_member_insert" on websites
  for insert with check (
    exists (
      select 1 from workspace_members
      where workspace_id = websites.workspace_id
      and user_id = auth.uid()
      and role in ('owner', 'admin', 'member')
    )
  );

create policy "websites_member_update" on websites
  for update using (
    exists (
      select 1 from workspace_members
      where workspace_id = websites.workspace_id
      and user_id = auth.uid()
      and role in ('owner', 'admin', 'member')
    )
  );

create policy "websites_member_delete" on websites
  for delete using (
    exists (
      select 1 from workspace_members
      where workspace_id = websites.workspace_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );