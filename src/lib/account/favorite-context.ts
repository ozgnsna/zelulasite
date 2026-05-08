import { createClient } from "@/lib/supabase/server";
import { listFavoriteProductIdsForUser } from "@/lib/account/favorites";

/** Liste / ana sayfa kartları için tek sorgu */
export async function loadFavoriteUiContext(): Promise<{
  isSignedIn: boolean;
  favoriteIds: Set<string>;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return { isSignedIn: false, favoriteIds: new Set() };
    const ids = await listFavoriteProductIdsForUser(supabase, user.id);
    return { isSignedIn: true, favoriteIds: new Set(ids) };
  } catch {
    return { isSignedIn: false, favoriteIds: new Set() };
  }
}
