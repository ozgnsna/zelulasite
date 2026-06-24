import { cookies } from "next/headers";
import { IMPERSONATION_COOKIE, parseImpersonationCookie } from "@/lib/admin/impersonation";

/** Sabit üst şerit (duyuru + header) için boşluk; içerik header altında kalmaz. */
export async function SiteHeaderSpacer() {
  const store = await cookies();
  const impersonation = parseImpersonationCookie(store.get(IMPERSONATION_COOKIE)?.value);
  return (
    <div
      className={impersonation ? "h-[8.75rem] sm:h-[9rem]" : "h-[5.75rem] sm:h-[6rem]"}
      aria-hidden
    />
  );
}
