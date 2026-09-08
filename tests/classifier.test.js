/**
 * tests/classifier.test.js
 *
 * Automated tests for classifyTraffic() using Node's built-in test runner.
 * Run with: npm test
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyTraffic } from "../src/classifier.js";

// ── Helper ─────────────────────────────────────────────────────────────────────
// Shorthand so test cases stay readable.
function classify(source, medium, referrer = "") {
    return classifyTraffic({ source, medium, referrer });
}

// ── Paid Search ────────────────────────────────────────────────────────────────

test("Google + cpc → Paid Search", () => {
    assert.equal(classify("google", "cpc"), "Paid Search");
});

test("Google + ppc → Paid Search", () => {
    assert.equal(classify("google", "ppc"), "Paid Search");
});

test("Bing + cpc → Paid Search", () => {
    assert.equal(classify("bing", "cpc"), "Paid Search");
});

test("Bing + ppc → Paid Search", () => {
    assert.equal(classify("bing", "ppc"), "Paid Search");
});

test("google + paidsearch → Paid Search", () => {
    assert.equal(classify("google", "paidsearch"), "Paid Search");
});

test("google + paid_search → Paid Search", () => {
    assert.equal(classify("google", "paid_search"), "Paid Search");
});

// Capitalization
test("GOOGLE + CPC → Paid Search (case insensitive)", () => {
    assert.equal(classify("GOOGLE", "CPC"), "Paid Search");
});

test("Google + Cpc → Paid Search (mixed case)", () => {
    assert.equal(classify("Google", "Cpc"), "Paid Search");
});

// ── Paid Social ────────────────────────────────────────────────────────────────

test("facebook + paid_social → Paid Social", () => {
    assert.equal(classify("facebook", "paid_social"), "Paid Social");
});

test("LinkedIn + paid_social → Paid Social", () => {
    assert.equal(classify("LinkedIn", "paid_social"), "Paid Social");
});

test("instagram + paidsocial → Paid Social", () => {
    assert.equal(classify("instagram", "paidsocial"), "Paid Social");
});

test("twitter + paid-social → Paid Social", () => {
    assert.equal(classify("twitter", "paid-social"), "Paid Social");
});

// ── Organic Search ─────────────────────────────────────────────────────────────

test("google + no medium → Organic Search", () => {
    assert.equal(classify("google", null), "Organic Search");
});

test("bing + no medium → Organic Search", () => {
    assert.equal(classify("bing", ""), "Organic Search");
});

test("yahoo + no medium → Organic Search", () => {
    assert.equal(classify("yahoo", null), "Organic Search");
});

test("duckduckgo + no medium → Organic Search", () => {
    assert.equal(classify("duckduckgo", ""), "Organic Search");
});

test("no source + google referrer → Organic Search", () => {
    assert.equal(classify(null, null, "https://www.google.com/search?q=attribution"), "Organic Search");
});

test("no source + bing referrer → Organic Search", () => {
    assert.equal(classify(null, null, "https://www.bing.com/search?q=crm"), "Organic Search");
});

// ── Organic Social ─────────────────────────────────────────────────────────────

test("facebook + no paid medium → Organic Social", () => {
    assert.equal(classify("facebook", null), "Organic Social");
});

test("instagram + no medium → Organic Social", () => {
    assert.equal(classify("instagram", ""), "Organic Social");
});

test("linkedin + no medium → Organic Social", () => {
    assert.equal(classify("linkedin", null), "Organic Social");
});

test("twitter + no medium → Organic Social", () => {
    assert.equal(classify("twitter", ""), "Organic Social");
});

test("x + no medium → Organic Social", () => {
    assert.equal(classify("x", null), "Organic Social");
});

test("tiktok + no medium → Organic Social", () => {
    assert.equal(classify("tiktok", ""), "Organic Social");
});

test("youtube + no medium → Organic Social", () => {
    assert.equal(classify("youtube", null), "Organic Social");
});

test("no source + facebook referrer → Organic Social", () => {
    assert.equal(classify(null, null, "https://www.facebook.com/"), "Organic Social");
});

// ── Email ──────────────────────────────────────────────────────────────────────

test("utm_medium=email → Email", () => {
    assert.equal(classify(null, "email"), "Email");
});

test("utm_medium=e-mail → Email", () => {
    assert.equal(classify("newsletter", "e-mail"), "Email");
});

test("utm_medium=EMAIL (uppercase) → Email", () => {
    assert.equal(classify(null, "EMAIL"), "Email");
});

// ── Display ────────────────────────────────────────────────────────────────────

test("utm_medium=display → Display", () => {
    assert.equal(classify(null, "display"), "Display");
});

test("utm_medium=banner → Display", () => {
    assert.equal(classify("gdn", "banner"), "Display");
});

test("utm_medium=cpm → Display", () => {
    assert.equal(classify(null, "cpm"), "Display");
});

// ── Affiliate ──────────────────────────────────────────────────────────────────

test("utm_medium=affiliate → Affiliate", () => {
    assert.equal(classify(null, "affiliate"), "Affiliate");
});

test("utm_medium=aff → Affiliate", () => {
    assert.equal(classify("partner", "aff"), "Affiliate");
});

// ── Referral ───────────────────────────────────────────────────────────────────

test("no UTM + external referrer → Referral", () => {
    assert.equal(classify(null, null, "https://www.example.com/blog"), "Referral");
});

test("no UTM + another external referrer → Referral", () => {
    assert.equal(classify("", "", "https://techcrunch.com/article"), "Referral");
});

// Search engine referrers should NOT become Referral
test("no UTM + google referrer → Organic Search (not Referral)", () => {
    assert.equal(classify(null, null, "https://google.com/search?q=test"), "Organic Search");
});

// ── Direct ─────────────────────────────────────────────────────────────────────

test("no UTM + no referrer → Direct", () => {
    assert.equal(classify(null, null, ""), "Direct");
});

test("null source/medium/referrer → Direct", () => {
    assert.equal(classify(null, null, null), "Direct");
});

test("empty strings → Direct", () => {
    assert.equal(classify("", "", ""), "Direct");
});

// ── Other ──────────────────────────────────────────────────────────────────────

test("unknown source + unknown medium → Other", () => {
    assert.equal(classify("unknownsource", "unknownmedium"), "Other");
});

test("source only, no matching rule → Other", () => {
    // A non-search, non-social source with no medium and no referrer
    assert.equal(classify("myapp", null), "Other");
});

// ── Edge cases ─────────────────────────────────────────────────────────────────

test("whitespace-padded values are normalized", () => {
    assert.equal(classify("  google  ", "  cpc  "), "Paid Search");
});

test("undefined values handled without error", () => {
    assert.equal(classify(undefined, undefined, undefined), "Direct");
});

test("paid medium overrides social source (Paid Social, not Organic Social)", () => {
    // facebook with a paid medium → Paid Social, not Organic Social
    assert.equal(classify("facebook", "paid_social"), "Paid Social");
});

test("paid search medium overrides search engine source", () => {
    // google with cpc → Paid Search (medium wins)
    assert.equal(classify("google", "cpc"), "Paid Search");
});
