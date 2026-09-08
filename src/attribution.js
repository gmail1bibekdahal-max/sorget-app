/**
 * attribution.js
 *
 * Main attribution engine entry point.
 *
 * Public API:
 *   initializeAttribution() → object       Initialize engine; returns first-touch data.
 *   getStoredAttribution()  → object|null  Read stored first-touch without detecting.
 *   getAttribution()        → object       Detect attribution from current URL/referrer.
 *   getTrackingId()         → string|null  Read project tracking_id (data-tracking-id / data-project-id).
 *   getProjectId()          → string|null  Alias for getTrackingId for backward compatibility.
 */

import { classifyTraffic } from "./classifier.js";
import { saveFirstTouch, getFirstTouch, saveLastTouch, getLastTouch } from "./storage.js";

/**
 * Extracts landing page group (e.g. "/blog/article" -> "/blog", "/" -> "/")
 */
export function getLandingPageGroup(pathname) {
    if (!pathname || typeof pathname !== "string") return "/";
    const clean = pathname.trim();
    if (clean === "" || clean === "/") return "/";
    const segments = clean.split("/").filter(Boolean);
    return segments.length > 0 ? `/${segments[0]}` : "/";
}

/**
 * Computes hierarchical drilldown dimensions (1, 2, 3) for standardized reporting.
 */
export function computeDrilldown({
    channel,
    source,
    medium,
    campaign,
    content,
    term,
    gclid,
    referrer,
    landingPage,
}) {
    let drilldown1 = null;
    let drilldown2 = null;
    let drilldown3 = null;

    let refDomain = null;
    if (referrer) {
        try {
            refDomain = new URL(referrer).hostname;
        } catch {
            refDomain = referrer;
        }
    }

    switch (channel) {
        case "Paid Search":
            drilldown1 = source || "google";
            drilldown2 = campaign || "(not set)";
            drilldown3 = content || term || gclid || null;
            break;

        case "Paid Social":
            drilldown1 = source || "social";
            drilldown2 = campaign || "(not set)";
            drilldown3 = content || null;
            break;

        case "Organic Search":
            drilldown1 = source || "organic search";
            drilldown2 = term || "(not provided)";
            drilldown3 = landingPage || null;
            break;

        case "Organic Social":
            drilldown1 = source || "organic social";
            drilldown2 = "(not set)";
            drilldown3 = landingPage || null;
            break;

        case "Email":
            drilldown1 = source || "email";
            drilldown2 = campaign || "(not set)";
            drilldown3 = content || null;
            break;

        case "Display":
            drilldown1 = source || "display";
            drilldown2 = campaign || "(not set)";
            drilldown3 = content || null;
            break;

        case "Affiliate":
            drilldown1 = source || "affiliate";
            drilldown2 = campaign || "(not set)";
            drilldown3 = null;
            break;

        case "Referral":
            drilldown1 = refDomain || "referral";
            drilldown2 = landingPage || "(not set)";
            drilldown3 = null;
            break;

        case "Direct":
            drilldown1 = "Direct";
            drilldown2 = landingPage || "/";
            drilldown3 = null;
            break;

        default:
            drilldown1 = source || "Other";
            drilldown2 = medium || "(not set)";
            drilldown3 = campaign || null;
            break;
    }

    return { drilldown1, drilldown2, drilldown3 };
}

/**
 * Read UTM parameters and referrer signals from the current page context.
 * Classifies the visit and returns a full attribution object.
 *
 * @param {object} [options]
 * @param {string} [options.url] - Optional override URL
 * @param {string} [options.referrer] - Optional override referrer
 * @returns {object} Attribution object representing this visit.
 */
export function getAttribution(options = {}) {
    let currentUrlString = options.url;
    if (!currentUrlString && typeof window !== "undefined" && window.location) {
        currentUrlString = window.location.href;
    }

    let urlObj = null;
    try {
        if (currentUrlString) {
            urlObj = new URL(currentUrlString);
        }
    } catch {
        urlObj = null;
    }

    const params = urlObj ? urlObj.searchParams : new URLSearchParams();

    const utmSource   = params.get("utm_source")   || null;
    const utmMedium   = params.get("utm_medium")   || null;
    const campaign    = params.get("utm_campaign") || null;
    const content     = params.get("utm_content")  || null;
    const term        = params.get("utm_term")     || null;

    const gclid           = params.get("gclid")          || null;
    const gbraid          = params.get("gbraid")         || null;
    const gadCampaignId   = params.get("gad_campaignid") || null;
    const gadSource       = params.get("gad_source")     || null;

    const hasGoogleAdsParam = Boolean(gclid || gbraid || gadCampaignId || gadSource);

    const source = utmSource || (hasGoogleAdsParam ? "google" : null);
    const medium = utmMedium || (hasGoogleAdsParam ? "cpc" : null);

    let referrer = options.referrer;
    if (referrer === undefined) {
        referrer = (typeof document !== "undefined" && document.referrer) ? document.referrer : null;
    }

    const channel = classifyTraffic({
        source,
        medium,
        referrer,
        gclid,
        gbraid,
        gad_campaignid: gadCampaignId,
        gad_source: gadSource,
    });

    let landingUrl = options.url || null;
    if (!landingUrl && typeof window !== "undefined" && window.location) {
        landingUrl = window.location.href;
    }

    let landingPage = null;
    if (landingUrl) {
        try {
            landingPage = new URL(landingUrl).pathname;
        } catch {
            landingPage = null;
        }
    }

    const landingPageGroup = getLandingPageGroup(landingPage);
    let submitPage = null;
    if (typeof window !== "undefined" && window.location) {
        submitPage = window.location.pathname;
    } else {
        submitPage = landingPage;
    }

    const { drilldown1, drilldown2, drilldown3 } = computeDrilldown({
        channel,
        source,
        medium,
        campaign,
        content,
        term,
        gclid,
        referrer,
        landingPage,
    });

    return {
        channel,
        source,
        medium,
        campaign,
        content,
        term,
        gclid,
        gbraid,
        gad_campaignid: gadCampaignId,
        gad_source: gadSource,
        drilldown1,
        drilldown2,
        drilldown3,
        referrer,
        landingUrl,
        landingPage,
        landingPageGroup,
        submitPage,
    };
}

export function initializeAttribution(options = {}) {
    const currentAttribution = getAttribution(options);

    // Save Last-Touch on every visit (except pure Direct when a previous touch exists)
    const existingLast = getLastTouch();
    if (!existingLast || currentAttribution.channel !== "Direct") {
        saveLastTouch(currentAttribution);
    }

    const existingFirst = getFirstTouch();
    if (existingFirst !== null) {
        return existingFirst;
    }

    saveFirstTouch(currentAttribution);
    return currentAttribution;
}

export function getStoredAttribution() {
    return getFirstTouch();
}

export function getLastTouchAttribution() {
    return getLastTouch();
}

/**
 * Retrieve the project tracking ID associated with this site/integration.
 * Reads:
 *   1. Explicit override via options.trackingId, options.tracking_id, options.projectId, options.project_id
 *   2. data-tracking-id or data-project-id on document.currentScript
 *   3. data-tracking-id or data-project-id on any <script> tag on the page
 *   4. URL search parameter ?tracking_id=... or ?project_id=...
 *   5. window.ATTRIBUTER_TRACKING_ID or window.ATTRIBUTER_PROJECT_ID
 *
 * @param {object} [options]
 * @returns {string|null}
 */
export function getTrackingId(options = {}) {
    if (options) {
        const val = options.trackingId || options.tracking_id || options.projectId || options.project_id;
        if (val && String(val).trim()) return String(val).trim();
    }

    if (typeof window !== "undefined" && window.location && window.location.search) {
        try {
            const params = new URLSearchParams(window.location.search);
            const urlPid = params.get("tracking_id") || params.get("project_id");
            if (urlPid && urlPid.trim()) return urlPid.trim();
        } catch {}
    }

    if (typeof document !== "undefined") {
        if (document.currentScript && typeof document.currentScript.getAttribute === "function") {
            const tid = document.currentScript.getAttribute("data-tracking-id") || document.currentScript.getAttribute("data-project-id");
            if (tid && tid.trim()) return tid.trim();
        }

        if (typeof document.querySelector === "function") {
            const scriptTag = document.querySelector("script[data-tracking-id], script[data-project-id]");
            if (scriptTag && typeof scriptTag.getAttribute === "function") {
                const tid = scriptTag.getAttribute("data-tracking-id") || scriptTag.getAttribute("data-project-id");
                if (tid && tid.trim()) return tid.trim();
            }
        }
    }

    if (typeof window !== "undefined") {
        const globalId = window.ATTRIBUTER_TRACKING_ID || window.ATTRIBUTER_PROJECT_ID;
        if (globalId && String(globalId).trim()) return String(globalId).trim();
    }

    return null;
}

// Backward compatibility alias
export function getProjectId(options = {}) {
    return getTrackingId(options);
}