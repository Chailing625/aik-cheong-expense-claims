import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ROLES = ["admin", "hod"] as const;
type AppRole = (typeof ROLES)[number];

/** Only a signed-in, active super admin may use these endpoints. */
async function requireSuperAdmin(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data.user) return null;
  const { data: profile } = await supabaseAdmin.from("profiles").select("role, active").eq("id", data.user.id).maybeSingle();
  return profile?.role === "superadmin" && profile.active ? data.user : null;
}

const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/** Tick boxes: editing or deleting needs viewing, so View is switched on for them. */
function cleanPerms(p: { can_view?: unknown; can_edit?: unknown; can_delete?: unknown }) {
  const out: { can_view?: boolean; can_edit?: boolean; can_delete?: boolean } = {};
  if (typeof p.can_view === "boolean") out.can_view = p.can_view;
  if (typeof p.can_edit === "boolean") out.can_edit = p.can_edit;
  if (typeof p.can_delete === "boolean") out.can_delete = p.can_delete;
  if (out.can_edit || out.can_delete) out.can_view = true;
  return out;
}

export async function GET(request: Request) {
  if (!(await requireSuperAdmin(request))) return bad("Not allowed", 403);
  const { data, error } = await supabaseAdmin.from("profiles").select("id, username, full_name, role, active, created_at, can_view, can_edit, can_delete").order("created_at");
  if (error) return bad(error.message, 500);
  return NextResponse.json({ users: data });
}

/** Create a staff account. Body: { id, fullName, role, password }. The ID is what they sign in with. */
export async function POST(request: Request) {
  if (!(await requireSuperAdmin(request))) return bad("Not allowed", 403);
  const body = (await request.json().catch(() => null)) as { id?: string; fullName?: string; role?: string; password?: string; can_view?: boolean; can_edit?: boolean; can_delete?: boolean } | null;
  const username = body?.id?.trim().toLowerCase() ?? "";
  const email = `${username}@aikcheong.my`; // internal only; staff never type it
  const fullName = body?.fullName?.trim() ?? "";
  const password = body?.password ?? "";
  const role = body?.role as AppRole;
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return bad("The ID must be 3 to 30 letters, numbers, dots, dashes or underscores, with no spaces.");
  const taken = await supabaseAdmin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (taken.data) return bad("That ID is already used. Choose another one.");
  if (!fullName) return bad("Enter the person's name.");
  if (!ROLES.includes(role)) return bad("Choose Admin or HOD.");
  if (password.length < 8) return bad("The password must be at least 8 characters.");

  const created = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: fullName, must_change_password: true },
  });
  if (created.error || !created.data.user) return bad(created.error?.message ?? "Could not create the account.", 400);

  const perms = { can_view: true, can_edit: role === "admin", can_delete: false, ...cleanPerms(body ?? {}) };
  const { error } = await supabaseAdmin.from("profiles").update({ role, full_name: fullName, active: true, username, ...perms }).eq("id", created.data.user.id);
  if (error) return bad(error.message, 500);
  return NextResponse.json({ id: created.data.user.id });
}

/** Change an account. Body: { id, role?, active?, password?, fullName? } */
export async function PATCH(request: Request) {
  const me = await requireSuperAdmin(request);
  if (!me) return bad("Not allowed", 403);
  const body = (await request.json().catch(() => null)) as { id?: string; role?: string; active?: boolean; password?: string; fullName?: string; can_view?: boolean; can_edit?: boolean; can_delete?: boolean } | null;
  if (!body?.id) return bad("Missing account.");
  const { data: target } = await supabaseAdmin.from("profiles").select("role").eq("id", body.id).maybeSingle();
  if (!target) return bad("Account not found.", 404);
  if (target.role === "superadmin") return bad("The super admin account cannot be changed here.", 403);

  const update: { role?: string; active?: boolean; full_name?: string; can_view?: boolean; can_edit?: boolean; can_delete?: boolean } = { ...cleanPerms(body) };
  if (body.can_view === false) {
    // View off also switches off Edit and Delete, since they cannot work without it.
    update.can_view = false;
    update.can_edit = false;
    update.can_delete = false;
  }
  if (body.role !== undefined) {
    if (!ROLES.includes(body.role as AppRole)) return bad("Choose Admin or HOD.");
    update.role = body.role;
  }
  if (body.fullName !== undefined) {
    if (!body.fullName.trim()) return bad("Enter the person's name.");
    update.full_name = body.fullName.trim();
  }
  if (body.active !== undefined) {
    update.active = body.active;
    const r = await supabaseAdmin.auth.admin.updateUserById(body.id, { ban_duration: body.active ? "none" : "876000h" });
    if (r.error) return bad(r.error.message, 500);
  }
  if (body.password !== undefined) {
    if (body.password.length < 8) return bad("The password must be at least 8 characters.");
    const r = await supabaseAdmin.auth.admin.updateUserById(body.id, { password: body.password, user_metadata: { must_change_password: true } });
    if (r.error) return bad(r.error.message, 500);
  }
  if (Object.keys(update).length) {
    const { error } = await supabaseAdmin.from("profiles").update(update).eq("id", body.id);
    if (error) return bad(error.message, 500);
  }
  return NextResponse.json({ ok: true });
}
