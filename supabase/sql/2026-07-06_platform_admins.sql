-- ============================================================
-- 2026-07-06 Platform admins (Triskope staff)
-- Distinct from org owners: agents own their orgs, but only
-- platform admins manage brand colors, SEO, and domains.
-- Clients may read only their own row (admin-status detection).
-- Idempotent.
-- ============================================================

create table if not exists platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table platform_admins enable row level security;

drop policy if exists platform_admins_self_read on platform_admins;
create policy platform_admins_self_read on platform_admins
  for select using (auth.uid() = user_id);

-- Seed Seth
insert into platform_admins (user_id)
select id from auth.users where email = 'tseth.bass@gmail.com'
on conflict do nothing;

select count(*)::text || ' platform admin(s)' as status from platform_admins;
