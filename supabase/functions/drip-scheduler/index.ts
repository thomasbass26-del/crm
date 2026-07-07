import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const SMS_ENABLED = (Deno.env.get("SMS_ENABLED") ?? "false") === "true";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "onboarding@resend.dev";
const UNSUB_SECRET = Deno.env.get("UNSUB_SECRET") ?? "";
const DEFAULT_TZ = Deno.env.get("ORG_TIMEZONE") ?? "America/New_York";
const TW_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
const TW_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
const TW_FROM = Deno.env.get("TWILIO_FROM") ?? "";
const BATCH = 50;

async function hmacHex(msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(UNSUB_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function render(tpl: string, lead: Record<string, unknown>): string {
  const name = String(lead.name ?? "");
  const first = name.split(" ")[0] ?? "";
  return tpl.replaceAll("{{name}}", name).replaceAll("{{first_name}}", first);
}

function hourIn(tz: string, d = new Date()): number {
  return parseInt(new Intl.DateTimeFormat("en-US",
    { hour: "numeric", hour12: false, timeZone: tz }).format(d));
}

// TCPA quiet hours: SMS only between 8am and 9pm local
function deferToQuietEnd(tz: string): string {
  const d = new Date();
  for (let i = 0; i < 24; i++) {
    d.setTime(d.getTime() + 30 * 60 * 1000); // step 30 min
    const h = hourIn(tz, d);
    if (h >= 8 && h < 21) return d.toISOString();
  }
  return new Date(Date.now() + 6 * 3600 * 1000).toISOString();
}

// Terminal stages now come from pipeline_stages.is_terminal (per-org flag).
// Fallback (org with no flagged stages) matches the legacy hardcoded list.
const FALLBACK_TERMINAL = new Set(["delivered", "lost"]);

async function loadTerminalStages(): Promise<Map<string, Set<string>>> {
  const { data } = await supabase.from("pipeline_stages")
    .select("org_id, id").eq("is_terminal", true);
  const map = new Map<string, Set<string>>();
  for (const r of data ?? []) {
    if (!map.has(r.org_id)) map.set(r.org_id, new Set());
    map.get(r.org_id)!.add(r.id);
  }
  return map;
}

async function stopEnrollment(id: string, reason: string) {
  await supabase.from("campaign_enrollments")
    .update({ status: "stopped", stop_reason: reason }).eq("id", id);
}

async function sendEmail(lead: Record<string, unknown>, subject: string, body: string,
  orgName: string, postal: string): Promise<{ ok: boolean; providerId?: string; error?: string }> {
  const unsubLink =
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/unsubscribe?lead=${lead.id}&sig=${await hmacHex(String(lead.id))}`;
  const html =
    `<div style="font-family:sans-serif;line-height:1.5">${body.replaceAll("\n", "<br>")}` +
    `<br><br><hr style="border:none;border-top:1px solid #ddd">` +
    `<p style="font-size:12px;color:#888">${orgName}${postal ? " · " + postal : ""}<br>` +
    `<a href="${unsubLink}" style="color:#888">Unsubscribe</a></p></div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({
      from: RESEND_FROM, to: [lead.email], subject,
      html,
      headers: { "List-Unsubscribe": `<${unsubLink}>` },
    }),
  });
  if (!r.ok) return { ok: false, error: `Resend ${r.status}: ${await r.text()}` };
  const d = await r.json();
  return { ok: true, providerId: d.id };
}

async function sendSms(to: string, body: string):
  Promise<{ ok: boolean; providerId?: string; error?: string }> {
  const r = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TW_SID}/Messages.json`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: "Basic " + btoa(`${TW_SID}:${TW_TOKEN}`),
    },
    body: new URLSearchParams({ To: to, From: TW_FROM, Body: body }),
  });
  if (!r.ok) return { ok: false, error: `Twilio ${r.status}: ${await r.text()}` };
  const d = await r.json();
  return { ok: true, providerId: d.sid };
}

Deno.serve(async (req) => {
  const auth = req.headers.get("authorization") ?? "";
  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const cron = Deno.env.get("CRON_SECRET") ?? "";
  const authorized = (srk.length > 0 && auth.includes(srk)) || (cron.length > 0 && auth.includes(cron));
  if (!authorized) {
    return new Response("Forbidden", { status: 403 });
  }

  const summary = { enrolled: 0, sent_email: 0, sent_sms: 0, deferred: 0, stopped: 0, completed: 0, errors: [] as string[] };

  // ---------- PASS 1: enroll matching leads into active campaigns ----------
  const { data: campaigns } = await supabase.from("campaigns")
    .select("id, org_id, audience_filter, campaign_steps(step_order, delay_hours)")
    .eq("status", "active");

  for (const c of campaigns ?? []) {
    const steps = (c.campaign_steps ?? []).sort((a: { step_order: number }, b: { step_order: number }) => a.step_order - b.step_order);
    if (!steps.length) continue;
    const f = (c.audience_filter ?? {}) as Record<string, unknown>;

    let q = supabase.from("leads").select("id").eq("org_id", c.org_id).limit(200);
    if (Array.isArray(f.stages) && f.stages.length) q = q.in("stage", f.stages as string[]);
    if (Array.isArray(f.sources) && f.sources.length) q = q.in("source", f.sources as string[]);
    if (f.community_id) q = q.eq("community_id", f.community_id);
    const { data: leads } = await q;
    if (!leads?.length) continue;

    const { data: already } = await supabase.from("campaign_enrollments")
      .select("lead_id").eq("campaign_id", c.id);
    const enrolledSet = new Set((already ?? []).map((e) => e.lead_id));
    const fresh = leads.filter((l) => !enrolledSet.has(l.id));
    if (!fresh.length) continue;

    const firstDelayMs = (steps[0].delay_hours ?? 0) * 3600 * 1000;
    const rows = fresh.map((l) => ({
      org_id: c.org_id, campaign_id: c.id, lead_id: l.id,
      next_send_at: new Date(Date.now() + firstDelayMs).toISOString(),
    }));
    const { error } = await supabase.from("campaign_enrollments").insert(rows);
    if (!error) summary.enrolled += rows.length;
  }

  // ---------- PASS 2: process due enrollments ----------
  const terminalByOrg = await loadTerminalStages();
  const { data: due } = await supabase.from("campaign_enrollments")
    .select("*, campaigns(id, name, status, org_id)")
    .eq("status", "active")
    .lte("next_send_at", new Date().toISOString())
    .limit(BATCH);

  for (const e of due ?? []) {
    try {
      if (e.campaigns?.status !== "active") continue; // paused — leave queued

      const { data: step } = await supabase.from("campaign_steps")
        .select("*").eq("campaign_id", e.campaign_id)
        .eq("step_order", e.current_step).maybeSingle();
      if (!step) {
        await supabase.from("campaign_enrollments")
          .update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", e.id);
        summary.completed++; continue;
      }

      const { data: lead } = await supabase.from("leads")
        .select("*").eq("id", e.lead_id).single();
      if (!lead) { await stopEnrollment(e.id, "lead missing"); summary.stopped++; continue; }
      // Stop if lead's stage is flagged is_terminal for its org.
      const terminalSet = terminalByOrg.get(e.org_id) ?? FALLBACK_TERMINAL;
      if (terminalSet.has(lead.stage)) {
        await stopEnrollment(e.id, `lead ${lead.stage}`); summary.stopped++; continue;
      }

      const { data: org } = await supabase.from("organizations")
        .select("name, brand_settings").eq("id", e.org_id).single();
      const postal = String((org?.brand_settings as Record<string, unknown>)?.postal_address ?? "");
      const tz = String((org?.brand_settings as Record<string, unknown>)?.timezone ?? DEFAULT_TZ);

      let result: { ok: boolean; providerId?: string; error?: string };

      if (step.channel === "sms") {
        if (!SMS_ENABLED) { // 10DLC not approved yet — check back later
          await supabase.from("campaign_enrollments")
            .update({ next_send_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString() }).eq("id", e.id);
          summary.deferred++; continue;
        }
        if (!lead.consent_sms || !lead.phone) {
          await stopEnrollment(e.id, "no sms consent"); summary.stopped++; continue;
        }
        const { data: optout } = await supabase.from("sms_consents")
          .select("id").eq("lead_id", lead.id).not("opted_out_at", "is", null).limit(1);
        if (optout?.length) {
          await stopEnrollment(e.id, "sms opted out"); summary.stopped++; continue;
        }
        const h = hourIn(tz);
        if (h < 8 || h >= 21) { // quiet hours — defer, never skip
          await supabase.from("campaign_enrollments")
            .update({ next_send_at: deferToQuietEnd(tz) }).eq("id", e.id);
          summary.deferred++; continue;
        }
        const body = render(step.body_template, lead) + "\nReply STOP to opt out.";
        result = await sendSms(lead.phone, body);
        if (result.ok) summary.sent_sms++;
      } else {
        if (!lead.consent_email || !lead.email) {
          await stopEnrollment(e.id, "no email consent"); summary.stopped++; continue;
        }
        result = await sendEmail(
          lead, render(step.subject ?? "Update from {{name}}".replace("{{name}}", org?.name ?? ""), lead),
          render(step.body_template, lead), org?.name ?? "", postal);
        if (result.ok) summary.sent_email++;
      }

      await supabase.from("messages").insert({
        org_id: e.org_id, lead_id: lead.id, campaign_step_id: step.id,
        channel: step.channel, direction: "outbound",
        status: result.ok ? "sent" : "failed",
        provider_id: result.providerId ?? null,
        body: render(step.body_template, lead),
        sent_at: result.ok ? new Date().toISOString() : null,
      });

      if (!result.ok) {
        summary.errors.push(result.error ?? "unknown send error");
        // retry this step in 2h rather than advancing
        await supabase.from("campaign_enrollments")
          .update({ next_send_at: new Date(Date.now() + 2 * 3600 * 1000).toISOString() }).eq("id", e.id);
        continue;
      }

      const { data: next } = await supabase.from("campaign_steps")
        .select("delay_hours").eq("campaign_id", e.campaign_id)
        .eq("step_order", e.current_step + 1).maybeSingle();
      if (next) {
        await supabase.from("campaign_enrollments").update({
          current_step: e.current_step + 1,
          next_send_at: new Date(Date.now() + (next.delay_hours ?? 24) * 3600 * 1000).toISOString(),
        }).eq("id", e.id);
      } else {
        await supabase.from("campaign_enrollments").update({
          status: "completed", completed_at: new Date().toISOString(),
        }).eq("id", e.id);
        summary.completed++;
      }
    } catch (err) {
      summary.errors.push(String(err));
    }
  }

  // Heartbeat: successful run pings healthchecks.io — a missed ping alerts
  // Triskope that the scheduler has silently stopped. No-op if unset.
  const hb = Deno.env.get("HEARTBEAT_DRIP_URL");
  if (hb) { try { await fetch(hb); } catch { /* never fail the run */ } }

  return new Response(JSON.stringify(summary), {
    headers: { "content-type": "application/json" },
  });
});
