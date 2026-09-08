-- =============================================================================
-- Sorget / Attributer — Complete Consolidated Database Schema
-- Description: Sets up the entire database from scratch in a single execution.
--              Includes all tables, extensions, indexes, and hardened RLS policies.
-- =============================================================================

-- 1. Enable Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 2. WORKSPACES & WORKSPACE MEMBERS (Multi-Tenancy & RBAC)
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

-- Helper function for RLS checks
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
drop policy if exists "workspaces_member_select" on workspaces;
create policy "workspaces_member_select" on workspaces
  for select using (is_workspace_member(id));

drop policy if exists "workspaces_authenticated_insert" on workspaces;
create policy "workspaces_authenticated_insert" on workspaces
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "workspaces_owner_admin_update" on workspaces;
create policy "workspaces_owner_admin_update" on workspaces
  for update using (
    exists (
      select 1 from workspace_members
      where workspace_id = id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

drop policy if exists "workspaces_owner_delete" on workspaces;
create policy "workspaces_owner_delete" on workspaces
  for delete using (
    exists (
      select 1 from workspace_members
      where workspace_id = id
      and user_id = auth.uid()
      and role = 'owner'
    )
  );

-- Workspace Members Policies (Hardened)
drop policy if exists "workspace_members_select" on workspace_members;
create policy "workspace_members_select" on workspace_members
  for select using (is_workspace_member(workspace_id));

drop policy if exists "workspace_members_insert" on workspace_members;
create policy "workspace_members_insert" on workspace_members
  for insert with check (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
    )
    or
    (
      user_id = auth.uid()
      and role = 'owner'
      and not exists (
        select 1 from workspace_members wm
        where wm.workspace_id = workspace_members.workspace_id
      )
    )
  );

drop policy if exists "workspace_members_update" on workspace_members;
create policy "workspace_members_update" on workspace_members
  for update using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
    )
  );

drop policy if exists "workspace_members_delete" on workspace_members;
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
-- 3. WORKSPACE INVITATIONS
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
-- ---------------------------------------------------------------------------
-- 4. PROJECTS (Canonical Websites / Tracked Domains)
-- ---------------------------------------------------------------------------

create table if not exists projects (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  website      text,
  tracking_id  text not null unique,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index if not exists projects_tracking_id_idx on projects(tracking_id);
create index if not exists projects_user_id_idx on projects(user_id);
create index if not exists idx_projects_workspace_id on projects(workspace_id);

alter table projects enable row level security;

drop policy if exists "projects_owner_select" on projects;
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

drop policy if exists "projects_owner_insert" on projects;
create policy "projects_owner_insert" on projects
  for insert with check (auth.uid() = user_id);

drop policy if exists "projects_owner_update" on projects;
create policy "projects_owner_update" on projects
  for update using (auth.uid() = user_id);

drop policy if exists "projects_owner_delete" on projects;
create policy "projects_owner_delete" on projects
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. LEADS (Attribution Records)
-- ---------------------------------------------------------------------------

create table if not exists leads (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references projects(id) on delete cascade,
  name               text,
  email              text not null,
  channel            text,
  source             text,
  medium             text,
  campaign           text,
  content            text,
  term               text,
  gclid              text,
  gbraid             text,
  gad_campaignid     text,
  gad_source         text,
  drilldown1         text,
  drilldown2         text,
  drilldown3         text,
  referrer           text,
  landing_url        text,
  landing_page       text,
  landing_page_group text,
  submit_page        text,
  created_at         timestamptz not null default now()
);

create index if not exists leads_project_id_idx on leads(project_id);

alter table leads enable row level security;

drop policy if exists "leads_owner_select" on leads;
drop policy if exists "leads_workspace_member_select" on leads;
create policy "leads_workspace_member_select" on leads
  for select using (
    exists (
      select 1 from projects p
      where p.id = leads.project_id
      and (
        p.user_id = auth.uid()
        or
        (
          p.workspace_id is not null
          and exists (
            select 1 from workspace_members wm
            where wm.workspace_id = p.workspace_id
            and wm.user_id = auth.uid()
          )
        )
      )
    )
  );

drop policy if exists "leads_workspace_admin_delete" on leads;
create policy "leads_workspace_admin_delete" on leads
  for delete using (
    exists (
      select 1 from projects p
      where p.id = leads.project_id
      and (
        p.user_id = auth.uid()
        or
        (
          p.workspace_id is not null
          and exists (
            select 1 from workspace_members wm
            where wm.workspace_id = p.workspace_id
            and wm.user_id = auth.uid()
            and wm.role in ('owner', 'admin')
          )
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 6. WEBHOOKS
-- ---------------------------------------------------------------------------

create table if not exists webhooks (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  project_id   uuid references projects(id) on delete cascade,
  url          text not null,
  secret       text not null,
  events       text[] not null default array['lead.created'],
  status       text not null default 'active' check (status in ('active', 'paused', 'disabled')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_webhooks_project_id on webhooks(project_id);
create index if not exists idx_webhooks_workspace_id on webhooks(workspace_id);

create table if not exists webhook_deliveries (
  id            uuid primary key default gen_random_uuid(),
  webhook_id    uuid not null references webhooks(id) on delete cascade,
  event         text not null,
  payload       jsonb not null,
  status_code   int,
  response_body text,
  duration_ms   int,
  error         text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_webhook_deliveries_webhook_id on webhook_deliveries(webhook_id);

alter table webhooks enable row level security;
alter table webhook_deliveries enable row level security;

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

-- ---------------------------------------------------------------------------
-- 7. SUBSCRIPTIONS & BILLING (Razorpay)
-- ---------------------------------------------------------------------------

create table if not exists subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid not null references workspaces(id) on delete cascade unique,
  plan_id                  text not null default 'starter' check (plan_id in ('starter', 'growth', 'enterprise')),
  status                   text not null default 'active' check (status in ('active', 'past_due', 'canceled', 'trialing')),
  razorpay_customer_id     text,
  razorpay_subscription_id text,
  current_period_start     timestamptz not null default now(),
  current_period_end       timestamptz not null default (now() + interval '30 days'),
  cancel_at_period_end     boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists idx_subscriptions_workspace_id on subscriptions(workspace_id);
create index if not exists idx_subscriptions_razorpay_subscription_id on subscriptions(razorpay_subscription_id);

alter table subscriptions enable row level security;

drop policy if exists "subscriptions_workspace_member_select" on subscriptions;
create policy "subscriptions_workspace_member_select" on subscriptions
  for select using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = subscriptions.workspace_id
      and wm.user_id = auth.uid()
    )
  );

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

-- ---------------------------------------------------------------------------
-- 8. CRM INTEGRATIONS (HubSpot)
-- ---------------------------------------------------------------------------

create table if not exists crm_connections (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references workspaces(id) on delete cascade,
  provider         text not null check (provider in ('hubspot', 'salesforce')),
  access_token     text,
  refresh_token    text,
  token_expires_at timestamptz,
  portal_id        text,
  is_active        boolean not null default true,
  scopes           text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique(workspace_id, provider)
);

create index if not exists idx_crm_connections_workspace_id on crm_connections(workspace_id);

create table if not exists crm_sync_log (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references workspaces(id) on delete cascade,
  lead_id             uuid references leads(id) on delete set null,
  provider            text not null,
  direction           text not null default 'push' check (direction in ('push', 'pull')),
  status              text not null default 'success' check (status in ('success', 'error', 'skipped')),
  external_contact_id text,
  error_message       text,
  created_at          timestamptz not null default now()
);

create index if not exists idx_crm_sync_log_workspace_id on crm_sync_log(workspace_id);
create index if not exists idx_crm_sync_log_lead_id on crm_sync_log(lead_id);

alter table crm_connections enable row level security;
alter table crm_sync_log enable row level security;

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

drop policy if exists "crm_sync_log_member_select" on crm_sync_log;
create policy "crm_sync_log_member_select" on crm_sync_log
  for select using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = crm_sync_log.workspace_id
      and wm.user_id = auth.uid()
    )
  );
