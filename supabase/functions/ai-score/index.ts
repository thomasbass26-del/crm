import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { lead_id, org_id } = await req.json();
  if (!lead_id || !org_id) return new Response("lead_id and org_id required", { status: 400 });

  const [{ data: lead }, { data: activities }, { data: community }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", lead_id).eq("org_id", org_id).single(),
    supabase.from("lead_activities").select("type, body, channel, created_at")
      .eq("lead_id", lead_id).order("created_at", { ascending: false }).limit(25),
    supabase.from("leads").select("community_id").eq("id", lead_id).single()
      .then(async (r) => r.data?.community_id
        ? supabase.from("communities").select("name").eq("id", r.data.community_id).single()
        : { data: null }),
  ]);
  if (!lead) return new Response("Lead not found", { status: 404 });

  const signals = {
    has_email: !!lead.email,
    has_phone: !!lead.phone,
    sms_opt_in: lead.consent_sms,
    source: lead.source,
    community_interest: community?.data?.name ?? null,
    days_since_created: Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400000),
    activity_count: activities?.length ?? 0,
    recent_activities: (activities ?? []).map((a) => ({
      type: a.type, when: a.created_at,
      excerpt: (a.body ?? "").slice(0, 200),
    })),
  };

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system:
        "You are a real estate lead-scoring engine. Given lead signals, return ONLY a JSON object: " +
        '{"score": <0-100 integer>, "tier": "hot"|"warm"|"cold", ' +
        '"rationale": [<2-4 short strings, each one concrete signal>], ' +
        '"recommended_next_action": <one short imperative sentence>}. ' +
        "Scoring guidance: phone + SMS opt-in + named community interest + a substantive message " +
        "are strong buy signals. Repeat activity within days is hot. Email-only with no message is cold-warm. " +
        "No prose, no markdown fences - raw JSON only.",
      messages: [{ role: "user", content: JSON.stringify(signals) }],
    }),
  });

  if (!resp.ok) {
    console.error("Claude API error", resp.status, await resp.text());
    return new Response("Scoring failed", { status: 502 });
  }

  const data = await resp.json();
  const text = (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text).join("\n")
    .replace(/```json|```/g, "").trim();

  let parsed: { score: number; tier: string; rationale: string[]; recommended_next_action: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error("Unparseable scoring output:", text.slice(0, 300));
    return new Response("Bad model output", { status: 502 });
  }

  const score = Math.max(0, Math.min(100, Math.round(parsed.score)));

  await supabase.from("leads").update({
    score,
    score_rationale: {
      tier: parsed.tier,
      rationale: parsed.rationale,
      recommended_next_action: parsed.recommended_next_action,
      scored_at: new Date().toISOString(),
      model: "claude-sonnet-4-6",
    },
  }).eq("id", lead_id).eq("org_id", org_id);

  await supabase.from("lead_activities").insert({
    org_id, lead_id,
    type: "ai_score",
    body: `Scored ${score} (${parsed.tier}). ${parsed.recommended_next_action}`,
    internal: true,
  });

  return new Response(JSON.stringify({ ok: true, score, tier: parsed.tier }), {
    headers: { "content-type": "application/json" },
  });
});
