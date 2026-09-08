-- =============================================================================
-- Migration: 0009_database_cleanup_phase2.sql
-- Description: Phase 2 Database Cleanup (Attributer Alignment)
--              1. Migrate any website records from 'websites' into canonical 'projects'.
--              2. Re-point any 'leads' with website_id to canonical project_id.
--              3. Remove 'website_id' column, index, and constraints from 'leads'.
--              4. Update RLS policies on 'leads' to rely strictly on 'projects'.
--              5. Drop redundant 'websites' table and associated policies/indexes.
--              6. Drop unused 'invoices' table and associated policies/indexes.
--              7. Drop unused Salesforce column 'instance_url' from 'crm_connections'.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. MIGRATE DATA FROM 'websites' INTO CANONICAL 'projects'
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'websites') then
    insert into projects (id, workspace_id, user_id, name, website, tracking_id, created_at, updated_at)
    select
      w.id,
      w.workspace_id,
      coalesce(
        (select wm.user_id from workspace_members wm where wm.workspace_id = w.workspace_id and wm.role = 'owner' limit 1),
        (select wm.user_id from workspace_members wm where wm.workspace_id = w.workspace_id limit 1),
        '00000000-0000-0000-0000-000000000000'::uuid
      ) as user_id,
      w.name,
      coalesce(w.domain, w.name),
      w.tracking_id,
      w.created_at,
      w.updated_at
    from websites w
    where not exists (
      select 1 from projects p where p.tracking_id = w.tracking_id or p.id = w.id
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. RE-POINT LEADS WITH website_id TO CANONICAL project_id
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'leads' and column_name = 'website_id') then
    if exists (select 1 from information_schema.tables where table_name = 'websites') then
      update leads
      set project_id = p.id
      from websites w
      join projects p on p.tracking_id = w.tracking_id
      where leads.website_id = w.id
        and (leads.project_id is null or leads.project_id != p.id);
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. UPDATE RLS POLICIES ON 'leads' (REMOVING 'websites' DEPENDENCY)
-- ---------------------------------------------------------------------------
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
-- 4. REMOVE 'website_id' FROM 'leads'
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'leads' and column_name = 'website_id') then
    drop index if exists idx_leads_website_id;
    alter table leads drop constraint if exists leads_website_id_fkey;
    alter table leads drop column website_id;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. DROP REDUNDANT 'websites' TABLE
-- ---------------------------------------------------------------------------
drop policy if exists "websites_member_select" on websites;
drop policy if exists "websites_member_insert" on websites;
drop policy if exists "websites_member_update" on websites;
drop policy if exists "websites_member_delete" on websites;
drop index if exists idx_websites_tracking_id;
drop index if exists idx_websites_workspace_id;
drop table if exists websites cascade;

-- ---------------------------------------------------------------------------
-- 6. DROP UNUSED 'invoices' TABLE
-- ---------------------------------------------------------------------------
drop policy if exists "invoices_workspace_member_select" on invoices;
drop index if exists idx_invoices_workspace_id;
drop table if exists invoices cascade;

-- ---------------------------------------------------------------------------
-- 7. DROP UNUSED SALESFORCE COLUMN 'instance_url' FROM 'crm_connections'
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'crm_connections' and column_name = 'instance_url') then
    alter table crm_connections drop column instance_url;
  end if;
end $$;
