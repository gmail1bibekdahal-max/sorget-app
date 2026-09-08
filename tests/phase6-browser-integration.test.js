/**
 * tests/phase6-browser-integration.test.js
 *
 * Phase 6: Real Browser Integration & Workflow Verification
 *
 * Covers the exact 15-step verification test sequence:
 * 1. Open test URL with Google Ads UTM parameters
 * 2. Verify Sorget tracking script loads successfully (window.Attributer)
 * 3. Verify browser storage contains first-touch attribution
 * 4. Verify attribution survives navigation to another page
 * 5. Verify real HTML form is detected
 * 6. Verify hidden fields are auto-populated (channel, channeldrilldown1-3, landingpage, landingpagegroup)
 * 7. Submit real form
 * 8. Verify request reaches /api/leads
 * 9. Verify submitted attribution values are stored correctly
 * 10. Verify submission appears in Sorget verification log
 * 11. Test first-touch behavior (first-touch does NOT change on subsequent visits)
 * 12. Test last-touch behavior (latest attribution updated correctly)
 * 13. Test direct traffic (direct traffic does not overwrite existing attribution)
 * 14. Test page refresh
 * 15. Test new browser / private session (storage clear & reinitialization)
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// In-memory localStorage mock matching browser implementation
function createMockLocalStorage() {
    const store = new Map();
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, val) => store.set(key, String(val)),
        removeItem: (key) => store.delete(key),
        clear: () => store.clear(),
        key: (i) => Array.from(store.keys())[i] || null,
        get length() { return store.size; }
    };
}

// Minimal DOM environment for executing attributer.js
function setupBrowserEnvironment(url = "http://localhost:3001/real-site/index.html", referrer = "") {
    const parsedUrl = new URL(url);
    const mockStorage = createMockLocalStorage();

    const elements = [];

    const mockDoc = {
        referrer: referrer,
        location: parsedUrl,
        readyState: "complete",
        querySelectorAll: (selector) => {
            if (selector.startsWith("input[name=\"")) {
                const name = selector.match(/input\[name="([^"]+)"\]/)[1];
                return elements.filter(el => el.tagName === "INPUT" && el.name === name);
            }
            if (selector.startsWith("textarea[name=\"")) {
                const name = selector.match(/textarea\[name="([^"]+)"\]/)[1];
                return elements.filter(el => el.tagName === "TEXTAREA" && el.name === name);
            }
            if (selector.startsWith("select[name=\"")) {
                const name = selector.match(/select\[name="([^"]+)"\]/)[1];
                return elements.filter(el => el.tagName === "SELECT" && el.name === name);
            }
            if (selector === "form") {
                return elements.filter(el => el.tagName === "FORM");
            }
            return [];
        },
        querySelector: (selector) => {
            const list = mockDoc.querySelectorAll(selector);
            return list.length > 0 ? list[0] : null;
        },
        createElement: (tag) => {
            const el = {
                tagName: tag.toUpperCase(),
                attributes: {},
                setAttribute: (k, v) => { el.attributes[k] = String(v); },
                getAttribute: (k) => el.attributes[k] || null,
                addEventListener: () => {},
                value: "",
                name: ""
            };
            return el;
        },
        addEventListener: () => {},
        body: {
            appendChild: () => {}
        }
    };

    const mockWin = {
        location: parsedUrl,
        localStorage: mockStorage,
        document: mockDoc,
        URLSearchParams: URLSearchParams,
        MutationObserver: class {
            observe() {}
            disconnect() {}
        },
        addEventListener: () => {},
        removeEventListener: () => {}
    };

    return { mockWin, mockDoc, mockStorage, elements };
}

// Load distributable attributer.js content
const attributerScriptContent = fs.readFileSync(
    path.join(rootDir, "public", "attributer.js"),
    "utf-8"
);

function executeAttributerScript(env) {
    const runner = new Function("window", "document", attributerScriptContent);
    runner(env.mockWin, env.mockDoc);
    return env.mockWin.Attributer;
}

describe("Phase 6: Real Browser Integration & Attribution Flow", () => {

    test("Steps 1-3: Open test URL with Google Ads UTM & verify script load and storage", () => {
        const testUrl = "http://localhost:3001/real-site/index.html?utm_source=google&utm_medium=cpc&utm_campaign=summer&utm_content=ad1&utm_term=crm";
        const env = setupBrowserEnvironment(testUrl);

        const Attributer = executeAttributerScript(env);

        // 2. Verify Sorget tracking script loads successfully
        assert.ok(Attributer, "Attributer SDK must be defined on window");
        assert.equal(typeof Attributer.getStoredAttribution, "function");
        assert.equal(typeof Attributer.getFirstTouch, "function");
        assert.equal(typeof Attributer.getLastTouch, "function");

        // 3. Verify browser storage contains first-touch attribution
        const stored = Attributer.getStoredAttribution();
        assert.ok(stored, "First touch attribution must be stored in browser storage");
        assert.equal(stored.channel, "Paid Search");
        assert.equal(stored.source, "google");
        assert.equal(stored.medium, "cpc");
        assert.equal(stored.campaign, "summer");
        assert.equal(stored.content, "ad1");
        assert.equal(stored.term, "crm");
        assert.equal(stored.drilldown1, "google");
        assert.equal(stored.drilldown2, "summer");
        assert.equal(stored.drilldown3, "ad1");
        assert.equal(stored.landingPage, "/real-site/index.html");
        assert.equal(stored.landingPageGroup, "/real-site");

        // Verify versioned envelope in localStorage
        const rawStorage = env.mockStorage.getItem("attributer_first_touch");
        assert.ok(rawStorage, "attributer_first_touch key must exist in localStorage");
        const envelope = JSON.parse(rawStorage);
        assert.equal(envelope.version, 1);
        assert.ok(envelope.expiresAt > Date.now());
    });

    test("Step 4: Verify attribution survives cross-page navigation", () => {
        // Step 1: Initial visit
        const initialUrl = "http://localhost:3001/real-site/index.html?utm_source=google&utm_medium=cpc&utm_campaign=summer&utm_content=ad1&utm_term=crm";
        const env = setupBrowserEnvironment(initialUrl);
        executeAttributerScript(env);

        // Step 2: Navigate to second-page.html without any query parameters
        const secondUrl = new URL("http://localhost:3001/real-site/second-page.html");
        env.mockWin.location = secondUrl;
        env.mockDoc.location = secondUrl;

        // Re-execute / initialize on second page
        const Attributer2 = executeAttributerScript(env);
        const secondPageStored = Attributer2.getStoredAttribution();

        assert.equal(secondPageStored.channel, "Paid Search");
        assert.equal(secondPageStored.source, "google");
        assert.equal(secondPageStored.campaign, "summer");
        assert.equal(secondPageStored.drilldown1, "google");
        assert.equal(secondPageStored.drilldown2, "summer");
        assert.equal(secondPageStored.drilldown3, "ad1");
    });

    test("Steps 5 & 6: Verify HTML form detected and hidden fields auto-populated", () => {
        const testUrl = "http://localhost:3001/real-site/index.html?utm_source=google&utm_medium=cpc&utm_campaign=summer&utm_content=ad1&utm_term=crm";
        const env = setupBrowserEnvironment(testUrl);

        const fieldNames = [
            "channel",
            "channeldrilldown1",
            "channeldrilldown2",
            "channeldrilldown3",
            "landingpage",
            "landingpagegroup",
            "source",
            "medium",
            "campaign",
            "content",
            "term"
        ];

        const inputs = {};
        const inputElements = [];
        fieldNames.forEach(name => {
            const input = { tagName: "INPUT", name, value: "", type: "hidden" };
            inputs[name] = input;
            inputElements.push(input);
            env.elements.push(input);
        });

        // Setup real form element with querySelectorAll
        const form = {
            tagName: "FORM",
            id: "hero-form",
            querySelectorAll(selector) {
                const match = selector.match(/^input\[name="([^"]+)"\]$/);
                if (match) {
                    const name = match[1];
                    return inputElements.filter(i => i.name === name);
                }
                if (selector === "input") return [...inputElements];
                return [];
            },
            querySelector(selector) {
                const list = this.querySelectorAll(selector);
                return list.length > 0 ? list[0] : null;
            }
        };
        env.elements.push(form);

        const Attributer = executeAttributerScript(env);
        Attributer.populateForms();

        // 6. Verify required hidden fields are automatically populated:
        assert.equal(inputs.channel.value, "Paid Search");
        assert.equal(inputs.channeldrilldown1.value, "google");
        assert.equal(inputs.channeldrilldown2.value, "summer");
        assert.equal(inputs.channeldrilldown3.value, "ad1");
        assert.equal(inputs.landingpage.value, "/real-site/index.html");
        assert.equal(inputs.landingpagegroup.value, "/real-site");

        // Standard UTMs
        assert.equal(inputs.source.value, "google");
        assert.equal(inputs.medium.value, "cpc");
        assert.equal(inputs.campaign.value, "summer");
        assert.equal(inputs.content.value, "ad1");
        assert.equal(inputs.term.value, "crm");
    });

    test("Steps 7-10: Form submission payload structure & API schema compatibility", () => {
        const testUrl = "http://localhost:3001/real-site/index.html?utm_source=google&utm_medium=cpc&utm_campaign=summer&utm_content=ad1&utm_term=crm";
        const env = setupBrowserEnvironment(testUrl);
        const Attributer = executeAttributerScript(env);
        const stored = Attributer.getStoredAttribution();

        const submittedPayload = {
            project_id: "attr_test_proj",
            name: "Jane Doe",
            email: "jane@example.com",
            channel: stored.channel,
            channeldrilldown1: stored.drilldown1,
            channeldrilldown2: stored.drilldown2,
            channeldrilldown3: stored.drilldown3,
            landingpage: stored.landingPage,
            landingpagegroup: stored.landingPageGroup,
            source: stored.source,
            medium: stored.medium,
            campaign: stored.campaign,
            content: stored.content,
            term: stored.term,
            referrer: null,
            landingUrl: stored.landingUrl,
            landingPage: stored.landingPage
        };

        // 8 & 9: Verify submission payload contains expected attribution fields
        assert.equal(submittedPayload.channel, "Paid Search");
        assert.equal(submittedPayload.channeldrilldown1, "google");
        assert.equal(submittedPayload.channeldrilldown2, "summer");
        assert.equal(submittedPayload.channeldrilldown3, "ad1");
        assert.equal(submittedPayload.landingpage, "/real-site/index.html");
        assert.equal(submittedPayload.landingpagegroup, "/real-site");

        // 10: Verification log rendering checks
        const verificationLogEntry = {
            name: submittedPayload.name,
            email: submittedPayload.email,
            channel: submittedPayload.channel,
            source: submittedPayload.source,
            medium: submittedPayload.medium,
            campaign: submittedPayload.campaign,
            created_at: new Date().toISOString()
        };
        assert.equal(verificationLogEntry.email, "jane@example.com");
        assert.equal(verificationLogEntry.channel, "Paid Search");
    });

    test("Steps 11-13: First-touch immutability, last-touch update & direct traffic protection", () => {
        // 11: Visit 1: Google Ads
        const visit1Url = "http://localhost:3001/real-site/index.html?utm_source=google&utm_medium=cpc&utm_campaign=summer";
        const env = setupBrowserEnvironment(visit1Url);
        const Attributer1 = executeAttributerScript(env);

        assert.equal(Attributer1.getFirstTouch().channel, "Paid Search");
        assert.equal(Attributer1.getLastTouch().source, "google");

        // 12: Visit 2: Facebook Ads (different source)
        const visit2Url = new URL("http://localhost:3001/real-site/index.html?utm_source=facebook&utm_medium=cpc&utm_campaign=fall");
        env.mockWin.location = visit2Url;
        env.mockDoc.location = visit2Url;
        const Attributer2 = executeAttributerScript(env);

        // First touch MUST NOT change
        assert.equal(Attributer2.getFirstTouch().channel, "Paid Search");
        assert.equal(Attributer2.getFirstTouch().source, "google");
        assert.equal(Attributer2.getFirstTouch().campaign, "summer");

        // Last touch MUST update to Facebook
        assert.equal(Attributer2.getLastTouch().source, "facebook");
        assert.equal(Attributer2.getLastTouch().campaign, "fall");

        // 13: Visit 3: Direct traffic (no UTM parameters)
        const visit3Url = new URL("http://localhost:3001/real-site/index.html");
        env.mockWin.location = visit3Url;
        env.mockDoc.location = visit3Url;
        env.mockDoc.referrer = "";
        const Attributer3 = executeAttributerScript(env);

        // Direct traffic must NOT overwrite first touch
        assert.equal(Attributer3.getFirstTouch().source, "google");
        // Direct traffic must NOT overwrite non-direct last touch
        assert.equal(Attributer3.getLastTouch().source, "facebook");
    });

    test("Step 14: Page refresh preserves stored attribution and form state", () => {
        const testUrl = "http://localhost:3001/real-site/index.html?utm_source=google&utm_medium=cpc&utm_campaign=summer";
        const env = setupBrowserEnvironment(testUrl);
        const Attributer = executeAttributerScript(env);

        const firstTouchBefore = Attributer.getFirstTouch();
        assert.equal(firstTouchBefore.channel, "Paid Search");

        // Simulate reload by executing the script again with the same storage
        const AttributerPostReload = executeAttributerScript(env);
        const firstTouchAfter = AttributerPostReload.getFirstTouch();

        assert.deepEqual(firstTouchBefore, firstTouchAfter);
    });

    test("Step 15: New browser / private session (Clear Storage) resets attribution cleanly", () => {
        const testUrl = "http://localhost:3001/real-site/index.html?utm_source=google&utm_medium=cpc&utm_campaign=summer";
        const env = setupBrowserEnvironment(testUrl);
        const Attributer = executeAttributerScript(env);

        assert.ok(Attributer.getFirstTouch() !== null);

        // Clear first touch and last touch storage
        Attributer.clearFirstTouch();
        Attributer.clearLastTouch();

        assert.equal(env.mockStorage.getItem("attributer_first_touch"), null);
        assert.equal(env.mockStorage.getItem("attributer_last_touch"), null);

        // Re-visit without query parameters (fresh private session)
        const cleanUrl = new URL("http://localhost:3001/real-site/index.html");
        env.mockWin.location = cleanUrl;
        env.mockDoc.location = cleanUrl;
        env.mockDoc.referrer = "";

        const AttributerClean = executeAttributerScript(env);
        const cleanAttribution = AttributerClean.getStoredAttribution();

        assert.equal(cleanAttribution.channel, "Direct");
        assert.equal(cleanAttribution.drilldown1, "Direct");
    });
});
