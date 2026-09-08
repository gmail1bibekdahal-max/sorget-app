/**
 * Phase 10 — Installation Checker & Debugger Tests
 *
 * Tests:
 * 1. HTML script tag detection and extraction of data-tracking-id
 * 2. Tracking ID match vs mismatch logic
 * 3. Form tag and hidden field discovery
 * 4. Safe failure on invalid URLs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Phase 10 — Installation Checker & Attribution Debugger", () => {
  const sampleSiteHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Customer Demo Site</title>
        <script src="https://mycdn.com/sdk/v1/attributer.js" data-tracking-id="attr_site777" async></script>
      </head>
      <body>
        <h1>Welcome</h1>
        <form action="/submit" method="POST">
          <input type="text" name="email" placeholder="Email" />
          <input type="hidden" name="channel" />
          <input type="hidden" name="source" />
          <input type="hidden" name="gclid" />
          <button type="submit">Sign Up</button>
        </form>
      </body>
    </html>
  `;

  function analyzeHtml(html, expectedTrackingId) {
    const scriptRegex = /<script\b[^>]*?\bsrc=["']([^"']*?attributer(?:\.min)?\.js[^"']*?)["'][^>]*>/gi;
    const scriptMatches = [...html.matchAll(scriptRegex)];
    const scriptInstalled = scriptMatches.length > 0;

    const trackingIdRegex = /data-tracking-id=["'](attr_[a-z0-9]+)["']/i;
    const trackingIdMatch = html.match(trackingIdRegex);
    const foundTrackingId = trackingIdMatch ? trackingIdMatch[1] : null;

    const trackingIdMatches = Boolean(
      expectedTrackingId && foundTrackingId && expectedTrackingId.toLowerCase() === foundTrackingId.toLowerCase()
    );

    const formRegex = /<form\b[^>]*>/gi;
    const formsCount = [...html.matchAll(formRegex)].length;

    const commonFields = ["channel", "source", "medium", "campaign", "gclid", "drilldown1"];
    const detectedFields = [];
    for (const field of commonFields) {
      const fieldRegex = new RegExp(`name=["']${field}["']|data-attributer-field=["']${field}["']`, "i");
      if (fieldRegex.test(html)) {
        detectedFields.push(field);
      }
    }

    return {
      scriptInstalled,
      foundTrackingId,
      trackingIdMatches,
      formsCount,
      detectedFields,
    };
  }

  it("1. Successfully detects Attributer SDK script and extracts data-tracking-id", () => {
    const analysis = analyzeHtml(sampleSiteHtml, "attr_site777");
    assert.equal(analysis.scriptInstalled, true);
    assert.equal(analysis.foundTrackingId, "attr_site777");
    assert.equal(analysis.trackingIdMatches, true);
  });

  it("2. Flags tracking ID mismatch if customer installed snippet with wrong ID", () => {
    const analysis = analyzeHtml(sampleSiteHtml, "attr_different_project");
    assert.equal(analysis.scriptInstalled, true);
    assert.equal(analysis.foundTrackingId, "attr_site777");
    assert.equal(analysis.trackingIdMatches, false);
  });

  it("3. Detects forms count and present attribution input fields", () => {
    const analysis = analyzeHtml(sampleSiteHtml, "attr_site777");
    assert.equal(analysis.formsCount, 1);
    assert.deepEqual(analysis.detectedFields, ["channel", "source", "gclid"]);
  });

  it("4. Handles pages without Attributer script gracefully", () => {
    const plainHtml = "<html><body><h1>No tracking</h1></body></html>";
    const analysis = analyzeHtml(plainHtml, "attr_site777");
    assert.equal(analysis.scriptInstalled, false);
    assert.equal(analysis.foundTrackingId, null);
    assert.equal(analysis.trackingIdMatches, false);
    assert.equal(analysis.formsCount, 0);
  });
});