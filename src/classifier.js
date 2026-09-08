/**
 * classifier.js
 *
 * Deterministic traffic channel classifier.
 * Priority order (highest to lowest):
 *   Paid Search → Paid Social → Email → Display → Affiliate
 *   → Organic Search → Organic Social → Referral → Direct → Other
 */

const PAID_SEARCH_MEDIUMS = ["cpc", "ppc", "paidsearch", "paid_search", "paidsearch"];
const PAID_SOCIAL_MEDIUMS = ["paid_social", "paidsocial", "social_paid", "paid-social"];
const EMAIL_MEDIUMS       = ["email", "e-mail", "email_marketing"];
const DISPLAY_MEDIUMS     = ["display", "banner", "cpm"];
const AFFILIATE_MEDIUMS   = ["affiliate", "aff"];

const SEARCH_ENGINE_SOURCES  = ["google", "bing", "yahoo", "duckduckgo", "yandex", "baidu", "ecosia"];
const SOCIAL_SOURCES         = ["facebook", "instagram", "linkedin", "twitter", "x", "tiktok", "youtube", "pinterest", "snapchat", "reddit", "whatsapp"];

// Domains associated with search engines — used to prevent referral classification
const SEARCH_ENGINE_DOMAINS = ["google", "bing", "yahoo", "duckduckgo", "yandex", "baidu", "ecosia", "ask", "aol"];

/**
 * Normalize a string value for comparison.
 * Trims whitespace, lowercases, returns "" for null/undefined.
 *
 * @param {string|null|undefined} value
 * @returns {string}
 */
function normalize(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim().toLowerCase();
}

/**
 * Extract the hostname from a URL string.
 * Returns "" if the URL is invalid or empty.
 *
 * @param {string} url
 * @returns {string}
 */
function extractHostname(url) {
    if (!url) return "";
    try {
        return new URL(url).hostname.toLowerCase();
    } catch {
        return "";
    }
}

/**
 * Check whether a referrer hostname belongs to a known search engine.
 *
 * @param {string} referrerHostname
 * @returns {boolean}
 */
function isSearchEngineReferrer(referrerHostname) {
    return SEARCH_ENGINE_DOMAINS.some(engine => referrerHostname.includes(engine));
}

/**
 * Classify a visit into a traffic channel.
 *
 * Classification is deterministic and priority-based.
 * UTM parameters and ad click identifiers take precedence over referrer-based signals.
 *
 * @param {object} [params]
 * @param {string|null|undefined} [params.source]         - utm_source
 * @param {string|null|undefined} [params.medium]         - utm_medium
 * @param {string|null|undefined} [params.referrer]       - document.referrer
 * @param {string|null|undefined} [params.gclid]          - Google click identifier
 * @param {string|null|undefined} [params.gbraid]         - Google iOS app-to-web click identifier
 * @param {string|null|undefined} [params.gad_campaignid] - Google Ads campaign ID
 * @param {string|null|undefined} [params.gad_source]     - Google Ads source identifier
 * @returns {string} One of: "Paid Search" | "Paid Social" | "Organic Search" |
 *                           "Organic Social" | "Email" | "Display" | "Affiliate" |
 *                           "Referral" | "Direct" | "Other"
 */
export function classifyTraffic(paramsOrSource = {}, mediumArg, referrerArg) {
    let source, medium, referrer, gclid, gbraid, gadCampaignId, gadSource;

    if (paramsOrSource && typeof paramsOrSource === "object") {
        source = paramsOrSource.source;
        medium = paramsOrSource.medium;
        referrer = paramsOrSource.referrer;
        gclid = paramsOrSource.gclid;
        gbraid = paramsOrSource.gbraid;
        gadCampaignId = paramsOrSource.gad_campaignid;
        gadSource = paramsOrSource.gad_source;
    } else {
        source = paramsOrSource;
        medium = mediumArg;
        referrer = referrerArg;
    }

    const src = normalize(source);
    const med = normalize(medium);
    const ref = normalize(referrer);
    const refHost = extractHostname(ref);

    const hasGoogleAdsParam = Boolean(
        normalize(gclid) || normalize(gbraid) || normalize(gadCampaignId) || normalize(gadSource)
    );

    // ── Paid Search ────────────────────────────────────────────────────────────
    // Triggered by any paid-search medium value or Google Ads click/ad identifiers.
    if (PAID_SEARCH_MEDIUMS.includes(med) || hasGoogleAdsParam) {
        return "Paid Search";
    }

    // ── Paid Social ────────────────────────────────────────────────────────────
    // Triggered by any paid-social medium value.
    if (PAID_SOCIAL_MEDIUMS.includes(med)) {
        return "Paid Social";
    }

    // ── Email ──────────────────────────────────────────────────────────────────
    if (EMAIL_MEDIUMS.includes(med)) {
        return "Email";
    }

    // ── Display ────────────────────────────────────────────────────────────────
    if (DISPLAY_MEDIUMS.includes(med)) {
        return "Display";
    }

    // ── Affiliate ──────────────────────────────────────────────────────────────
    if (AFFILIATE_MEDIUMS.includes(med)) {
        return "Affiliate";
    }

    // ── Organic Search ─────────────────────────────────────────────────────────
    // Two signals: explicit utm_source matching a search engine (no paid medium),
    // OR a referrer from a known search engine domain (no utm_source override).
    if (SEARCH_ENGINE_SOURCES.includes(src)) {
        return "Organic Search";
    }
    if (!src && isSearchEngineReferrer(refHost)) {
        return "Organic Search";
    }

    // ── Organic Social ─────────────────────────────────────────────────────────
    // Social source with no paid medium (paid mediums already caught above).
    if (SOCIAL_SOURCES.includes(src)) {
        return "Organic Social";
    }
    // Social referrer with no utm_source.
    // Split hostname into segments and check for an exact match against a social name
    // e.g. "www.facebook.com" → ["www","facebook","com"] → includes "facebook" ✓
    // e.g. "example.com"      → ["example","com"]         → does not include "x" ✓
    if (!src) {
        const hostSegments = refHost.split(".");
        if (SOCIAL_SOURCES.some(s => hostSegments.includes(s))) {
            return "Organic Social";
        }
    }

    // ── Referral ───────────────────────────────────────────────────────────────
    // Any remaining non-empty, non-search-engine referrer.
    if (refHost && !isSearchEngineReferrer(refHost)) {
        return "Referral";
    }

    // ── Direct ─────────────────────────────────────────────────────────────────
    if (!src && !med && !ref) {
        return "Direct";
    }

    // ── Other ──────────────────────────────────────────────────────────────────
    return "Other";
}