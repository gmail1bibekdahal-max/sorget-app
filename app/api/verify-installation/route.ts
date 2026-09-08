import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface VerifyRequestBody {
  url?: string;
  tracking_id?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: VerifyRequestBody = await req.json();
    const rawUrl = body.url?.trim();
    const trackingId = body.tracking_id?.trim();

    if (!rawUrl) {
      return NextResponse.json(
        { success: false, error: "Website URL is required." },
        { status: 400 }
      );
    }

    // Ensure valid URL format
    let targetUrl: URL;
    try {
      targetUrl = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid website URL format." },
        { status: 400 }
      );
    }

    // Fetch site HTML with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let html = "";
    try {
      const res = await fetch(targetUrl.toString(), {
        signal: controller.signal,
        headers: {
          "User-Agent": "Attributer-Tag-Checker/1.0 (+https://attributer.io)",
        },
      });
      clearTimeout(timeoutId);
      html = await res.text();
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      return NextResponse.json({
        success: true,
        installed: false,
        trackingIdMatches: false,
        formsCount: 0,
        detectedFields: [],
        message: `Could not connect to ${targetUrl.hostname}: ${fetchErr.name === "AbortError" ? "Connection timed out" : "Unable to reach host"}`,
      });
    }

    // Inspect HTML for script tags referencing attributer
    const scriptRegex = /<script\b[^>]*?\bsrc=["']([^"']*?attributer(?:\.min)?\.js[^"']*?)["'][^>]*>/gi;
    const scriptMatches = [...html.matchAll(scriptRegex)];
    const scriptInstalled = scriptMatches.length > 0;

    // Search for data-tracking-id in script tags or inline configs
    const trackingIdRegex = /data-tracking-id=["'](attr_[a-z0-9]+)["']/i;
    const trackingIdMatch = html.match(trackingIdRegex);
    const foundTrackingId = trackingIdMatch ? trackingIdMatch[1] : null;

    const trackingIdMatches = Boolean(
      trackingId && foundTrackingId && trackingId.toLowerCase() === foundTrackingId.toLowerCase()
    );

    // Count forms
    const formRegex = /<form\b[^>]*>/gi;
    const formMatches = [...html.matchAll(formRegex)];
    const formsCount = formMatches.length;

    // Check for common attribution input fields
    const commonFields = ["channel", "source", "medium", "campaign", "gclid", "drilldown1"];
    const detectedFields: string[] = [];
    for (const field of commonFields) {
      const fieldRegex = new RegExp(`name=["']${field}["']|data-attributer-field=["']${field}["']`, "i");
      if (fieldRegex.test(html)) {
        detectedFields.push(field);
      }
    }

    return NextResponse.json({
      success: true,
      installed: scriptInstalled,
      foundTrackingId,
      trackingIdMatches: trackingId ? trackingIdMatches : Boolean(foundTrackingId),
      formsCount,
      detectedFields,
      message: scriptInstalled
        ? (trackingId && !trackingIdMatches
            ? `Attributer tag detected, but tracking ID (${foundTrackingId || "none"}) does not match expected (${trackingId}).`
            : "Attributer snippet is installed and configured correctly.")
        : "Attributer snippet was not found in the HTML source of this page.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Verification failed." },
      { status: 500 }
    );
  }
}