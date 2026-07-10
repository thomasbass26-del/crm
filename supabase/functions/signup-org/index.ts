// ============================================================
// signup-org — self-serve workspace creation for new signups.
// Caller must be an authenticated user who does NOT yet own a
// workspace (one self-serve org per user; more via sales/admin).
//
// POST {
//   name,                    // brokerage / workspace name
//   service_area?,           // e.g. "Myrtle Beach & Grand Strand"
//   phone?, bio?,            // agent profile for the subscriber site
//   headshot_base64?,        // data-URL or raw base64 jpeg (client compresses)
//   domain: { mode: "own" | "request" | "subdomain", value?: string }
// } -> { org_id, slug }
//
// Creates: organizations row (plan=starter, billing_status='pending' — the
// app hard-gates pending orgs on Plan & Billing until Stripe checkout
// completes and the webhook flips billing_status to 'active'),
// org_members owner row, headshot upload to site-assets (service role).
// Pipeline stages are seeded by the existing on-insert trigger.
// Domain: NEVER activates custom_domain here — "own"/"request" are stored
// in site_config.domain_request for the Site Admin queue.
//
// Deploy: npx supabase functions deploy signup-org --no-verify-jwt
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", ...CORS } });

function uidFromToken(token: string) {
  try {
    const p = JSON.parse(atob(token.split(".")[1]));
    if (p?.sub && p?.role === "authenticated") return p.sub;
  } catch { /* ignore */ }
  return null;
}

const slugify = (s: string) =>
  (s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32)) || "workspace";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const uid = uidFromToken((req.headers.get("authorization") || "").replace("Bearer ", ""));
  if (!uid) return json({ error: "Not signed in" }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const name = String(body.name ?? "").trim().slice(0, 80);
  if (name.length < 2) return json({ error: "Workspace name is required" }, 400);
  const serviceArea = String(body.service_area ?? "").trim().slice(0, 120) || null;
  const phone = String(body.phone ?? "").trim().slice(0, 30) || null;
  const bio = String(body.bio ?? "").trim().slice(0, 1200) || null;
  const domain = (body.domain ?? {}) as { mode?: string; value?: string };
  const domainMode = ["own", "request", "subdomain"].includes(String(domain.mode)) ? String(domain.mode) : "subdomain";
  const domainValue = String(domain.value ?? "").trim().toLowerCase().slice(0, 120) || null;

  // One self-serve workspace per user. (Owners of existing orgs — including
  // platform-created ones — go through sales/admin for additional workspaces.)
  const { data: owned } = await admin.from("org_members")
    .select("org_id").eq("user_id", uid).eq("role", "owner").limit(1);
  if (owned && owned.length) return json({ error: "You already own a workspace. Contact us to add another." }, 409);

  // Unique slug: name-based, random suffix on collision.
  let slug = slugify(name);
  const { data: taken } = await admin.from("organizations").select("id").eq("slug", slug).maybeSingle();
  if (taken) slug = `${slug.slice(0, 26)}-${Math.random().toString(36).slice(2, 7)}`;

  // Headshot (optional): client compresses; we store via service role.
  let headshotUrl: string | null = null;
  const rawB64 = String(body.headshot_base64 ?? "");
  if (rawB64) {
    try {
      const b64 = rawB64.includes(",") ? rawB64.split(",")[1] : rawB64;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      if (bytes.length > 2_000_000) return json({ error: "Headshot too large — please use an image under 2MB." }, 400);
      const path = `signup/${uid}/headshot-${Date.now()}.jpg`;
      const { error: upErr } = await admin.storage.from("site-assets")
        .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw upErr;
      headshotUrl = admin.storage.from("site-assets").getPublicUrl(path).data.publicUrl;
    } catch (e) {
      console.error("headshot upload failed:", (e as { message?: string })?.message);
      // Non-fatal: continue without the headshot rather than failing signup.
    }
  }

  const { data: u } = await admin.auth.admin.getUserById(uid);
  const agentName = (u?.user?.user_metadata?.display_name as string) || u?.user?.email?.split("@")[0] || null;

  const siteConfig: Record<string, unknown> = {
    agentName, phone, bio,
    city: serviceArea,
    ...(headshotUrl ? { headshot: headshotUrl } : {}),
    domain_request: { mode: domainMode, value: domainValue, requested_at: new Date().toISOString() },
  };

  const { data: org, error: orgErr } = await admin.from("organizations")
    .insert({ name, slug, plan: "starter", billing_status: "pending", site_config: siteConfig })
    .select("id, slug").single();
  if (orgErr) return json({ error: "Couldn't create workspace: " + orgErr.message }, 500);

  const { error: memErr } = await admin.from("org_members")
    .insert({ org_id: org.id, user_id: uid, role: "owner" });
  if (memErr) {
    // Roll back the orphan org so the user can retry cleanly.
    await admin.from("organizations").delete().eq("id", org.id);
    return json({ error: "Couldn't create workspace: " + memErr.message }, 500);
  }

  return json({ org_id: org.id, slug: org.slug });
});
