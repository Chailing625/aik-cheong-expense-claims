import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// The publishable key is safe in the browser: the database rules (RLS) decide who can see or change what.
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);
