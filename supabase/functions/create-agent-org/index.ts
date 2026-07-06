// create-agent-org — onboard a new agent: create their organization (workspace)
// with a unique slug + starter site_config, then invite them as the owner.
//
// Deploy: npx supabase functions deploy create-agent-org --no-verify-jwt
//
// Caller must be a Triskope platform owner (an owner of the FIRST/root org, i.e.
// you). This prevents any signed-in agent from spinning up new orgs.
//
// POST JSON:
//   { "agent_name":"Dejana Ikonic", "email":"dejana@...", "slug":"dejana-ikonic",
//     "brokerage":"Coldwell Banker Sea Coast Advantage", "phone":"(843)...",
//     "city":"Myrtle Beach", "region":"SC" }
// Returns: { ok:true, org_id, slug, mode } | { error }
//
// STRIPE-READY: this function is the single onboarding entrypoint. Today it's
// called from the "Add Agent" admin screen. Later, a Stripe "payment succeeded"
// webhook can call this same function with the buyer's details to auto-provision.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL");
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ANON = Deno.env.get("SUPABASE_ANON_KEY");
const SITE = Deno.env.get("SITE_URL") ?? "https://app.triskope.ai";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", ...CORS } });

const slugify = (s) => String(s).toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

Deno.serve(async (req) => {
 try {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // Identify the caller by decoding their JWT directly (no anon-key dependency).
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  let callerId = null;
  try {
    const p = JSON.parse(atob(token.split(".")[1]));
    if (p?.sub && p?.role === "authenticated") callerId = p.sub;
  } catch { /* ignore */ }
  if (!callerId) return json({ error: "Not signed in" }, 401);

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

  // Authorize: Triskope platform admins only. The old check ("owner of at
  // least one org") passed for every subscriber.
  const { data: adminRow } = await admin.from("platform_admins")
    .select("user_id").eq("user_id", callerId).maybeSingle();
  if (!adminRow) {
    return json({ error: "Only Triskope staff can onboard agents." }, 403);
  }

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const agentName = String(body.agent_name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  let slug = slugify(body.slug || agentName);
  if (!agentName || !email) return json({ error: "agent_name and email are required" }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Invalid email" }, 400);
  if (!slug) return json({ error: "Could not derive a slug — provide one" }, 400);

  // Ensure slug is unique (append -2, -3, … if taken)
  let finalSlug = slug, n = 1;
  while (true) {
    const { data: exists } = await admin.from("organizations").select("id").eq("slug", finalSlug).maybeSingle();
    if (!exists) break;
    n += 1; finalSlug = `${slug}-${n}`;
    if (n > 50) return json({ error: "Could not find a free slug" }, 500);
  }

  // Starter site_config so My Website + the generator have content to work with
  const firstName = agentName.split(" ")[0];
  const site_config = {
    agent_name: agentName,
    agent_first: firstName,
    brokerage: String(body.brokerage ?? "").trim(),
    phone: String(body.phone ?? "").trim(),
    email,
    city: String(body.city ?? "").trim(),
    region: String(body.region ?? "").trim(),
    hero_eyebrow: [body.city, body.region].filter(Boolean).join(", "),
    hero_headline: `Find your place with ${firstName}.`,
    hero_subtext: `Helping buyers and sellers${body.city ? " in " + body.city : ""}. Let's find your next home.`,
    seo_title: `${agentName} | Real Estate${body.city ? " in " + body.city : ""}`,
    seo_description: `${agentName} helps buyers and sellers${body.city ? " in " + body.city + ", " + (body.region||"") : ""}. Get a free home valuation and curated listings.`,
    footer_tagline: `Real estate${body.city ? " in " + body.city : ""}.`,
    about: [`Hi, I'm ${firstName}. I help buyers and sellers find the right home with honest guidance and real market data.`],
    colors: { ink: "#10261f", ink_soft: "#3a4f47", accent: "#1d6b63", accent_deep: "#0f4a44", gold: "#b8893f" },
    curated_listings: [],
    neighborhoods: [],
    _saved_at: new Date().toISOString(),
  };

  // 1) Create the organization
  const { data: orgRow, error: oerr } = await admin.from("organizations")
    .insert({ name: agentName, slug: finalSlug, site_config })
    .select("id, slug").single();
  if (oerr) return json({ error: "Org create failed: " + oerr.message }, 500);

  // 2) Create or look up the agent's auth user, and make them OWNER of the new org
  const { data: existingList } = await admin.auth.admin.listUsers();
  const existingUser = existingList?.users?.find(u => u.email?.toLowerCase() === email);

  let mode;
  if (existingUser) {
    // Already has an account → add them as owner of the new org immediately
    const { error: merr } = await admin.from("org_members")
      .insert({ org_id: orgRow.id, user_id: existingUser.id, role: "owner", invited_by: callerId });
    if (merr) return json({ error: "Member link failed: " + merr.message }, 500);
    mode = "added_existing_user";
  } else {
    // New account → send Supabase invite; carry org + role in metadata so the
    // accept flow can finalize membership.
    try {
      const { error: ierr } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${SITE}/`,
        data: { invited_org_id: orgRow.id, invited_role: "owner", agent_name: agentName },
      });
      if (ierr) {
        await admin.from("organizations").delete().eq("id", orgRow.id); // roll back orphan org
        return json({ error: "Invite failed: " + ierr.message, step: "invite" }, 500);
      }
    } catch (e) {
      await admin.from("organizations").delete().eq("id", orgRow.id); // roll back orphan org
      return json({ error: "Invite threw: " + (e?.message || String(e)), step: "invite-exception" }, 500);
    }
    mode = "invited_new_user";
  }

  return json({ ok: true, org_id: orgRow.id, slug: orgRow.slug, mode });
 } catch (e) {
  return json({ error: "Unexpected: " + (e?.message || String(e)) }, 500);
 }
});
