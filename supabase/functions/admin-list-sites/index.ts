// ============================================================
// admin-list-sites — platform-admin-only list of ALL subscriber orgs
// with their site/brand/SEO state, for the Triskope Site Admin panel.
// Deploy: npx supabase functions deploy admin-list-sites --no-verify-jwt
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

function userIdFromToken(token: string) {
  try {
    const p = JSON.parse(atob(token.split(".")[1]));
    if (p?.sub && p?.role === "authenticated") return p.sub;
  } catch { /* ignore */ }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const uid = userIdFromToken(token);
  if (!uid) return json({ error: "Unauthorized" }, 401);

  const { data: adminRow } = await admin.from("platform_admins")
    .select("user_id").eq("user_id", uid).maybeSingle();
  if (!adminRow) return json({ error: "Platform admins only" }, 403);

  const { data: orgs, error } = await admin.from("organizations")
    .select("id, name, slug, custom_domain, site_config, plan, billing_status")
    .order("name");
  if (error) return json({ error: error.message }, 500);

  // ---- Platform metrics ----
  // Prices must match PlansView in the app.
  const PRICES: Record<string, number> = { starter: 49, pro: 99, enterprise: 199 };
  const THIRTY_D = Date.now() - 30 * 24 * 3600 * 1000;

  const tierCounts: Record<string, number> = { starter: 0, pro: 0, enterprise: 0 };
  const billingCounts: Record<string, number> = { active: 0, past_due: 0, suspended: 0 };
  let mrr = 0, pastDueTotal = 0;
  for (const o of orgs ?? []) {
    tierCounts[o.plan] = (tierCounts[o.plan] ?? 0) + 1;
    billingCounts[o.billing_status] = (billingCounts[o.billing_status] ?? 0) + 1;
    const price = PRICES[o.plan] ?? 0;
    // MRR counts subscribed accounts (active + past_due); suspended excluded.
    if (o.billing_status === "active" || o.billing_status === "past_due") mrr += price;
    if (o.billing_status === "past_due") pastDueTotal += price;
  }

  let totalUsers = 0, activeUsers30d = 0;
  try {
    const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const users = usersPage?.users ?? [];
    totalUsers = users.length;
    activeUsers30d = users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at).getTime() > THIRTY_D).length;
  } catch { /* metrics best-effort */ }

  let leadsTotal = 0, leads30d = 0;
  try {
    const [{ count: lt }, { count: l30 }] = await Promise.all([
      admin.from("leads").select("id", { count: "exact", head: true }),
      admin.from("leads").select("id", { count: "exact", head: true })
        .gte("created_at", new Date(THIRTY_D).toISOString()),
    ]);
    leadsTotal = lt ?? 0; leads30d = l30 ?? 0;
  } catch { /* metrics best-effort */ }

  const metrics = {
    subscribers: (orgs ?? []).length,
    tiers: tierCounts,
    billing: billingCounts,
    mrr, past_due_total: pastDueTotal,
    users_total: totalUsers, users_active_30d: activeUsers30d,
    leads_total: leadsTotal, leads_30d: leads30d,
  };

  const sites = (orgs ?? []).map((o) => {
    const cfg = (o.site_config ?? {}) as Record<string, unknown>;
    return {
      id: o.id,
      name: o.name,
      slug: o.slug,
      custom_domain: o.custom_domain,
      plan: o.plan,
      billing_status: o.billing_status,
      has_site: !!o.site_config && Object.keys(o.site_config).length > 0,
      colors: cfg.colors ?? {},
      seo_title: cfg.seo_title ?? "",
      seo_description: cfg.seo_description ?? "",
      og_image: cfg.og_image ?? "",
      city: cfg.city ?? "",
      region: cfg.region ?? "",
      areas_served: cfg.areas_served ?? "",
      saved_at: cfg._saved_at ?? null,
    };
  });

  return json({ sites, metrics });
});
