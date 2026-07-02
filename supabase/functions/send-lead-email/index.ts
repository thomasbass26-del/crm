// send-lead-email — send a single email to a lead via Resend, log it to messages.
// Used by the nurture runner and (optionally) manual sends from the CRM.
//
// Deploy: npx supabase functions deploy send-lead-email --no-verify-jwt
// Needs secret: RESEND_API_KEY  (you already have a Resend key from the invite setup;
//   create a fresh "Sending access" key in Resend if needed and set it as this secret)
//
// POST JSON: { lead_id, to, subject, body, org_id }  (to/subject/body explicit, or lead_id to look up)
// Returns: { ok:true, id } | { error }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const FROM = Deno.env.get("NURTURE_FROM") || "team@triskope.ai"; // verified Resend sender
const UNSUB_SECRET = Deno.env.get("UNSUB_SECRET") || "";

function b64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function unsubToken(leadId) {
  if (!UNSUB_SECRET || !leadId) return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(UNSUB_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(String(leadId)));
  const idPart = b64url(new TextEncoder().encode(String(leadId)));
  return idPart + "." + b64url(new Uint8Array(sig));
}

// Build a branded, email-safe HTML email (tables + inline styles for Gmail/Outlook/Apple).
function brandedEmail(bodyText, brand, unsubUrl) {
  const b = brand || {};
  const brandColor = b.brand_color || "#1A2238";
  const accent = b.accent_color || "#9C7A3C";
  const font = b.font || "Georgia, 'Times New Roman', serif";
  const bodyHtml = (bodyText || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");

  const logo = b.logo_url
    ? `<img src="${b.logo_url}" alt="" style="max-height:48px;max-width:200px;display:block">`
    : (b.sig_brokerage || b.sig_name
        ? `<div style="font-family:${font};font-size:20px;font-weight:bold;color:${brandColor}">${b.sig_brokerage || b.sig_name}</div>`
        : "");

  // Signature block
  const sig = (b.sig_name || b.sig_phone || b.sig_photo_url) ? `
    <tr><td style="padding:24px 32px;border-top:1px solid #eee">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        ${b.sig_photo_url ? `<td style="padding-right:14px;vertical-align:top"><img src="${b.sig_photo_url}" alt="" width="56" height="56" style="border-radius:50%;display:block"></td>` : ""}
        <td style="vertical-align:top;font-family:sans-serif">
          ${b.sig_name ? `<div style="font-size:15px;font-weight:bold;color:${brandColor}">${b.sig_name}</div>` : ""}
          ${b.sig_title ? `<div style="font-size:13px;color:#666">${b.sig_title}${b.sig_brokerage ? " · " + b.sig_brokerage : ""}</div>` : (b.sig_brokerage ? `<div style="font-size:13px;color:#666">${b.sig_brokerage}</div>` : "")}
          ${b.sig_phone ? `<div style="font-size:13px;color:${accent};margin-top:4px">${b.sig_phone}</div>` : ""}
          ${b.sig_email ? `<div style="font-size:13px;color:#888">${b.sig_email}</div>` : ""}
        </td>
      </tr></table>
    </td></tr>` : "";

  const footer = unsubUrl
    ? `<tr><td style="padding:16px 32px;background:#faf9f7;font-family:sans-serif;font-size:11px;color:#999;text-align:center">
        You're receiving this because you expressed interest. <a href="${unsubUrl}" style="color:#999">Unsubscribe</a>.
       </td></tr>`
    : "";

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f2ee">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e7e2d8">
        <tr><td style="padding:24px 32px;border-bottom:3px solid ${accent}">${logo}</td></tr>
        <tr><td style="padding:32px;font-family:${font};font-size:16px;line-height:1.7;color:#2a2a2a">${bodyHtml}</td></tr>
        ${sig}
        ${footer}
      </table>
    </td></tr>
  </table></body></html>`;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", ...CORS } });

Deno.serve(async (req) => {
 try {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!RESEND_KEY) return json({ error: "Email not configured (missing RESEND_API_KEY secret)." }, 503);

  const URL = Deno.env.get("SUPABASE_URL");
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  let { lead_id, to, subject, body: emailBody, org_id } = body;

  // If lead_id given, look up the address + consent.
  let lead = null;
  if (lead_id) {
    const { data } = await admin.from("leads")
      .select("id, name, email, consent_email, org_id").eq("id", lead_id).maybeSingle();
    lead = data;
    if (!lead) return json({ error: "Lead not found" }, 404);
    if (!to) to = lead.email;
    if (!org_id) org_id = lead.org_id;
    // Respect consent — never email a lead who hasn't consented.
    if (lead.consent_email === false) {
      return json({ error: "Lead has not consented to email.", skipped: true }, 200);
    }
  }

  if (!to) return json({ error: "No recipient (lead has no email)." }, 400);
  if (!emailBody) return json({ error: "Body required" }, 400);

  // Build the unsubscribe link (CAN-SPAM). Requires lead_id + UNSUB_SECRET.
  const SUPA_URL = Deno.env.get("SUPABASE_URL");
  const token = await unsubToken(lead_id);
  const unsubUrl = token ? `${SUPA_URL}/functions/v1/unsubscribe?token=${token}` : null;

  // Load this org's email branding (logo, colors, signature).
  let brand = {};
  if (org_id) {
    const { data: orgRow } = await admin.from("organizations")
      .select("email_branding").eq("id", org_id).maybeSingle();
    brand = orgRow?.email_branding || {};
  }

  const textFooter = unsubUrl
    ? `\n\n—\nYou're receiving this because you expressed interest. To stop these emails, unsubscribe here: ${unsubUrl}`
    : "";
  const htmlBody = brandedEmail(emailBody, brand, unsubUrl);

  // Send via Resend (both text and branded html).
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject: subject || "A note for you",
      text: emailBody + textFooter,
      html: htmlBody,
      ...(unsubUrl ? { headers: { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    return json({ error: "Resend failed: " + t.slice(0, 300) }, 502);
  }
  const sent = await resp.json();

  // Log to messages so it shows in the lead's thread.
  if (lead_id) {
    await admin.from("messages").insert({
      lead_id, org_id: org_id || null, channel: "email",
      direction: "outbound", subject: subject || null, body: emailBody,
      sent_at: new Date().toISOString(),
    });
  }

  return json({ ok: true, id: sent?.id || null });
 } catch (e) {
  return json({ error: "Unexpected: " + (e?.message || String(e)) }, 500);
 }
});
