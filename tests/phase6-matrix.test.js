/**
 * Phase 6 — Comprehensive Multi-Channel Matrix & Attribution Verification Tests
 *
 * Covers all 10 standard channels, signal combinations, precedence rules, and drilldowns.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyTraffic } from "../src/classifier.js";
import { getAttribution } from "../src/attribution.js";

describe("Phase 6 — Multi-Channel Matrix & Precedence Rules", () => {
  // ── 1. Paid Search Matrix ──────────────────────────────────────────────────
  describe("1. Paid Search", () => {
    it("matches Google CPC, Bing PPC, and ad click identifiers", () => {
      assert.equal(classifyTraffic({ source: "google", medium: "cpc" }), "Paid Search");
      assert.equal(classifyTraffic({ source: "bing", medium: "ppc" }), "Paid Search");
      assert.equal(classifyTraffic({ source: "yahoo", medium: "paidsearch" }), "Paid Search");
      assert.equal(classifyTraffic({ source: "google", medium: "paid_search" }), "Paid Search");
      assert.equal(classifyTraffic({ gclid: "test_gclid_123" }), "Paid Search");
      assert.equal(classifyTraffic({ gbraid: "test_gbraid_456" }), "Paid Search");
      assert.equal(classifyTraffic({ gad_campaignid: "998877" }), "Paid Search");
      assert.equal(classifyTraffic({ gad_source: "1" }), "Paid Search");
    });

    it("builds correct Paid Search drilldowns", () => {
      const attr = getAttribution({
        url: "https://example.com/?utm_source=google&utm_medium=cpc&utm_campaign=brand_2026&utm_content=headline_a&utm_term=saas_attribution",
      });
      assert.equal(attr.channel, "Paid Search");
      assert.equal(attr.drilldown1, "google");
      assert.equal(attr.drilldown2, "brand_2026");
      assert.equal(attr.drilldown3, "headline_a");
    });
  });

  // ── 2. Paid Social Matrix ──────────────────────────────────────────────────
  describe("2. Paid Social", () => {
    it("matches Meta, LinkedIn, Instagram, TikTok, Reddit with paid social mediums", () => {
      assert.equal(classifyTraffic({ source: "facebook", medium: "paid_social" }), "Paid Social");
      assert.equal(classifyTraffic({ source: "linkedin", medium: "paidsocial" }), "Paid Social");
      assert.equal(classifyTraffic({ source: "instagram", medium: "social_paid" }), "Paid Social");
      assert.equal(classifyTraffic({ source: "tiktok", medium: "paid-social" }), "Paid Social");
      assert.equal(classifyTraffic({ source: "reddit", medium: "paid_social" }), "Paid Social");
    });

    it("builds correct Paid Social drilldowns", () => {
      const attr = getAttribution({
        url: "https://example.com/?utm_source=linkedin&utm_medium=paid_social&utm_campaign=demand_gen&utm_content=video_demo",
      });
      assert.equal(attr.channel, "Paid Social");
      assert.equal(attr.drilldown1, "linkedin");
      assert.equal(attr.drilldown2, "demand_gen");
      assert.equal(attr.drilldown3, "video_demo");
    });
  });

  // ── 3. Email Matrix ────────────────────────────────────────────────────────
  describe("3. Email", () => {
    it("matches email, e-mail, and email_marketing mediums", () => {
      assert.equal(classifyTraffic({ source: "newsletter", medium: "email" }), "Email");
      assert.equal(classifyTraffic({ source: "customerio", medium: "e-mail" }), "Email");
      assert.equal(classifyTraffic({ source: "mailchimp", medium: "email_marketing" }), "Email");
    });

    it("builds correct Email drilldowns", () => {
      const attr = getAttribution({
        url: "https://example.com/?utm_source=weekly_digest&utm_medium=email&utm_campaign=product_update_jan",
      });
      assert.equal(attr.channel, "Email");
      assert.equal(attr.drilldown1, "weekly_digest");
      assert.equal(attr.drilldown2, "product_update_jan");
    });
  });

  // ── 4. Display & Affiliate Matrix ──────────────────────────────────────────
  describe("4. Display & Affiliate", () => {
    it("matches display, banner, cpm, affiliate, aff mediums", () => {
      assert.equal(classifyTraffic({ source: "adroll", medium: "display" }), "Display");
      assert.equal(classifyTraffic({ source: "gdn", medium: "banner" }), "Display");
      assert.equal(classifyTraffic({ source: "network", medium: "cpm" }), "Display");
      assert.equal(classifyTraffic({ source: "partner_hub", medium: "affiliate" }), "Affiliate");
      assert.equal(classifyTraffic({ source: "impact", medium: "aff" }), "Affiliate");
    });
  });

  // ── 5. Organic Search Matrix ───────────────────────────────────────────────
  describe("5. Organic Search", () => {
    it("matches search engine sources without paid medium", () => {
      assert.equal(classifyTraffic({ source: "google" }), "Organic Search");
      assert.equal(classifyTraffic({ source: "bing" }), "Organic Search");
      assert.equal(classifyTraffic({ source: "duckduckgo" }), "Organic Search");
      assert.equal(classifyTraffic({ source: "yahoo" }), "Organic Search");
    });

    it("matches search engine referrers when no UTMs exist", () => {
      assert.equal(classifyTraffic({ referrer: "https://www.google.com/search?q=attributer" }), "Organic Search");
      assert.equal(classifyTraffic({ referrer: "https://www.bing.com/search?q=attribution" }), "Organic Search");
      assert.equal(classifyTraffic({ referrer: "https://duckduckgo.com/?q=crm" }), "Organic Search");
      assert.equal(classifyTraffic({ referrer: "https://search.yahoo.com/search" }), "Organic Search");
    });
  });

  // ── 6. Organic Social Matrix ───────────────────────────────────────────────
  describe("6. Organic Social", () => {
    it("matches social network sources without paid medium", () => {
      assert.equal(classifyTraffic({ source: "linkedin" }), "Organic Social");
      assert.equal(classifyTraffic({ source: "facebook" }), "Organic Social");
      assert.equal(classifyTraffic({ source: "instagram" }), "Organic Social");
      assert.equal(classifyTraffic({ source: "youtube" }), "Organic Social");
      assert.equal(classifyTraffic({ source: "tiktok" }), "Organic Social");
      assert.equal(classifyTraffic({ source: "reddit" }), "Organic Social");
    });

    it("matches social referrers when no UTMs exist", () => {
      assert.equal(classifyTraffic({ referrer: "https://www.linkedin.com/feed/" }), "Organic Social");
      assert.equal(classifyTraffic({ referrer: "https://www.facebook.com/" }), "Organic Social");
      assert.equal(classifyTraffic({ referrer: "https://www.instagram.com/" }), "Organic Social");
      assert.equal(classifyTraffic({ referrer: "https://www.youtube.com/watch?v=123" }), "Organic Social");
      assert.equal(classifyTraffic({ referrer: "https://www.reddit.com/r/saas" }), "Organic Social");
    });
  });

  // ── 7. Referral Matrix ─────────────────────────────────────────────────────
  describe("7. Referral", () => {
    it("matches standard external non-search, non-social referrers", () => {
      assert.equal(classifyTraffic({ referrer: "https://news.ycombinator.com/item?id=123" }), "Referral");
      assert.equal(classifyTraffic({ referrer: "https://techcrunch.com/2026/saas" }), "Referral");
      assert.equal(classifyTraffic({ referrer: "https://medium.com/@author/story" }), "Referral");
    });
  });

  // ── 8. Direct Matrix ───────────────────────────────────────────────────────
  describe("8. Direct", () => {
    it("matches empty visits with no UTMs and no referrer", () => {
      assert.equal(classifyTraffic({}), "Direct");
      assert.equal(classifyTraffic({ source: "", medium: "", referrer: "" }), "Direct");
      assert.equal(classifyTraffic({ source: null, medium: null, referrer: null }), "Direct");
    });
  });

  // ── 9. Precedence & Conflict Resolution ────────────────────────────────────
  describe("9. Precedence & Conflict Resolution Rules", () => {
    it("Email medium takes precedence over search engine source", () => {
      assert.equal(classifyTraffic({ source: "google", medium: "email" }), "Email");
    });

    it("Paid search medium takes precedence over social source", () => {
      assert.equal(classifyTraffic({ source: "facebook", medium: "cpc" }), "Paid Search");
    });

    it("Explicit UTM parameters override organic search referrer", () => {
      assert.equal(
        classifyTraffic({
          source: "newsletter",
          medium: "email",
          referrer: "https://www.google.com/",
        }),
        "Email"
      );
    });

    it("Paid Social UTM overrides external blog referrer", () => {
      assert.equal(
        classifyTraffic({
          source: "linkedin",
          medium: "paid_social",
          referrer: "https://techcrunch.com/",
        }),
        "Paid Social"
      );
    });
  });
});