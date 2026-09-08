import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { PLANS, canAddWebsite, canInviteMember, canUseCrmIntegrations, verifyRazorpayWebhookSignature } from "../src/billing.js";

describe("Phase 14 — Razorpay Subscription & Billing Framework", () => {
  const webhookSecret = "rzp_whsec_test_secret_key_8888";

  function createRazorpaySignature(body, secret) {
    return crypto.createHmac("sha256", secret).update(body).digest("hex");
  }

  it("1. Verifies Starter, Growth, and Enterprise plan definitions", () => {
    assert.equal(PLANS.starter.priceMonthlyUsd, 49);
    assert.equal(PLANS.starter.websiteLimit, 1);
    assert.equal(PLANS.starter.crmIntegrations, false);

    assert.equal(PLANS.growth.priceMonthlyUsd, 119);
    assert.equal(PLANS.growth.websiteLimit, 5);
    assert.equal(PLANS.growth.crmIntegrations, true);

    assert.equal(PLANS.enterprise.priceMonthlyUsd, 299);
    assert.equal(PLANS.enterprise.crmIntegrations, true);
  });

  it("2. Validates website and member limit entitlement checks", () => {
    assert.equal(canAddWebsite("starter", 0), true);
    assert.equal(canAddWebsite("starter", 1), false, "Starter is limited to 1 website");

    assert.equal(canAddWebsite("growth", 3), true);
    assert.equal(canAddWebsite("growth", 5), false, "Growth is limited to 5 websites");

    assert.equal(canInviteMember("starter", 2), true);
    assert.equal(canInviteMember("starter", 3), false, "Starter is limited to 3 members");

    assert.equal(canUseCrmIntegrations("starter"), false);
    assert.equal(canUseCrmIntegrations("growth"), true);
    assert.equal(canUseCrmIntegrations("enterprise"), true);
  });

  it("3. Verifies authentic Razorpay webhook signatures", () => {
    const payload = JSON.stringify({
      event: "subscription.charged",
      payload: { payment: { entity: { id: "pay_123", amount: 4900 } } },
    });

    const validSignature = createRazorpaySignature(payload, webhookSecret);
    const result = verifyRazorpayWebhookSignature(payload, validSignature, webhookSecret);
    assert.equal(result, true);
  });

  it("4. Rejects forged or invalid Razorpay webhook signatures", () => {
    const payload = JSON.stringify({ event: "subscription.charged" });
    const forgedSignature = "invalid_hash_signature_0000";

    const result = verifyRazorpayWebhookSignature(payload, forgedSignature, webhookSecret);
    assert.equal(result, false);
  });
});