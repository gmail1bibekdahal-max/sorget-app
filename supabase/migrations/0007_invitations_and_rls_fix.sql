-- =============================================================================
-- Migration: 0007_invitations_and_rls_fix.sql
-- Description: 
--   1. Ensure workspaces & workspace_members base tables exist (idempotent).
--   2. Fix critical RLS vulnerability on workspace_members (remove auth.role() = 'authenticated' loophole).
--   3. Enforce strict workspace isolation and proper RBAC for membership insert/update/delete.
--   4. Create workspace_invitations table for secure, token-based team invitations.
--   5. Update projects select policy to allow workspace members to view workspace-scoped projects.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 0. ENSURE BASE WORKSPACE TABLES EXIST (IDEMPOTENT)
-- ---------------------------------------------------------------------------

create table if not exists workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

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

alter table workspaces enable row level security;
alter table workspace_members enable row level security;

-- Ensure workspace_id column exists on projects
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'projects') then
    if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'workspace_id') then
      alter table projects add column workspace_id uuid references workspaces(id) on delete cascade;
      create index if not exists idx_projects_workspace_id on projects(workspace_id);
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. FIX WORKSPACE_MEMBERS RLS POLICIES
-- ---------------------------------------------------------------------------

-- Drop vulnerable insert policy that allowed arbitrary authenticated users to insert into any workspace
drop policy if exists "workspace_members_insert" on workspace_members;
drop policy if exists "workspace_members_update" on workspace_members;
drop policy if exists "workspace_members_delete" on workspace_members;

-- Secure insert policy:
-- 1. Workspace owners/admins can add new members.
-- 2. An authenticated user can claim the initial 'owner' role ONLY for a newly created workspace that has no members yet.
create policy "workspace_members_insert" on workspace_members
  for insert with check (
    -- Existing workspace owner or admin can add members
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
    )
    or
    -- Initial owner creation for a brand-new workspace with zero existing members
    (
      user_id = auth.uid()
      and role = 'owner'
      and not exists (
        select 1 from workspace_members wm
        where wm.workspace_id = workspace_members.workspace_id
      )
    )
  );

-- Secure update policy: Only workspace owners can modify member roles
create policy "workspace_members_update" on workspace_members
  for update using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
    )
  );

-- Secure delete policy:
-- 1. A member can remove themselves (leave workspace).
-- 2. A workspace owner or admin can remove other members.
create policy "workspace_members_delete" on workspace_members
  for delete using (
    user_id = auth.uid()
    or
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 2. WORKSPACE INVITATIONS TABLE & RLS
-- ---------------------------------------------------------------------------

create table if not exists workspace_invitations (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email        text not null,
  role         text not null check (role in ('admin', 'member', 'viewer')),
  token        text not null unique,
  invited_by   uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at   timestamptz not null default (now() + interval '7 days'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_workspace_invitations_ws on workspace_invitations(workspace_id);
create index if not exists idx_workspace_invitations_token on workspace_invitations(token);
create index if not exists idx_workspace_invitations_email on workspace_invitations(email);

alter table workspace_invitations enable row level security;

-- Workspace owners and admins can view pending invitations for their workspace
drop policy if exists "workspace_invitations_select" on workspace_invitations;
create policy "workspace_invitations_select" on workspace_invitations
  for select using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_invitations.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
    )
  );

-- Workspace owners and admins can create invitations
drop policy if exists "workspace_invitations_insert" on workspace_invitations;
create policy "workspace_invitations_insert" on workspace_invitations
  for insert with check (
    invited_by = auth.uid()
    and
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_invitations.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
    )
  );

-- Workspace owners and admins can update/revoke invitations
drop policy if exists "workspace_invitations_update" on workspace_invitations;
create policy "workspace_invitations_update" on workspace_invitations
  for update using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_invitations.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
    )
  );

-- Workspace owners and admins can delete invitations
drop policy if exists "workspace_invitations_delete" on workspace_invitations;
create policy "workspace_invitations_delete" on workspace_invitations
  for delete using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_invitations.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 3. PROJECTS WORKSPACE-MEMBER SELECT RLS
-- ---------------------------------------------------------------------------

-- Ensure workspace members can view projects belonging to their workspace
drop policy if exists "projects_member_select" on projects;
create policy "projects_member_select" on projects
  for select using (
    auth.uid() = user_id
    or
    (
      workspace_id is not null
      and
      exists (
        select 1 from workspace_members wm
        where wm.workspace_id = projects.workspace_id
        and wm.user_id = auth.uid()
      )
    )
  );
