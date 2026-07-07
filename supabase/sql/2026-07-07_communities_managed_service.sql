-- ============================================================
-- 2026-07-07 Community pages become a Triskope-managed service.
-- Members: READ ONLY (their own org's pages + lead attribution).
-- Platform admins: full CRUD on every org's communities, and
-- upload rights into any org's site-assets folder.
-- Idempotent.
-- ============================================================

drop policy if exists iso_communities_rw on communities;

drop policy if exists iso_communities_read on communities;
create policy iso_communities_read on communities
  for select using (org_id in (select private.user_org_ids()));

drop policy if exists communities_platform_admin_all on communities;
create policy communities_platform_admin_all on communities
  for all
  using (exists (select 1 from platform_admins pa where pa.user_id = auth.uid()))
  with check (exists (select 1 from platform_admins pa where pa.user_id = auth.uid()));

-- Platform admins may upload site assets into ANY org's folder
-- (community heroes for orgs they aren't members of).
drop policy if exists site_assets_platform_insert on storage.objects;
create policy site_assets_platform_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'site-assets'
    and exists (select 1 from platform_admins pa where pa.user_id = auth.uid())
  );

select 'community pages are now Triskope-managed' as status;
