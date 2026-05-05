import type { SupabaseClient } from "@supabase/supabase-js";

export async function getUserLoyaltyBalance(client: SupabaseClient, userId: string): Promise<number> {
  const { data } = await client.from("loyalty_points_ledger").select("points").eq("user_id", userId);
  let sum = 0;
  for (const row of data ?? []) {
    sum += Number((row as { points: number }).points);
  }
  return sum;
}
