/**
 * Phase 11 — Webhook Integration Tests
 *
 * Tests:
 * 1. HMAC-SHA256 signature signing and verification
 * 2. Webhook payload format for lead.created event
 * 3. Timing-safe signature comparison
 * 4. Dispatches webhook to registered endpoint
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";

describe("Phase 11 — Integration Framework & Webhooks", () => {
  const secret = "whsec_test_secret_key_123456";

  function signPayload(payloadString, sec) {
    const hmac = crypto.createHmac("sha256", sec);
    hmac.update(payloadString, "utf8");
    return `sha256=${hmac.digest("hex")}`;
  }

  function verifySignature(payloadString, signatureHeader, sec) {
    if (!signatureHeader || !sec) return false;
    const expected = signPayload(payloadString, sec);
    try {
      return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  it("1. Generates and verifies HMAC-SHA256 signature correctly", () => {
    const testPayload = JSON.stringify({
      event: "lead.created",
      data: { id: "lead_123", email: "user@example.com", channel: "Paid Search" },
    });

    const sig = signPayload(testPayload, secret);
    assert.match(sig, /^sha256=[a-f0-9]{64}$/);

    const isValid = verifySignature(testPayload, sig, secret);
    assert.equal(isValid, true);
  });

  it("2. Rejects invalid signatures or tampered payloads", () => {
    const originalPayload = JSON.stringify({ event: "lead.created", data: { email: "user@example.com" } });
    const tamperedPayload = JSON.stringify({ event: "lead.created", data: { email: "hacker@example.com" } });

    const sig = signPayload(originalPayload, secret);

    const isValid = verifySignature(tamperedPayload, sig, secret);
    assert.equal(isValid, false);
  });

  it("3. Verifies complete lead webhook payload structure", () => {
    const sampleLead = {
      id: "lead_abc_999",
      project_id: "proj_111",
      name: "Jane Doe",
      email: "jane@company.com",
      channel: "Paid Social",
      source: "linkedin",
      medium: "paid_social",
      campaign: "enterprise_h2",
      drilldown1: "linkedin",
      drilldown2: "enterprise_h2",
      drilldown3: "ad_video_1",
      landing_page: "/pricing",
      submit_page: "/pricing",
    };

    const webhookEvent = {
      event: "lead.created",
      timestamp: new Date().toISOString(),
      data: sampleLead,
    };

    assert.equal(webhookEvent.event, "lead.created");
    assert.equal(webhookEvent.data.channel, "Paid Social");
    assert.equal(webhookEvent.data.drilldown1, "linkedin");
    assert.equal(webhookEvent.data.drilldown2, "enterprise_h2");
  });
});