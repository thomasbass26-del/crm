// idx-sync — pull an agent's MLS listings from the RESO Web API and store them
// in idx_listings, so public-listings can serve them on the agent's site.
//
// Deploy: npx supabase functions deploy idx-sync --no-verify-jwt
//
// POST JSON: { "org_id": "<uuid>" }   (owner-triggered, or by a scheduled job)
// Returns:   { ok:true, count, org_id } | { error }
//
// ============================================================================
// RESO WEB API NOTES (read before filling the CCAR blanks)
// ----------------------------------------------------------------------------
// RESO Web API is the national MLS data standard. It's an OData (REST+JSON) feed.
// You query a base URL like:
//   https://<ccar-host>/RESO/OData/Property?$filter=...&$select=...&$top=...
// with an Authorization: Bearer <token> header.
//
// Standard RESO "Property" field names (most MLSs follow these):
//   ListingKey, ListPrice, UnparsedAddress, City, StateOrProvince, PostalCode,
//   BedroomsTotal, BathroomsTotalInteger, LivingArea, StandardStatus,
//   ListAgentMlsId, Media (photos)
//
// THREE THINGS YOU GET FROM CCAR — fill them where marked TODO(CCAR):
//   1) RESO base URL  (the OData service root)
//   2) Access token   (how they authenticate you as an approved vendor)
//   3) The agent identifier field + value to filter "this agent's listings"
//      (usually ListAgentMlsId = the agent's MLS member id). Some MLSs scope by
//      office (ListOfficeMlsId) instead. CCAR will tell you which.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", ...CORS } });

function callerId(token) {
  try {
    const p = JSON.parse(atob(token.split(".")[1]));
    if (p?.sub && p?.role === "authenticated") return p.sub;
  } catch { /* ignore */ }
  return null;
}

// ---- TODO(CCAR): the RESO base URL. Comes from CCAR vendor onboarding. ----
// Example shape only — replace with the real CCAR OData service root:
const RESO_BASE_URL = Deno.env.get("CCAR_RESO_URL") || ""; // e.g. "https://api.ccar.example/RESO/OData"
// ---- TODO(CCAR): how CCAR authenticates the feed. Usually a bearer token. ----
const RESO_TOKEN = Deno.env.get("CCAR_RESO_TOKEN") || "";

// Map a RESO Property record -> our idx_listings row shape.
// Field names follow the RESO standard; adjust if CCAR deviates.
function mapResoToRow(orgId, p) {
  const photo =
    Array.isArray(p.Media) && p.Media.length
      ? (p.Media[0].MediaURL || p.Media[0].MediaUrl || null)
      : null;
  return {
    org_id: orgId,
    mls_id: String(p.ListingKey ?? p.ListingId ?? ""),
    list_price: p.ListPrice ?? null,
    address: p.UnparsedAddress ?? null,
    city: p.City ?? null,
    state: p.StateOrProvince ?? null,
    zip: p.PostalCode ?? null,
    beds: p.BedroomsTotal ?? null,
    baths: p.BathroomsTotalInteger ?? p.BathroomsTotal ?? null,
    sqft: p.LivingArea ?? null,
    status: p.StandardStatus ?? p.MlsStatus ?? null,
    photo_url: photo,
    // detail_url: where this listing links on the agent's site. Adjust to your routing.
    detail_url: null,
    raw: p,
    synced_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
 try {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const URL = Deno.env.get("SUPABASE_URL");
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

  // Auth: caller must be a platform owner (decode JWT directly — no anon-key dep).
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const uid = callerId(token);
  if (!uid) return json({ error: "Not signed in" }, 401);
  const { data: adminRow } = await admin.from("platform_admins")
    .select("user_id").eq("user_id", uid).maybeSingle();
  if (!adminRow) {
    return json({ error: "Only Triskope staff can sync IDX." }, 403);
  }

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const orgId = String(body.org_id ?? "").trim();
  if (!orgId) return json({ error: "org_id required" }, 400);

  // Load this org's IDX config (the agent's MLS identifier etc.)
  const { data: org } = await admin.from("organizations")
    .select("id, idx_config").eq("id", orgId).maybeSingle();
  if (!org) return json({ error: "Org not found" }, 404);

  const cfg = org.idx_config || {};
  if (!cfg.enabled) return json({ error: "IDX not enabled for this org." }, 400);

  // Not configured yet → tell the caller clearly instead of failing silently.
  if (!RESO_BASE_URL || !RESO_TOKEN) {
    return json({ error: "IDX feed not configured yet. Set CCAR_RESO_URL and CCAR_RESO_TOKEN secrets once CCAR provisions the feed." }, 503);
  }

  // ---- TODO(CCAR): the filter that selects THIS agent's listings. ----
  // Most common: filter by the agent's MLS member id. CCAR confirms the field.
  const agentMlsId = cfg.agent_mls_id;
  if (!agentMlsId) return json({ error: "org idx_config.agent_mls_id is not set." }, 400);

  // Build a RESO OData query. Active listings for this agent, top 200, with photos.
  const select = [
    "ListingKey","ListPrice","UnparsedAddress","City","StateOrProvince","PostalCode",
    "BedroomsTotal","BathroomsTotalInteger","LivingArea","StandardStatus","ListAgentMlsId",
  ].join(",");
  const filter = encodeURIComponent(
    `ListAgentMlsId eq '${agentMlsId}' and StandardStatus eq 'Active'`
  );
  const url = `${RESO_BASE_URL}/Property?$select=${select}&$filter=${filter}&$expand=Media&$top=200`;

  // Fetch from the RESO Web API.
  const resp = await fetch(url, {
    headers: { "Authorization": `Bearer ${RESO_TOKEN}`, "Accept": "application/json" },
  });
  if (!resp.ok) {
    const t = await resp.text();
    await admin.from("organizations").update({
      idx_config: { ...cfg, last_sync_error: `HTTP ${resp.status}: ${t.slice(0,200)}`, last_synced_at: new Date().toISOString() },
    }).eq("id", orgId);
    return json({ error: `RESO request failed: HTTP ${resp.status}` }, 502);
  }
  const payload = await resp.json();
  const records = payload.value || payload["@odata.value"] || [];

  // Map + upsert. Upsert on (org_id, mls_id) so re-syncs update, not duplicate.
  const rows = records.map((p) => mapResoToRow(orgId, p)).filter((r) => r.mls_id);
  if (rows.length) {
    const { error: upErr } = await admin.from("idx_listings")
      .upsert(rows, { onConflict: "org_id,mls_id" });
    if (upErr) return json({ error: "Upsert failed: " + upErr.message }, 500);
  }

  // Optional: mark listings no longer in the feed as inactive (kept simple here).

  // Record sync status on the org.
  await admin.from("organizations").update({
    idx_config: { ...cfg, last_synced_at: new Date().toISOString(), last_sync_count: rows.length, last_sync_error: null },
  }).eq("id", orgId);

  return json({ ok: true, org_id: orgId, count: rows.length });
 } catch (e) {
  return json({ error: "Unexpected: " + (e?.message || String(e)) }, 500);
 }
});
