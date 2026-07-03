-- ============================================================
-- 2026-07-03 site-assets storage bucket for subscriber site images
-- Public read (sites serve these), uploads restricted to members of
-- the org whose id is the first folder of the object path:
--   site-assets/<org_id>/<timestamp>-<rand>.<ext>
-- 5MB limit, images only. Idempotent.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-assets', 'site-assets', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists site_assets_public_read on storage.objects;
create policy site_assets_public_read on storage.objects
  for select using (bucket_id = 'site-assets');

drop policy if exists site_assets_org_insert on storage.objects;
create policy site_assets_org_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'site-assets'
    and (storage.foldername(name))[1]::uuid in (select private.user_org_ids())
  );

drop policy if exists site_assets_org_delete on storage.objects;
create policy site_assets_org_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'site-assets'
    and (storage.foldername(name))[1]::uuid in (select private.user_org_ids())
  );

-- Sanity: bucket exists with limits
select id, public, file_size_limit from storage.buckets where id = 'site-assets';
