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

  return json({ sites });
});
