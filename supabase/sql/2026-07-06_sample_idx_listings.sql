-- ============================================================
-- 2026-07-06 Sample IDX listings for demo/sales purposes.
-- Seeds 10 realistic Grand Strand listings into idx_listings for the
-- carrie-collins and market-edge orgs so the site's property search
-- works before the CCAR feed is approved.
-- All rows use mls_id prefix 'SAMPLE-'. When the real feed lands:
--   delete from idx_listings where mls_id like 'SAMPLE-%';
-- Idempotent (upsert on org_id,mls_id).
-- ============================================================

with demo_orgs as (
  select id from organizations where slug in ('carrie-collins','market-edge')
),
samples(n, price, addr, city, zip, beds, baths, sqft, ptype, yr, remarks) as (values
  (1, 1249000, '412 Ocean Pines Ct',   'Myrtle Beach',    '29572', 5, 4, 3850, 'Detached', 2019, 'Stunning coastal retreat two blocks from the beach. Chef''s kitchen, saltwater pool, and a three-story elevator. Golf cart to the sand in minutes.'),
  (2,  874900, '18 Litchfield Plantation Dr', 'Pawleys Island', '29585', 4, 3, 3100, 'Detached', 2015, 'Lowcountry living under the live oaks. Wraparound porches, gas lanterns, and deeded access to the plantation river house and pool.'),
  (3,  689000, '2205 Waterway Blvd',   'North Myrtle Beach','29582', 3, 3, 2400, 'Detached', 2021, 'Intracoastal Waterway views from nearly every room. Private dock permit in hand. Open plan with quartz island and shiplap accents.'),
  (4,  545000, '96 Bella Vita Loop',   'Myrtle Beach',    '29579', 4, 3, 2750, 'Detached', 2018, 'Immaculate Carolina Forest home in gated Bella Vita. First-floor owner''s suite, screened lanai overlooking the pond, natural gas community.'),
  (5,  474900, '1704 Murrells Inlet Way', 'Murrells Inlet', '29576', 3, 2, 2050, 'Detached', 2016, 'Minutes to the MarshWalk. Vaulted great room, oversized garage for the boat, and a fenced yard backing to protected wetlands.'),
  (6,  419000, '805 Surfside Shores Ln', 'Surfside Beach', '29575', 3, 2, 1800, 'Detached', 2012, 'Classic beach cottage in the family-friendly section of Surfside. Raised construction, outdoor shower, and room for the golf cart.'),
  (7,  389900, '3310 Barefoot Landing Cir', 'North Myrtle Beach','29582', 3, 2, 1750, 'Townhouse', 2020, 'Lock-and-leave townhome steps from Barefoot Landing. Two-car garage, plantation shutters, and low-maintenance coastal landscaping.'),
  (8,  339000, '77 Garden City Retreat', 'Garden City Beach','29576', 2, 2, 1350, 'Condominium', 2008, 'Top-floor end unit with marsh views and a rare deeded boat slip option. Strong rental history — turnkey and fully furnished.'),
  (9,  299900, '150 Carolina Forest Commons', 'Myrtle Beach','29579', 3, 2, 1550, 'Detached', 2010, 'The perfect starter in award-winning school district. New roof 2024, LVP throughout, and a sunny fenced backyard with fire pit.'),
  (10, 259000, '921 Shore Dr Unit 14B', 'Myrtle Beach',    '29577', 2, 2, 1100, 'Condominium', 2005, 'Oceanview condo on the quiet end of Shore Drive. Updated kitchen and baths, on-site pools, and strong summer rental demand.')
)
insert into idx_listings (org_id, mls_id, list_price, address, city, state, zip, beds, baths, sqft, status, photo_url, raw, synced_at)
select
  o.id,
  'SAMPLE-' || lpad(s.n::text, 3, '0'),
  s.price, s.addr, s.city, 'SC', s.zip, s.beds, s.baths, s.sqft,
  'Active',
  'https://picsum.photos/seed/tme-' || s.n || 'a/1200/800',
  jsonb_build_object(
    'PublicRemarks', s.remarks,
    'YearBuilt', s.yr,
    'PropertySubType', s.ptype,
    'Media', jsonb_build_array(
      jsonb_build_object('MediaURL', 'https://picsum.photos/seed/tme-' || s.n || 'a/1200/800'),
      jsonb_build_object('MediaURL', 'https://picsum.photos/seed/tme-' || s.n || 'b/1200/800'),
      jsonb_build_object('MediaURL', 'https://picsum.photos/seed/tme-' || s.n || 'c/1200/800'),
      jsonb_build_object('MediaURL', 'https://picsum.photos/seed/tme-' || s.n || 'd/1200/800')
    )
  ),
  now()
from demo_orgs o cross join samples s
on conflict (org_id, mls_id) do update
  set list_price = excluded.list_price, raw = excluded.raw, synced_at = now();

select count(*)::text || ' sample listings in place' as status from idx_listings where mls_id like 'SAMPLE-%';
