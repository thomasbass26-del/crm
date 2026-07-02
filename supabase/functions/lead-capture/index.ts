import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (typeof body.website === "string" && body.website.trim() !== "") {
    return json({ ok: true });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase() || null;
  const phone = String(body.phone ?? "").replace(/[^\d+]/g, "") || null;
  const orgSlug = String(body.org_slug ?? "").trim();

  if (!orgSlug) return json({ error: "org_slug required" }, 400);
  if (!name) return json({ error: "Name is required" }, 400);
  if (!email && !phone) return json({ error: "Email or phone required" }, 400);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Invalid email" }, 400);
  }

  const { data: org } = await supabase
    .from("organizations").select("id, features").eq("slug", orgSlug).single();
  if (!org) return json({ error: "Unknown organization" }, 404);

  let communityId: string | null = null;
  if (body.community_slug) {
    const { data: comm } = await supabase
      .from("communities").select("id")
      .eq("org_id", org.id).eq("slug", String(body.community_slug))
      .eq("published", true).single();
    communityId = comm?.id ?? null;
  }

  const consentEmail = body.consent_email === true;
  const consentSms = body.consent_sms === true && !!phone;

  const evidence = {
    captured_at: new Date().toISOString(),
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: req.headers.get("user-agent") ?? null,
    page_url: body.page_url ?? null,
    form_snapshot: {
      consent_sms_checkbox: body.consent_sms === true,
      consent_email_checkbox: body.consent_email === true,
      disclosure_version: "v1-2026-06",
    },
    utm: body.utm ?? null,
  };

  let leadId: string;
  const { data: existing } = email
    ? await supabase.from("leads").select("id")
        .eq("org_id", org.id).eq("email", email).maybeSingle()
    : { data: null };

  if (existing) {
    leadId = existing.id;
    await supabase.from("leads").update({
      phone: phone ?? undefined,
      consent_email: consentEmail || undefined,
      consent_sms: consentSms || undefined,
      consent_captured_at: (consentEmail || consentSms) ? new Date().toISOString() : undefined,
      community_id: communityId ?? undefined,
    }).eq("id", leadId);
  } else {
    // Entry stage comes from pipeline_stages.is_entry (per-org flag, exactly
    // one enforced by partial unique index). Fallback to system-seeded
    // "captured" if an org somehow has no flagged entry stage.
    const { data: entryStage } = await supabase.from("pipeline_stages")
      .select("id").eq("org_id", org.id).eq("is_entry", true).maybeSingle();

    const { data: lead, error } = await supabase.from("leads").insert({
      org_id: org.id,
      name, email, phone,
      stage: entryStage?.id ?? "captured",
      source: String(body.source ?? "lead-form"),
      community_id: communityId,
      consent_email: consentEmail,
      consent_sms: consentSms,
      consent_captured_at: (consentEmail || consentSms) ? new Date().toISOString() : null,
      consent_record: evidence,
    }).select("id").single();
    if (error) return json({ error: "Could not save lead" }, 500);
    leadId = lead.id;

    // Auto-assign (opt-in per org via features.auto_assign): atomic round-robin
    // across org members, state + locking handled inside the RPC. Non-fatal.
    if ((org.features as Record<string, unknown> | null)?.auto_assign === true) {
      const { error: aErr } = await supabase.rpc("assign_next_agent", {
        p_org: org.id,
        p_lead: leadId,
      });
      if (aErr) console.error("assign_next_agent failed:", aErr.message);
    }
  }

  if (consentSms && phone) {
    await supabase.from("sms_consents").insert({
      org_id: org.id, lead_id: leadId, phone,
      opted_in_at: new Date().toISOString(),
      opt_in_source: String(body.source ?? "lead-form"),
      opt_in_evidence: evidence,
    });
  }

  await supabase.from("lead_activities").insert({
    org_id: org.id, lead_id: leadId,
    type: existing ? "form_resubmit" : "form",
    body: String(body.message ?? "").slice(0, 2000) || "Lead form submitted",
    internal: false,
  });

  fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-score`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ lead_id: leadId, org_id: org.id }),
  }).catch(() => {});

  return json({ ok: true, lead_id: leadId });
});
