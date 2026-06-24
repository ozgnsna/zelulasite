import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getSafeReturnPath } from "@/lib/account/safe-return-path";
import { assertSupabasePublicEnv } from "@/lib/supabase/env";
import { IMPERSONATION_COOKIE } from "@/lib/admin/impersonation";

/** Oturumu kapatır; çerezler yanıt üzerinden yazılır (server action redirect’ten güvenilir). */
async function handleSignOut(request: NextRequest) {
  assertSupabasePublicEnv();

  const next = getSafeReturnPath(request.nextUrl.searchParams.get("next"));
  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });

  const supabase = createServerClient(
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

  const { error } = await supabase.auth.signOut();
  if (error && process.env.NODE_ENV === "development") {
    console.warn("[auth/signout]", error.message);
  }

  response.cookies.set(IMPERSONATION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  revalidatePath("/", "layout");
  return response;
}

export async function POST(request: NextRequest) {
  return handleSignOut(request);
}

export async function GET(request: NextRequest) {
  return handleSignOut(request);
}
