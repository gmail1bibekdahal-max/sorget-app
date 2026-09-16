-- =============================================================================
-- Sorget — Production-Safe Database Data Wipe Script
-- File: scripts/wipe_production_data.sql
-- Description: Deletes all test/application data and Auth users across all tables
--              while strictly preserving tables, columns, indexes, constraints,
--              RLS policies, triggers, functions, migration history, and project config.
--
-- HOW TO RUN:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/vvpgkijytjxqmydkyrzt
-- 2. Go to the "SQL Editor" in the left navigation sidebar.
-- 3. Open a New Query, paste the contents of this script, and click "Run".
-- =============================================================================

DO $$
DECLARE
  v_count integer;
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Starting Sorget Production-Safe Data Wipe...';
  RAISE NOTICE '=======================================================';

  -- ---------------------------------------------------------------------------
  -- PHASE 1: Leaf child tables (depend on parent tables, nothing depends on them)
  -- ---------------------------------------------------------------------------

  -- 1.1 Webhook Deliveries (references webhooks)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webhook_deliveries') THEN
    DELETE FROM public.webhook_deliveries;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % rows from public.webhook_deliveries', v_count;
  END IF;

  -- 1.2 CRM Sync Log (references leads, workspaces, projects)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_sync_log') THEN
    DELETE FROM public.crm_sync_log;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % rows from public.crm_sync_log', v_count;
  END IF;

  -- 1.3 Invoices (references subscriptions, workspaces)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    DELETE FROM public.invoices;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % rows from public.invoices', v_count;
  END IF;

  -- 1.4 Early Access (references workspaces)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'early_access') THEN
    DELETE FROM public.early_access;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % rows from public.early_access', v_count;
  END IF;

  -- 1.5 Workspace Invitations (references workspaces, auth.users)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_invitations') THEN
    DELETE FROM public.workspace_invitations;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % rows from public.workspace_invitations', v_count;
  END IF;

  -- ---------------------------------------------------------------------------
  -- PHASE 2: Second-tier child tables
  -- ---------------------------------------------------------------------------

  -- 2.1 Leads (references projects)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
    DELETE FROM public.leads;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % rows from public.leads', v_count;
  END IF;

  -- 2.2 Webhooks (references workspaces, auth.users)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webhooks') THEN
    DELETE FROM public.webhooks;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % rows from public.webhooks', v_count;
  END IF;

  -- 2.3 CRM Connections (references workspaces)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_connections') THEN
    DELETE FROM public.crm_connections;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % rows from public.crm_connections', v_count;
  END IF;

  -- 2.4 Subscriptions (references workspaces)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
    DELETE FROM public.subscriptions;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % rows from public.subscriptions', v_count;
  END IF;

  -- 2.5 Websites (references workspaces)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'websites') THEN
    DELETE FROM public.websites;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % rows from public.websites', v_count;
  END IF;

  -- ---------------------------------------------------------------------------
  -- PHASE 3: Core workspace entity tables
  -- ---------------------------------------------------------------------------

  -- 3.1 Projects (references workspaces, auth.users)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    DELETE FROM public.projects;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % rows from public.projects', v_count;
  END IF;

  -- 3.2 Workspace Members (references workspaces, auth.users)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_members') THEN
    DELETE FROM public.workspace_members;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % rows from public.workspace_members', v_count;
  END IF;

  -- ---------------------------------------------------------------------------
  -- PHASE 4: Root workspace table
  -- ---------------------------------------------------------------------------

  -- 4.1 Workspaces (root of all workspace data)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspaces') THEN
    DELETE FROM public.workspaces;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % rows from public.workspaces', v_count;
  END IF;

  -- ---------------------------------------------------------------------------
  -- PHASE 5: Supabase Auth Users
  -- ---------------------------------------------------------------------------

  -- 5.1 Delete all Auth users (cascades to identities, sessions, refresh_tokens, mfa)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    DELETE FROM auth.users;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % rows from auth.users (cascaded to all auth sessions & identities)', v_count;
  END IF;

  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Sorget Production Data Wipe COMPLETED SUCCESSFULLY.';
  RAISE NOTICE 'All schemas, tables, columns, indexes, RLS policies,';
  RAISE NOTICE 'functions, and migration records have been 100%% preserved.';
  RAISE NOTICE '=======================================================';
END $$;
