-- =============================================================================
-- Migration: 0004_webhooks_and_integrations.sql
-- Description: Creates webhooks and webhook_deliveries tables with RLS policies.
-- =============================================================================

create table if not exists webhooks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  url text not null,
  secret text not null,
  events text[] not null default array['lead.created'],
  status text not null default 'active' check (status in ('active', 'paused', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_webhooks_project_id on webhooks(project_id);
create index if not exists idx_webhooks_workspace_id on webhooks(workspace_id);

create table if not exists webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_id uuid not null references webhooks(id) on delete cascade,
  event text not null,
  payload jsonb not null,
  status_code int,
  response_body text,
  duration_ms int,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_webhook_deliveries_webhook_id on webhook_deliveries(webhook_id);

alter table webhooks enable row level security;
alter table webhook_deliveries enable row level security;

-- RLS: Workspace members can view webhooks for their workspace
drop policy if exists "webhooks_workspace_member_select" on webhooks;
create policy "webhooks_workspace_member_select" on webhooks
  for select using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = webhooks.workspace_id
      and wm.user_id = auth.uid()
    )
    or
    exists (
      select 1 from projects p
      where p.id = webhooks.project_id
      and p.user_id = auth.uid()
    )
  );

-- RLS: Workspace admin/owner can insert/update/delete webhooks
drop policy if exists "webhooks_workspace_admin_modify" on webhooks;
create policy "webhooks_workspace_admin_modify" on webhooks
  for all using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = webhooks.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
    )
    or
    exists (
      select 1 from projects p
      where p.id = webhooks.project_id
      and p.user_id = auth.uid()
    )
  );

-- RLS: Webhook deliveries select policy
drop policy if exists "webhook_deliveries_select" on webhook_deliveries;
create policy "webhook_deliveries_select" on webhook_deliveries
  for select using (
    exists (
      select 1 from webhooks w
      join workspace_members wm on wm.workspace_id = w.workspace_id
      where w.id = webhook_deliveries.webhook_id
      and wm.user_id = auth.uid()
    )
    or
    exists (
      select 1 from webhooks w
      join projects p on p.id = w.project_id
      where w.id = webhook_deliveries.webhook_id
      and p.user_id = auth.uid()
    )
  );