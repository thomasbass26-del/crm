// set-org-features — a platform owner turns a paid feature on/off for an agent.
//
// Deploy: npx supabase functions deploy set-org-features --no-verify-jwt
//
// POST JSON: { "org_id": "<agent org uuid>", "feature": "communities", "enabled": true }
// Returns:   { ok:true, features } | { error }
//
// Only a platform owner (owner of some existing org) may call this. Updates only
// the "features" map on the target org.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL");
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ANON = Deno.env.get("SUPABASE_ANON_KEY");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", ...CORS } });

// Features an owner is allowed to toggle (whitelist — add new paid features here).
const TOGGLEABLE = new Set(["communities", "market_reports", "ai_assistant"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  let callerId = null;
  try {
    const p = JSON.parse(atob(token.split(".")[1]));
    if (p?.sub && p?.role === "authenticated") callerId = p.sub;
  } catch { /* ignore */ }
  if (!callerId) return json({ error: "Not signed in" }, 401);

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

  // Authorize: Triskope platform admins only. The old check ("owner of some
  // org") passed for EVERY subscriber, letting them toggle paid features.
  const { data: adminRow } = await admin.from("platform_admins")
    .select("user_id").eq("user_id", callerId).maybeSingle();
  if (!adminRow) {
    return json({ error: "Only Triskope staff can change features." }, 403);
  }

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const orgId = String(body.org_id ?? "");
  const feature = String(body.feature ?? "");
  const enabled = !!body.enabled;
  if (!orgId || !feature) return json({ error: "org_id and feature required" }, 400);
  if (!TOGGLEABLE.has(feature)) return json({ error: "Unknown feature" }, 400);

  // Read current features, set the one key, write back.
  const { data: orgRow, error: rerr } = await admin.from("organizations")
    .select("features").eq("id", orgId).maybeSingle();
  if (rerr || !orgRow) return json({ error: "Org not found" }, 404);

  const features = { ...(orgRow.features || {}), [feature]: enabled };
  const { error: werr } = await admin.from("organizations")
    .update({ features }).eq("id", orgId);
  if (werr) return json({ error: werr.message }, 500);

  return json({ ok: true, features });
});
