import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isValidTrackingId } from "@/lib/tracking-id";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

function getCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

/**
 * POST /api/leads
 *
 * Public lead ingestion endpoint used by tracking scripts across customer websites.
 * Accepts attribution payload + tracking_id, resolves tracking_id to internal project UUID,
 * and inserts lead into Supabase.
 *
 * Security:
 * - Uses server-only SUPABASE_SERVICE_ROLE_KEY to bypass client RLS during public API ingestion.
 * - Service key is NEVER exposed to the client or browser bundles.
 * - Client-supplied project_id is NEVER trusted — server resolves tracking_id -> project.id UUID.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Rate Limiting per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const rateResult = rateLimit(`leads:${ip}`, RATE_LIMITS.leadCapture);
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: corsHeaders }
    );
  }

  const rawUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  // Normalize Supabase URL origin
  let supabaseUrl = rawUrl;
  try {
    supabaseUrl = new URL(rawUrl).origin;
  } catch {
    supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  }

  if (!supabaseUrl || !serviceKey) {
    console.error("[api/leads] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");
    return NextResponse.json(
      { success: false, error: "Server misconfiguration" },
      { status: 500, headers: corsHeaders }
    );
  }

  const supabase = createServiceClient(supabaseUrl, serviceKey);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400, headers: corsHeaders }
    );
  }

  // Authoritative project tracking ID must come from tracking_id (or project_id for backward compatibility)
  const rawTrackingId = body.tracking_id ?? body.project_id ?? body.projectId;
  const trackingId = typeof rawTrackingId === "string" ? rawTrackingId.trim() : null;

  if (!trackingId) {
    return NextResponse.json(
      { success: false, error: "tracking_id is required" },
      { status: 400, headers: corsHeaders }
    );
  }

  // Resolve public tracking_id (or legacy UUID) to internal project record
  let { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, tracking_id, workspace_id, user_id")
    .eq("tracking_id", trackingId)
    .single();

  // Legacy fallback if identifier passed was an internal UUID
  if (projectError || !project) {
    const { data: projectByUuid, error: uuidErr } = await supabase
      .from("projects")
      .select("id, name, tracking_id, workspace_id, user_id")
      .eq("id", trackingId)
      .single();

    if (!uuidErr && projectByUuid) {
      project = projectByUuid;
      projectError = null;
    }
  }

  if (projectError || !project) {
    console.error(`[api/leads] Project not found for tracking_id: "${trackingId}"`);
    return NextResponse.json(
      { success: false, error: "Invalid tracking ID" },
      { status: 400, headers: corsHeaders }
    );
  }

  // Email validation
  const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!rawEmail || !emailRegex.test(rawEmail)) {
    return NextResponse.json(
      { success: false, error: "Valid email is required" },
      { status: 400, headers: corsHeaders }
    );
  }

  const sanitize = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const trimmed = v.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const leadRecord = {
    project_id: project.id, // Strictly resolved server-side from tracking_id -> project.id UUID
    name: sanitize(body.name),
    email: rawEmail,
    channel: sanitize(body.channel),
    source: sanitize(body.source),
    medium: sanitize(body.medium),
    campaign: sanitize(body.campaign),
    content: sanitize(body.content),
    term: sanitize(body.term),
    gclid: sanitize(body.gclid),
    gbraid: sanitize(body.gbraid),
    gad_campaignid: sanitize(body.gad_campaignid),
    gad_source: sanitize(body.gad_source),
    drilldown1: sanitize(body.channeldrilldown1 ?? body.channelDrilldown1 ?? body.drilldown1 ?? body.channel_drilldown1 ?? body.drilldown_1),
    drilldown2: sanitize(body.channeldrilldown2 ?? body.channelDrilldown2 ?? body.drilldown2 ?? body.channel_drilldown2 ?? body.drilldown_2),
    drilldown3: sanitize(body.channeldrilldown3 ?? body.channelDrilldown3 ?? body.drilldown3 ?? body.channel_drilldown3 ?? body.drilldown_3),
    referrer: sanitize(body.referrer),
    landing_url: sanitize(body.landingUrl ?? body.landing_url),
    landing_page: sanitize(body.landingpage ?? body.landingPage ?? body.landing_page),
    landing_page_group: sanitize(body.landingpagegroup ?? body.landingPageGroup ?? body.landing_page_group),
    submit_page: sanitize(body.submitPage ?? body.submit_page),
    // Last-touch attribution (added in migration 0008)
    last_touch_source:   sanitize(body.last_touch_source   ?? body.lastTouchSource),
    last_touch_medium:   sanitize(body.last_touch_medium   ?? body.lastTouchMedium),
    last_touch_campaign: sanitize(body.last_touch_campaign ?? body.lastTouchCampaign),
    last_touch_content:  sanitize(body.last_touch_content  ?? body.lastTouchContent),
    last_touch_term:     sanitize(body.last_touch_term     ?? body.lastTouchTerm),
  };

  const { data: inserted, error: insertError } = await supabase
    .from("leads")
    .insert([leadRecord])
    .select()
    .single();

  if (insertError) {
    console.error("[api/leads] Supabase insert error:", insertError.message);
    return NextResponse.json(
      { success: false, error: "Failed to save lead" },
      { status: 500, headers: corsHeaders }
    );
  }

  // Trigger webhooks in background
  try {
    const { dispatchLeadWebhook } = await import("@/lib/webhooks");
    await dispatchLeadWebhook(inserted, project.id, supabase);
  } catch (err: any) {
    console.error("[api/leads] Webhook dispatch error:", err.message);
  }

  // Trigger HubSpot CRM sync (errors caught so lead response is never blocked)
  try {
    const { triggerHubSpotSync } = await import("@/lib/crm-sync");
    await triggerHubSpotSync(inserted, project, supabase);
  } catch (err: any) {
    console.error("[api/leads] HubSpot sync error:", err.message);
  }

  return NextResponse.json(
    { success: true, tracking_id: project.tracking_id, lead: inserted },
    { status: 201, headers: corsHeaders }
  );
}
