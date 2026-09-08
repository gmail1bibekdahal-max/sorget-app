/**
 * tests/real-site.test.js
 *
 * Automated tests for Phase 4: Real-Site Integration Testing.
 * Validates the distributable script, real-site HTML structure, UTM capture,
 * form population, form submission payload, dynamic form mutation handling,
 * and cross-page first-touch immutability.
 *
 * Run with: npm test
 */

import { test, beforeEach, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// ── Minimal DOM mock for the standalone distributable script ──────────────────

function createMockStorage() {
    const store = new Map();
    return {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
    };
}

class MockMutationObserver {
    constructor(callback) {
        this._cb = callback;
        MockMutationObserver._last = this;
    }
    observe() {}
    disconnect() {}
    trigger(mutations) {
        this._cb(mutations);
    }
}
MockMutationObserver._last = null;

function createInput(name = "", value = "", type = "hidden") {
    return { tagName: "INPUT", name, value, type };
}

function createForm(id = "", inputs = []) {
    const form = {
        id,
        tagName: "FORM",
        _inputs: inputs,
        querySelectorAll(selector) {
            const match = selector.match(/^input\[name="([^"]+)"\]$/);
            if (match) {
                const name = match[1];
                return this._inputs.filter((i) => i.name === name);
            }
            if (selector === "input") return [...this._inputs];
            return [];
        },
        querySelector(selector) {
            const list = this.querySelectorAll(selector);
            return list.length > 0 ? list[0] : null;
        },
    };
    return form;
}

// ── HTML File Static Inspection Tests ─────────────────────────────────────────

test("Phase 4 — Step 2 & 11: Real-site does not import internal src/ modules", () => {
    const indexHtml = fs.readFileSync(path.join(rootDir, "real-site", "index.html"), "utf-8");
    const secondPageHtml = fs.readFileSync(path.join(rootDir, "real-site", "second-page.html"), "utf-8");

    // Must NOT contain direct imports to internal src modules
    assert.doesNotMatch(indexHtml, /src\/attribution\.js/);
    assert.doesNotMatch(indexHtml, /src\/storage\.js/);
    assert.doesNotMatch(indexHtml, /src\/classifier\.js/);
    assert.doesNotMatch(indexHtml, /src\/form-attribution\.js/);

    assert.doesNotMatch(secondPageHtml, /src\/attribution\.js/);
    assert.doesNotMatch(secondPageHtml, /src\/storage\.js/);
    assert.doesNotMatch(secondPageHtml, /src\/classifier\.js/);
    assert.doesNotMatch(secondPageHtml, /src\/form-attribution\.js/);
});

test("Phase 4 — Step 1 & 4: Real-site loads public distributable script", () => {
    const indexHtml = fs.readFileSync(path.join(rootDir, "real-site", "index.html"), "utf-8");
    const secondPageHtml = fs.readFileSync(path.join(rootDir, "real-site", "second-page.html"), "utf-8");

    assert.match(indexHtml, /<script[^>]*src=["'][^"']*attributer\.js["'][^>]*>/);
    assert.match(secondPageHtml, /<script[^>]*src=["'][^"']*attributer\.js["'][^>]*>/);
});

test("Phase 4 — Step 3 & 6: Real-site forms contain hidden attribution fields", () => {
    const indexHtml = fs.readFileSync(path.join(rootDir, "real-site", "index.html"), "utf-8");
    const secondPageHtml = fs.readFileSync(path.join(rootDir, "real-site", "second-page.html"), "utf-8");

    const requiredFields = ["channel", "source", "medium", "campaign", "content", "term"];
    for (const field of requiredFields) {
        assert.ok(
            indexHtml.includes(`name="${field}"`),
            `real-site/index.html missing hidden field: ${field}`
        );
        assert.ok(
            secondPageHtml.includes(`name="${field}"`),
            `real-site/second-page.html missing hidden field: ${field}`
        );
    }
});

// ── Distributable Script Functional & Integration Tests ───────────────────────

test("Phase 4 — Step 1: Distributable script executes and exposes window.Attributer", async () => {
    const mockStorage = createMockStorage();
    const mockForms = [];

    const mockWindow = {
        location: new URL("http://localhost:8080/real-site/?utm_source=google&utm_medium=cpc&utm_campaign=summer"),
        localStorage: mockStorage,
    };

    const mockDocument = {
        referrer: "",
        readyState: "complete",
        location: mockWindow.location,
        body: {},
        querySelectorAll(sel) {
            if (sel === "form") return mockForms;
            return [];
        },
        addEventListener() {},
    };

    // Load and execute root attributer.js code in sandbox context
    const scriptCode = fs.readFileSync(path.join(rootDir, "attributer.js"), "utf-8");
    const runner = new Function(
        "window",
        "document",
        "MutationObserver",
        "Node",
        "URL",
        scriptCode
    );

    runner(
        mockWindow,
        mockDocument,
        MockMutationObserver,
        { ELEMENT_NODE: 1 },
        URL
    );

    assert.ok(mockWindow.Attributer, "window.Attributer should be defined");
    assert.equal(typeof mockWindow.Attributer.getAttribution, "function");
    assert.equal(typeof mockWindow.Attributer.getStoredAttribution, "function");
    assert.equal(typeof mockWindow.Attributer.populateForm, "function");
    assert.equal(typeof mockWindow.Attributer.populateForms, "function");
    assert.equal(typeof mockWindow.Attributer.clearFirstTouch, "function");
});

test("Phase 4 — Steps 5, 6, 7: UTM Detection, Hidden Field Population & Submission Payload", () => {
    const mockStorage = createMockStorage();

    const heroFormInputs = [
        createInput("name", "John", "text"),
        createInput("email", "john@example.com", "email"),
        createInput("company", "Example Company", "text"),
        createInput("channel", "", "hidden"),
        createInput("source", "", "hidden"),
        createInput("medium", "", "hidden"),
        createInput("campaign", "", "hidden"),
        createInput("content", "", "hidden"),
        createInput("term", "", "hidden"),
    ];
    const heroForm = createForm("hero-form", heroFormInputs);
    const mockForms = [heroForm];

    const mockWindow = {
        location: new URL("http://localhost:8080/real-site/?utm_source=google&utm_medium=cpc&utm_campaign=summer"),
        localStorage: mockStorage,
    };

    const mockDocument = {
        referrer: "",
        readyState: "complete",
        location: mockWindow.location,
        body: {},
        querySelectorAll(sel) {
            if (sel === "form") return mockForms;
            return [];
        },
        addEventListener() {},
    };

    const scriptCode = fs.readFileSync(path.join(rootDir, "attributer.js"), "utf-8");
    const runner = new Function("window", "document", "MutationObserver", "Node", "URL", scriptCode);
    runner(mockWindow, mockDocument, MockMutationObserver, { ELEMENT_NODE: 1 }, URL);

    // Verify first-touch stored in localStorage (Step 5)
    const stored = mockWindow.Attributer.getStoredAttribution();
    assert.notEqual(stored, null);
    assert.equal(stored.channel, "Paid Search");
    assert.equal(stored.source, "google");
    assert.equal(stored.medium, "cpc");
    assert.equal(stored.campaign, "summer");

    // Verify hidden form inputs are auto-populated (Step 6)
    const channelInput = heroFormInputs.find((i) => i.name === "channel");
    const sourceInput = heroFormInputs.find((i) => i.name === "source");
    const mediumInput = heroFormInputs.find((i) => i.name === "medium");
    const campaignInput = heroFormInputs.find((i) => i.name === "campaign");

    assert.equal(channelInput.value, "Paid Search");
    assert.equal(sourceInput.value, "google");
    assert.equal(mediumInput.value, "cpc");
    assert.equal(campaignInput.value, "summer");

    // Verify form submission payload (Step 7)
    const submissionPayload = {};
    for (const input of heroFormInputs) {
        submissionPayload[input.name] = input.value;
    }

    assert.deepEqual(submissionPayload, {
        name: "John",
        email: "john@example.com",
        company: "Example Company",
        channel: "Paid Search",
        source: "google",
        medium: "cpc",
        campaign: "summer",
        content: "",
        term: "",
    });
});

test("Phase 4 — Step 9: Multiple forms on page receive identical attribution", () => {
    const mockStorage = createMockStorage();

    const form1Inputs = [createInput("name"), createInput("source"), createInput("channel")];
    const form2Inputs = [createInput("email"), createInput("source"), createInput("channel")];
    const form1 = createForm("hero-form", form1Inputs);
    const form2 = createForm("newsletter-form", form2Inputs);
    const mockForms = [form1, form2];

    const mockWindow = {
        location: new URL("http://localhost:8080/real-site/?utm_source=google&utm_medium=cpc&utm_campaign=summer"),
        localStorage: mockStorage,
    };

    const mockDocument = {
        referrer: "",
        readyState: "complete",
        location: mockWindow.location,
        body: {},
        querySelectorAll(sel) {
            if (sel === "form") return mockForms;
            return [];
        },
        addEventListener() {},
    };

    const scriptCode = fs.readFileSync(path.join(rootDir, "attributer.js"), "utf-8");
    const runner = new Function("window", "document", "MutationObserver", "Node", "URL", scriptCode);
    runner(mockWindow, mockDocument, MockMutationObserver, { ELEMENT_NODE: 1 }, URL);

    // Form 1
    assert.equal(form1Inputs.find((i) => i.name === "source").value, "google");
    assert.equal(form1Inputs.find((i) => i.name === "channel").value, "Paid Search");

    // Form 2
    assert.equal(form2Inputs.find((i) => i.name === "source").value, "google");
    assert.equal(form2Inputs.find((i) => i.name === "channel").value, "Paid Search");
});

test("Phase 4 — Step 10: Dynamically created modal form is populated via MutationObserver", () => {
    const mockStorage = createMockStorage();
    const mockForms = [];

    const mockWindow = {
        location: new URL("http://localhost:8080/real-site/?utm_source=google&utm_medium=cpc&utm_campaign=summer"),
        localStorage: mockStorage,
    };

    const mockDocument = {
        referrer: "",
        readyState: "complete",
        location: mockWindow.location,
        body: {},
        querySelectorAll(sel) {
            if (sel === "form") return mockForms;
            return [];
        },
        addEventListener() {},
    };

    const scriptCode = fs.readFileSync(path.join(rootDir, "attributer.js"), "utf-8");
    const runner = new Function("window", "document", "MutationObserver", "Node", "URL", scriptCode);
    runner(mockWindow, mockDocument, MockMutationObserver, { ELEMENT_NODE: 1 }, URL);

    // Dynamically insert modal form
    const modalInputs = [
        createInput("name"),
        createInput("email"),
        createInput("source"),
        createInput("channel"),
        createInput("medium"),
        createInput("campaign"),
    ];
    const modalForm = createForm("modal-form", modalInputs);

    const observer = MockMutationObserver._last;
    assert.ok(observer, "Observer should be registered");

    // Simulate DOM mutation
    observer.trigger([
        {
            addedNodes: [
                {
                    nodeType: 1,
                    tagName: "FORM",
                    ...modalForm,
                },
            ],
        },
    ]);

    assert.equal(modalInputs.find((i) => i.name === "source").value, "google");
    assert.equal(modalInputs.find((i) => i.name === "channel").value, "Paid Search");
    assert.equal(modalInputs.find((i) => i.name === "medium").value, "cpc");
    assert.equal(modalInputs.find((i) => i.name === "campaign").value, "summer");
});

test("Phase 4 — Steps 8, 12, 13, 14: Cross-page flow & First-touch immutability across visits", () => {
    const sharedLocalStorage = createMockStorage();
    const scriptCode = fs.readFileSync(path.join(rootDir, "attributer.js"), "utf-8");

    // ── VISIT 1: Landing on real-site with Google Ads UTMs
    {
        const page1Inputs = [createInput("source"), createInput("channel"), createInput("campaign")];
        const page1Form = createForm("form-1", page1Inputs);
        const win1 = {
            location: new URL("http://localhost:8080/real-site/?utm_source=google&utm_medium=cpc&utm_campaign=summer"),
            localStorage: sharedLocalStorage,
        };
        const doc1 = {
            referrer: "",
            readyState: "complete",
            location: win1.location,
            body: {},
            querySelectorAll: (s) => (s === "form" ? [page1Form] : []),
            addEventListener() {},
        };

        const runner1 = new Function("window", "document", "MutationObserver", "Node", "URL", scriptCode);
        runner1(win1, doc1, MockMutationObserver, { ELEMENT_NODE: 1 }, URL);

        assert.equal(page1Inputs[0].value, "google");
        assert.equal(page1Inputs[1].value, "Paid Search");
        assert.equal(page1Inputs[2].value, "summer");

        // Verify storage entry (Step 14)
        const raw = sharedLocalStorage.getItem("attributer_first_touch");
        assert.ok(raw);
        const parsed = JSON.parse(raw);
        assert.equal(parsed.source, "google");
        assert.equal(parsed.channel, "Paid Search");
    }

    // ── VISIT 2: Navigating to second-page.html (No UTM parameters)
    {
        const page2Inputs = [createInput("source"), createInput("channel"), createInput("medium")];
        const page2Form = createForm("sales-form", page2Inputs);
        const win2 = {
            location: new URL("http://localhost:8080/real-site/second-page.html"),
            localStorage: sharedLocalStorage,
        };
        const doc2 = {
            referrer: "http://localhost:8080/real-site/?utm_source=google&utm_medium=cpc&utm_campaign=summer",
            readyState: "complete",
            location: win2.location,
            body: {},
            querySelectorAll: (s) => (s === "form" ? [page2Form] : []),
            addEventListener() {},
        };

        const runner2 = new Function("window", "document", "MutationObserver", "Node", "URL", scriptCode);
        runner2(win2, doc2, MockMutationObserver, { ELEMENT_NODE: 1 }, URL);

        // Even though Visit 2 has no UTMs, the form gets Google first-touch
        assert.equal(page2Inputs[0].value, "google");
        assert.equal(page2Inputs[1].value, "Paid Search");
        assert.equal(page2Inputs[2].value, "cpc");
    }

    // ── VISIT 3: Visitor comes back later from LinkedIn
    {
        const win3 = {
            location: new URL("http://localhost:8080/real-site/?utm_source=linkedin"),
            localStorage: sharedLocalStorage,
        };
        const doc3 = {
            referrer: "https://www.linkedin.com/",
            readyState: "complete",
            location: win3.location,
            body: {},
            querySelectorAll: () => [],
            addEventListener() {},
        };

        const runner3 = new Function("window", "document", "MutationObserver", "Node", "URL", scriptCode);
        runner3(win3, doc3, MockMutationObserver, { ELEMENT_NODE: 1 }, URL);

        const stored = win3.Attributer.getStoredAttribution();
        assert.equal(stored.source, "google");
        assert.equal(stored.channel, "Paid Search");
        assert.equal(stored.medium, "cpc");
        assert.equal(stored.campaign, "summer");
    }
});
