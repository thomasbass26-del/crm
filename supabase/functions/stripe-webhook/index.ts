// ============================================================
// stripe-webhook — Stripe events drive plan + billing_status.
// Signature-verified; NEVER trust the payload without it.
//
// Mapping:
//   checkout.session.completed        -> plan set, billing active
//   customer.subscription.updated     -> plan/status follow Stripe
//   invoice.payment_failed            -> past_due
//   customer.subscription.deleted     -> suspended (data kept)
//
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
//          STRIPE_PRICE_STARTER/PRO/ENTERPRISE
// Deploy: npx supabase functions deploy stripe-webhook --no-verify-jwt
// ============================================================
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Tier feature presets — MUST match admin-manage-org.
const PLAN_FEATURES: Record<string, Record<string, boolean>> = {
  starter:    { communities: false, market_reports: false, ai_assistant: false },
  pro:        { communities: true,  market_reports: true,  ai_assistant: false },
  enterprise: { communities: true,  market_reports: true,  ai_assistant: true },
};

function planFromPrice(priceId: string | undefined): string | null {
  if (!priceId) return null;
  if (priceId === Deno.env.get("STRIPE_PRICE_STARTER")) return "starter";
  if (priceId === Deno.env.get("STRIPE_PRICE_PRO")) return "pro";
  if (priceId === Deno.env.get("STRIPE_PRICE_ENTERPRISE")) return "enterprise";
  return null;
}

async function findOrg(opts: { orgId?: string | null; customerId?: string | null }) {
  if (opts.orgId) {
    const { data } = await admin.from("organizations")
      .select("id, features, plan, billing_status").eq("id", opts.orgId).maybeSingle();
    if (data) return data;
  }
  if (opts.customerId) {
    const { data } = await admin.from("organizations")
      .select("id, features, plan, billing_status").eq("stripe_customer_id", opts.customerId).maybeSingle();
    if (data) return data;
  }
  return null;
}

async function applyPlan(org: { id: string; features: Record<string, boolean> | null }, plan: string | null, billing: string, subId?: string | null) {
  const update: Record<string, unknown> = {
    billing_status: billing,
    suspended_at: billing === "suspended" ? new Date().toISOString() : null,
  };
  if (plan && PLAN_FEATURES[plan]) {
    update.plan = plan;
    update.features = { ...(org.features ?? {}), ...PLAN_FEATURES[plan] };
  }
  if (subId !== undefined) update.stripe_subscription_id = subId;
  await admin.from("organizations").update(update).eq("id", org.id);
}

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!sig || !secret) return new Response("Webhook not configured", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, secret, undefined, cryptoProvider);
  } catch (e) {
    console.error("signature verification failed:", (e as Error).message);
    return new Response("Bad signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const org = await findOrg({ orgId: s.metadata?.org_id, customerId: String(s.customer ?? "") });
        if (!org) break;
        const plan = s.metadata?.plan ?? null;
        await applyPlan(org, plan, "active", String(s.subscription ?? "") || null);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const org = await findOrg({ orgId: sub.metadata?.org_id, customerId: String(sub.customer ?? "") });
        if (!org) break;
        const plan = planFromPrice(sub.items?.data?.[0]?.price?.id) ?? sub.metadata?.plan ?? null;
        const billing =
          sub.status === "active" || sub.status === "trialing" ? "active"
          : sub.status === "past_due" ? "past_due"
          : sub.status === "canceled" || sub.status === "unpaid" || sub.status === "incomplete_expired" ? "suspended"
          : null;
        if (billing) await applyPlan(org, plan, billing, sub.id);
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const org = await findOrg({ customerId: String(inv.customer ?? "") });
        if (!org) break;
        await applyPlan(org, null, "past_due");
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const org = await findOrg({ orgId: sub.metadata?.org_id, customerId: String(sub.customer ?? "") });
        if (!org) break;
        // Cancellation: suspend (site dark, CRM locked, DATA KEPT per the
        // cancellation policy's 30-day export window).
        await applyPlan(org, null, "suspended", null);
        break;
      }
      default:
        break; // unhandled event types are fine
    }
  } catch (e) {
    console.error("webhook handler error:", (e as Error).message);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "content-type": "application/json" },
  });
});
