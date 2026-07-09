// ============================================================
// stripe-portal — opens the Stripe Customer Portal for the org's
// owner (update card, view invoices, cancel). Cancellations flow
// back through stripe-webhook -> suspension.
//
// POST { org_id } -> { url }
// Deploy: npx supabase functions deploy stripe-portal --no-verify-jwt
// ============================================================
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const OK_ORIGINS = new Set([
  "https://app.triskope.ai",
  "https://app.themarketedge.app",
  "http://localhost:5173",
]);
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!Deno.env.get("STRIPE_SECRET_KEY")) return json({ error: "Billing not configured yet" }, 503);

  const uid = uidFromToken((req.headers.get("authorization") || "").replace("Bearer ", ""));
  if (!uid) return json({ error: "Not signed in" }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const orgId = String(body.org_id ?? "").trim();
  if (!orgId) return json({ error: "org_id required" }, 400);

  const { data: mem } = await admin.from("org_members")
    .select("role").eq("org_id", orgId).eq("user_id", uid).maybeSingle();
  if (mem?.role !== "owner") return json({ error: "Only the workspace owner can manage billing" }, 403);

  const { data: org } = await admin.from("organizations")
    .select("stripe_customer_id").eq("id", orgId).maybeSingle();
  if (!org?.stripe_customer_id) return json({ error: "No billing account yet — choose a plan first" }, 400);

  const origin = req.headers.get("origin") ?? "";
  const site = OK_ORIGINS.has(origin) ? origin : "https://app.triskope.ai";

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${site}/#billing`,
  });
  return json({ url: session.url });
});
