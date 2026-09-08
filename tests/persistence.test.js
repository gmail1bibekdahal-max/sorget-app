/**
 * tests/persistence.test.js
 *
 * Automated tests for Phase 2: First-Touch Persistence.
 * Verifies storage, immutability, multiple initializations, clear, and corrupted storage recovery.
 */

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { saveFirstTouch, getFirstTouch, clearFirstTouch } from "../src/storage.js";
import { initializeAttribution, getAttribution } from "../src/attribution.js";

// Mock localStorage implementation for Node test environment
function createMockStorage() {
    const store = new Map();
    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, String(value));
        },
        removeItem(key) {
            store.delete(key);
        },
        clear() {
            store.clear();
        }
    };
}

// Setup mock storage before each test
beforeEach(() => {
    globalThis.localStorage = createMockStorage();
});

// ── Test 1 — First visit stores attribution ──────────────────────────────────
test("Test 1 — First visit stores first-touch attribution", () => {
    clearFirstTouch();
    assert.equal(getFirstTouch(), null);

    const firstVisitUrl = "http://localhost:8080/test-site/?utm_source=google&utm_medium=cpc&utm_campaign=summer";
    const attribution = initializeAttribution({ url: firstVisitUrl });

    assert.equal(attribution.channel, "Paid Search");
    assert.equal(attribution.source, "google");
    assert.equal(attribution.medium, "cpc");
    assert.equal(attribution.campaign, "summer");

    // Stored attribution matches
    const stored = getFirstTouch();
    assert.notEqual(stored, null);
    assert.equal(stored.channel, "Paid Search");
    assert.equal(stored.source, "google");
    assert.equal(stored.medium, "cpc");
    assert.equal(stored.campaign, "summer");
});

// ── Test 2 — Second Direct visit does not overwrite ──────────────────────────
test("Test 2 — Second Direct visit does NOT overwrite first-touch attribution", () => {
    clearFirstTouch();

    // Visit 1: Google Ads
    initializeAttribution({
        url: "http://localhost:8080/test-site/?utm_source=google&utm_medium=cpc&utm_campaign=summer"
    });

    // Visit 2: Direct return (no UTM parameters, no referrer)
    const directVisitUrl = "http://localhost:8080/test-site/";
    const currentAttribution = getAttribution({ url: directVisitUrl, referrer: null });
    assert.equal(currentAttribution.channel, "Direct"); // Current visit is direct

    // But initializeAttribution MUST return the original first-touch
    const secondVisitResult = initializeAttribution({ url: directVisitUrl, referrer: null });
    assert.equal(secondVisitResult.channel, "Paid Search");
    assert.equal(secondVisitResult.source, "google");
    assert.equal(secondVisitResult.medium, "cpc");
    assert.equal(secondVisitResult.campaign, "summer");

    // And storage MUST still hold Paid Search
    const stored = getFirstTouch();
    assert.equal(stored.channel, "Paid Search");
    assert.equal(stored.source, "google");
    assert.equal(stored.medium, "cpc");
    assert.equal(stored.campaign, "summer");
});

// ── Test 3 — Third LinkedIn visit does not overwrite ─────────────────────────
test("Test 3 — Third LinkedIn visit does NOT overwrite first-touch attribution", () => {
    clearFirstTouch();

    // Visit 1: Google Ads
    initializeAttribution({
        url: "http://localhost:8080/test-site/?utm_source=google&utm_medium=cpc&utm_campaign=summer"
    });

    // Visit 2: Direct
    initializeAttribution({ url: "http://localhost:8080/test-site/", referrer: null });

    // Visit 3: Arrives from LinkedIn
    const linkedInUrl = "http://localhost:8080/test-site/?utm_source=linkedin";
    const thirdVisitResult = initializeAttribution({ url: linkedInUrl });

    // Must STILL be Paid Search from Visit 1
    assert.equal(thirdVisitResult.channel, "Paid Search");
    assert.equal(thirdVisitResult.source, "google");
    assert.equal(thirdVisitResult.medium, "cpc");
    assert.equal(thirdVisitResult.campaign, "summer");

    const stored = getFirstTouch();
    assert.equal(stored.channel, "Paid Search");
    assert.equal(stored.source, "google");
});

// ── Test 4 — Multiple initialization calls ───────────────────────────────────
test("Test 4 — Multiple initializeAttribution() calls return the same first-touch data", () => {
    clearFirstTouch();

    const url = "http://localhost:8080/test-site/?utm_source=facebook&utm_medium=paid_social&utm_campaign=fall";
    const res1 = initializeAttribution({ url });
    const res2 = initializeAttribution({ url: "http://localhost:8080/test-site/?utm_source=bing" });
    const res3 = initializeAttribution({ url: "http://localhost:8080/test-site/" });

    assert.deepEqual(res1, res2);
    assert.deepEqual(res2, res3);
    assert.equal(res3.channel, "Paid Social");
    assert.equal(res3.source, "facebook");
});

// ── Test 5 — Clear first-touch ───────────────────────────────────────────────
test("Test 5 — clearFirstTouch() removes stored attribution", () => {
    clearFirstTouch();

    saveFirstTouch({
        channel: "Paid Search",
        source: "google",
        medium: "cpc"
    });
    assert.notEqual(getFirstTouch(), null);

    clearFirstTouch();
    assert.equal(getFirstTouch(), null);
});

// ── Test 6 — Corrupted storage safely handled ────────────────────────────────
test("Test 6 — Corrupted/invalid JSON in storage does not crash and recovers safely", () => {
    // Put malformed JSON directly into localStorage
    globalThis.localStorage.setItem("attributer_first_touch", "{invalid-json: missing quotes");

    // getFirstTouch() should not throw, should clean up corrupted key, and return null
    assert.doesNotThrow(() => {
        const result = getFirstTouch();
        assert.equal(result, null);
    });

    // Verify key was cleaned up
    assert.equal(globalThis.localStorage.getItem("attributer_first_touch"), null);

    // Engine can now record a fresh, valid first-touch
    const freshUrl = "http://localhost:8080/test-site/?utm_source=twitter";
    const freshAttribution = initializeAttribution({ url: freshUrl });
    assert.equal(freshAttribution.channel, "Organic Social");
    assert.equal(freshAttribution.source, "twitter");

    // Storage now contains valid record
    const stored = getFirstTouch();
    assert.equal(stored.channel, "Organic Social");
    assert.equal(stored.source, "twitter");
});

test("Test 7 — Non-object JSON primitive in storage is treated as corrupted and cleaned up", () => {
    globalThis.localStorage.setItem("attributer_first_touch", "12345");

    const result = getFirstTouch();
    assert.equal(result, null);
    assert.equal(globalThis.localStorage.getItem("attributer_first_touch"), null);
});
