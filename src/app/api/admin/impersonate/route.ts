import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessAdminPanel, isAdminEmail } from "@/lib/admin/auth";
import { buildAuthCallbackUrl } from "@/lib/account/site-url";
import { getSafeReturnPath } from "@/lib/account/safe-return-path";
import { IMPERSONATION_COOKIE } from "@/lib/admin/impersonation";

async function verifyAdminSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !canAccessAdminPanel(user.email)) return null;
  return { supabase, adminUser: user };
}

async function establishCustomerSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  hashedToken: string,
) {
  const attempts = [{ type: "email" as const }, { type: "magiclink" as const }];
  for (const attempt of attempts) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: hashedToken,
      type: attempt.type,
    });
    if (!error) return { ok: true as const };
  }
  return { ok: false as const };
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const userId = String(requestUrl.searchParams.get("userId") ?? "").trim();
  const nextPath = getSafeReturnPath(requestUrl.searchParams.get("next") ?? "/hesabim");

  const session = await verifyAdminSession();
  if (!session) {
    return NextResponse.redirect(new URL("/admin/login", requestUrl));
  }

  if (!userId) {
    return NextResponse.redirect(new URL("/admin/customers?err=missing_user", requestUrl));
  }

  const admin = createAdminClient();
  const { data: targetData, error: targetErr } = await admin.auth.admin.getUserById(userId);
  const targetEmail = String(targetData.user?.email ?? "").trim();
  if (targetErr || !targetEmail) {
    return NextResponse.redirect(new URL("/admin/customers?err=user_not_found", requestUrl));
  }

  if (isAdminEmail(targetEmail)) {
    return NextResponse.redirect(new URL("/admin/customers?err=admin_target", requestUrl));
  }

  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  const targetName = String(profile?.full_name ?? targetData.user?.user_metadata?.full_name ?? targetEmail).trim();

  const redirectTo =
    buildAuthCallbackUrl(nextPath) ||
    `${requestUrl.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: targetEmail,
    options: { redirectTo },
  });

  const hashedToken = linkData?.properties?.hashed_token;
  if (linkErr || !hashedToken) {
    return NextResponse.redirect(new URL("/admin/customers?err=link_failed", requestUrl));
  }

  const established = await establishCustomerSession(session.supabase, hashedToken);
  if (!established.ok) {
    return NextResponse.redirect(new URL("/admin/customers?err=session_failed", requestUrl));
  }

  const response = NextResponse.redirect(new URL(nextPath, requestUrl));

  response.cookies.set(
    IMPERSONATION_COOKIE,
    JSON.stringify({
      adminEmail: session.adminUser.email,
      targetUserId: userId,
      targetName,
      startedAt: new Date().toISOString(),
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 4,
    },
  );

  return response;
}
