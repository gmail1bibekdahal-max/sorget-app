import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseOAuthState, HUBSPOT_SCOPES } from "@/src/crm.js";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const rawState = searchParams.get("state");
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");

  // ---------------------------------------------------------------------------
  // 1. Parse & validate OAuth state (CSRF protection)
  // ---------------------------------------------------------------------------
  const parsedState = parseOAuthState(rawState ?? "");

  const workspaceId = parsedState?.workspaceId ?? "";
  const projectId = parsedState?.projectId ?? "";

  // Build the return URL for both success and error cases
  const integrationsUrl = projectId
    ? `/dashboard/projects/${projectId}/integrations`
    : `/dashboard`;

  if (oauthError || !code || !workspaceId) {
    const errMsg = oauthErrorDescription || oauthError || "OAuth cancelled or missing state";
    return NextResponse.redirect(
      new URL(`${integrationsUrl}?error=${encodeURIComponent(errMsg)}`, req.url)
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Authenticate the Sorget user
  // ---------------------------------------------------------------------------
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(integrationsUrl)}`, req.url));
  }

  // ---------------------------------------------------------------------------
  // 3. Verify caller is owner or admin of the target workspace
  //    (Never trust workspaceId from browser — validate server-side)
  // ---------------------------------------------------------------------------
  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!member || !["owner", "admin"].includes(member.role)) {
    return NextResponse.redirect(
      new URL(`${integrationsUrl}?error=${encodeURIComponent("Permission denied: must be workspace owner or admin")}`, req.url)
    );
  }

  // 3b. Verify project belongs to workspace (cross-workspace isolation)
  if (projectId) {
    const { data: projectRow } = await supabase
      .from("projects")
      .select("id, workspace_id")
      .eq("id", projectId)
      .eq("workspace_id", workspaceId)
      .single();

    if (!projectRow) {
      return NextResponse.redirect(
        new URL(`${integrationsUrl}?error=${encodeURIComponent("Cross-workspace violation: project does not belong to specified workspace")}`, req.url)
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Exchange authorization code for OAuth tokens
  //    Uses HubSpot's current versioned endpoint (/oauth/2026-03/token)
  //    NOT the deprecated /oauth/v1/token (deprecated Feb 2027)
  // ---------------------------------------------------------------------------
  const clientId = (process.env.HUBSPOT_CLIENT_ID || "").trim();
  const clientSecret = (process.env.HUBSPOT_CLIENT_SECRET || "").trim();
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/crm/hubspot/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(`${integrationsUrl}?error=${encodeURIComponent("HubSpot credentials not configured")}`, req.url)
    );
  }

  try {
    const tokenRes = await fetch("https://api.hubapi.com/oauth/2026-03/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }).toString(),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok) {
      // IMPORTANT: do NOT log tokens.access_token or tokens.refresh_token
      const errDetail = tokens.message || tokens.error_description || "Token exchange failed";
      throw new Error(errDetail);
    }

    // ---------------------------------------------------------------------------
    // 5. Identify HubSpot portal (hub_id is returned in the token response)
    // ---------------------------------------------------------------------------
    const expiresAt = new Date(Date.now() + (tokens.expires_in || 1800) * 1000).toISOString();
    const portalId = tokens.hub_id ? String(tokens.hub_id) : null;

    // Use admin client for the upsert — crm_connections is protected by RLS
    // and the current user's session cannot write to other workspaces
    const adminClient = createAdminClient();

    // ---------------------------------------------------------------------------
    // 6. Store connection securely — never expose in response or logs
    // ---------------------------------------------------------------------------
    const { error: upsertError } = await adminClient.from("crm_connections").upsert(
      {
        workspace_id: workspaceId,
        provider: "hubspot",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        portal_id: portalId,
        scopes: HUBSPOT_SCOPES.join(","),
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,provider" }
    );

    if (upsertError) {
      throw new Error("Failed to save HubSpot connection");
    }

    // Provision all 11 Sorget attribution properties in the connected HubSpot portal
    try {
      const { ensureHubSpotAttributionProperties } = await import("@/lib/hubspot-properties");
      const provResult = await ensureHubSpotAttributionProperties(tokens.access_token);
      console.log("[hubspot/callback] Property provisioning result:", {
        created: provResult.created.length,
        existing: provResult.existing.length,
        failed: provResult.failed.length,
      });
    } catch (provErr: any) {
      // Non-blocking: transient provisioning failure must not fail the entire OAuth callback
      console.error("[hubspot/callback] Property provisioning warning:", provErr.message);
    }

    return NextResponse.redirect(
      new URL(`${integrationsUrl}?success=${encodeURIComponent("HubSpot connected successfully!")}`, req.url)
    );
  } catch (err: any) {
    // IMPORTANT: err.message must never contain the access_token/refresh_token
    console.error("[hubspot/callback] Token exchange error:", err.message);
    return NextResponse.redirect(
      new URL(`${integrationsUrl}?error=${encodeURIComponent(err.message)}`, req.url)
    );
  }
}