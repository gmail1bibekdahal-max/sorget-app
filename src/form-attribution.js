/**
 * form-attribution.js
 *
 * Phase 3 — Form Attribution
 *
 * Reads stored first-touch attribution and populates matching hidden
 * fields across all forms on the page (both existing and dynamically added).
 *
 * Public API:
 *   populateForm(form, attribution)      Populate one form element.
 *   populateForms(attribution)           Populate all current forms on the page.
 *   initializeFormAttribution()         Initialize: populate existing + watch for new forms.
 *   disconnectFormAttribution()         Disconnect the MutationObserver (useful for testing).
 */

import { getFirstTouch } from "./storage.js";
import { getTrackingId } from "./attribution.js";

/**
 * The attribution field names that Attributer will look for in forms.
 * Only these field names are ever touched — all other inputs are ignored.
 */
/**
 * The attribution field names that Attributer will look for in forms.
 */
const ATTRIBUTION_FIELDS = [
    "channel",
    "source",
    "medium",
    "campaign",
    "content",
    "term",
    "gclid",
    "gbraid",
    "gad_campaignid",
    "gad_source",
    "drilldown1",
    "drilldown2",
    "drilldown3",
    "landing_page",
    "landing_page_group",
    "landing_url",
    "submit_page",
    "referrer",
];

const STANDARD_FIELD_ALIASES = {
    // UTM aliases
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

    // Drilldown aliases
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

    // Landing / Submit page aliases
    "landingPage": "landing_page",
    "landingPageGroup": "landing_page_group",
    "landingpage": "landing_page",
    "landingpagegroup": "landing_page_group",
    "landingUrl": "landing_url",
    "submitPage": "submit_page",
    "landing_page_url": "landing_url",

    // CRM & CMS aliases
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
    "hs_lead_source": "source",
};

/**
 * Resolves custom field mapping overrides from options, global window, or script tag.
 */
export function getCustomFieldMapping(options = {}) {
    if (options && options.fieldMapping && typeof options.fieldMapping === "object") {
        return options.fieldMapping;
    }

    if (typeof window !== "undefined" && window.ATTRIBUTER_FIELD_MAPPING && typeof window.ATTRIBUTER_FIELD_MAPPING === "object") {
        return window.ATTRIBUTER_FIELD_MAPPING;
    }

    if (typeof document !== "undefined" && typeof document.querySelector === "function") {
        const scriptTag = document.querySelector("script[data-field-mapping]");
        if (scriptTag && typeof scriptTag.getAttribute === "function") {
            try {
                const raw = scriptTag.getAttribute("data-field-mapping");
                if (raw) return JSON.parse(raw);
            } catch {}
        }
    }

    return {};
}

/**
 * Safely sets value on input, textarea, or select element without overwriting existing non-empty values.
 */
function _setFormInputValue(el, value) {
    if (!el || value === null || value === undefined) return;
    const strVal = String(value);

    if (el.tagName === "SELECT") {
        if (!el.value || el.value.trim() === "" || el.value === "0" || el.value === "default") {
            el.value = strVal;
        }
    } else {
        if (el.value && el.value.trim() !== "") {
            return; // Preserve existing non-empty value
        }
        el.value = strVal;
    }
}

/**
 * Populate attribution fields in a single form.
 *
 * Rules:
 *   - Matches fields by name, data-attributer-field, or custom field mapping.
 *   - A field is only populated if its current value is empty.
 *   - Non-empty inputs are preserved.
 *
 * @param {HTMLFormElement} form         - The form element to populate.
 * @param {object}          attribution  - The attribution object from storage.
 * @param {object}          [options]    - Optional mapping options.
 */
export function populateForm(form, attribution, options = {}) {
    if (!form || !attribution || typeof attribution !== "object") return;

    const customMapping = getCustomFieldMapping(options);

    function _fillSelector(sel, val) {
        if (typeof form.querySelectorAll !== "function") return;
        try {
            const els = form.querySelectorAll(sel);
            if (els && els.length > 0) {
                for (const el of els) {
                    _setFormInputValue(el, val);
                }
            }
        } catch {}
    }

    // 1. Direct name mapping (input[name="..."])
    for (const fieldName of ATTRIBUTION_FIELDS) {
        const camelName = fieldName.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
        const value = attribution[fieldName] ?? attribution[camelName];
        if (value === null || value === undefined) continue;

        _fillSelector(`input[name="${fieldName}"]`, value);
        _fillSelector(`textarea[name="${fieldName}"]`, value);
        _fillSelector(`select[name="${fieldName}"]`, value);
        _fillSelector(`[data-attributer-field="${fieldName}"]`, value);
        _fillSelector(`[data-attributer-field="${camelName}"]`, value);
    }

    // 2. Standard alias mapping (e.g. utm_source -> source, channel_drilldown1 -> drilldown1)
    for (const [aliasName, targetProp] of Object.entries(STANDARD_FIELD_ALIASES)) {
        const camelTarget = targetProp.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
        const value = attribution[targetProp] ?? attribution[camelTarget];
        if (value === null || value === undefined) continue;

        _fillSelector(`input[name="${aliasName}"]`, value);
        _fillSelector(`textarea[name="${aliasName}"]`, value);
        _fillSelector(`select[name="${aliasName}"]`, value);
    }

    // 3. Custom user-defined field mapping (e.g. { "custom_lead_channel": "channel" })
    for (const [customInputName, targetField] of Object.entries(customMapping)) {
        const camelTarget = String(targetField).replace(/_([a-z])/g, (_, g) => g.toUpperCase());
        const value = attribution[targetField] ?? attribution[camelTarget];
        if (value === null || value === undefined) continue;

        _fillSelector(`input[name="${customInputName}"]`, value);
        _fillSelector(`textarea[name="${customInputName}"]`, value);
        _fillSelector(`select[name="${customInputName}"]`, value);
    }

    // 4. Populate tracking_id or project_id form inputs if present and empty
    const trackingId = getTrackingId(options);
    if (trackingId) {
        _fillSelector('input[name="tracking_id"]', trackingId);
        _fillSelector('input[name="project_id"]', trackingId);
        _fillSelector('[data-attributer-field="tracking_id"]', trackingId);
    }
}

/**
 * Populate attribution fields in all forms currently in the document.
 *
 * @param {object} attribution - The attribution object from storage.
 */
export function populateForms(attribution) {
    if (!attribution) return;

    const forms = document.querySelectorAll("form");
    for (const form of forms) {
        populateForm(form, attribution);
    }
}

// Internal: holds the active MutationObserver so it can be disconnected.
let _observer = null;

/**
 * Initialize form attribution.
 *
 * 1. Reads stored first-touch attribution.
 * 2. Populates all existing forms on the page.
 * 3. Sets up a MutationObserver to populate attribution fields in any form
 *    that is dynamically added to the DOM after initialization.
 *
 * Safe to call multiple times — existing observer is replaced if already active.
 *
 * @returns {object|null} The attribution that was applied, or null if none stored.
 */
export function initializeFormAttribution() {
    const attribution = getFirstTouch();

    // Always disconnect any existing observer before creating a new one
    disconnectFormAttribution();

    if (!attribution) {
        // No first-touch data yet; nothing to populate.
        return null;
    }

    // Populate forms already on the page
    populateForms(attribution);

    // Watch for forms added after initialization (e.g. modals, injected widgets)
    _observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;

                // The added node itself might be a <form>
                if (node.tagName === "FORM") {
                    populateForm(node, attribution);
                }

                // Or a <form> might be nested inside the added subtree
                const nestedForms = node.querySelectorAll("form");
                for (const form of nestedForms) {
                    populateForm(form, attribution);
                }
            }
        }
    });

    _observer.observe(document.body, {
        childList: true,   // watch direct children
        subtree: true,     // watch entire subtree
    });

    return attribution;
}

/**
 * Disconnect the active MutationObserver.
 * Useful for cleanup and testing.
 */
export function disconnectFormAttribution() {
    if (_observer) {
        _observer.disconnect();
        _observer = null;
    }
}
