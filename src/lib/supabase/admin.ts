import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/supabase/env";

export function createAdminClient() {
  assertSupabasePublicEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY eksik.");
  }
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}
