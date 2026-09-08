-- =============================================================================
-- Migration: 0003_leads_enhancement_and_isolation.sql
-- Description: Adds drilldown fields (1, 2, 3), landing dimensions, and
--              workspace-isolated RLS policies on leads.
-- =============================================================================

-- Add enhanced attribution columns to leads if not present
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'leads') then
    if not exists (select 1 from information_schema.columns where table_name = 'leads' and column_name = 'drilldown1') then
      alter table leads add column drilldown1 text;
      alter table leads add column drilldown2 text;
      alter table leads add column drilldown3 text;
      alter table leads add column landing_page_group text;
      alter table leads add column submit_page text;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'leads' and column_name = 'website_id') then
      alter table leads add column website_id uuid references websites(id) on delete cascade;
      create index if not exists idx_leads_website_id on leads(website_id);
    end if;
  end if;
end $$;

-- Workspace-scoped RLS policies for leads:
-- 1. Members of a workspace can select leads for websites/projects in their workspace
drop policy if exists "leads_workspace_member_select" on leads;
create policy "leads_workspace_member_select" on leads
  for select using (
    exists (
      select 1 from websites w
      join workspace_members wm on wm.workspace_id = w.workspace_id
      where w.id = leads.website_id
      and wm.user_id = auth.uid()
    )
    or
    exists (
      select 1 from projects p
      where p.id = leads.project_id
      and p.user_id = auth.uid()
    )
  );

-- 2. Workspace Admin/Owner can delete leads
drop policy if exists "leads_workspace_admin_delete" on leads;
create policy "leads_workspace_admin_delete" on leads
  for delete using (
    exists (
      select 1 from websites w
      join workspace_members wm on wm.workspace_id = w.workspace_id
      where w.id = leads.website_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
    )
    or
    exists (
      select 1 from projects p
      where p.id = leads.project_id
      and p.user_id = auth.uid()
    )
  );