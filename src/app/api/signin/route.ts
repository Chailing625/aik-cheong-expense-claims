import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** Sign in with an ID + password. The ID is turned into the account's email here, on the server, so emails are never exposed. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { id?: string; password?: string } | null;
  const id = body?.id?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  const wrong = () => NextResponse.json({ error: "Wrong ID or password." }, { status: 401 });
  if (!id || !password || id.length > 64) return wrong();

  const { data: profile } = await supabaseAdmin.from("profiles").select("email").eq("username", id).maybeSingle();
  if (!profile?.email) return wrong();

  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email: profile.email, password });
  if (error || !data.session) {
    if (error?.message.toLowerCase().includes("banned")) {
      return NextResponse.json({ error: "This account has been switched off. Please contact the Super Admin." }, { status: 403 });
    }
    return wrong();
  }
  return NextResponse.json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
}
