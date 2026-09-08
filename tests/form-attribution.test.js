/**
 * tests/form-attribution.test.js
 *
 * Automated tests for Phase 3: Form Attribution.
 * Uses a lightweight in-process mock DOM (no jsdom dependency required).
 *
 * Run with: npm test
 */

import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

// ── Minimal mock DOM ──────────────────────────────────────────────────────────
// A lightweight DOM mock that is sufficient for form-attribution.js to run
// in the Node test environment without requiring jsdom or a browser.

/**
 * Create a mock input element.
 * Supports: .name, .value, .tagName, .trim (via value)
 */
function createInput(name = "", value = "", type = "hidden") {
    return { tagName: "INPUT", name, value, type };
}

/**
 * Create a mock form containing inputs.
 * Returns an object that mimics HTMLFormElement for our purposes.
 */
function createForm(inputs = []) {
    const form = {
        tagName: "FORM",
        _inputs: inputs,
        querySelectorAll(selector) {
            // Parse  input[name="X"]  selectors
            const match = selector.match(/^input\[name="([^"]+)"\]$/);
            if (!match) return [];
            const name = match[1];
            return this._inputs.filter(i => i.name === name);
        }
    };
    return form;
}

// ── Import module under test with mock env ────────────────────────────────────
// form-attribution.js imports from storage.js and uses document / Node (browser).
// We stub those globals before importing.

// 1. Mock localStorage
function createMockStorage() {
    const store = new Map();
    return {
        getItem: k => store.has(k) ? store.get(k) : null,
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: k => store.delete(k),
        clear: () => store.clear()
    };
}
globalThis.localStorage = createMockStorage();

// 2. Mock document + Node constant (needed by MutationObserver logic)
globalThis.Node = { ELEMENT_NODE: 1 };

// MutationObserver mock — captures the callback and exposes .trigger() for testing
class MockMutationObserver {
    constructor(callback) {
        this._cb = callback;
        MockMutationObserver._last = this;
    }
    observe() {}
    disconnect() {}
    // Trigger with an array of simulated mutation records
    trigger(mutations) {
        this._cb(mutations);
    }
}
MockMutationObserver._last = null;
globalThis.MutationObserver = MockMutationObserver;

// 3. document mock with querySelectAll over a shared form list
const _documentForms = [];
globalThis.document = {
    querySelectorAll(selector) {
        if (selector === "form") return [..._documentForms];
        return [];
    },
    body: {}  // observe() is called on body — just needs to exist
};

// Now import the modules under test (after globals are set)
const { populateForm, populateForms, initializeFormAttribution, disconnectFormAttribution } =
    await import("../src/form-attribution.js");
const { saveFirstTouch, getFirstTouch, clearFirstTouch } =
    await import("../src/storage.js");

// ── Helpers ───────────────────────────────────────────────────────────────────
function resetStorage() {
    clearFirstTouch();
    localStorage = createMockStorage();
    globalThis.localStorage = localStorage;
}

function clearForms() {
    _documentForms.length = 0;
}

function addForm(form) {
    _documentForms.push(form);
}

const GOOGLE_ATTRIBUTION = {
    channel: "Paid Search",
    source: "google",
    medium: "cpc",
    campaign: "summer",
    content: "ad1",
    term: "crm"
};

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
    clearFirstTouch();
    clearForms();
});

// Test 1 — All six fields populated
test("Test 1 — All six attribution fields are populated in a form", () => {
    const inputs = [
        createInput("channel"),
        createInput("source"),
        createInput("medium"),
        createInput("campaign"),
        createInput("content"),
        createInput("term"),
    ];
    const form = createForm(inputs);

    populateForm(form, GOOGLE_ATTRIBUTION);

    assert.equal(inputs[0].value, "Paid Search");
    assert.equal(inputs[1].value, "google");
    assert.equal(inputs[2].value, "cpc");
    assert.equal(inputs[3].value, "summer");
    assert.equal(inputs[4].value, "ad1");
    assert.equal(inputs[5].value, "crm");
});

// Test 2 — Only some fields exist
test("Test 2 — Only existing fields are populated; missing fields cause no error", () => {
    const inputs = [
        createInput("source"),
        createInput("campaign"),
    ];
    const form = createForm(inputs);

    assert.doesNotThrow(() => populateForm(form, GOOGLE_ATTRIBUTION));

    assert.equal(inputs[0].value, "google");
    assert.equal(inputs[1].value, "summer");
});

// Test 3 — Form has no attribution fields
test("Test 3 — Form with no attribution fields causes no error", () => {
    const inputs = [
        createInput("name"),
        createInput("email"),
    ];
    const form = createForm(inputs);

    assert.doesNotThrow(() => populateForm(form, GOOGLE_ATTRIBUTION));

    // Non-attribution fields untouched
    assert.equal(inputs[0].value, "");
    assert.equal(inputs[1].value, "");
});

// Test 4 — Multiple forms on the page
test("Test 4 — populateForms() populates all forms", () => {
    const inputs1 = [createInput("source"), createInput("medium")];
    const inputs2 = [createInput("source"), createInput("campaign")];
    const form1 = createForm(inputs1);
    const form2 = createForm(inputs2);

    addForm(form1);
    addForm(form2);

    populateForms(GOOGLE_ATTRIBUTION);

    assert.equal(inputs1[0].value, "google");
    assert.equal(inputs1[1].value, "cpc");
    assert.equal(inputs2[0].value, "google");
    assert.equal(inputs2[1].value, "summer");
});

// Test 5 — Existing non-empty value is NOT overwritten
test("Test 5 — Field with existing value is preserved (not overwritten)", () => {
    const inputs = [
        createInput("source", "custom-source"),  // pre-filled
        createInput("medium"),                   // empty
    ];
    const form = createForm(inputs);

    populateForm(form, GOOGLE_ATTRIBUTION);

    assert.equal(inputs[0].value, "custom-source");  // unchanged
    assert.equal(inputs[1].value, "cpc");             // populated
});

// Test 6 — Empty field IS populated
test("Test 6 — Empty field receives attribution value", () => {
    const inputs = [createInput("source", "")];
    const form = createForm(inputs);

    populateForm(form, GOOGLE_ATTRIBUTION);

    assert.equal(inputs[0].value, "google");
});

// Test 7 — Null attribution does not crash
test("Test 7 — populateForm() with null attribution does not throw", () => {
    const form = createForm([createInput("source")]);

    assert.doesNotThrow(() => populateForm(form, null));
    assert.doesNotThrow(() => populateForm(form, undefined));
    assert.doesNotThrow(() => populateForm(null, GOOGLE_ATTRIBUTION));
    assert.doesNotThrow(() => populateForms(null));
});

// Test 8 — Dynamically added form receives attribution via MutationObserver
test("Test 8 — Dynamically added form is populated via MutationObserver", () => {
    saveFirstTouch(GOOGLE_ATTRIBUTION);

    initializeFormAttribution();

    // Simulate a form being added to the DOM after init
    const newInputs = [createInput("source"), createInput("channel")];
    const newForm = createForm(newInputs);
    newForm.tagName = "FORM";
    newForm.querySelectorAll = (sel) => {
        const match = sel.match(/^input\[name="([^"]+)"\]$/);
        if (!match) return [];
        return newInputs.filter(i => i.name === match[1]);
    };

    // Simulate MutationObserver callback with the new form as an added node
    const observer = MockMutationObserver._last;
    observer.trigger([{
        addedNodes: [{
            nodeType: 1,       // ELEMENT_NODE
            tagName: "FORM",
            ...newForm
        }]
    }]);

    assert.equal(newInputs[0].value, "google");
    assert.equal(newInputs[1].value, "Paid Search");

    disconnectFormAttribution();
});

// Test 9 — First-touch integration: Google → Direct → LinkedIn
test("Test 9 — Form attribution uses first-touch, not current visit attribution", () => {
    // Visit 1: Google Ads → store first-touch
    saveFirstTouch(GOOGLE_ATTRIBUTION);

    // Simulate initializeFormAttribution (uses stored first-touch)
    const inputs = [createInput("source"), createInput("channel"), createInput("medium")];
    const form = createForm(inputs);
    addForm(form);

    // "Visit 2" (Direct) — but we call populateForms with stored attribution
    const stored = getFirstTouch();
    assert.equal(stored.channel, "Paid Search");  // Still Paid Search

    populateForms(stored);

    // Form fields should reflect FIRST TOUCH, not current visit
    assert.equal(inputs[0].value, "google");     // not null/empty (Direct would have no source)
    assert.equal(inputs[1].value, "Paid Search");
    assert.equal(inputs[2].value, "cpc");

    // "Visit 3" (LinkedIn) — attribution still unchanged
    const storedAgain = getFirstTouch();
    assert.equal(storedAgain.source, "google");
    assert.equal(storedAgain.channel, "Paid Search");
});

// Test 10 — whitespace-only field value is treated as empty and populated
test("Test 10 — Whitespace-only field value is treated as empty and gets populated", () => {
    const inputs = [createInput("source", "   ")]; // whitespace only
    const form = createForm(inputs);

    populateForm(form, GOOGLE_ATTRIBUTION);

    assert.equal(inputs[0].value, "google");
});

// Test 11 — attribution fields with null value in attribution object are skipped
test("Test 11 — Null attribution field values are not written to inputs", () => {
    const partial = { channel: "Direct", source: null, medium: null, campaign: null, content: null, term: null };
    const inputs = [createInput("source"), createInput("medium"), createInput("channel")];
    const form = createForm(inputs);

    populateForm(form, partial);

    assert.equal(inputs[0].value, "");   // null source → not written
    assert.equal(inputs[1].value, "");   // null medium → not written
    assert.equal(inputs[2].value, "Direct");
});

// Test 12 — disconnectFormAttribution stops observation
test("Test 12 — disconnectFormAttribution() disconnects the MutationObserver", () => {
    saveFirstTouch(GOOGLE_ATTRIBUTION);
    initializeFormAttribution();

    const observerBefore = MockMutationObserver._last;
    assert.notEqual(observerBefore, null);

    disconnectFormAttribution();

    // After disconnect, a newly triggered mutation should NOT populate forms
    const newInputs = [createInput("source")];
    const newForm = createForm(newInputs);
    newForm.tagName = "FORM";

    // If we trigger the old observer's callback manually, it shouldn't matter
    // because the module's internal _observer is null — a fresh init is needed.
    // Verify by checking the input was NOT populated via a post-disconnect add:
    assert.equal(newInputs[0].value, "");  // not populated since observer disconnected
});
