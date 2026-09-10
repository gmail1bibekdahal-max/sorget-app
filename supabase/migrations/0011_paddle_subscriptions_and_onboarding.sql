-- =============================================================================
-- Migration: 0011_paddle_subscriptions_and_onboarding.sql
-- Description: Adds Paddle billing fields, 14-day trial timestamps, and CRM metadata
--              to workspaces, subscriptions, and projects tables.
-- =============================================================================

-- 1. Enhance subscriptions table for Paddle and 14-day trial
do $$
begin
  -- Add provider column (default 'paddle')
  if not exists (select 1 from information_schema.columns where table_name = 'subscriptions' and column_name = 'provider') then
    alter table subscriptions add column provider text not null default 'paddle';
  end if;

  -- Add plan column (canonical plan name)
  if not exists (select 1 from information_schema.columns where table_name = 'subscriptions' and column_name = 'plan') then
    alter table subscriptions add column plan text;
  end if;

  -- Add provider customer and subscription IDs
  if not exists (select 1 from information_schema.columns where table_name = 'subscriptions' and column_name = 'provider_customer_id') then
    alter table subscriptions add column provider_customer_id text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'subscriptions' and column_name = 'provider_subscription_id') then
    alter table subscriptions add column provider_subscription_id text;
  end if;

  -- Add trial start and end timestamps
  if not exists (select 1 from information_schema.columns where table_name = 'subscriptions' and column_name = 'trial_start') then
    alter table subscriptions add column trial_start timestamptz;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'subscriptions' and column_name = 'trial_end') then
    alter table subscriptions add column trial_end timestamptz;
  end if;
end $$;

-- Relax check constraints on plan_id and status if present
alter table subscriptions drop constraint if exists subscriptions_plan_id_check;
alter table subscriptions drop constraint if exists subscriptions_status_check;

-- Create indexes for fast lookup by provider subscription id
create index if not exists idx_subscriptions_provider_sub_id on subscriptions(provider_subscription_id);
create index if not exists idx_subscriptions_status on subscriptions(status);

-- 2. Enhance projects table to record onboarding CRM information
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'crm') then
    alter table projects add column crm text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'cms') then
    alter table projects add column cms text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'form_tool') then
    alter table projects add column form_tool text;
  end if;
end $$;
