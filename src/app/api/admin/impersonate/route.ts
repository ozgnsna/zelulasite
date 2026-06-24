import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessAdminPanel, isAdminEmail } from "@/lib/admin/auth";
import { buildAuthCallbackUrl } from "@/lib/account/site-url";
import { getSafeReturnPath } from "@/lib/account/safe-return-path";
import { IMPERSONATION_COOKIE } from "@/lib/admin/impersonation";
import { assertSupabasePublicEnv } from "@/lib/supabase/env";

const IMPERSONATION_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 4,
};

function createRouteSupabase(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );
}

async function establishCustomerSession(
  supabase: ReturnType<typeof createRouteSupabase>,
  hashedToken: string,
) {
  const attempts = [{ type: "email" as const }, { type: "magiclink" as const }];
  for (const attempt of attempts) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: hashedToken,
      type: attempt.type,
    });
    if (!error) return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  assertSupabasePublicEnv();
  const requestUrl = new URL(request.url);
  const userId = String(requestUrl.searchParams.get("userId") ?? "").trim();
  const nextPath = getSafeReturnPath(requestUrl.searchParams.get("next") ?? "/hesabim");

  const response = NextResponse.redirect(new URL(nextPath, requestUrl));
  const supabase = createRouteSupabase(request, response);

  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();
  if (!adminUser?.email || !canAccessAdminPanel(adminUser.email)) {
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

  const sessionOk = await establishCustomerSession(supabase, hashedToken);
  if (!sessionOk) {
    return NextResponse.redirect(new URL("/admin/customers?err=session_failed", requestUrl));
  }

  response.cookies.set(
    IMPERSONATION_COOKIE,
    JSON.stringify({
      adminEmail: adminUser.email,
      targetUserId: userId,
      targetName,
      startedAt: new Date().toISOString(),
    }),
    IMPERSONATION_COOKIE_OPTS,
  );

  return response;
}
