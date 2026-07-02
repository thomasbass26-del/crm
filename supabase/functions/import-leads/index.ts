// ============================================================
// Triskope CRM — Edge Function: import-leads
// Bulk-inserts leads from a parsed CSV/XLSX (rows sent as JSON).
// Dedupes by email within the org. Consent defaults OFF; an
// explicit attestation flag stamps an auditable consent record.
//
// Deploy: supabase functions deploy import-leads --no-verify-jwt
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", ...CORS } });

function userIdFromToken(token: string): string | null {
  try {
    const p = JSON.parse(atob(token.split(".")[1]));
    if (p?.sub && p?.role === "authenticated") return p.sub;
  } catch { /* ignore */ }
  return null;
}

const cleanEmail = (v: unknown) => String(v ?? "").trim().toLowerCase() || null;
const cleanPhone = (v: unknown) => { const p = String(v ?? "").replace(/[^\d+]/g, ""); return p || null; };
const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  const userId = userIdFromToken(token);
  if (!userId) return json({ error: "Not signed in" }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const orgId = String(body.org_id ?? "");
  const rows = Array.isArray(body.rows) ? body.rows as Record<string, unknown>[] : [];
  const source = String(body.source ?? "import");
  const attestEmail = body.attest_email_consent === true;
  const attestSms = body.attest_sms_consent === true;
  if (!orgId) return json({ error: "org_id required" }, 400);
  if (!rows.length) return json({ error: "No rows to import" }, 400);
  if (rows.length > 5000) return json({ error: "Max 5000 rows per import" }, 400);

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

  // Authorize: owner/admin only
  const { data: mem } = await admin.from("org_members")
    .select("role").eq("org_id", orgId).eq("user_id", userId).maybeSingle();
  if (!mem || !["owner", "admin"].includes(mem.role)) {
    return json({ error: "Only owners and admins can import" }, 403);
  }

  // Existing emails for dedupe
  const { data: existing } = await admin.from("leads")
    .select("email").eq("org_id", orgId).not("email", "is", null);
  const seen = new Set((existing ?? []).map((e) => (e.email ?? "").toLowerCase()));

  const now = new Date().toISOString();
  const attestation = (attestEmail || attestSms) ? {
    method: "bulk_import_attestation",
    attested_by: userId,
    attested_at: now,
    email_consent_attested: attestEmail,
    sms_consent_attested: attestSms,
    note: "Importer attested prior consent / existing business relationship",
  } : null;

  const toInsert: Record<string, unknown>[] = [];
  let skippedDup = 0, skippedInvalid = 0;

  for (const r of rows) {
    const name = String(r.name ?? "").trim();
    const email = cleanEmail(r.email);
    const phone = cleanPhone(r.phone);
    if (!name && !email && !phone) { skippedInvalid++; continue; }
    if (email && !isEmail(email)) { skippedInvalid++; continue; }
    if (email && seen.has(email)) { skippedDup++; continue; }
    if (email) seen.add(email); // guard against dupes within the same file

    toInsert.push({
      org_id: orgId,
      name: name || email || phone,
      email, phone,
      // "captured" is the system-seeded first stage; the legacy "fresh" value
      // violates the composite FK to pipeline_stages.
      stage: "captured",
      source,
      consent_email: attestEmail,
      consent_sms: attestSms && !!phone,
      consent_captured_at: attestation ? now : null,
      consent_record: attestation,
    });
  }

  let inserted = 0;
  const BATCH = 500;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const chunk = toInsert.slice(i, i + BATCH);
    const { error, count } = await admin.from("leads").insert(chunk, { count: "exact" });
    if (error) return json({ error: error.message, inserted }, 500);
    inserted += count ?? chunk.length;
  }

  return json({
    ok: true,
    inserted,
    skipped_duplicates: skippedDup,
    skipped_invalid: skippedInvalid,
    total_rows: rows.length,
  });
});
