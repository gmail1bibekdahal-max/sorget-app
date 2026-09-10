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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { pathname } = request.nextUrl;

  // Check if route requires auth validation before calling the Supabase API
  const protectedPaths = ["/dashboard", "/onboarding", "/planning"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const authPaths = ["/login", "/signup"];
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));
  const isRoot = pathname === "/";
  const hasCodeParam = request.nextUrl.searchParams.has("code");

  const needsAuthCheck = isProtected || isAuthPage || isRoot || hasCodeParam;

  if (!needsAuthCheck) {
    return supabaseResponse;
  }

  // Only refresh session via API if this route needs it to determine redirects
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Intercept OAuth PKCE code parameter landing on /, /login, or /signup and forward immediately to /auth/callback
  const codeParam = request.nextUrl.searchParams.get("code");
  if (codeParam && (pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname === "/")) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const origin = forwardedHost
      ? `${forwardedProto || (forwardedHost.includes("localhost") ? "http" : "https")}://${forwardedHost}`
      : request.nextUrl.origin;

    const callbackUrl = new URL("/auth/callback", origin);
    callbackUrl.searchParams.set("code", codeParam);
    const nextVal = request.nextUrl.searchParams.get("next") || "/onboarding";
    callbackUrl.searchParams.set("next", nextVal);

    const redirectResponse = NextResponse.redirect(callbackUrl);
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
      redirectResponse.cookies.set(name, value, options);
    });
    return redirectResponse;
  }

  // 2. Root route: app entry point strictly redirects based on auth status
  if (pathname === "/") {
    const targetUrl = request.nextUrl.clone();
    targetUrl.pathname = user ? "/dashboard" : "/login";
    return NextResponse.redirect(targetUrl);
  }

  // 3. Protected routes: redirect unauthenticated users to /login
  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // 4. Auth routes: redirect authenticated users away from /login and /signup
  if (isAuthPage && user) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}
