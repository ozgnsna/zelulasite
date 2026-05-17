import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafeReturnPath } from "@/lib/account/safe-return-path";
import { getPublicSiteUrl } from "@/lib/account/site-url";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeReturnPath(requestUrl.searchParams.get("next"));
  const origin = getPublicSiteUrl() || requestUrl.origin;

  const authError = requestUrl.searchParams.get("error");
  const authErrorCode = requestUrl.searchParams.get("error_code");
  if (authError || authErrorCode) {
    const forgot = new URL("/sifremi-unuttum", origin);
    forgot.searchParams.set("error", "link_expired");
    return NextResponse.redirect(forgot);
  }

  if (!code) {
    const login = new URL("/giris", origin);
    login.searchParams.set("error", "auth_callback");
    return NextResponse.redirect(login);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const forgot = new URL("/sifremi-unuttum", origin);
    forgot.searchParams.set("error", "link_expired");
    return NextResponse.redirect(forgot);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
