-- ============================================================
-- 2026-07-06 CAPTURED FROM LIVE DB (was never versioned)
-- Trigger: on_auth_user_invited on auth.users
-- Consumes invited_org_id/invited_role metadata at user creation:
-- creates the org membership and marks the invite accepted.
-- team-invite fn also inserts the membership directly (belt +
-- suspenders as of this date).
-- ============================================================

create or replace function private.accept_invite_on_signup()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_org uuid;
  v_role org_role;
begin
  v_org := (new.raw_user_meta_data ->> 'invited_org_id')::uuid;
  if v_org is null then
    return new;
  end if;
  v_role := coalesce((new.raw_user_meta_data ->> 'invited_role')::org_role, 'agent');
  insert into org_members (org_id, user_id, role, invited_by)
  values (v_org, new.id, v_role, null)
  on conflict (org_id, user_id) do nothing;
  update invites
    set status = 'accepted', accepted_at = now()
    where org_id = v_org and lower(email) = lower(new.email);
  return new;
end $function$;

-- Trigger definition to be confirmed against live DB:
-- (expected) create trigger on_auth_user_invited
--   after insert on auth.users
--   for each row execute function private.accept_invite_on_signup();
