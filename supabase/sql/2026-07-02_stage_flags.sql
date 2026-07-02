-- ============================================================
-- 2026-07-02 Stage behavior flags on pipeline_stages
-- Root-cause fix for the hardcoded-stage bug family.
-- is_entry:        where new leads land (lead-capture, import-leads,
--                  in-app Add Lead). Exactly one per org (partial idx).
-- is_terminal:     drip-scheduler stops enrollments here.
-- pauses_nurture:  nurture-runner pauses here (superset of terminal
--                  plus "warm" = engaged, hand off to agent).
-- Run in Supabase SQL editor. Idempotent.
-- ============================================================

alter table pipeline_stages
  add column if not exists is_entry boolean not null default false,
  add column if not exists is_terminal boolean not null default false,
  add column if not exists pauses_nurture boolean not null default false;

-- Seed to match current hardcoded behavior across ALL orgs
update pipeline_stages set is_entry = true  where id = 'captured';

update pipeline_stages
  set is_terminal = true, pauses_nurture = true
  where id in ('delivered', 'lost');

update pipeline_stages set pauses_nurture = true where id = 'warm';

-- Enforce at most one entry stage per org
create unique index if not exists one_entry_stage_per_org
  on pipeline_stages (org_id)
  where is_entry;

-- Sanity check: every org with stages should have exactly 1 entry stage
select o.name,
  count(*) filter (where ps.is_entry)        as entry_stages,
  count(*) filter (where ps.is_terminal)     as terminal_stages,
  count(*) filter (where ps.pauses_nurture)  as pause_stages
from organizations o
join pipeline_stages ps on ps.org_id = o.id
group by o.name
order by o.name;
