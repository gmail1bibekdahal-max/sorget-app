-- =============================================================================
-- Migration: 0010_workspace_backfill_and_integrity.sql
-- Description: Ensure workspace integrity for all users and projects:
--              1. Auto-create default workspace for any auth user lacking one.
--              2. Assign user as 'owner' in workspace_members.
--              3. Backfill any orphan projects (workspace_id IS NULL) to user's workspace.
--              4. Ensure projects are always tied to a workspace.
-- =============================================================================

-- 1. Auto-create workspace for any user who has projects but no workspace membership
do $$
declare
  r record;
  new_ws_id uuid;
  ws_slug text;
begin
  for r in 
    select distinct p.user_id 
    from projects p
    where p.user_id is not null
      and not exists (
        select 1 from workspace_members wm where wm.user_id = p.user_id
      )
  loop
    ws_slug := 'workspace-' || substr(r.user_id::text, 1, 8);
    insert into workspaces (name, slug)
    values ('Main Workspace', ws_slug)
    returning id into new_ws_id;

    insert into workspace_members (workspace_id, user_id, role)
    values (new_ws_id, r.user_id, 'owner');
  end loop;
end $$;

-- 2. Backfill orphan projects (workspace_id IS NULL) to the owner's workspace
update projects p
set workspace_id = (
  select wm.workspace_id 
  from workspace_members wm 
  where wm.user_id = p.user_id 
  order by (case when wm.role = 'owner' then 1 when wm.role = 'admin' then 2 else 3 end)
  limit 1
)
where p.workspace_id is null;

-- 3. Index projects(workspace_id) if not already indexed
create index if not exists idx_projects_workspace_id on projects(workspace_id);
