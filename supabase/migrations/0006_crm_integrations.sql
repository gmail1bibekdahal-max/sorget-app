-- =============================================================================
-- Migration: 0006_crm_integrations.sql
-- Description: CRM connector credentials, sync log, and contact mapping tables.
-- =============================================================================

create table if not exists crm_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  provider text not null check (provider in ('hubspot', 'salesforce')),
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  portal_id text,
  instance_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, provider)
);

create index if not exists idx_crm_connections_workspace_id on crm_connections(workspace_id);

create table if not exists crm_sync_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  provider text not null,
  direction text not null default 'push' check (direction in ('push', 'pull')),
  status text not null default 'success' check (status in ('success', 'error', 'skipped')),
  external_contact_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_crm_sync_log_workspace_id on crm_sync_log(workspace_id);
create index if not exists idx_crm_sync_log_lead_id on crm_sync_log(lead_id);

alter table crm_connections enable row level security;
alter table crm_sync_log enable row level security;

-- Only workspace admins/owners can view or modify CRM connections
drop policy if exists "crm_connections_admin_only" on crm_connections;
create policy "crm_connections_admin_only" on crm_connections
  for all using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = crm_connections.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
    )
  );

-- Workspace members can view sync logs
drop policy if exists "crm_sync_log_member_select" on crm_sync_log;
create policy "crm_sync_log_member_select" on crm_sync_log
  for select using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = crm_sync_log.workspace_id
      and wm.user_id = auth.uid()
    )
  );