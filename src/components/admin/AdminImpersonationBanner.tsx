import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { IMPERSONATION_COOKIE, resolveImpersonationState } from "@/lib/admin/impersonation";

export async function AdminImpersonationBanner() {
  const store = await cookies();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { impersonation, sessionActive } = await resolveImpersonationState(
    store.get(IMPERSONATION_COOKIE)?.value,
    user?.id,
  );
  if (!impersonation) return null;

  return (
    <div
      className="border-b border-amber-300/80 bg-amber-950 px-4 py-2 text-center text-sm text-amber-50 shadow-md"
      role="status"
    >
      <span className="font-medium">Müşteri görünümü:</span> {impersonation.targetName}
      {sessionActive ? (
        <>
          <span className="mx-2 text-amber-200/80">·</span>
          Hataları bu oturumda test edebilirsiniz.
          <Link
            href="/api/admin/impersonate/exit"
            className="ml-3 inline-flex rounded-full border border-amber-200/40 bg-amber-900/60 px-3 py-0.5 text-xs font-semibold text-amber-50 underline-offset-2 hover:bg-amber-900"
          >
            Admin oturumuna dön
          </Link>
        </>
      ) : (
        <>
          <span className="mx-2 text-amber-200/80">·</span>
          <span className="text-amber-100">Müşteri oturumu kapandı.</span>
          <Link
            href="/admin/customers"
            className="ml-3 inline-flex rounded-full border border-amber-200/40 bg-amber-900/60 px-3 py-0.5 text-xs font-semibold text-amber-50 underline-offset-2 hover:bg-amber-900"
          >
            Admin → tekrar Hesaba gir
          </Link>
        </>
      )}
    </div>
  );
}
