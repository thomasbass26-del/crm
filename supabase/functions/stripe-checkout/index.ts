// ============================================================
// stripe-checkout — creates a Stripe Checkout session for a plan.
// Caller must be an OWNER of the org. One Stripe Customer per org,
// created on first checkout and stored on organizations.
//
// POST { org_id, plan: "starter"|"pro"|"enterprise" } -> { url }
// Secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_STARTER, STRIPE_PRICE_PRO,
//          STRIPE_PRICE_ENTERPRISE
// Deploy: npx supabase functions deploy stripe-checkout --no-verify-jwt
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

const PRICES: Record<string, string | undefined> = {
  starter: Deno.env.get("STRIPE_PRICE_STARTER"),
  pro: Deno.env.get("STRIPE_PRICE_PRO"),
  enterprise: Deno.env.get("STRIPE_PRICE_ENTERPRISE"),
};

// Only these origins may be bounced back to after checkout.
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
  const plan = String(body.plan ?? "").trim();
  const priceId = PRICES[plan];
  if (!orgId || !priceId) return json({ error: "org_id and a valid plan are required" }, 400);

  // Owner-only: billing changes are the owner's call.
  const { data: mem } = await admin.from("org_members")
    .select("role").eq("org_id", orgId).eq("user_id", uid).maybeSingle();
  if (mem?.role !== "owner") return json({ error: "Only the workspace owner can change billing" }, 403);

  const { data: org } = await admin.from("organizations")
    .select("id, name, slug, stripe_customer_id").eq("id", orgId).maybeSingle();
  if (!org) return json({ error: "Workspace not found" }, 404);

  const { data: u } = await admin.auth.admin.getUserById(uid);
  const email = u?.user?.email ?? undefined;

  // One Stripe Customer per org, reused forever.
  let customerId = org.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      name: org.name ?? org.slug,
      metadata: { org_id: org.id, org_slug: org.slug ?? "" },
    });
    customerId = customer.id;
    await admin.from("organizations").update({ stripe_customer_id: customerId }).eq("id", org.id);
  }

  const origin = req.headers.get("origin") ?? "";
  const site = OK_ORIGINS.has(origin) ? origin : "https://app.triskope.ai";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    subscription_data: { metadata: { org_id: org.id, plan } },
    metadata: { org_id: org.id, plan },
    success_url: `${site}/?billing=success#billing`,
    cancel_url: `${site}/?billing=cancelled#billing`,
  });

  return json({ url: session.url });
});
