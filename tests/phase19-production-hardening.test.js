/**
 * Phase 19 — Production Hardening & Security Tests
 *
 * Tests:
 * 1. Sliding window rate limiting functionality
 * 2. Rate limit exceeding and recovery
 * 3. Environment configuration validation
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rateLimit, RATE_LIMITS } from "../src/rate-limit.js";
import { validateEnvironment } from "../src/env.js";

describe("Phase 19 — Production Hardening & Deployment Readiness", () => {
  it("1. Allows requests within defined rate limit threshold", () => {
    const config = { limit: 3, windowSeconds: 2 };
    const ip = "192.168.1.100";

    const r1 = rateLimit(`test1:${ip}`, config);
    assert.equal(r1.allowed, true);
    assert.equal(r1.remaining, 2);

    const r2 = rateLimit(`test1:${ip}`, config);
    assert.equal(r2.allowed, true);
    assert.equal(r2.remaining, 1);

    const r3 = rateLimit(`test1:${ip}`, config);
    assert.equal(r3.allowed, true);
    assert.equal(r3.remaining, 0);
  });

  it("2. Blocks subsequent requests when rate limit is exceeded", () => {
    const config = { limit: 2, windowSeconds: 2 };
    const ip = "192.168.1.200";

    rateLimit(`test2:${ip}`, config);
    rateLimit(`test2:${ip}`, config);

    const blocked = rateLimit(`test2:${ip}`, config);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
    assert.equal(typeof blocked.resetAt, "number");
  });

  it("3. Validates required vs recommended environment variables", () => {
    const validEnv = {
      NEXT_PUBLIC_SUPABASE_URL: "https://xyz.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon_key_123",
      SUPABASE_SERVICE_ROLE_KEY: "service_key_456",
      NEXT_PUBLIC_SITE_URL: "https://attributer.io",
    };

    const result = validateEnvironment(validEnv);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
    assert.equal(result.warnings.length, 0);

    const incompleteEnv = {
      NEXT_PUBLIC_SUPABASE_URL: "https://xyz.supabase.co",
    };

    const invalidResult = validateEnvironment(incompleteEnv);
    assert.equal(invalidResult.valid, false);
    assert.equal(invalidResult.errors.length, 1);
    assert.equal(invalidResult.warnings.length, 2);
  });
});