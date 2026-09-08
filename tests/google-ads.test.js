/**
 * tests/google-ads.test.js
 *
 * Automated tests for Phase 4.5: Google Ads Auto-Tagging Support (GCLID, GBRAID, GAD_*).
 * Verifies that Google Ads click/ad identifiers are correctly parsed, classified as Paid Search,
 * preserved in storage without polluting campaign metadata, populated into forms, and immune to overwrite.
 *
 * Run with: npm test
 */

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { classifyTraffic } from "../src/classifier.js";
import { getAttribution, initializeAttribution } from "../src/attribution.js";
import { populateForm, populateForms, initializeFormAttribution, disconnectFormAttribution } from "../src/form-attribution.js";
import { saveFirstTouch, getFirstTouch, clearFirstTouch } from "../src/storage.js";

// ── Minimal Mock Storage & DOM ────────────────────────────────────────────────

function createMockStorage() {
    const store = new Map();
    return {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
    };
}

function createInput(name = "", value = "", type = "hidden") {
    return { tagName: "INPUT", name, value, type };
}

function createForm(inputs = []) {
    return {
        tagName: "FORM",
        _inputs: inputs,
        querySelectorAll(selector) {
            const match = selector.match(/^input\[name="([^"]+)"\]$/);
            if (!match) return [];
            return this._inputs.filter((i) => i.name === match[1]);
        },
    };
}

// MutationObserver mock
class MockMutationObserver {
    constructor(callback) {
        this._cb = callback;
        MockMutationObserver._last = this;
    }
    observe() {}
    disconnect() {}
    trigger(mutations) { this._cb(mutations); }
}
MockMutationObserver._last = null;
globalThis.MutationObserver = MockMutationObserver;

const _documentForms = [];
globalThis.Node = { ELEMENT_NODE: 1 };
globalThis.document = {
    querySelectorAll(selector) {
        if (selector === "form") return [..._documentForms];
        return [];
    },
    body: {},
    referrer: "",
};

beforeEach(() => {
    globalThis.localStorage = createMockStorage();
    clearFirstTouch();
    _documentForms.length = 0;
});

// ═══════════════════════════════════════════════════════════════════════════════
// GCLID CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

test("GCLID → Paid Search with source=google, medium=cpc", () => {
    const attr = getAttribution({ url: "http://localhost:8080/real-site/?gclid=TEST_GCLID" });

    assert.equal(attr.channel, "Paid Search");
    assert.equal(attr.source, "google");
    assert.equal(attr.medium, "cpc");
    assert.equal(attr.gclid, "TEST_GCLID");
    assert.equal(attr.campaign, null);
});

test("GBRAID → Paid Search with source=google, medium=cpc", () => {
    const attr = getAttribution({ url: "http://localhost:8080/real-site/?gbraid=TEST_GBRAID" });

    assert.equal(attr.channel, "Paid Search");
    assert.equal(attr.source, "google");
    assert.equal(attr.medium, "cpc");
    assert.equal(attr.gbraid, "TEST_GBRAID");
    assert.equal(attr.campaign, null);
});

test("gad_campaignid alone → Paid Search (identifier captured, not used as campaign)", () => {
    const attr = getAttribution({ url: "http://localhost:8080/real-site/?gad_campaignid=123456789" });

    assert.equal(attr.gad_campaignid, "123456789");
    assert.equal(attr.campaign, null);
    assert.equal(attr.channel, "Paid Search");
    assert.equal(attr.source, "google");
    assert.equal(attr.medium, "cpc");
});

test("gad_source alone → Paid Search", () => {
    const attr = getAttribution({ url: "http://localhost:8080/real-site/?gad_source=1" });

    assert.equal(attr.gad_source, "1");
    assert.equal(attr.channel, "Paid Search");
    assert.equal(attr.source, "google");
    assert.equal(attr.medium, "cpc");
});

// ═══════════════════════════════════════════════════════════════════════════════
// IDENTIFIER PRESERVATION
// ═══════════════════════════════════════════════════════════════════════════════

test("GCLID identifier is preserved exactly as-is in attribution object", () => {
    const attr = getAttribution({ url: "http://localhost:8080/real-site/?gclid=EAIaIQobChMI_test123" });

    assert.equal(attr.gclid, "EAIaIQobChMI_test123");
    assert.equal(attr.gbraid, null);
    assert.equal(attr.gad_campaignid, null);
    assert.equal(attr.gad_source, null);
});

test("GBRAID identifier is preserved exactly as-is in attribution object", () => {
    const attr = getAttribution({ url: "http://localhost:8080/real-site/?gbraid=0AAAA_test_ios_app" });

    assert.equal(attr.gbraid, "0AAAA_test_ios_app");
    assert.equal(attr.gclid, null);
});

test("GCLID does NOT overwrite or invent a campaign name", () => {
    const attr = getAttribution({ url: "http://localhost:8080/real-site/?gclid=TEST_GCLID" });

    assert.equal(attr.campaign, null);
    assert.notEqual(attr.campaign, "TEST_GCLID");
});

test("gad_campaignid is NOT automatically used as campaign", () => {
    const attr = getAttribution({ url: "http://localhost:8080/real-site/?gad_campaignid=11301910042" });

    assert.equal(attr.gad_campaignid, "11301910042");
    assert.equal(attr.campaign, null);
    assert.notEqual(attr.campaign, "11301910042");
});

// ═══════════════════════════════════════════════════════════════════════════════
// UTM + GCLID COEXISTENCE
// ═══════════════════════════════════════════════════════════════════════════════

test("UTM parameters and GCLID coexist — UTM provides campaign metadata", () => {
    const url = "http://localhost:8080/real-site/?utm_source=google&utm_medium=cpc&utm_campaign=summer&gclid=TEST_GCLID";
    const attr = getAttribution({ url });

    assert.equal(attr.channel, "Paid Search");
    assert.equal(attr.source, "google");
    assert.equal(attr.medium, "cpc");
    assert.equal(attr.campaign, "summer");
    assert.equal(attr.gclid, "TEST_GCLID");
});

test("Full UTM set + GCLID — all five UTM fields preserved alongside gclid", () => {
    const url = "http://localhost:8080/real-site/?utm_source=google&utm_medium=cpc&utm_campaign=summer&utm_content=ad1&utm_term=crm&gclid=TEST_GCLID";
    const attr = getAttribution({ url });

    assert.equal(attr.channel, "Paid Search");
    assert.equal(attr.source, "google");
    assert.equal(attr.medium, "cpc");
    assert.equal(attr.campaign, "summer");
    assert.equal(attr.content, "ad1");
    assert.equal(attr.term, "crm");
    assert.equal(attr.gclid, "TEST_GCLID");
});

// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE ORGANIC MUST NOT BECOME PAID
// ═══════════════════════════════════════════════════════════════════════════════

test("Google organic referrer without GCLID/GBRAID remains Organic Search", () => {
    const attr = getAttribution({
        url: "http://localhost:8080/real-site/",
        referrer: "https://www.google.com/",
    });

    assert.equal(attr.channel, "Organic Search");
    assert.equal(attr.source, null);
    assert.equal(attr.medium, null);
    assert.equal(attr.gclid, null);
    assert.equal(attr.gbraid, null);
    assert.notEqual(attr.channel, "Paid Search");
});

test("utm_source=google without paid medium or GCLID → Organic Search", () => {
    const attr = getAttribution({ url: "http://localhost:8080/real-site/?utm_source=google" });

    assert.equal(attr.channel, "Organic Search");
    assert.equal(attr.source, "google");
});

// ═══════════════════════════════════════════════════════════════════════════════
// FIRST-TOUCH PERSISTENCE WITH GCLID
// ═══════════════════════════════════════════════════════════════════════════════

test("GCLID first-touch is stored in localStorage", () => {
    const attr = initializeAttribution({ url: "http://localhost:8080/real-site/?gclid=TEST_GCLID" });

    assert.equal(attr.gclid, "TEST_GCLID");
    assert.equal(attr.channel, "Paid Search");

    const stored = getFirstTouch();
    assert.notEqual(stored, null);
    assert.equal(stored.gclid, "TEST_GCLID");
    assert.equal(stored.source, "google");
    assert.equal(stored.medium, "cpc");
    assert.equal(stored.channel, "Paid Search");
});

test("Direct visit does NOT overwrite GCLID first-touch", () => {
    initializeAttribution({ url: "http://localhost:8080/real-site/?gclid=TEST_GCLID" });

    const secondVisit = initializeAttribution({ url: "http://localhost:8080/real-site/", referrer: null });

    assert.equal(secondVisit.channel, "Paid Search");
    assert.equal(secondVisit.source, "google");
    assert.equal(secondVisit.medium, "cpc");
    assert.equal(secondVisit.gclid, "TEST_GCLID");
});

test("LinkedIn visit does NOT overwrite GCLID first-touch", () => {
    initializeAttribution({ url: "http://localhost:8080/real-site/?gclid=TEST_GCLID" });

    const linkedInVisit = initializeAttribution({
        url: "http://localhost:8080/real-site/?utm_source=linkedin",
        referrer: "https://www.linkedin.com/",
    });

    assert.equal(linkedInVisit.channel, "Paid Search");
    assert.equal(linkedInVisit.source, "google");
    assert.equal(linkedInVisit.medium, "cpc");
    assert.equal(linkedInVisit.gclid, "TEST_GCLID");
});

// ═══════════════════════════════════════════════════════════════════════════════
// FORM ATTRIBUTION WITH GCLID
// ═══════════════════════════════════════════════════════════════════════════════

test("Hidden form inputs receive gclid from first-touch attribution", () => {
    const attribution = {
        channel: "Paid Search",
        source: "google",
        medium: "cpc",
        campaign: null,
        content: null,
        term: null,
        gclid: "TEST_GCLID",
        gbraid: null,
        gad_campaignid: null,
        gad_source: null,
    };

    const inputs = [
        createInput("channel"),
        createInput("source"),
        createInput("medium"),
        createInput("gclid"),
    ];
    const form = createForm(inputs);

    populateForm(form, attribution);

    assert.equal(inputs[0].value, "Paid Search");
    assert.equal(inputs[1].value, "google");
    assert.equal(inputs[2].value, "cpc");
    assert.equal(inputs[3].value, "TEST_GCLID");
});

test("Dynamic form receives GCLID via MutationObserver", () => {
    const gclidAttribution = {
        channel: "Paid Search",
        source: "google",
        medium: "cpc",
        campaign: null,
        content: null,
        term: null,
        gclid: "DYNAMIC_TEST_GCLID",
        gbraid: null,
        gad_campaignid: null,
        gad_source: null,
    };

    saveFirstTouch(gclidAttribution);
    initializeFormAttribution();

    // Simulate a form being dynamically added
    const dynamicInputs = [
        createInput("channel"),
        createInput("source"),
        createInput("medium"),
        createInput("gclid"),
    ];
    const dynamicForm = createForm(dynamicInputs);
    dynamicForm.tagName = "FORM";
    dynamicForm.querySelectorAll = (sel) => {
        const match = sel.match(/^input\[name="([^"]+)"\]$/);
        if (!match) return [];
        return dynamicInputs.filter((i) => i.name === match[1]);
    };

    const observer = MockMutationObserver._last;
    observer.trigger([{
        addedNodes: [{
            nodeType: 1,
            tagName: "FORM",
            ...dynamicForm,
        }],
    }]);

    assert.equal(dynamicInputs.find((i) => i.name === "source").value, "google");
    assert.equal(dynamicInputs.find((i) => i.name === "channel").value, "Paid Search");
    assert.equal(dynamicInputs.find((i) => i.name === "medium").value, "cpc");
    assert.equal(dynamicInputs.find((i) => i.name === "gclid").value, "DYNAMIC_TEST_GCLID");

    disconnectFormAttribution();
});

// ═══════════════════════════════════════════════════════════════════════════════
// REALISTIC GOOGLE ADS URL
// ═══════════════════════════════════════════════════════════════════════════════

test("Realistic Google Ads URL — all identifiers captured, campaign not invented", () => {
    const url = "https://www.namecheap.com/?gad_source=1&gad_campaignid=11301910042&gbraid=TEST_GBRAID&gclid=TEST_GCLID";
    const attr = getAttribution({ url });

    assert.equal(attr.channel, "Paid Search");
    assert.equal(attr.source, "google");
    assert.equal(attr.medium, "cpc");
    assert.equal(attr.gclid, "TEST_GCLID");
    assert.equal(attr.gbraid, "TEST_GBRAID");
    assert.equal(attr.gad_campaignid, "11301910042");
    assert.equal(attr.gad_source, "1");
    assert.equal(attr.campaign, null);
});

// ═══════════════════════════════════════════════════════════════════════════════
// EMPTY VALUES & EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

test("Empty gclid parameter (?gclid=) is treated as absent — not Paid Search", () => {
    const attr = getAttribution({
        url: "http://localhost:8080/real-site/?gclid=",
        referrer: null,
    });

    // Empty gclid should be null, so no Google Ads detection
    assert.equal(attr.gclid, null);
    assert.equal(attr.channel, "Direct");
    assert.notEqual(attr.channel, "Paid Search");
});

test("Empty gbraid parameter (?gbraid=) is treated as absent — not Paid Search", () => {
    const attr = getAttribution({
        url: "http://localhost:8080/real-site/?gbraid=",
        referrer: null,
    });

    assert.equal(attr.gbraid, null);
    assert.equal(attr.channel, "Direct");
    assert.notEqual(attr.channel, "Paid Search");
});

test("Unknown parameters (?foo=bar) do not affect attribution", () => {
    const attr = getAttribution({
        url: "http://localhost:8080/real-site/?foo=bar&baz=qux",
        referrer: null,
    });

    assert.equal(attr.channel, "Direct");
    assert.equal(attr.source, null);
    assert.equal(attr.medium, null);
    assert.equal(attr.gclid, null);
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSIFIER-LEVEL GOOGLE ADS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

test("classifyTraffic with gclid parameter → Paid Search", () => {
    const result = classifyTraffic({ source: null, medium: null, referrer: null, gclid: "TEST_GCLID" });
    assert.equal(result, "Paid Search");
});

test("classifyTraffic with gbraid parameter → Paid Search", () => {
    const result = classifyTraffic({ source: null, medium: null, referrer: null, gbraid: "TEST_GBRAID" });
    assert.equal(result, "Paid Search");
});

test("classifyTraffic with gad_campaignid parameter → Paid Search", () => {
    const result = classifyTraffic({ source: null, medium: null, referrer: null, gad_campaignid: "123456" });
    assert.equal(result, "Paid Search");
});

test("classifyTraffic with gad_source parameter → Paid Search", () => {
    const result = classifyTraffic({ source: null, medium: null, referrer: null, gad_source: "1" });
    assert.equal(result, "Paid Search");
});

test("classifyTraffic with empty gclid → NOT Paid Search (falls through to Direct)", () => {
    const result = classifyTraffic({ source: null, medium: null, referrer: null, gclid: "" });
    assert.equal(result, "Direct");
});

test("classifyTraffic without any Google Ads params → existing rules apply", () => {
    // Google organic by source
    assert.equal(classifyTraffic({ source: "google", medium: null, referrer: null }), "Organic Search");
    // Paid Social
    assert.equal(classifyTraffic({ source: "facebook", medium: "paid_social", referrer: null }), "Paid Social");
    // Email
    assert.equal(classifyTraffic({ source: null, medium: "email", referrer: null }), "Email");
    // Display
    assert.equal(classifyTraffic({ source: null, medium: "display", referrer: null }), "Display");
    // Affiliate
    assert.equal(classifyTraffic({ source: null, medium: "affiliate", referrer: null }), "Affiliate");
    // Direct
    assert.equal(classifyTraffic({ source: null, medium: null, referrer: null }), "Direct");
});

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-PAGE PERSISTENCE WITH GCLID
// ═══════════════════════════════════════════════════════════════════════════════

test("GCLID first-touch persists across page navigation simulation", () => {
    // Visit 1: Landing from Google Ads
    initializeAttribution({ url: "http://localhost:8080/real-site/?gclid=FIRST_GOOGLE_AD" });

    // Visit 2: Internal navigation (no UTMs)
    const v2 = initializeAttribution({ url: "http://localhost:8080/real-site/second-page.html", referrer: "http://localhost:8080/real-site/" });
    assert.equal(v2.source, "google");
    assert.equal(v2.channel, "Paid Search");
    assert.equal(v2.gclid, "FIRST_GOOGLE_AD");

    // Visit 3: Back to main page
    const v3 = initializeAttribution({ url: "http://localhost:8080/real-site/", referrer: null });
    assert.equal(v3.source, "google");
    assert.equal(v3.channel, "Paid Search");
    assert.equal(v3.gclid, "FIRST_GOOGLE_AD");
});
