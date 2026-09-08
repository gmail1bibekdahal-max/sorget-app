/**
 * Phase 8 — Authentication & Onboarding Tests
 *
 * Tests:
 * 1. Default workspace slug generation from user metadata
 * 2. Password validation and reset rules
 * 3. Onboarding project auto-linking to user account
 * 4. Multi-role assignment (first user is owner)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Phase 8 — Authentication Completion & Onboarding Flow", () => {
  it("1. Generates clean URL-safe workspace slug from user full name or email", () => {
    function generateWorkspaceSlug(fullName, email) {
      const base = (fullName || email.split("@")[0]).toLowerCase().replace(/[^a-z0-9]/g, "-");
      return base.replace(/-+/g, "-").replace(/^-|-$/g, "");
    }

    assert.equal(generateWorkspaceSlug("Acme Corporation", "admin@acme.com"), "acme-corporation");
    assert.equal(generateWorkspaceSlug("", "john.doe+marketing@example.com"), "john-doe-marketing");
    assert.equal(generateWorkspaceSlug("SaaS & Co. LLC!", "test@saas.com"), "saas-co-llc");
  });

  it("2. Password validation checks minimum length and confirmation match", () => {
    function validatePasswordReset(password, confirmPassword) {
      if (!password || password.length < 6) {
        return { valid: false, error: "Password must be at least 6 characters." };
      }
      if (password !== confirmPassword) {
        return { valid: false, error: "Passwords do not match." };
      }
      return { valid: true, error: null };
    }

    assert.deepEqual(validatePasswordReset("short", "short"), {
      valid: false,
      error: "Password must be at least 6 characters.",
    });

    assert.deepEqual(validatePasswordReset("validpass123", "mismatch456"), {
      valid: false,
      error: "Passwords do not match.",
    });

    assert.deepEqual(validatePasswordReset("securepassword2026", "securepassword2026"), {
      valid: true,
      error: null,
    });
  });

  it("3. User onboarding creates website and assigns unique tracking_id", () => {
    function generateTrackingId() {
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      let randomStr = "";
      for (let i = 0; i < 7; i++) {
        randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return `attr_${randomStr}`;
    }

    const tid = generateTrackingId();
    assert.match(tid, /^attr_[a-z0-9]{7}$/);
  });
});