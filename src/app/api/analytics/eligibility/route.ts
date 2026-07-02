import { createClient } from "@/lib/supabase/server";
import { canAccessAdminPanel } from "@/lib/admin/auth";

/** Admin oturumu vitrin analytics'inden hariç tutulur. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const exclude = Boolean(user && canAccessAdminPanel(user.email));
  return Response.json({ exclude });
}
