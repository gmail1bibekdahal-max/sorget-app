/**
 * Phase 3 — Attribution Engine Enhancement Tests
 *
 * Tests:
 * 1. Dual Persistence: First-Touch immutability + Last-Touch update across multi-touch journey
 * 2. Drilldown 1, 2, 3 hierarchy for Paid Search, Paid Social, Organic Search, Referral, Direct
 * 3. Landing page group extraction
 * 4. Submit page tracking
 * 5. Form hidden field population for drilldowns and landing dimensions
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getAttribution,
  initializeAttribution,
  getStoredAttribution,
  getLastTouchAttribution,
  computeDrilldown,
  getLandingPageGroup,
} from "../src/attribution.js";
import {
  saveFirstTouch,
  getFirstTouch,
  saveLastTouch,
  getLastTouch,
  clearAllAttribution,
} from "../src/storage.js";
import { populateForm } from "../src/form-attribution.js";

describe("Phase 3 — Attribution Engine Enhancement", () => {
  const memoryStore = new Map();

  beforeEach(() => {
    memoryStore.clear();
    globalThis.localStorage = {
      getItem: (k) => memoryStore.get(k) ?? null,
      setItem: (k, v) => memoryStore.set(k, String(v)),
      removeItem: (k) => memoryStore.delete(k),
      clear: () => memoryStore.clear(),
    };
    clearAllAttribution();
  });

  // ── 1. Dual Persistence: Multi-Touch Journey ────────────────────────────────
  it("1. Multi-Touch Journey: Day 1 Google Ads, Day 2 Direct, Day 3 LinkedIn", () => {
    // Day 1: User arrives from Google Ads
    initializeAttribution({
      url: "https://example.com/?utm_source=google&utm_medium=cpc&utm_campaign=summer_promo",
    });

    let first = getStoredAttribution();
    let last = getLastTouchAttribution();

    assert.equal(first.channel, "Paid Search");
    assert.equal(first.source, "google");
    assert.equal(first.campaign, "summer_promo");
    assert.equal(last.channel, "Paid Search");
    assert.equal(last.source, "google");

    // Day 2: User returns via Direct
    initializeAttribution({
      url: "https://example.com/pricing",
    });

    first = getStoredAttribution();
    last = getLastTouchAttribution();

    // First-touch MUST remain Paid Search / google
    assert.equal(first.channel, "Paid Search");
    assert.equal(first.source, "google");
    // Last-touch is not degraded by direct visit when previous touch exists
    assert.equal(last.channel, "Paid Search");

    // Day 3: User clicks a LinkedIn post/ad
    initializeAttribution({
      url: "https://example.com/demo?utm_source=linkedin&utm_medium=paid_social&utm_campaign=b2b_leads",
    });

    first = getStoredAttribution();
    last = getLastTouchAttribution();

    // First-touch is STILL Paid Search / Google
    assert.equal(first.channel, "Paid Search");
    assert.equal(first.source, "google");
    assert.equal(first.campaign, "summer_promo");

    // Last-touch is now Paid Social / LinkedIn
    assert.equal(last.channel, "Paid Social");
    assert.equal(last.source, "linkedin");
    assert.equal(last.campaign, "b2b_leads");
  });

  // ── 2. Drilldown 1/2/3 Dimensions ───────────────────────────────────────────
  it("2. Drilldown 1/2/3 generated correctly for Paid Search", () => {
    const drill = computeDrilldown({
      channel: "Paid Search",
      source: "google",
      medium: "cpc",
      campaign: "brand_campaign",
      content: "ad_headline_1",
      term: "attributer alternative",
      gclid: "test_gclid_123",
      landingPage: "/features",
    });

    assert.equal(drill.drilldown1, "google");
    assert.equal(drill.drilldown2, "brand_campaign");
    assert.equal(drill.drilldown3, "ad_headline_1");
  });

  it("3. Drilldown 1/2/3 generated correctly for Referral", () => {
    const drill = computeDrilldown({
      channel: "Referral",
      referrer: "https://techcrunch.com/2026/saas-tools",
      landingPage: "/blog/post",
    });

    assert.equal(drill.drilldown1, "techcrunch.com");
    assert.equal(drill.drilldown2, "/blog/post");
    assert.equal(drill.drilldown3, null);
  });

  it("4. Drilldown 1/2/3 generated correctly for Organic Search", () => {
    const drill = computeDrilldown({
      channel: "Organic Search",
      source: "bing",
      term: null,
      landingPage: "/pricing",
    });

    assert.equal(drill.drilldown1, "bing");
    assert.equal(drill.drilldown2, "(not provided)");
    assert.equal(drill.drilldown3, "/pricing");
  });

  it("5. Drilldown 1/2/3 generated correctly for Direct", () => {
    const drill = computeDrilldown({
      channel: "Direct",
      landingPage: "/contact",
    });

    assert.equal(drill.drilldown1, "Direct");
    assert.equal(drill.drilldown2, "/contact");
    assert.equal(drill.drilldown3, null);
  });

  // ── 3. Landing Page Grouping ────────────────────────────────────────────────
  it("6. Landing page group extracts top-level section prefix", () => {
    assert.equal(getLandingPageGroup("/blog/how-to-track-attribution"), "/blog");
    assert.equal(getLandingPageGroup("/products/analytics/v2"), "/products");
    assert.equal(getLandingPageGroup("/pricing"), "/pricing");
    assert.equal(getLandingPageGroup("/"), "/");
    assert.equal(getLandingPageGroup(""), "/");
    assert.equal(getLandingPageGroup(null), "/");
  });

  // ── 4. Form Population with Extended Fields ─────────────────────────────────
  it("7. Form population fills drilldowns and landing dimensions", () => {
    const formFields = {
      channel: { value: "", trim: () => "" },
      source: { value: "", trim: () => "" },
      drilldown1: { value: "", trim: () => "" },
      channel_drilldown2: { value: "", trim: () => "" },
      landing_page: { value: "", trim: () => "" },
      landing_page_group: { value: "", trim: () => "" },
    };

    const mockForm = {
      querySelectorAll: (sel) => {
        const m = sel.match(/name="([^"]+)"/);
        if (m && formFields[m[1]]) {
          return [formFields[m[1]]];
        }
        return [];
      },
    };

    const attr = {
      channel: "Paid Search",
      source: "google",
      drilldown1: "google",
      drilldown2: "promo_2026",
      landingPage: "/blog/post-1",
      landingPageGroup: "/blog",
    };

    populateForm(mockForm, attr);

    assert.equal(formFields.channel.value, "Paid Search");
    assert.equal(formFields.source.value, "google");
    assert.equal(formFields.drilldown1.value, "google");
    assert.equal(formFields.channel_drilldown2.value, "promo_2026");
    assert.equal(formFields.landing_page.value, "/blog/post-1");
    assert.equal(formFields.landing_page_group.value, "/blog");
  });
});