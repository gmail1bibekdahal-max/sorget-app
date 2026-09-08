/**
 * Attributer SDK — v1.0.0
 *
 * Standalone distributable browser tracking SDK for Attributer.
 * Self-contained bundle including traffic classification, first-touch persistence,
 * automatic form population, dynamic DOM monitoring (MutationObserver), and project identification.
 *
 * Versioned path: /sdk/v1/attributer.js
 * Backward-compat path: /attributer.js (redirects to /sdk/v1/attributer.js)
 *
 * Installation:
 *   <script src="https://YOUR-DOMAIN.com/sdk/v1/attributer.js" data-tracking-id="attr_XXXXXXX"></script>
 *
 * Changelog:
 *   v1.0.0 — Initial production release. First-touch persistence, UTM + Google Ads detection,
 *             form population via MutationObserver, tracking_id injection into form fields.
 */

(function (window) {
    "use strict";

    var ATTRIBUTER_VERSION = "1.0.0";

    // ── Constants & Lookup Tables ──────────────────────────────────────────────

    var STORAGE_KEY_FIRST = "attributer_first_touch";
    var STORAGE_KEY_LAST  = "attributer_last_touch";

    var PAID_SEARCH_MEDIUMS = ["cpc", "ppc", "paidsearch", "paid_search"];
    var PAID_SOCIAL_MEDIUMS = ["paid_social", "paidsocial", "social_paid", "paid-social"];
    var EMAIL_MEDIUMS       = ["email", "e-mail", "email_marketing"];
    var DISPLAY_MEDIUMS     = ["display", "banner", "cpm"];
    var AFFILIATE_MEDIUMS   = ["affiliate", "aff"];

    var SEARCH_ENGINE_SOURCES = ["google", "bing", "yahoo", "duckduckgo", "yandex", "baidu", "ecosia"];
    var SOCIAL_SOURCES        = ["facebook", "instagram", "linkedin", "twitter", "x", "tiktok", "youtube", "pinterest", "snapchat", "reddit", "whatsapp"];
    var SEARCH_ENGINE_DOMAINS = ["google", "bing", "yahoo", "duckduckgo", "yandex", "baidu", "ecosia", "ask", "aol"];

    var ATTRIBUTION_FIELDS = [
        "channel", "source", "medium", "campaign",
        "content", "term", "gclid", "gbraid",
        "gad_campaignid", "gad_source",
        "drilldown1", "drilldown2", "drilldown3",
        "landing_page", "landing_page_group", "landing_url", "submit_page", "referrer"
    ];

    var FIELD_ALIASES = {
        "channel_drilldown1": "drilldown1",
        "channel_drilldown2": "drilldown2",
        "channel_drilldown3": "drilldown3",
        "drilldown_1": "drilldown1",
        "drilldown_2": "drilldown2",
        "drilldown_3": "drilldown3",
        "landingPage": "landing_page",
        "landingPageGroup": "landing_page_group",
        "landingUrl": "landing_url",
        "submitPage": "submit_page"
    };

    // ── Helper Utilities ───────────────────────────────────────────────────────
    function normalize(val) {
        if (val === null || val === undefined) return "";
        return String(val).trim().toLowerCase();
    }

    function extractHostname(urlStr) {
        if (!urlStr || typeof urlStr !== "string") return "";
        try {
            var parsed = new URL(urlStr);
            return parsed.hostname.toLowerCase();
        } catch (e) {
            return "";
        }
    }

    function isSearchEngineReferrer(refHost) {
        if (!refHost) return false;
        var segments = refHost.split(".");
        for (var i = 0; i < SEARCH_ENGINE_DOMAINS.length; i++) {
            if (segments.indexOf(SEARCH_ENGINE_DOMAINS[i]) !== -1) return true;
        }
        return false;
    }

    function getLandingPageGroup(pathname) {
        if (!pathname || typeof pathname !== "string") return "/";
        var clean = pathname.trim();
        if (clean === "" || clean === "/") return "/";
        var segments = clean.split("/").filter(Boolean);
        return segments.length > 0 ? "/" + segments[0] : "/";
    }

    function computeDrilldown(params) {
        var ch  = params.channel;
        var src = params.source;
        var med = params.medium;
        var cmp = params.campaign;
        var cnt = params.content;
        var trm = params.term;
        var gcl = params.gclid;
        var ref = params.referrer;
        var lp  = params.landingPage;

        var refDomain = extractHostname(ref) || ref;

        var d1 = null;
        var d2 = null;
        var d3 = null;

        switch (ch) {
            case "Paid Search":
                d1 = src || "google";
                d2 = cmp || "(not set)";
                d3 = cnt || trm || gcl || null;
                break;
            case "Paid Social":
                d1 = src || "social";
                d2 = cmp || "(not set)";
                d3 = cnt || null;
                break;
            case "Organic Search":
                d1 = src || "organic search";
                d2 = trm || "(not provided)";
                d3 = lp || null;
                break;
            case "Organic Social":
                d1 = src || "organic social";
                d2 = "(not set)";
                d3 = lp || null;
                break;
            case "Email":
                d1 = src || "email";
                d2 = cmp || "(not set)";
                d3 = cnt || null;
                break;
            case "Display":
                d1 = src || "display";
                d2 = cmp || "(not set)";
                d3 = cnt || null;
                break;
            case "Affiliate":
                d1 = src || "affiliate";
                d2 = cmp || "(not set)";
                d3 = null;
                break;
            case "Referral":
                d1 = refDomain || "referral";
                d2 = lp || "(not set)";
                d3 = null;
                break;
            case "Direct":
                d1 = "Direct";
                d2 = lp || "/";
                d3 = null;
                break;
            default:
                d1 = src || "Other";
                d2 = med || "(not set)";
                d3 = cmp || null;
                break;
        }

        return { drilldown1: d1, drilldown2: d2, drilldown3: d3 };
    }

    // ── Classifier ────────────────────────────────────────────────────────────
    function classifyTraffic(params) {
        var src  = normalize(params.source);
        var med  = normalize(params.medium);
        var ref  = params.referrer || "";
        var refHost = extractHostname(ref);

        var gclid         = params.gclid ? String(params.gclid).trim() : "";
        var gbraid        = params.gbraid ? String(params.gbraid).trim() : "";
        var gadCampaignId = params.gad_campaignid ? String(params.gad_campaignid).trim() : "";
        var gadSource     = params.gad_source ? String(params.gad_source).trim() : "";

        var hasGoogleAdsParam = Boolean(gclid || gbraid || gadCampaignId || gadSource);

        if (hasGoogleAdsParam || PAID_SEARCH_MEDIUMS.indexOf(med) !== -1) {
            return "Paid Search";
        }
        if (PAID_SOCIAL_MEDIUMS.indexOf(med) !== -1) {
            return "Paid Social";
        }
        if (EMAIL_MEDIUMS.indexOf(med) !== -1) {
            return "Email";
        }
        if (DISPLAY_MEDIUMS.indexOf(med) !== -1) {
            return "Display";
        }
        if (AFFILIATE_MEDIUMS.indexOf(med) !== -1) {
            return "Affiliate";
        }
        if (SEARCH_ENGINE_SOURCES.indexOf(src) !== -1) {
            return "Organic Search";
        }
        if (!src && isSearchEngineReferrer(refHost)) {
            return "Organic Search";
        }
        if (SOCIAL_SOURCES.indexOf(src) !== -1) {
            return "Organic Social";
        }
        if (!src) {
            var hostSegments = refHost.split(".");
            for (var s = 0; s < SOCIAL_SOURCES.length; s++) {
                if (hostSegments.indexOf(SOCIAL_SOURCES[s]) !== -1) {
                    return "Organic Social";
                }
            }
        }
        if (refHost && !isSearchEngineReferrer(refHost)) {
            return "Referral";
        }
        if (!src && !med && !ref) {
            return "Direct";
        }
        return "Other";
    }

    // ── Storage (First-Touch & Last-Touch Persistence with TTL) ───────────────
    var DEFAULT_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
    var STORAGE_SCHEMA_VERSION = 1;

    function _wrapEnvelope(data, ttlMs) {
        var now = Date.now();
        var ttl = typeof ttlMs === "number" ? ttlMs : DEFAULT_TTL_MS;
        var env = {
            version: STORAGE_SCHEMA_VERSION,
            storedAt: now,
            expiresAt: now + ttl,
            data: data
        };
        if (data && typeof data === "object") {
            for (var k in data) {
                if (data.hasOwnProperty(k) && !env.hasOwnProperty(k)) {
                    env[k] = data[k];
                }
            }
        }
        return env;
    }

    function _readStorage(key) {
        if (typeof window === "undefined" || !window.localStorage) return null;
        try {
            var raw = window.localStorage.getItem(key);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                window.localStorage.removeItem(key);
                return null;
            }

            var now = Date.now();

            // 1. Versioned envelope check
            if (parsed.version && parsed.data && typeof parsed.data === "object") {
                if (typeof parsed.expiresAt === "number" && now > parsed.expiresAt) {
                    window.localStorage.removeItem(key);
                    return null;
                }
                return parsed.data;
            }

            // 2. Legacy flat object migration
            if (parsed.channel || parsed.source || parsed.medium || parsed.landingUrl || parsed.landingPage) {
                try {
                    window.localStorage.setItem(key, JSON.stringify(_wrapEnvelope(parsed)));
                } catch (err) {}
                return parsed;
            }

            window.localStorage.removeItem(key);
            return null;
        } catch (e) {
            try { window.localStorage.removeItem(key); } catch (err) {}
            return null;
        }
    }

    function getFirstTouch() {
        return _readStorage(STORAGE_KEY_FIRST);
    }

    function saveFirstTouch(attribution, ttlMs) {
        if (typeof window === "undefined" || !window.localStorage || !attribution) return;
        if (getFirstTouch() !== null) return; // Immutable
        try {
            var envelope = _wrapEnvelope(attribution, ttlMs);
            window.localStorage.setItem(STORAGE_KEY_FIRST, JSON.stringify(envelope));
        } catch (e) {}
    }

    function clearFirstTouch() {
        if (typeof window === "undefined" || !window.localStorage) return;
        try { window.localStorage.removeItem(STORAGE_KEY_FIRST); } catch (e) {}
    }

    function getLastTouch() {
        return _readStorage(STORAGE_KEY_LAST);
    }

    function saveLastTouch(attribution, ttlMs) {
        if (typeof window === "undefined" || !window.localStorage || !attribution) return;
        try {
            var envelope = _wrapEnvelope(attribution, ttlMs);
            window.localStorage.setItem(STORAGE_KEY_LAST, JSON.stringify(envelope));
        } catch (e) {}
    }

    function clearLastTouch() {
        if (typeof window === "undefined" || !window.localStorage) return;
        try { window.localStorage.removeItem(STORAGE_KEY_LAST); } catch (e) {}
    }

    // ── Attribution Detection ──────────────────────────────────────────────────
    function getAttribution() {
        var href = (typeof window !== "undefined" && window.location) ? window.location.href : "";
        var searchParams = (typeof window !== "undefined" && window.location) ? new URLSearchParams(window.location.search) : new URLSearchParams();

        var utmSource   = searchParams.get("utm_source")   || null;
        var utmMedium   = searchParams.get("utm_medium")   || null;
        var campaign    = searchParams.get("utm_campaign") || null;
        var content     = searchParams.get("utm_content")  || null;
        var term        = searchParams.get("utm_term")     || null;

        var gclid         = searchParams.get("gclid")          || null;
        var gbraid        = searchParams.get("gbraid")         || null;
        var gadCampaignId = searchParams.get("gad_campaignid") || null;
        var gadSource     = searchParams.get("gad_source")     || null;

        var hasGoogleAdsParam = Boolean(gclid || gbraid || gadCampaignId || gadSource);

        var source = utmSource || (hasGoogleAdsParam ? "google" : null);
        var medium = utmMedium || (hasGoogleAdsParam ? "cpc" : null);
        var referrer = (typeof document !== "undefined" && document.referrer) ? document.referrer : null;

        var channel = classifyTraffic({
            source: source,
            medium: medium,
            referrer: referrer,
            gclid: gclid,
            gbraid: gbraid,
            gad_campaignid: gadCampaignId,
            gad_source: gadSource,
        });

        var landingPage = (typeof window !== "undefined" && window.location) ? window.location.pathname : "/";
        var landingPageGroup = getLandingPageGroup(landingPage);
        var submitPage = landingPage;

        var drilldown = computeDrilldown({
            channel: channel,
            source: source,
            medium: medium,
            campaign: campaign,
            content: content,
            term: term,
            gclid: gclid,
            referrer: referrer,
            landingPage: landingPage,
        });

        return {
            channel:          channel,
            source:           source,
            medium:           medium,
            campaign:         campaign,
            content:          content,
            term:             term,
            gclid:            gclid,
            gbraid:           gbraid,
            gad_campaignid:   gadCampaignId,
            gad_source:       gadSource,
            drilldown1:       drilldown.drilldown1,
            drilldown2:       drilldown.drilldown2,
            drilldown3:       drilldown.drilldown3,
            referrer:         referrer,
            landingUrl:       href,
            landingPage:      landingPage,
            landingPageGroup: landingPageGroup,
            submitPage:       submitPage,
        };
    }

    function initializeAttribution() {
        var current = getAttribution();

        var existingLast = getLastTouch();
        if (!existingLast || current.channel !== "Direct") {
            saveLastTouch(current);
        }

        var existingFirst = getFirstTouch();
        if (existingFirst !== null) return existingFirst;

        saveFirstTouch(current);
        return current;
    }

    function getStoredAttribution() {
        return getFirstTouch();
    }

    var STANDARD_FIELD_ALIASES = {
        "utm_source": "source",
        "utm_medium": "medium",
        "utm_campaign": "campaign",
        "utm_content": "content",
        "utm_term": "term",
        "utmSource": "source",
        "utmMedium": "medium",
        "utmCampaign": "campaign",
        "utmContent": "content",
        "utmTerm": "term",
        "channel_drilldown1": "drilldown1",
        "channel_drilldown2": "drilldown2",
        "channel_drilldown3": "drilldown3",
        "channeldrilldown1": "drilldown1",
        "channeldrilldown2": "drilldown2",
        "channeldrilldown3": "drilldown3",
        "drilldown_1": "drilldown1",
        "drilldown_2": "drilldown2",
        "drilldown_3": "drilldown3",
        "channelDrilldown1": "drilldown1",
        "channelDrilldown2": "drilldown2",
        "channelDrilldown3": "drilldown3",
        "landingPage": "landing_page",
        "landingPageGroup": "landing_page_group",
        "landingpage": "landing_page",
        "landingpagegroup": "landing_page_group",
        "landingUrl": "landing_url",
        "submitPage": "submit_page",
        "landing_page_url": "landing_url",
        "LeadSource": "source",
        "lead_source": "source",
        "leadSource": "source",
        "First_Click_Source__c": "source",
        "First_Click_Medium__c": "medium",
        "First_Click_Campaign__c": "campaign",
        "first_touch_channel": "channel",
        "firstTouchChannel": "channel",
        "GCLID": "gclid",
        "GBRAID": "gbraid",
        "wpcf7-channel": "channel",
        "wpcf7-source": "source",
        "gform_channel": "channel",
        "gform_source": "source",
        "hs_lead_source": "source"
    };

    function getCustomFieldMapping(options) {
        if (options && options.fieldMapping && typeof options.fieldMapping === "object") {
            return options.fieldMapping;
        }
        if (typeof window !== "undefined" && window.ATTRIBUTER_FIELD_MAPPING && typeof window.ATTRIBUTER_FIELD_MAPPING === "object") {
            return window.ATTRIBUTER_FIELD_MAPPING;
        }
        if (typeof document !== "undefined" && typeof document.querySelector === "function") {
            var scriptTag = document.querySelector("script[data-field-mapping]");
            if (scriptTag && typeof scriptTag.getAttribute === "function") {
                try {
                    var raw = scriptTag.getAttribute("data-field-mapping");
                    if (raw) return JSON.parse(raw);
                } catch (e) {}
            }
        }
        return {};
    }

    function _setFormInputValue(el, value) {
        if (!el || value === null || value === undefined) return;
        var strVal = String(value);

        if (el.tagName === "SELECT") {
            if (el.value.trim() === "" || el.value === "0" || el.value === "default") {
                el.value = strVal;
            }
        } else {
            if (el.value && el.value.trim() !== "") {
                return; // Preserve existing non-empty value
            }
            el.value = strVal;
        }
    }

    // ── Form attribution ───────────────────────────────────────────────────────
    function populateForm(form, attribution, options) {
        if (!form || !attribution || typeof attribution !== "object") return;
        var customMapping = getCustomFieldMapping(options);

        function _fillSelector(sel, val) {
            if (typeof form.querySelectorAll !== "function") return;
            try {
                var els = form.querySelectorAll(sel);
                if (els && els.length > 0) {
                    for (var e = 0; e < els.length; e++) {
                        _setFormInputValue(els[e], val);
                    }
                }
            } catch (err) {}
        }

        // 1. Direct name mapping (input[name="..."])
        for (var j = 0; j < ATTRIBUTION_FIELDS.length; j++) {
            var directField = ATTRIBUTION_FIELDS[j];
            var camelDirect = directField.replace(/_([a-z])/g, function (_, g) { return g.toUpperCase(); });
            var directVal = attribution[directField] !== undefined ? attribution[directField] : attribution[camelDirect];
            if (directVal === null || directVal === undefined) continue;

            _fillSelector('input[name="' + directField + '"]', directVal);
            _fillSelector('textarea[name="' + directField + '"]', directVal);
            _fillSelector('select[name="' + directField + '"]', directVal);
            _fillSelector('[data-attributer-field="' + directField + '"]', directVal);
            _fillSelector('[data-attributer-field="' + camelDirect + '"]', directVal);
        }

        // 2. Standard alias mapping
        for (var alias in STANDARD_FIELD_ALIASES) {
            if (STANDARD_FIELD_ALIASES.hasOwnProperty(alias)) {
                var target = STANDARD_FIELD_ALIASES[alias];
                var cTarget = target.replace(/_([a-z])/g, function (_, g) { return g.toUpperCase(); });
                var aVal = attribution[target] !== undefined ? attribution[target] : attribution[cTarget];
                if (aVal === null || aVal === undefined) continue;

                _fillSelector('input[name="' + alias + '"]', aVal);
                _fillSelector('textarea[name="' + alias + '"]', aVal);
                _fillSelector('select[name="' + alias + '"]', aVal);
            }
        }

        // 3. Custom user-defined field mapping
        for (var customInputName in customMapping) {
            if (customMapping.hasOwnProperty(customInputName)) {
                var targetField = customMapping[customInputName];
                var cField = String(targetField).replace(/_([a-z])/g, function (_, g) { return g.toUpperCase(); });
                var cVal = attribution[targetField] !== undefined ? attribution[targetField] : attribution[cField];
                if (cVal === null || cVal === undefined) continue;

                _fillSelector('input[name="' + customInputName + '"]', cVal);
                _fillSelector('textarea[name="' + customInputName + '"]', cVal);
                _fillSelector('select[name="' + customInputName + '"]', cVal);
            }
        }

        // 4. Tracking ID injection
        var tid = getTrackingId(options);
        if (tid) {
            _fillSelector('input[name="tracking_id"]', tid);
            _fillSelector('input[name="project_id"]', tid);
            _fillSelector('[data-attributer-field="tracking_id"]', tid);
        }
    }

    function populateForms(attribution, options) {
        if (!attribution) return;
        var forms = document.querySelectorAll("form");
        for (var i = 0; i < forms.length; i++) {
            populateForm(forms[i], attribution, options);
        }
    }

    // ── MutationObserver — dynamic forms ──────────────────────────────────────
    var _observer = null;

    function _startObserver(attribution) {
        if (_observer) { _observer.disconnect(); _observer = null; }
        if (!attribution || typeof MutationObserver === "undefined" || typeof document === "undefined" || !document.body) return;

        try {
            _observer = new MutationObserver(function (mutations) {
                for (var m = 0; m < mutations.length; m++) {
                    var added = mutations[m].addedNodes;
                    for (var n = 0; n < added.length; n++) {
                        var node = added[n];
                        if (node.nodeType !== 1) continue; // Node.ELEMENT_NODE
                        if (node.tagName === "FORM") {
                            populateForm(node, attribution);
                        } else if (typeof node.querySelectorAll === "function") {
                            var nestedForms = node.querySelectorAll("form");
                            for (var f = 0; f < nestedForms.length; f++) {
                                populateForm(nestedForms[f], attribution);
                            }
                        }
                    }
                }
            });

            _observer.observe(document.body, { childList: true, subtree: true });
        } catch (e) {
            // Fail-safe: never throw from observer setup
        }
    }

    function disconnectFormAttribution() {
        if (_observer) {
            try {
                _observer.disconnect();
            } catch (e) {}
            _observer = null;
        }
    }

    // ── Allowed Domains Verification ──────────────────────────────────────────
    function isDomainAllowed() {
        if (typeof window === "undefined" || !window.location) return true;
        var hostname = window.location.hostname || "";
        if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") return true;

        var allowedAttr = null;
        if (typeof document !== "undefined") {
            if (document.currentScript && typeof document.currentScript.getAttribute === "function") {
                allowedAttr = document.currentScript.getAttribute("data-allowed-domains");
            }
            if (!allowedAttr && typeof document.querySelector === "function") {
                var tag = document.querySelector("script[data-allowed-domains]");
                if (tag && typeof tag.getAttribute === "function") {
                    allowedAttr = tag.getAttribute("data-allowed-domains");
                }
            }
        }
        if (!allowedAttr && typeof window !== "undefined") {
            allowedAttr = window.ATTRIBUTER_ALLOWED_DOMAINS;
        }

        if (!allowedAttr || typeof allowedAttr !== "string" || !allowedAttr.trim()) {
            return true; // No restriction specified
        }

        var domains = allowedAttr.split(",").map(function (d) { return d.trim().toLowerCase(); }).filter(Boolean);
        if (domains.length === 0) return true;

        var host = hostname.toLowerCase();
        for (var i = 0; i < domains.length; i++) {
            var target = domains[i];
            if (host === target || host.endsWith("." + target)) {
                return true;
            }
        }

        return false;
    }

    // ── Auto Initialization ───────────────────────────────────────────────────
    function _autoInit() {
        try {
            if (!isDomainAllowed()) {
                return; // Domain not authorized, exit silently and safely
            }
            var attribution = initializeAttribution();
            populateForms(attribution);
            _startObserver(attribution);
        } catch (e) {
            // Fail-safe: never throw uncaught exception
        }
    }

    if (typeof document !== "undefined") {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", _autoInit);
        } else {
            _autoInit();
        }
    }

    // ── Project Identification (Tracking ID) ──────────────────────────────────
    function getTrackingId(options) {
        if (options) {
            var val = options.trackingId || options.tracking_id || options.projectId || options.project_id;
            if (val && String(val).trim()) return String(val).trim();
        }

        if (typeof window !== "undefined" && window.location && window.location.search) {
            try {
                var searchParams = new URLSearchParams(window.location.search);
                var urlPid = searchParams.get("tracking_id") || searchParams.get("project_id");
                if (urlPid && urlPid.trim()) return urlPid.trim();
            } catch (e) {}
        }

        if (typeof document !== "undefined") {
            if (document.currentScript && typeof document.currentScript.getAttribute === "function") {
                var tid = document.currentScript.getAttribute("data-tracking-id") || document.currentScript.getAttribute("data-project-id");
                if (tid && tid.trim()) return tid.trim();
            }

            if (typeof document.querySelector === "function") {
                var scriptTag = document.querySelector("script[data-tracking-id], script[data-project-id]");
                if (scriptTag && typeof scriptTag.getAttribute === "function") {
                    var tidTag = scriptTag.getAttribute("data-tracking-id") || scriptTag.getAttribute("data-project-id");
                    if (tidTag && tidTag.trim()) return tidTag.trim();
                }
            }
        }

        if (typeof window !== "undefined") {
            var gPid = window.ATTRIBUTER_TRACKING_ID || window.ATTRIBUTER_PROJECT_ID;
            if (gPid && String(gPid).trim()) return String(gPid).trim();
        }

        return null;
    }

    function getProjectId(options) {
        return getTrackingId(options);
    }

    // ── Public API ─────────────────────────────────────────────────────────────
    window.Attributer = {
        /** SDK Version */
        version: ATTRIBUTER_VERSION,

        /** Returns current visit's attribution signals */
        getAttribution: getAttribution,

        /** Returns stored first-touch attribution object */
        getStoredAttribution: getStoredAttribution,

        /** Returns stored first-touch attribution object */
        getFirstTouch: getFirstTouch,

        /** Returns stored last-touch attribution object */
        getLastTouch: getLastTouch,

        /** Returns project tracking ID (data-tracking-id / data-project-id) */
        getTrackingId: getTrackingId,

        /** Alias for getTrackingId for backward compatibility */
        getProjectId: getProjectId,

        /** Populate attribution fields in a form element */
        populateForm: function (form) {
            try {
                populateForm(form, getFirstTouch());
            } catch (e) {}
        },

        /** Populate all forms on page now */
        populateForms: function () {
            try {
                populateForms(getFirstTouch());
            } catch (e) {}
        },

        /** Disconnect MutationObserver */
        disconnectFormAttribution: disconnectFormAttribution,

        /** Clear first-touch storage (dev/testing) */
        clearFirstTouch: clearFirstTouch,

        /** Clear last-touch storage */
        clearLastTouch: clearLastTouch,
    };

})(window);
