-- ============================================================
-- 2026-07-06 SECURITY FIX: invite trigger must not trust metadata
--
-- raw_user_meta_data is USER-CONTROLLABLE at public signup
-- (auth.signUp accepts arbitrary `data`). The old trigger granted
-- membership — at any role, including owner — from that metadata,
-- allowing privilege escalation into any org whose UUID is known.
--
-- New behavior: membership is granted ONLY when a matching PENDING
-- row exists in `invites` (written solely by the team-invite fn with
-- the service key), and the ROLE comes from that row — never from
-- metadata. Role is additionally capped to agent/team_lead.
-- ============================================================

create or replace function private.accept_invite_on_signup()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_org uuid;
  v_invite record;
begin
  v_org := (new.raw_user_meta_data ->> 'invited_org_id')::uuid;
  if v_org is null then
    return new;
  end if;

  -- The invites table is the source of truth; metadata is only a hint.
  select role, org_id into v_invite
    from invites
   where org_id = v_org
     and lower(email) = lower(new.email)
     and status = 'pending'
   limit 1;

  if v_invite.org_id is null then
    -- No matching pending invite: do nothing. Blocks forged metadata.
    return new;
  end if;

  insert into org_members (org_id, user_id, role, invited_by)
  values (
    v_invite.org_id,
    new.id,
    case when v_invite.role in ('agent','team_lead') then v_invite.role else 'agent' end,
    null
  )
  on conflict (org_id, user_id) do nothing;

  update invites
     set status = 'accepted', accepted_at = now()
   where org_id = v_invite.org_id and lower(email) = lower(new.email);

  return new;
end $function$;

select 'invite trigger hardened' as status;
