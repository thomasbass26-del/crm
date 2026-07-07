import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE = Deno.env.get("SITE_URL") ?? "https://app.triskope.ai";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", ...CORS } });

function userIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload?.sub && payload?.role === "authenticated") return payload.sub;
  } catch { /* fall through */ }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  const userId = userIdFromToken(token);
  if (!userId) return json({ error: "Not signed in" }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const orgId = String(body.org_id ?? "");
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = String(body.role ?? "agent");
  if (!orgId || !email) return json({ error: "org_id and email required" }, 400);
  if (!["agent", "team_lead"].includes(role)) return json({ error: "Invalid role" }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Invalid email" }, 400);

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

  const { data: membership } = await admin.from("org_members")
    .select("role").eq("org_id", orgId).eq("user_id", userId).maybeSingle();
  if (!membership || membership.role !== "owner") {
    return json({ error: "Only an owner can invite teammates" }, 403);
  }

  const { data: existingUserList } = await admin.auth.admin.listUsers();
  const existingUser = existingUserList?.users?.find(
    (u) => u.email?.toLowerCase() === email);

  if (existingUser) {
    const { data: already } = await admin.from("org_members")
      .select("user_id").eq("org_id", orgId).eq("user_id", existingUser.id).maybeSingle();
    if (already) return json({ error: "That person is already a member" }, 409);

    const { error: merr } = await admin.from("org_members")
      .insert({ org_id: orgId, user_id: existingUser.id, role, invited_by: userId });
    if (merr) return json({ error: merr.message }, 500);
    await admin.from("invites").upsert(
      { org_id: orgId, email, role, status: "accepted", invited_by: userId, accepted_at: new Date().toISOString() },
      { onConflict: "org_id,email" });

    // Existing auth users get no invite email from inviteUserByEmail, so send a
    // password-recovery email instead — same landing: the app's set-password
    // screen. Covers people who signed up earlier but never set a password.
    const { error: rerr } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE}/`,
    });
    if (rerr) console.error("recovery email failed:", rerr.message);

    return json({
      ok: true,
      mode: rerr ? "added_existing_user" : "added_existing_user_email_sent",
    });
  }

  // Write the invite row FIRST: the hardened accept_invite_on_signup trigger
  // only grants membership when a matching PENDING invite exists, and it
  // fires during user creation below.
  await admin.from("invites").upsert(
    { org_id: orgId, email, role, status: "pending", invited_by: userId },
    { onConflict: "org_id,email" });

  const { data: invited, error: ierr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${SITE}/`,
    data: { invited_org_id: orgId, invited_role: role },
  });
  if (ierr) return json({ error: ierr.message }, 500);

  // ROOT-CAUSE FIX: create the membership NOW, not at first sign-in. The
  // invited_org_id metadata was never consumed anywhere, so invited users
  // signed in membership-less and the signup path minted stray personal
  // orgs (source of the duplicate-org bug).
  if (invited?.user?.id) {
    const { error: merr } = await admin.from("org_members")
      .insert({ org_id: orgId, user_id: invited.user.id, role });
    if (merr && !String(merr.message).includes("duplicate")) {
      console.error("membership insert for invited user failed:", merr.message);
      return json({ error: "Invite sent but membership failed: " + merr.message }, 500);
    }
  }

  return json({ ok: true, mode: "invited_new_user" });
});
