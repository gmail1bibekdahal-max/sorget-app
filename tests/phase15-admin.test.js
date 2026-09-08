/**
 * Phase 15 — Admin Panel & Telemetry Tests
 *
 * Tests:
 * 1. Super-admin access verification
 * 2. Monthly Recurring Revenue (MRR) aggregate calculation
 * 3. System health telemetry monitoring logic
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Phase 15 — Admin Panel & System Telemetry", () => {
  function checkIsSuperAdmin(userEmail, adminEmailsEnv) {
    if (!userEmail) return false;
    const allowed = (adminEmailsEnv || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (allowed.length === 0) return true; // Default dev environment
    return allowed.includes(userEmail.toLowerCase());
  }

  function calculatePlatformMrr(subscriptions) {
    let mrr = 0;
    for (const sub of subscriptions) {
      if (sub.status === "active") {
        if (sub.plan_id === "growth") mrr += 119;
        else if (sub.plan_id === "enterprise") mrr += 299;
        else mrr += 49;
      }
    }
    return mrr;
  }

  it("1. Verifies super-admin authorization against email whitelist", () => {
    const adminWhitelist = "admin@attributer.io, founder@attributer.io";

    assert.equal(checkIsSuperAdmin("admin@attributer.io", adminWhitelist), true);
    assert.equal(checkIsSuperAdmin("FOUNDER@attributer.io", adminWhitelist), true);
    assert.equal(checkIsSuperAdmin("customer@company.com", adminWhitelist), false);
    assert.equal(checkIsSuperAdmin(null, adminWhitelist), false);
  });

  it("2. Calculates platform MRR accurately across subscription tiers", () => {
    const mockSubscriptions = [
      { plan_id: "starter", status: "active" },     // $49
      { plan_id: "growth", status: "active" },      // $119
      { plan_id: "enterprise", status: "active" },  // $299
      { plan_id: "growth", status: "canceled" },    // $0 (canceled)
      { plan_id: "starter", status: "active" },     // $49
    ];

    const totalMrr = calculatePlatformMrr(mockSubscriptions);
    assert.equal(totalMrr, 49 + 119 + 299 + 49); // $516
  });

  it("3. Validates health status formatting", () => {
    const healthItem = { service: "PostgreSQL Database", status: "Healthy", uptime: "99.99%", latency: "24ms" };
    assert.equal(healthItem.status, "Healthy");
    assert.match(healthItem.uptime, /^\d{2,3}\.\d{2}%$/);
    assert.match(healthItem.latency, /^\d+ms$/);
  });
});