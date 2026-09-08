-- =============================================================================
-- Migration: 0001_initial_schema.sql
-- Description: Initial schema — projects and leads tables.
--              Documents the schema as it exists after Phases 1-10.
--              Applied manually to Supabase before migration tracking was set up.
-- =============================================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- =============================================================================
-- TABLE: projects
-- Owned by a single user (user_id). Phase 9 will introduce workspaces.
-- =============================================================================
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  website     text,
  tracking_id text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for fast tracking_id lookups (used by SDK lead ingestion on every request)
create unique index if not exists projects_tracking_id_idx on projects(tracking_id);

-- Index for user dashboard queries
create index if not exists projects_user_id_idx on projects(user_id);

-- =============================================================================
-- TABLE: leads
-- Attribution records submitted by the tracking SDK.
-- project_id references projects(id) — the server resolves tracking_id -> project UUID.
-- NEVER accept project_id from browser clients directly.
-- =============================================================================
create table if not exists leads (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  name           text,
  email          text not null,
  channel        text,
  source         text,
  medium         text,
  campaign       text,
  content        text,
  term           text,
  gclid          text,
  gbraid         text,
  gad_campaignid text,
  gad_source     text,
  referrer       text,
  landing_url    text,
  landing_page   text,
  created_at     timestamptz not null default now()
);

-- Index for project-scoped lead queries
create index if not exists leads_project_id_idx on leads(project_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- Enforces per-user data isolation. Never rely solely on application-level checks.
-- =============================================================================

alter table projects enable row level security;
alter table leads enable row level security;

-- Projects: users can only see and modify their own projects
create policy "projects_owner_select" on projects
  for select using (auth.uid() = user_id);

create policy "projects_owner_insert" on projects
  for insert with check (auth.uid() = user_id);

create policy "projects_owner_update" on projects
  for update using (auth.uid() = user_id);

create policy "projects_owner_delete" on projects
  for delete using (auth.uid() = user_id);

-- Leads: users can see leads for their own projects only
create policy "leads_owner_select" on leads
  for select using (
    exists (
      select 1 from projects p
      where p.id = leads.project_id
      and p.user_id = auth.uid()
    )
  );

-- Lead inserts happen via service role (API route) — no client RLS needed for INSERT
-- The API route resolves tracking_id server-side and uses the service role key.
-- =============================================================================

-- =============================================================================
-- NEXT MIGRATIONS (planned):
--   0002_workspaces.sql         — workspaces, workspace_members, migrate projects to workspace_id
--   0003_websites.sql           — websites table replacing project concept
--   0004_custom_parameters.sql  — custom URL parameter config
--   0005_form_configs.sql       — form field mapping configuration
--   0006_integrations.sql       — integration_connections, integration_mappings
--   0007_api_keys.sql           — customer API keys (hashed)
--   0008_subscriptions.sql      — plans, subscriptions (Razorpay)
--   0009_webhooks.sql           — webhook_endpoints, webhook_deliveries
--   0010_audit_logs.sql         — audit_logs, system_logs
-- =============================================================================