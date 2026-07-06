// ============================================================
// get-listings — public, read-only listing search for subscriber sites.
// Resolves the org by slug or custom domain (same contract as
// get-site-config), then serves that org's idx_listings with filters.
// Returns sanitized fields only; the raw RESO record stays private
// except photos + public remarks.
//
// GET ?slug=|domain= [&id= (detail)] [&min_price=&max_price=&beds=&baths=
//     &city=&limit=&offset=]
// Deploy: npx supabase functions deploy get-listings --no-verify-jwt
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

const num = (v: string | null) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

type Raw = Record<string, unknown> | null;

function publicShape(row: Record<string, unknown>, detail = false) {
  const raw = (row.raw ?? {}) as Record<string, unknown>;
  const media = Array.isArray(raw.Media) ? raw.Media as Record<string, unknown>[] : [];
  const photos = media.map(m => m.MediaURL || m.MediaUrl).filter(Boolean).slice(0, 30);
  const base = {
    id: row.id,
    mls_id: row.mls_id,
    list_price: row.list_price,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    beds: row.beds,
    baths: row.baths,
    sqft: row.sqft,
    status: row.status,
    photo_url: row.photo_url || photos[0] || null,
  };
  if (!detail) return base;
  return {
    ...base,
    photos,
    description: (raw.PublicRemarks as string) || null,
    year_built: raw.YearBuilt ?? null,
    lot_size: raw.LotSizeAcres ?? null,
    property_type: raw.PropertySubType ?? raw.PropertyType ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "GET") return json({ error: "GET only" }, 405);

  const url = new URL(req.url);
  const g = (k: string) => (url.searchParams.get(k) ?? "").trim();
  const slug = g("slug").toLowerCase();
  const domain = g("domain").toLowerCase();

  let orgQ = supabase.from("organizations").select("id");
  if (slug && /^[a-z0-9-]{1,60}$/.test(slug)) orgQ = orgQ.eq("slug", slug);
  else if (domain && /^[a-z0-9.-]{4,253}$/.test(domain)) {
    const bare = domain.replace(/^www\./, "");
    orgQ = orgQ.or(`custom_domain.eq.${bare},custom_domain.eq.www.${bare}`);
  } else return json({ error: "Valid slug or domain required" }, 400);

  const { data: org } = await orgQ.maybeSingle();
  if (!org) return json({ error: "Site not found" }, 404);

  // Detail request
  const id = g("id");
  if (id) {
    const { data: row } = await supabase.from("idx_listings")
      .select("*").eq("org_id", org.id).eq("id", id).maybeSingle();
    if (!row) return json({ error: "Listing not found" }, 404);
    return json({ listing: publicShape(row, true) }, 200, true);
  }

  // Search request
  let q = supabase.from("idx_listings").select("*", { count: "exact" })
    .eq("org_id", org.id)
    .or("status.eq.Active,status.is.null");
  const minP = num(g("min_price")); if (minP) q = q.gte("list_price", minP);
  const maxP = num(g("max_price")); if (maxP) q = q.lte("list_price", maxP);
  const beds = num(g("beds"));      if (beds) q = q.gte("beds", beds);
  const baths = num(g("baths"));    if (baths) q = q.gte("baths", baths);
  const city = g("city");           if (city) q = q.ilike("city", `%${city}%`);
  const limit = Math.min(num(g("limit")) ?? 24, 48);
  const offset = num(g("offset")) ?? 0;
  q = q.order("list_price", { ascending: false }).range(offset, offset + limit - 1);

  const { data: rows, count, error } = await q;
  if (error) return json({ error: "Search failed" }, 500);
  return json({
    listings: (rows ?? []).map(r => publicShape(r)),
    total: count ?? 0,
    limit, offset,
  }, 200, true);
});
