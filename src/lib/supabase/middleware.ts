import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

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
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — important for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect all routes except public ones
  const publicPaths = [
    "/login",
    "/signup",
    "/privacy",
    "/changelog",
    "/contact",
    "/dashboard/preview", // temp: sidebar layout preview without auth
    "/auth/callback",
    "/api/health",
    "/api/stripe/webhook",
    "/api/stripe/reconcile",
    "/api/events/sync/jobs/worker",
    "/sitemap.xml",
    "/robots.txt",
    "/manifest.json",
  ];
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!user && !isPublicPath && request.nextUrl.pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages to dashboard
  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Check onboarding/org status for dashboard routes
  const isDashboardPath = request.nextUrl.pathname.startsWith("/dashboard");
  if (user && isDashboardPath) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id, onboarding_complete, is_staff")
      .eq("id", user.id)
      .single();

    if (profile && !profile.is_staff && !profile.org_id) {
      const url = request.nextUrl.clone();
      url.pathname = "/join";
      return NextResponse.redirect(url);
    }

    if (profile && !profile.is_staff && profile.org_id && !profile.onboarding_complete) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
