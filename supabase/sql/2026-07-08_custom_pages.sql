-- ============================================================
-- 2026-07-08 Custom HTML landing pages (Triskope-managed)
-- Full single-file HTML documents served verbatim at
--   https://<subscriber-domain>/<slug>
-- Members: read-only. Platform admins: full CRUD (managed service,
-- same model as community pages).
-- Idempotent.
-- ============================================================

create table if not exists custom_pages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  slug text not null,
  title text not null default 'Landing page',
  html text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, slug)
);

alter table custom_pages enable row level security;

drop policy if exists custom_pages_member_read on custom_pages;
create policy custom_pages_member_read on custom_pages
  for select using (org_id in (select private.user_org_ids()));

drop policy if exists custom_pages_platform_admin_all on custom_pages;
create policy custom_pages_platform_admin_all on custom_pages
  for all
  using (exists (select 1 from platform_admins pa where pa.user_id = auth.uid()))
  with check (exists (select 1 from platform_admins pa where pa.user_id = auth.uid()));

select 'custom_pages ready' as status;
