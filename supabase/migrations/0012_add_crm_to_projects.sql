-- =============================================================================
-- Migration: 0012_add_crm_to_projects.sql
-- Description: Adds canonical nullable crm column to projects table to persist
--              the user's selected CRM during onboarding.
-- =============================================================================

-- 1. Add crm column to projects table (idempotent, nullable)
alter table public.projects add column if not exists crm text;

-- 2. Notify PostgREST to reload schema cache so the new column is immediately recognized
notify pgrst, 'reload schema';
