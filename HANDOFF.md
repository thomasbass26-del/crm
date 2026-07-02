# TRISKOPE CRM — SESSION HANDOFF (post audit: org partition complete, 7 bugs fixed)

Paste this whole doc at the start of the new chat, then say "continue."

## WHO I AM / HOW I WORK
Seth Bass, Triskope LLC (Myrtle Beach real estate). Building The Market Edge, a
multi-tenant CRM. Partner: Carrie Collins.
- Mac, zsh, user tsethbass, machine thomass-mbp. Safari main browser (NOTE: Safari
  blocks paste into Supabase's code editors — use Chrome for dashboard template/SQL
  paste problems, or pbcopy from a repo file).
- You have DIRECT filesystem access via Desktop Commander. Edit ~/triskope-crm-app
  files in place with surgical edits (back the file up FIRST), then Seth runs
  build/deploy himself.
- Always COMPILE (npm run build) before handing over a deploy.
- Label TERMINAL vs BROWSER. Terminal commands one line at a time.
- SQL goes in the Supabase SQL editor (browser). Editor gotcha: it runs only the
  SELECTED text if a selection exists — clear selection before Run.
- Deploy line = Seth runs it. Rollback line = only if visibly broken.
- Render-check ethos: green build is NOT proof; verify in the browser.
- Git is now live in the repo — commit after each work block (Claude can commit
  directly; push needs Seth's PAT).

## LIVE INFRA
- Supabase project: ddsqyvcaissqavivyhlv (CLI is linked; if it re-prompts, pick this
  one, NOT ypvytuvahfqypngqcnaf).
- SQL editor: https://supabase.com/dashboard/project/ddsqyvcaissqavivyhlv/sql/new
- App: ~/triskope-crm-app -> Vercel -> app.triskope.ai
- Deploy: cd ~/triskope-crm-app && npm run build && npx vercel --prod, then Cmd+Shift+R.
- Git: repo initialized, 3 commits (9002196 initial, f7c9dc0 partition+features,
  260fff5 audit fixes). ALL 11 edge functions now versioned in supabase/functions/.
  Remote: github.com/thomasbass26-del/CRM.git — PUSH STILL PENDING (needs fresh
  classic PAT with repo scope; git push -u origin main --force).
- Rollback = git (checkout prior commit), or .bak files (gitignored, still on disk).
- Edge fns deploy: npx supabase functions deploy <name>.
- Custom SMTP: Resend, smtp.resend.com:465, user resend, sender team@triskope.ai.
  Branded reset-password email template installed (source: email-templates/
  reset-password.html in repo; pbcopy < file to re-copy). Invite-user template NOT
  yet branded (same HTML works, change h1).

## ARCHITECTURE FACTS (critical — don't relearn)
- LIVE app = src/App.jsx, ONE monolith (~7,900 lines). main.jsx mounts it directly.
- src/pages/* and src/components/* are DEAD/unwired. Do not build there.
- All views (XView = () => {}) live INSIDE export default function App() (~line 1490).
  nav array (~2540) + renderView() switch. Views are re-created every App render —
  use refs, not controlled state, for form inputs inside views.
- Colors const C (~line 20): cream #f9f6f0, obsidian #1a1a22, teal #0d8b75,
  gold #9c7f43. Helpers: SERIF_FONT, pageHeader(isMobile), Card, Avatar, btnPrimary().
- NO profiles table (app queries it, silently null). Roles on org_members.role.
- Desktop Commander read_file offset is 0-BASED; its search line numbers unreliable —
  grep -n via start_process for real numbers.
- leads.stage is TEXT with composite FK (org_id, stage) -> pipeline_stages(org_id, id).
  ANY writer of leads.stage MUST use a stage id that exists for that org.
  System-seeded ids: captured scored nurturing warm delivered lost ("captured" is
  the safe universal entry stage; system stages can't be deleted).
- Legacy stage names fresh/new/closed are GONE. This caused 4 production bugs.
- Automations hardcode stage semantics: nurture-runner pauses on
  [warm, delivered, lost]; drip-scheduler stops on [delivered, lost]. Custom per-org
  stages will silently break these — see is_entry/is_terminal item in NEXT UP.
- messages RLS: iso_messages_read (select) + iso_messages_insert (insert, added this
  session). Edge fns bypass RLS via service key. organizations update is owner-only
  (private.has_org_role). Isolation pattern: org_id in (select private.user_org_ids()).
- private.protect_last_owner trigger blocks deleting/demoting last owner — disable
  trigger inside a transaction when deleting whole orgs.
- Email sends route through send-lead-email fn; SMS is client insert into messages
  (status queued; delivery pending A2P approval).
- IDX: the REAL pipeline is organizations.idx_config (jsonb) -> idx-sync fn ->
  idx_listings. idx-sync is dormant until CCAR_RESO_URL/CCAR_RESO_TOKEN secrets are
  set (waiting on CCAR feed approval). The "IDX Feeds" panel in App.jsx is an ORPHAN:
  it targets an idx_connections table that DOES NOT EXIST (queries silently no-op).

## WHAT SHIPPED THIS SESSION (done, compiled; deploy status per item)
Org partitioning (frontend, DEPLOYED + verified):
- Tasks + IDX listings load in an org-keyed effect (.eq org_id), mirror leads.
- All 7 "org_members limit(1) first-membership" grabs replaced with active org.id:
  addTask, sendMessage, submitNewLead, email-branding load/save, saveConn, syncNow.
- idx_connections list query org-filtered (moot — table missing, see orphan note).
- Workspace switcher now truly partitions everything.

Tasks (DEPLOYED + verified):
- Quick-add bar on Tasks view: text + optional lead picker (alphabetized) + optional
  due date; addTask("_none") for lead-less tasks. Refs qaTask*Ref (~line 1586).
- Fixed dead "No due date" bucket (no-due tasks are the literal string "no due date",
  which lexically sorted into Upcoming). taskHasDue() regex guard.

Stage-FK bug family (4 bugs):
- lead-capture fn: fresh -> captured (DEPLOYED).
- In-app Add Lead: blankLeadDraft stage new -> captured + validation guard (DEPLOYED).
- import-leads fn: fresh -> captured (FIXED, DEPLOY MAY BE PENDING).
- drip-scheduler fn: stop list closed -> delivered (FIXED, DEPLOY MAY BE PENDING).
  Verify: npx supabase functions deploy import-leads / drip-scheduler if unsure.

Auto-assign on capture (item 3, DB DONE, fn DEPLOYED, NOT YET VERIFIED):
- organizations.last_assigned_member + assign_next_agent(p_org,p_lead) RPC
  (security definer, FOR UPDATE lock, only assigns if still unassigned, revoked from
  anon/authenticated — service-role only).
- lead-capture calls it for NEW leads when org features.auto_assign = true.
- Market Edge (b1fc6d0d-52f6-40af-b588-e6be9aaf3536) has auto_assign: true.
- VERIFY: submit public form twice w/ two NEW emails -> alternating assignees,
  last_assigned_member becomes non-null.

Messaging (frontend DEPLOY MAY BE PENDING):
- iso_messages_insert RLS policy created (SMS client inserts were being REJECTED —
  SMS sending was broken until this session).
- simulateInboundReply now includes org_id.

Invites/UX (DEPLOYED):
- team-invite fn: existing auth users now get a resetPasswordForEmail email
  (mode added_existing_user_email_sent). New users still get inviteUserByEmail.
- Distribute button: armed label "Click again to assign N", toast, 8s auto-disarm.
  (Three assignment mechanisms: per-lead dropdown, Distribute button, auto-assign.)

Org cleanup:
- Removed duplicate org carrie-collins-2 (fb5d9259). KEPT f01191d9 carrie-collins as
  Carrie's sandbox (she wants her own account to play with).

## PINNED — CARRIE LOGIN (blocked on reaching her; resume here)
Carrie = cacollins525@gmail.com, exists in auth, owns sandbox org carrie-collins
(f01191d9-eea7-4f28-8a82-ca16af3c9b3a).
UNCONFIRMED, check in order:
1. Was the duplicate-org delete transaction re-run successfully after the
   protect_last_owner error? (select name,slug from organizations where name ilike
   '%carrie%'; -> expect ONE row.)
2. Is she OWNER of her sandbox? If not: update org_members set role='owner' where
   org_id='f01191d9-...' and user_id=(select id from auth.users where email='cacollins525@gmail.com');
3. Is she a member of Market Edge? Seth may want her invited there too (Team panel
   invite now emails existing users).
4. Did her password-recovery email deliver? Trace: Resend dashboard -> Emails log.
   Delivered = her inbox problem. Bounced = read reason. Absent = Supabase->Resend
   handoff (check SMTP toggle + API key; also triskope.ai must be green/Verified in
   Resend Domains — sender is team@triskope.ai). NOTE: a Supabase incident banner was
   up during testing (status.supabase.com) — may have been the whole problem.
5. New-user invite ROOT CAUSE still unfixed: invited_org_id metadata is never
   consumed on signup; membership-less sign-ins mint stray personal orgs (that's
   where the duplicates came from). Fix = consume metadata in signup flow/trigger,
   or create membership at invite time for new users too.

## OTHER OPEN VERIFICATIONS
- The "fresh" diagnostic never ran. Matters: window between pipeline migration and
  the lead-capture fix = every public form submission 500'd (possible lost real
  leads). Run:
    select 'stage rows named fresh', count(*)::text from pipeline_stages where id='fresh'
    union all select 'leads still on fresh', count(*)::text from leads where stage='fresh';
  If leads sit on legacy stages: update leads set stage='captured' where stage in
  ('fresh','new') returning id,name;
- SMS send + simulate inbound reply: verify post-deploy (open lead -> send SMS ->
  "SMS queued" toast, message appears).
- GITHUB PUSH (handoff item 4, still pending): Seth generates fresh classic PAT with
  repo scope, then git push -u origin main --force (user thomasbass26-del).

## ORG / ACCOUNT STATE
- Market Edge b1fc6d0d-52f6-40af-b588-e6be9aaf3536: 587+ leads, owner
  tseth.bass@gmail.com, features {auto_assign:true}.
- Triskope Demo c40f581c...: 2 leads, tseth.bass.
- carrie-collins f01191d9-eea7-4f28-8a82-ca16af3c9b3a: Carrie's sandbox, empty.
- Test orgs (excluded from stage seeding): Haylee Bass (null owner), Test Profile.

## NEXT UP (priority order)
1. Finish pinned Carrie login + open verifications above.
2. is_entry/is_terminal flags on pipeline_stages; make lead-capture, nurture-runner,
   drip-scheduler, and frontend consult flags instead of hardcoded stage ids. This is
   the root cause behind 4 of this session's 7 bugs and the prerequisite for safe
   per-org stage customization.
3. IDX Feeds panel reconciliation — DECIDED DIRECTION PENDING, options:
   A (lean, recommended): rewire panel to organizations.idx_config (enabled toggle,
   agent_mls_id, last-sync status). B: create idx_connections table + refactor
   idx-sync to iterate it (multi-feed; defer until a 2nd vendor is real).
4. Product decision: should drip-scheduler also stop at "warm" like nurture-runner?
   One-word change once decided.
5. Competitive features (ranked): speed-to-lead SMS auto-response on capture
   (plumbing now works end to end; blocked on A2P approval for actual delivery);
   IDX listing-alert drips (blocked on CCAR feed); per-agent QR open-house capture
   pages feeding round-robin.
6. Tech debt: profiles table (create or remove the query); brand the Invite-user
   email template; bundle code-splitting (1MB single chunk); 5 silent-error awaits.

## IMMEDIATE NEXT STEP IN NEW CHAT
Run the open verifications (fresh diagnostic + fn deploy status), then take NEXT UP
item 2 (stage flags). Start by seeing current stage consumers:

  cd ~/triskope-crm-app && grep -rn "captured\|delivered\|PAUSE_STAGES" supabase/functions/*/index.ts | grep -v ".bak" | head -20
