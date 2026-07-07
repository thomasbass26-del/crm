// ============================================================
// admin-manage-org — Triskope platform-admin control center.
// Actions:
//   overview       -> org row, members (email/last sign-in), health counts
//   set_plan       -> { plan } applies tier + its feature preset
//   set_billing    -> { billing_status } active|past_due|suspended
//   set_feature    -> { feature, enabled } individual override
//   set_notes      -> { notes } internal admin notes
//   reset_password -> { email } sends recovery email to a member
//   login_link     -> { email } returns one-time magic link (support use)
// Deploy: npx supabase functions deploy admin-manage-org --no-verify-jwt
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", ...CORS } });

function uidFromToken(token: string) {
  try {
    const p = JSON.parse(atob(token.split(".")[1]));
    if (p?.sub && p?.role === "authenticated") return p.sub;
  } catch { /* ignore */ }
  return null;
}

// Tier presets: applying a plan sets these feature keys (others untouched).
// Names must match the existing plan_tier Postgres enum: starter|pro|enterprise.
const PLANS: Record<string, Record<string, boolean>> = {
  starter:    { communities: false, market_reports: false, ai_assistant: false },
  pro:        { communities: true,  market_reports: true,  ai_assistant: false },
  enterprise: { communities: true,  market_reports: true,  ai_assistant: true },
};
const TOGGLEABLE = new Set(["communities", "market_reports", "ai_assistant", "auto_assign"]);
const BILLING = new Set(["active", "past_due", "suspended"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const uid = uidFromToken(token);
  if (!uid) return json({ error: "Not signed in" }, 401);

  const { data: adminRow } = await admin.from("platform_admins")
    .select("user_id").eq("user_id", uid).maybeSingle();
  if (!adminRow) return json({ error: "Triskope staff only" }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const action = String(body.action ?? "");
  const orgId = String(body.org_id ?? "").trim();
  if (!orgId) return json({ error: "org_id required" }, 400);

  const { data: org } = await admin.from("organizations")
    .select("id, name, slug, plan, billing_status, suspended_at, admin_notes, features, custom_domain, site_config")
    .eq("id", orgId).maybeSingle();
  if (!org) return json({ error: "Org not found" }, 404);

  if (action === "overview") {
    const { data: mems } = await admin.from("org_members")
      .select("user_id, role").eq("org_id", orgId);
    const members = [];
    for (const m of mems ?? []) {
      const { data: u } = await admin.auth.admin.getUserById(m.user_id);
      members.push({
        user_id: m.user_id, role: m.role,
        email: u?.user?.email ?? "(unknown)",
        last_sign_in_at: u?.user?.last_sign_in_at ?? null,
      });
    }
    const [{ count: leadCount }, { count: taskCount }] = await Promise.all([
      admin.from("leads").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      admin.from("tasks").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    ]);
    const { data: lastLead } = await admin.from("leads").select("created_at")
      .eq("org_id", orgId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    return json({
      org: {
        id: org.id, name: org.name, slug: org.slug, plan: org.plan,
        billing_status: org.billing_status, suspended_at: org.suspended_at,
        admin_notes: org.admin_notes, features: org.features ?? {},
        custom_domain: org.custom_domain,
        has_site: !!org.site_config && Object.keys(org.site_config).length > 0,
      },
      members,
      health: { leads: leadCount ?? 0, tasks: taskCount ?? 0, last_lead_at: lastLead?.created_at ?? null },
    });
  }

  if (action === "set_plan") {
    const plan = String(body.plan ?? "");
    if (!PLANS[plan]) return json({ error: "Unknown plan" }, 400);
    const features = { ...(org.features ?? {}), ...PLANS[plan] };
    const { error } = await admin.from("organizations")
      .update({ plan, features }).eq("id", orgId);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, plan, features });
  }

  if (action === "set_billing") {
    const status = String(body.billing_status ?? "");
    if (!BILLING.has(status)) return json({ error: "Unknown billing status" }, 400);
    const { error } = await admin.from("organizations").update({
      billing_status: status,
      suspended_at: status === "suspended" ? new Date().toISOString() : null,
    }).eq("id", orgId);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, billing_status: status });
  }

  if (action === "set_feature") {
    const feature = String(body.feature ?? "");
    if (!TOGGLEABLE.has(feature)) return json({ error: "Unknown feature" }, 400);
    const features = { ...(org.features ?? {}), [feature]: !!body.enabled };
    const { error } = await admin.from("organizations")
      .update({ features }).eq("id", orgId);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, features });
  }

  if (action === "set_notes") {
    const { error } = await admin.from("organizations")
      .update({ admin_notes: String(body.notes ?? "").slice(0, 5000) }).eq("id", orgId);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  // Support actions below verify the email belongs to a member of THIS org
  // so an admin typo can't affect an unrelated account.
  const email = String(body.email ?? "").trim().toLowerCase();
  let targetUserId: string | null = null;
  if (action === "reset_password" || action === "login_link" || action === "temp_password") {
    if (!email) return json({ error: "email required" }, 400);
    const { data: mems } = await admin.from("org_members").select("user_id").eq("org_id", orgId);
    for (const m of mems ?? []) {
      const { data: u } = await admin.auth.admin.getUserById(m.user_id);
      if ((u?.user?.email ?? "").toLowerCase() === email) { targetUserId = m.user_id; break; }
    }
    if (!targetUserId) return json({ error: "That email is not a member of this workspace" }, 400);
  }

  if (action === "reset_password") {
    // Anon client sends the branded recovery email via configured SMTP.
    const anon = createClient(URL, ANON, { auth: { persistSession: false } });
    const { error } = await anon.auth.resetPasswordForEmail(email);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, sent_to: email });
  }

  if (action === "temp_password") {
    // Phone-support flow: strong generated password, read to the subscriber
    // verbally; must_change_password forces the set-password screen on their
    // next sign-in. Returned ONCE, never stored in plain form.
    const words = ["harbor","palmetto","coastal","marsh","dune","tide","cypress","pelican","inlet","breeze"];
    const pick = () => words[Math.floor(Math.random() * words.length)];
    const temp = `${pick()}-${pick()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const { error } = await admin.auth.admin.updateUserById(targetUserId!, {
      password: temp,
      user_metadata: { must_change_password: true },
    });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, temp_password: temp });
  }

  if (action === "login_link") {
    // One-time magic link for support sessions. Handle with care: opening it
    // signs you in AS the subscriber. Use a private window; expires quickly.
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, link: data?.properties?.action_link ?? null });
  }

  return json({ error: "Unknown action" }, 400);
});
