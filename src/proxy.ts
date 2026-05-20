import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ZELULA_REFERRAL_COOKIE, ZELULA_REFERRAL_TTL_SECONDS } from "@/lib/referral/constants";

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  const requestWithHeaders = { headers: requestHeaders };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.next({ request: requestWithHeaders });
  }

  let response = NextResponse.next({ request: requestWithHeaders });
  const ref = request.nextUrl.searchParams.get("ref")?.trim().toLowerCase() ?? "";
  if (/^[a-z0-9_-]{4,32}$/.test(ref)) {
    response.cookies.set(ZELULA_REFERRAL_COOKIE, ref, {
      maxAge: ZELULA_REFERRAL_TTL_SECONDS,
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  const pathname = request.nextUrl.pathname;
  const needsAuthGuard = pathname.startsWith("/hesabim");

  let user: { id: string } | null = null;
  try {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: requestWithHeaders });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    if (needsAuthGuard) {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      user = u ?? null;
    } else {
      await supabase.auth.getSession();
    }
  } catch {
    user = null;
  }

  if (needsAuthGuard && !user) {
    const returnTo = pathname + request.nextUrl.search;
    const login = new URL("/giris", request.url);
    login.searchParams.set("next", returnTo);
    const redirectResponse = NextResponse.redirect(login);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
