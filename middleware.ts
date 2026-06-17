import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    if (user) {
      const { data: membership } = await supabase
        .from("puppy_members")
        .select("puppy_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const destination = membership ? "/dashboard" : "/profile/setup";
      return NextResponse.redirect(new URL(destination, request.url));
    }
    return supabaseResponse;
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname !== "/profile/setup") {
    const { data: membership } = await supabase
      .from("puppy_members")
      .select("puppy_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.redirect(new URL("/profile/setup", request.url));
    }
  }

  // Sync NEXT_LOCALE cookie from Supabase user metadata (cross-device sync)
  const userLocale = user.user_metadata?.language as string | undefined;
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (userLocale && ["en", "pt"].includes(userLocale) && userLocale !== cookieLocale) {
    supabaseResponse.cookies.set("NEXT_LOCALE", userLocale, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
