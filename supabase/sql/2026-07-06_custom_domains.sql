-- ============================================================
-- 2026-07-06 Custom domains for subscriber sites
-- organizations.custom_domain: bare hostname (e.g. carriesellsthebeach.com
-- or www.carriesellsthebeach.com), unique across orgs. The site renderer
-- resolves tenants by this when the host isn't *.triskope.ai.
-- Idempotent.
-- ============================================================

alter table organizations
  add column if not exists custom_domain text;

create unique index if not exists organizations_custom_domain_key
  on organizations (lower(custom_domain))
  where custom_domain is not null;

select 'custom_domain column ready' as status;
