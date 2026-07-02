// ============================================================
// Triskope CRM — Edge Function: bulk-score
// Scores up to N unscored leads in the org via the Claude API.
// Call repeatedly (or let the UI loop) until remaining = 0.
//
// Deploy: supabase functions deploy bulk-score --no-verify-jwt
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC = Deno.env.get("ANTHROPIC_API_KEY")!;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", ...CORS } });

function userIdFromToken(token: string): string | null {
  try { const p = JSON.parse(atob(token.split(".")[1])); if (p?.sub && p?.role === "authenticated") return p.sub; }
  catch { /* ignore */ } return null;
}

async function scoreOne(lead: Record<string, unknown>): Promise<{ score: number; tier: string; rationale: string[]; next: string } | null> {
  const signals = {
    has_email: !!lead.email, has_phone: !!lead.phone,
    sms_opt_in: lead.consent_sms, email_opt_in: lead.consent_email,
    source: lead.source, name: lead.name,
    note: "Imported/legacy contact — limited behavioral signal; score as a baseline from available fields.",
  };
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": ANTHROPIC, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6", max_tokens: 500,
      system: "You are a real estate lead-scoring engine. Return ONLY JSON: " +
        '{"score": <0-100 int>, "tier": "hot"|"warm"|"cold", "rationale": [<2-3 short strings>], "recommended_next_action": <one short sentence>}. ' +
        "For imported contacts with limited signal, score conservatively (most land 30-60) and say so in the rationale. Raw JSON only.",
      messages: [{ role: "user", content: JSON.stringify(signals) }],
    }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  const text = (data.content ?? []).filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text).join("\n").replace(/```json|```/g, "").trim();
  try {
    const p = JSON.parse(text);
    return { score: Math.max(0, Math.min(100, Math.round(p.score))), tier: p.tier, rationale: p.rationale, next: p.recommended_next_action };
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  const userId = userIdFromToken(token);
  if (!userId) return json({ error: "Not signed in" }, 401);

  const { org_id, batch } = await req.json();
  if (!org_id) return json({ error: "org_id required" }, 400);
  const limit = Math.min(Number(batch) || 15, 25);

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

  const { data: mem } = await admin.from("org_members")
    .select("role").eq("org_id", org_id).eq("user_id", userId).maybeSingle();
  if (!mem || !["owner", "admin"].includes(mem.role)) return json({ error: "Only owners/admins can bulk score" }, 403);

  // Count remaining unscored
  const { count: remainingBefore } = await admin.from("leads")
    .select("id", { count: "exact", head: true }).eq("org_id", org_id).is("score", null);

  // Grab a batch of unscored leads
  const { data: leads } = await admin.from("leads")
    .select("*").eq("org_id", org_id).is("score", null).limit(limit);

  let scored = 0;
  for (const lead of leads ?? []) {
    const result = await scoreOne(lead);
    if (!result) continue;
    await admin.from("leads").update({
      score: result.score,
      score_rationale: { tier: result.tier, rationale: result.rationale,
        recommended_next_action: result.next, scored_at: new Date().toISOString(),
        model: "claude-sonnet-4-6", bulk: true },
    }).eq("id", lead.id);
    await admin.from("lead_activities").insert({
      org_id, lead_id: lead.id, type: "ai_score",
      body: `Scored ${result.score} (${result.tier}). ${result.next}`, internal: true,
    });
    scored++;
  }

  const remaining = Math.max(0, (remainingBefore ?? 0) - scored);
  return json({ ok: true, scored, remaining });
});
