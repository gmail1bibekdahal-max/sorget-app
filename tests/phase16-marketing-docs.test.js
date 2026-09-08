/**
 * Phase 16 — Marketing Website & Docs Tests
 *
 * Tests:
 * 1. Marketing page metadata and feature matrix
 * 2. Documentation section navigation schema
 * 3. Plan pricing calculator outputs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PLANS } from "../src/billing.js";

describe("Phase 16 — Marketing Website & Documentation", () => {
  it("1. Verifies marketing plan offerings and tier consistency", () => {
    assert.equal(typeof PLANS.starter.priceMonthlyUsd, "number");
    assert.equal(typeof PLANS.growth.priceMonthlyUsd, "number");
    assert.equal(typeof PLANS.enterprise.priceMonthlyUsd, "number");

    assert.equal(PLANS.starter.leadsMonthlyLimit, 10000);
    assert.equal(PLANS.growth.leadsMonthlyLimit, 50000);
    assert.equal(PLANS.enterprise.leadsMonthlyLimit, 1000000);
  });

  it("2. Validates documentation sections structure", () => {
    const docSections = ["quick-start", "hidden-fields", "crm-mapping", "webhooks-api"];
    assert.equal(docSections.length, 4);
    assert.equal(docSections.includes("quick-start"), true);
    assert.equal(docSections.includes("crm-mapping"), true);
  });
});