-- =============================================================================
-- Migration: 0008_hubspot_enhancements.sql
-- Description:
--   1. Add last-touch attribution columns to leads table.
--   2. Add scopes column to crm_connections (records what OAuth granted).
--   3. Add project_id column to crm_sync_log for finer-grained tracing.
--   4. Mark connection inactive when refresh token is revoked (helper comment).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. LAST-TOUCH ATTRIBUTION FIELDS ON LEADS
-- HubSpot field map references last_touch_source/medium/campaign/content/term
-- but these columns were missing from the leads table.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'leads') then

    if not exists (select 1 from information_schema.columns where table_name = 'leads' and column_name = 'last_touch_source') then
      alter table leads add column last_touch_source    text;
      alter table leads add column last_touch_medium    text;
      alter table leads add column last_touch_campaign  text;
      alter table leads add column last_touch_content   text;
      alter table leads add column last_touch_term      text;
    end if;

  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. SCOPES COLUMN ON CRM_CONNECTIONS
-- Store which OAuth scopes were granted so we can validate before API calls.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'crm_connections') then

    if not exists (select 1 from information_schema.columns where table_name = 'crm_connections' and column_name = 'scopes') then
      alter table crm_connections add column scopes text;
    end if;

  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. PROJECT_ID COLUMN ON CRM_SYNC_LOG
-- Allows tracing a sync attempt back to the originating project (website),
-- not just the workspace.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'crm_sync_log') then

    if not exists (select 1 from information_schema.columns where table_name = 'crm_sync_log' and column_name = 'project_id') then
      alter table crm_sync_log add column project_id uuid references projects(id) on delete set null;
      create index if not exists idx_crm_sync_log_project_id on crm_sync_log(project_id);
    end if;

  end if;
end $$;
