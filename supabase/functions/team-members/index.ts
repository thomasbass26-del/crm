import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  const userId = userIdFromToken(token);
  if (!userId) return json({ error: "Not signed in" }, 401);

  const { org_id } = await req.json();
  if (!org_id) return json({ error: "org_id required" }, 400);

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

  const { data: mine } = await admin.from("org_members")
    .select("role").eq("org_id", org_id).eq("user_id", userId).maybeSingle();
  if (!mine) return json({ error: "Not a member" }, 403);

  const { data: members } = await admin.from("org_members")
    .select("user_id, role, created_at").eq("org_id", org_id)
    .order("created_at", { ascending: true });

  const { data: userList } = await admin.auth.admin.listUsers();
  const emailById = new Map((userList?.users ?? []).map((u) => [u.id, u.email]));

  return json({
    members: (members ?? []).map((m) => ({
      user_id: m.user_id, role: m.role, created_at: m.created_at,
      email: emailById.get(m.user_id) ?? "(unknown)",
    })),
  });
});
