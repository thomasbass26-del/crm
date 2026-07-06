// ============================================================
// Triskope CRM — Edge Function: get-site-config
// Public, read-only. Powers the multi-tenant subscriber sites at
// <slug>.triskope.ai. Returns ONLY whitelisted, publishable data:
// org name/slug, site_config (authored site content), and the
// org's published communities. Never exposes features, idx_config,
// members, or any other organizations columns.
//
// Deploy: npx supabase functions deploy get-site-config --no-verify-jwt
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const json = (body: unknown, status = 200, cache = false) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...(cache ? { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" } : {}),
      ...CORS,
    },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "GET") return json({ error: "GET only" }, 405);

  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") ?? "").trim().toLowerCase();
  const domain = (url.searchParams.get("domain") ?? "").trim().toLowerCase();

  let query = supabase.from("organizations")
    .select("id, name, slug, site_config, custom_domain");
  if (slug && /^[a-z0-9-]{1,60}$/.test(slug)) {
    query = query.eq("slug", slug);
  } else if (domain && /^[a-z0-9.-]{4,253}$/.test(domain)) {
    // Match with and without a www. prefix so either form works.
    const bare = domain.replace(/^www\./, "");
    query = query.or(`custom_domain.eq.${bare},custom_domain.eq.www.${bare}`);
  } else {
    return json({ error: "Valid slug or domain required" }, 400);
  }

  const { data: org } = await query.maybeSingle();

  if (!org) return json({ error: "Site not found" }, 404);
  if (!org.site_config || Object.keys(org.site_config).length === 0) {
    // Org exists but has not authored a site yet.
    return json({ error: "Site not published" }, 404);
  }

  // Column set of communities isn't guaranteed; select all and whitelist
  // in code so a missing column can never 500 the public site.
  const { data: communities } = await supabase
    .from("communities")
    .select("*")
    .eq("org_id", org.id)
    .eq("published", true);

  const pubCommunities = (communities ?? []).map((c: Record<string, unknown>) => ({
    id: c.id,
    slug: c.slug,
    name: c.name ?? c.title ?? c.slug,
    tagline: c.tagline ?? null,
    hero_image: c.hero_image ?? c.image ?? null,
    description: c.description ?? null,
  })).sort((a, b) => String(a.name).localeCompare(String(b.name)));

  return json({
    name: org.name,
    slug: org.slug,
    site_config: org.site_config,
    communities: pubCommunities,
  }, 200, true);
});
