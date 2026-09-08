import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafeNextPath } from "@/lib/auth-callback";

export { getSafeNextPath };

/**
 * GET /auth/callback
 *
 * Supabase PKCE Code Exchange Endpoint.
 * Exchanges the auth authorization code (?code=...) for a secure Supabase session cookie.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextParam = requestUrl.searchParams.get("next");
  const errorParam = requestUrl.searchParams.get("error");
  const errorDesc = requestUrl.searchParams.get("error_description");

  const safeNext = getSafeNextPath(nextParam, "/reset-password");
  const fallbackUrl = safeNext.startsWith("/reset-password") ? "/forgot-password" : "/login";

  // 1. Handle error parameters returned directly from Supabase Auth
  if (errorParam || errorDesc) {
    const message = errorDesc || errorParam || "Authentication failed or link expired.";
    return NextResponse.redirect(
      new URL(`${fallbackUrl}?error=${encodeURIComponent(message)}`, request.url)
    );
  }

  // 2. Reject requests missing the PKCE authorization code
  if (!code) {
    return NextResponse.redirect(
      new URL(
        `${fallbackUrl}?error=${encodeURIComponent("Missing authentication code. Please request a new link.")}`,
        request.url
      )
    );
  }

  // 3. Perform server-side code exchange via @supabase/ssr server client
  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("[auth/callback] PKCE exchange error:", exchangeError.message);
    return NextResponse.redirect(
      new URL(
        `${fallbackUrl}?error=${encodeURIComponent(
          "Invalid or expired recovery link. Please request a new one."
        )}`,
        request.url
      )
    );
  }

  // 4. Code exchange succeeded — redirect to the validated internal path with active session cookies
  return NextResponse.redirect(new URL(safeNext, request.url));
}
