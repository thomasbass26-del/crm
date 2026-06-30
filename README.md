# Triskope CRM — Frontend v1

React + Vite, brand-locked, wired to the live Supabase backend.
Screens: Auth (sign in / create account), Workspace onboarding, Pipeline
(kanban with drag-and-drop + live updates), Lead drawer (AI score, rationale,
consent, timeline, notes), Campaigns (live enrollment counts), Settings.

## Run locally

1. Unzip, then in Terminal:
   cd ~/triskope-crm-app
   cp .env.example .env

2. Open .env and paste your ANON PUBLIC key (Project Settings → API Keys →
   anon public — NOT the service role key; this one ships to browsers by design):
   VITE_SUPABASE_URL=https://ddsqyvcaissqavivyhlv.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...anon-key...

3. Install and start:
   npm install
   npm run dev
   → open http://localhost:5173

## First sign-in

- Create an account with your email, then name your workspace
  (e.g. "Triskope"). The database trigger makes you its owner.
- NOTE: leads you created earlier belong to the 'Triskope Demo' org, which has
  no members — so your fresh workspace starts empty. Either send a new
  test lead with YOUR workspace slug (see below), or attach yourself to the
  demo org in SQL:
    insert into org_members (org_id, user_id, role)
    select o.id, u.id, 'owner'
    from organizations o, auth.users u
    where o.slug = 'triskope-demo' and u.email = 'YOUR_LOGIN_EMAIL';
  (Sign out and back in after running it.)

## The demo moment

With the app open on Pipeline, run a lead-capture curl (use your workspace
slug from the URL bar of Settings or 'triskope-demo'). The card appears on
the board, then its score pill fills in a few seconds later.

For instant (no 25s poll) updates, enable realtime on the leads table once:
  alter publication supabase_realtime add table leads;

## Email confirmation (smoother signups)

By default Supabase requires email confirmation on signup. For pilot speed:
Dashboard → Authentication → Sign In / Up → Email → toggle OFF
"Confirm email". Re-enable before GA.

## Deploy (next session)

Vercel: `npx vercel` from the project folder, set the two VITE_ env vars in
the Vercel dashboard, then CNAME app.triskope.ai → cname.vercel-dns.com.
