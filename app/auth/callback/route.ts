import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafeNextPath } from "@/lib/auth-callback";
import { getOrCreateDefaultWorkspace, healOrphanProjects } from "@/lib/workspaces";

export { getSafeNextPath };

function getPublicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    const proto = forwardedProto || (forwardedHost.includes("localhost") ? "http" : "https");
    return `${proto}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

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

  const origin = getPublicOrigin(request);
  const isResetFlow = Boolean(nextParam && nextParam.startsWith("/reset-password"));
  const fallbackUrl = isResetFlow ? "/forgot-password" : "/login";
  const safeNext = nextParam ? getSafeNextPath(nextParam, "/onboarding") : "/onboarding";

  // 1. Handle error parameters returned directly from Supabase Auth
  if (errorParam || errorDesc) {
    const message = errorDesc || errorParam || "Authentication failed or link expired.";
    return NextResponse.redirect(
      new URL(`${fallbackUrl}?error=${encodeURIComponent(message)}`, origin)
    );
  }

  // 2. Reject requests missing the PKCE authorization code
  if (!code) {
    return NextResponse.redirect(
      new URL(
        `${fallbackUrl}?error=${encodeURIComponent("Missing authentication code. Please sign in again.")}`,
        origin
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
          "Invalid or expired authentication link. Please sign in again."
        )}`,
        origin
      )
    );
  }

  // 4. Provision / heal workspace for authenticated user (e.g. Google OAuth or email sign-in)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const ws = await getOrCreateDefaultWorkspace(
        supabase,
        user.id,
        user.email,
        user.user_metadata?.full_name || user.user_metadata?.name
      );
      await healOrphanProjects(supabase, user.id, ws.id);

      // If user came from password reset or invitation, respect explicit destination
      if (safeNext.startsWith("/reset-password") || safeNext.startsWith("/invite")) {
        return NextResponse.redirect(new URL(safeNext, origin));
      }

      // Check if user has completed onboarding (has at least 1 website/project)
      const { data: userProjects } = await supabase
        .from("projects")
        .select("id")
        .eq("workspace_id", ws.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (!userProjects || userProjects.length === 0) {
        return NextResponse.redirect(new URL("/onboarding", origin));
      }

      // Check if workspace has an active subscription or 14-day trial
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("id, status")
        .eq("workspace_id", ws.id)
        .maybeSingle();

      if (!subscription) {
        return NextResponse.redirect(new URL("/planning", origin));
      }

      // Both onboarding and plan/trial are completed -> redirect to website Overview
      return NextResponse.redirect(
        new URL(`/dashboard/projects/${userProjects[0].id}`, origin)
      );
    }
  } catch (wsErr) {
    console.error("[auth/callback] Workspace provisioning error:", wsErr);
  }

  // 5. Code exchange succeeded — fallback redirect
  return NextResponse.redirect(new URL(safeNext, origin));
}
