-- ============================================================
-- 2026-07-09 Stripe billing columns on organizations
-- stripe_customer_id: one Stripe Customer per org (created at first
-- checkout). stripe_subscription_id: the active subscription.
-- plan + billing_status (existing) are DRIVEN by the stripe-webhook fn.
-- Idempotent.
-- ============================================================

alter table organizations
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

create unique index if not exists organizations_stripe_customer_key
  on organizations (stripe_customer_id) where stripe_customer_id is not null;

select 'stripe columns ready' as status;
