import type { SupabaseClient } from "@supabase/supabase-js";
import type { SavedAddress } from "@/lib/types";

export async function listSavedAddressesForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<SavedAddress[]> {
  const { data, error } = await supabase
    .from("customer_saved_addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as SavedAddress[];
}
