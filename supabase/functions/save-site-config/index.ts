// save-site-config — lets a signed-in agent save their website content.
// Updates ONLY organizations.site_config, ONLY for an org the caller belongs to.
// Agents cannot change slug or any other org field through this.
//
// Deploy: npx supabase functions deploy save-site-config --no-verify-jwt
//
// POST JSON: { "site_config": { ...editable site fields... } }
// Returns:   { ok:true } | { error }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", ...CORS } });

function userIdFromToken(token) {
  try {
    const p = JSON.parse(atob(token.split(".")[1]));
    if (p?.sub && p?.role === "authenticated") return p.sub;
  } catch { /* ignore */ }
  return null;
}

// Key split: subscribers edit CONTENT; only Triskope platform admins edit
// ADMIN keys (brand system, SEO, domain). Saves are MERGED into the existing
// site_config so a subscriber save can never clobber admin-managed fields
// and an admin save can never clobber subscriber content.
const CONTENT_KEYS = new Set([
  "agent_name","agent_first","brokerage","phone","email","site_url",
  "hero_image","hero_alt","hero_eyebrow","hero_headline","hero_subtext",
  "headshot","about","footer_tagline","trust",
  "curated_listings","neighborhoods",
  "stats","testimonials","sold_portfolio",
  "_saved_at",
]);
const ADMIN_KEYS = new Set([
  "colors","seo_title","seo_description","og_image",
  "city","region","areas_served",
]);

function sanitize(input, isAdmin) {
  const out = {};
  if (input && typeof input === "object") {
    for (const k of Object.keys(input)) {
      if (CONTENT_KEYS.has(k) || (isAdmin && ADMIN_KEYS.has(k))) out[k] = input[k];
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const uid = userIdFromToken(token);
  if (!uid) return json({ error: "Unauthorized" }, 401);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  );

  // Platform admin? (Triskope staff — may edit any org and admin keys.)
  const { data: adminRow } = await admin.from("platform_admins")
    .select("user_id").eq("user_id", uid).maybeSingle();
  const isAdmin = !!adminRow;

  // Target org: explicit org_id. Members may edit their own org's content;
  // platform admins may edit any org.
  const orgId = String(body.org_id ?? "").trim();
  if (!orgId) return json({ error: "org_id required" }, 400);
  if (!isAdmin) {
    const { data: mem } = await admin.from("org_members")
      .select("org_id").eq("user_id", uid).eq("org_id", orgId).maybeSingle();
    if (!mem?.org_id) return json({ error: "Not a member of this workspace" }, 403);
  }

  // MERGE: overlay only the keys this caller may edit onto the existing config.
  const { data: orgRow } = await admin.from("organizations")
    .select("site_config").eq("id", orgId).maybeSingle();
  if (!orgRow) return json({ error: "Workspace not found" }, 404);
  const clean = { ...(orgRow.site_config || {}), ...sanitize(body.site_config, isAdmin) };

  const update = { site_config: clean };

  // Custom domain: platform admins only. Pass null/"" to clear.
  if ("custom_domain" in body) {
    if (!isAdmin) return json({ error: "Domains are managed by Triskope" }, 403);
    const raw = String(body.custom_domain ?? "").trim().toLowerCase()
      .replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (raw && !/^[a-z0-9][a-z0-9.-]{2,251}[a-z0-9]$/.test(raw)) {
      return json({ error: "That doesn't look like a valid domain" }, 400);
    }
    update.custom_domain = raw || null;
  }

  const { error } = await admin.from("organizations")
    .update(update)
    .eq("id", orgId);

  if (error) {
    if (String(error.message).includes("organizations_custom_domain_key")) {
      return json({ error: "That domain is already in use by another site" }, 409);
    }
    return json({ error: error.message }, 500);
  }
  return json({ ok: true });
});
