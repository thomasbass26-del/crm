// ============================================================
// get-custom-page — serves Triskope-authored HTML landing pages.
// Resolves the org (slug or custom domain), finds the PUBLISHED page,
// replaces {{TOKENS}}, injects the lead-capture auto-wire script, and
// returns text/html. Suspended orgs: 404.
//
// Tokens available in the HTML:
//   {{ORG_SLUG}} {{ORG_NAME}} {{LEAD_CAPTURE_URL}} {{PAGE_SLUG}}
// Auto-wire: any <form data-tme-lead> is submitted to lead-capture with
// fields name/email/phone/message (+ optional data-source attribute).
//
// Deploy: npx supabase functions deploy get-custom-page --no-verify-jwt
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const FN_BASE = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const err = (status: number, msg: string) =>
  new Response(JSON.stringify({ error: msg }), {
    status, headers: { "content-type": "application/json", ...CORS },
  });

// Auto-wire: serialize + POST any <form data-tme-lead> to lead-capture.
const WIRE = (orgSlug: string, captureUrl: string) => `
<script>
(function(){
  var forms = document.querySelectorAll("form[data-tme-lead]");
  forms.forEach(function(f){
    f.addEventListener("submit", async function(e){
      e.preventDefault();
      var g = function(n){ var el = f.querySelector('[name="'+n+'"]'); return el ? el.value.trim() : ""; };
      var btn = f.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; var orig = btn.textContent; btn.textContent = "Sending…"; }
      try {
        var r = await fetch(${JSON.stringify(captureUrl)}, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            org_slug: ${JSON.stringify(orgSlug)},
            name: g("name"), email: g("email"), phone: g("phone"),
            notes: g("message") || g("notes") || undefined,
            source: f.getAttribute("data-source") || "landing-page",
            consent_email: (function(){ var c = f.querySelector('[name="consent"]'); return !!(c && c.checked); })(),
            website: g("website"),
            page_url: location.href
          })
        });
        var d = await r.json().catch(function(){ return {}; });
        if (!r.ok || d.error) throw new Error(d.error || "Something went wrong");
        var ok = f.getAttribute("data-success") || "Thanks — you'll hear from us shortly.";
        f.innerHTML = '<p style="font:16px/1.6 sans-serif;padding:12px 0">' + ok + "</p>";
      } catch (ex) {
        if (btn) { btn.disabled = false; btn.textContent = orig; }
        alert(ex.message || "Something went wrong — please try again.");
      }
    });
  });
})();
</script>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "GET") return err(405, "GET only");

  const url = new URL(req.url);
  const g = (k: string) => (url.searchParams.get(k) ?? "").trim().toLowerCase();
  const slug = g("slug"), domain = g("domain"), page = g("page");
  if (!page || !/^[a-z0-9-]{1,80}$/.test(page)) return err(400, "Valid page slug required");

  let orgQ = supabase.from("organizations").select("id, name, slug, billing_status");
  if (slug && /^[a-z0-9-]{1,60}$/.test(slug)) orgQ = orgQ.eq("slug", slug);
  else if (domain && /^[a-z0-9.-]{4,253}$/.test(domain)) {
    const bare = domain.replace(/^www\./, "");
    orgQ = orgQ.or(`custom_domain.eq.${bare},custom_domain.eq.www.${bare}`);
  } else return err(400, "Valid slug or domain required");

  const { data: org } = await orgQ.maybeSingle();
  if (!org || org.billing_status === "suspended") return err(404, "Not found");

  const { data: row } = await supabase.from("custom_pages")
    .select("html, slug").eq("org_id", org.id).eq("slug", page)
    .eq("published", true).maybeSingle();
  if (!row?.html) return err(404, "Page not found");

  const captureUrl = `${FN_BASE}/lead-capture`;
  let html = String(row.html)
    .replaceAll("{{ORG_SLUG}}", org.slug)
    .replaceAll("{{ORG_NAME}}", org.name ?? "")
    .replaceAll("{{LEAD_CAPTURE_URL}}", captureUrl)
    .replaceAll("{{PAGE_SLUG}}", row.slug);

  const wire = WIRE(org.slug, captureUrl);
  html = html.includes("</body>") ? html.replace("</body>", `${wire}\n</body>`) : html + wire;

  const fresh = url.searchParams.get("fresh") === "1";
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...(fresh ? {} : { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" }),
      ...CORS,
    },
  });
});
