// nurture-runner — the scheduler heart. Run on a daily schedule (Supabase cron).
// For every ACTIVE enrollment whose next touch is due, send the email and advance.
// Auto-pauses enrollments whose lead has gone Warm/Delivered/Lost (per the plan:
// "the automated drip pauses" when a lead transitions to active).
//
// Deploy: npx supabase functions deploy nurture-runner --no-verify-jwt
// Schedule (Supabase Dashboard -> Edge Functions -> nurture-runner -> Schedules,
//   or via pg_cron) to run daily, e.g. 0 14 * * * (14:00 UTC ~ 9-10am ET).
//
// No request body needed. Returns a summary { sent, paused, skipped, errors }.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
const json = (b, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", ...CORS } });

// Stages that mean "stop nurturing" now come from pipeline_stages.pauses_nurture
// (per-org flag). Loaded once per run into a Map<org_id, Set<stage_id>>.
// Fallback (org with no flagged stages) matches the legacy hardcoded list.
const FALLBACK_PAUSE = new Set(["warm", "delivered", "lost"]);

async function loadPauseStages(admin) {
  const { data } = await admin.from("pipeline_stages")
    .select("org_id, id").eq("pauses_nurture", true);
  const map = new Map();
  for (const r of data || []) {
    if (!map.has(r.org_id)) map.set(r.org_id, new Set());
    map.get(r.org_id).add(r.id);
  }
  return map;
}

// Simple {{token}} fill.
function fill(tpl, vars) {
  return (tpl || "").replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ""));
}

Deno.serve(async (req) => {
 try {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const URL = Deno.env.get("SUPABASE_URL");
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

  const summary = { sent: 0, paused: 0, skipped: 0, errors: 0, details: [] };

  // Pull active enrollments.
  const { data: enrolls, error: enrErr } = await admin
    .from("nurture_enrollments")
    .select("id, lead_id, sequence_id, org_id, enrolled_at, next_step, status")
    .eq("status", "active");
  if (enrErr) return json({ error: "Load enrollments failed: " + enrErr.message }, 500);

  const pauseByOrg = await loadPauseStages(admin);
  const now = Date.now();

  for (const en of enrolls || []) {
    // Look up the lead (for stage check + email + name).
    const { data: lead } = await admin.from("leads")
      .select("id, name, email, stage, consent_email, org_id").eq("id", en.lead_id).maybeSingle();
    if (!lead) { summary.skipped++; continue; }

    // Pause if lead's stage is flagged pauses_nurture for its org.
    const pauseSet = pauseByOrg.get(lead.org_id) ?? FALLBACK_PAUSE;
    if (pauseSet.has(lead.stage)) {
      await admin.from("nurture_enrollments").update({ status: "paused" }).eq("id", en.id);
      summary.paused++;
      continue;
    }

    // Find the next step.
    const { data: step } = await admin.from("nurture_steps")
      .select("id, step_order, day_offset, channel, subject, body")
      .eq("sequence_id", en.sequence_id).eq("step_order", en.next_step).maybeSingle();

    if (!step) {
      // No more steps -> completed.
      await admin.from("nurture_enrollments").update({ status: "completed" }).eq("id", en.id);
      continue;
    }

    // Is this touch due yet? enrolled_at + day_offset days <= now.
    const dueAt = new Date(en.enrolled_at).getTime() + step.day_offset * 86400000;
    if (dueAt > now) { continue; } // not due yet

    // Only email channel in v1.
    if (step.channel !== "email") { summary.skipped++; continue; }
    if (!lead.email || lead.consent_email === false) {
      // Can't/shouldn't email — advance past this step so the sequence isn't stuck.
      await admin.from("nurture_enrollments")
        .update({ next_step: en.next_step + 1, last_sent_at: new Date().toISOString() }).eq("id", en.id);
      summary.skipped++;
      continue;
    }

    // Personalize.
    const first = (lead.name || "").split(" ")[0] || "there";
    const vars = { first_name: first, agent_name: "Your agent" };
    const subject = fill(step.subject, vars);
    const bodyText = fill(step.body, vars);

    // Send via the send-lead-email function (keeps Resend logic in one place).
    const sendUrl = `${URL}/functions/v1/send-lead-email`;
    const r = await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE}` },
      body: JSON.stringify({ lead_id: lead.id, to: lead.email, subject, body: bodyText, org_id: lead.org_id }),
    });
    const rj = await r.json().catch(() => ({}));
    if (!r.ok || rj.error) {
      summary.errors++;
      summary.details.push({ lead: lead.id, step: step.step_order, error: rj.error || ("HTTP " + r.status) });
      continue; // leave enrollment as-is; retried next run
    }

    // Advance to next step.
    await admin.from("nurture_enrollments")
      .update({ next_step: en.next_step + 1, last_sent_at: new Date().toISOString() })
      .eq("id", en.id);
    summary.sent++;
  }

  return json({ ok: true, ...summary });
 } catch (e) {
  return json({ error: "Unexpected: " + (e?.message || String(e)) }, 500);
 }
});
