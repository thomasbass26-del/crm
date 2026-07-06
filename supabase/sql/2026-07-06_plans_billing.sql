-- ============================================================
-- 2026-07-06 Plans + billing status on organizations
-- plan: pricing tier label (feature presets applied by admin fn).
-- billing_status: active | past_due | suspended.
--   suspended = CRM locked, public site dark, lead capture off.
-- Idempotent.
-- ============================================================

alter table organizations
  add column if not exists plan text not null default 'starter',
  add column if not exists billing_status text not null default 'active',
  add column if not exists suspended_at timestamptz,
  add column if not exists admin_notes text;

do $$ begin
  alter table organizations
    add constraint organizations_billing_status_check
    check (billing_status in ('active','past_due','suspended'));
exception when duplicate_object then null; end $$;

select name, plan, billing_status from organizations order by name;
