import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Uses the secret service key. This file must only ever run on the server.
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
