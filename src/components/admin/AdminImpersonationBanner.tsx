import Link from "next/link";
import { cookies } from "next/headers";
import { IMPERSONATION_COOKIE, parseImpersonationCookie } from "@/lib/admin/impersonation";

export async function AdminImpersonationBanner() {
  const store = await cookies();
  const impersonation = parseImpersonationCookie(store.get(IMPERSONATION_COOKIE)?.value);
  if (!impersonation) return null;

  return (
    <div
      className="relative z-[80] border-b border-amber-300/80 bg-amber-950 px-4 py-2 text-center text-sm text-amber-50 shadow-md"
      role="status"
    >
      <span className="font-medium">Müşteri görünümü:</span> {impersonation.targetName}
      <span className="mx-2 text-amber-200/80">·</span>
      Hataları bu oturumda test edebilirsiniz.
      <Link
        href="/api/admin/impersonate/exit"
        className="ml-3 inline-flex rounded-full border border-amber-200/40 bg-amber-900/60 px-3 py-0.5 text-xs font-semibold text-amber-50 underline-offset-2 hover:bg-amber-900"
      >
        Admin oturumuna dön
      </Link>
    </div>
  );
}
