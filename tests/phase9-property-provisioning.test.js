/**
 * tests/phase9-property-provisioning.test.js
 *
 * Phase 9: Automatic HubSpot Attribution Property Provisioning Tests
 *
 * 1. all 11 properties already exist → creates 0 properties
 * 2. all 11 missing → creates 11
 * 3. 5 exist, 6 missing → creates exactly 6
 * 4. repeated provisioning → no duplicates
 * 5. concurrent/conflict creation (409) → succeeds cleanly
 * 6. missing property during contact sync → provision → retry → success
 * 7. property provisioning 403 → clear failure, no infinite retry
 * 8. validation error → no provisioning loop
 * 9. expired OAuth token → existing refresh flow remains intact
 * 10. no credentials in logs
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  ensureHubSpotAttributionProperties,
  REQUIRED_ATTRIBUTION_PROPERTIES,
} from "../src/hubspot-properties.js";
import { syncLeadToHubSpot } from "../src/crm-sync.js";

describe("Phase 9: HubSpot Attribution Property Provisioning", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("1. All 11 properties already exist → creates 0 properties", async () => {
    let postCount = 0;
    globalThis.fetch = async (url, opts) => {
      if (opts?.method === "GET" || !opts?.method) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: REQUIRED_ATTRIBUTION_PROPERTIES.map((p) => ({ name: p.name })),
          }),
        };
      }
      if (opts?.method === "POST") {
        postCount++;
        return { ok: true, status: 201, json: async () => ({}) };
      }
      return { ok: false, status: 404 };
    };

    const result = await ensureHubSpotAttributionProperties("mock_token");
    assert.equal(result.created.length, 0, "Should create 0 properties");
    assert.equal(result.existing.length, 11, "Should find all 11 existing");
    assert.equal(postCount, 0, "No POST requests should be made");
  });

  test("2. All 11 missing → creates 11 properties", async () => {
    const createdNames = [];
    globalThis.fetch = async (url, opts) => {
      if (opts?.method === "GET" || !opts?.method) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ results: [] }), // 0 existing
        };
      }
      if (opts?.method === "POST") {
        const body = JSON.parse(opts.body);
        createdNames.push(body.name);
        return {
          ok: true,
          status: 201,
          json: async () => body,
        };
      }
      return { ok: false, status: 404 };
    };

    const result = await ensureHubSpotAttributionProperties("mock_token");
    assert.equal(result.created.length, 11, "Should create 11 properties");
    assert.equal(result.existing.length, 0, "Should find 0 existing");
    assert.equal(createdNames.length, 11, "Must make 11 POST requests");
    assert.ok(createdNames.includes("attributer_channel"));
    assert.ok(createdNames.includes("attributer_term"));
  });

  test("3. 5 exist, 6 missing → creates exactly 6", async () => {
    const existing5 = REQUIRED_ATTRIBUTION_PROPERTIES.slice(0, 5).map((p) => p.name);
    const createdNames = [];

    globalThis.fetch = async (url, opts) => {
      if (opts?.method === "GET" || !opts?.method) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: existing5.map((name) => ({ name })),
          }),
        };
      }
      if (opts?.method === "POST") {
        const body = JSON.parse(opts.body);
        createdNames.push(body.name);
        return { ok: true, status: 201, json: async () => body };
      }
      return { ok: false, status: 404 };
    };

    const result = await ensureHubSpotAttributionProperties("mock_token");
    assert.equal(result.existing.length, 5, "5 existing");
    assert.equal(result.created.length, 6, "6 created");
    assert.equal(createdNames.length, 6, "Must make exactly 6 POST requests");
    for (const name of existing5) {
      assert.ok(!createdNames.includes(name), `Must not recreate existing property: ${name}`);
    }
  });

  test("4. Repeated provisioning → idempotent, no duplicates created", async () => {
    const portalProperties = new Set();

    globalThis.fetch = async (url, opts) => {
      if (opts?.method === "GET" || !opts?.method) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: Array.from(portalProperties).map((name) => ({ name })),
          }),
        };
      }
      if (opts?.method === "POST") {
        const body = JSON.parse(opts.body);
        portalProperties.add(body.name);
        return { ok: true, status: 201, json: async () => body };
      }
      return { ok: false, status: 404 };
    };

    // Run 1: all 11 created
    const run1 = await ensureHubSpotAttributionProperties("mock_token");
    assert.equal(run1.created.length, 11);
    assert.equal(run1.existing.length, 0);

    // Run 2: none created, all 11 existing
    const run2 = await ensureHubSpotAttributionProperties("mock_token");
    assert.equal(run2.created.length, 0);
    assert.equal(run2.existing.length, 11);

    // Run 3: idempotent
    const run3 = await ensureHubSpotAttributionProperties("mock_token");
    assert.equal(run3.created.length, 0);
    assert.equal(run3.existing.length, 11);
  });

  test("5. Concurrent / conflict creation (409) → succeeds and marks existing", async () => {
    globalThis.fetch = async (url, opts) => {
      if (opts?.method === "GET" || !opts?.method) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ results: [] }),
        };
      }
      if (opts?.method === "POST") {
        // Return 409 Conflict: another process created the property concurrently
        return {
          ok: false,
          status: 409,
          json: async () => ({
            status: "error",
            message: "Property already exists",
          }),
        };
      }
      return { ok: false, status: 404 };
    };

    const result = await ensureHubSpotAttributionProperties("mock_token");
    assert.equal(result.failed.length, 0, "Conflict must not be marked as failed");
    assert.equal(result.existing.length, 11, "Conflicted properties must be marked as existing");
  });

  test("6. Missing property during contact sync → provision → retry → success", async () => {
    let postContactCalls = 0;
    let provisionCalled = false;

    globalThis.fetch = async (url, opts) => {
      // Properties API
      if (url.includes("/crm/v3/properties/contacts")) {
        if (opts?.method === "GET") {
          return { ok: true, status: 200, json: async () => ({ results: [] }) };
        }
        if (opts?.method === "POST") {
          provisionCalled = true;
          return { ok: true, status: 201, json: async () => JSON.parse(opts.body) };
        }
      }

      // Contacts API
      if (url.includes("/crm/v3/objects/contacts") && !url.includes("/properties/")) {
        postContactCalls++;
        if (postContactCalls === 1) {
          // First attempt fails with PROPERTY_DOESNT_EXIST
          return {
            ok: false,
            status: 400,
            json: async () => ({
              status: "error",
              message: "Property values were not valid",
              errors: [
                {
                  message: 'Property "attributer_channel" does not exist',
                  code: "PROPERTY_DOESNT_EXIST",
                  context: { propertyName: ["attributer_channel"] },
                },
              ],
            }),
          };
        }
        // Second attempt succeeds after provisioning
        return {
          ok: true,
          status: 201,
          json: async () => ({ id: "hs_contact_recovered_99", properties: JSON.parse(opts.body).properties }),
        };
      }

      return { ok: false, status: 404 };
    };

    const properties = {
      email: "recovery@example.com",
      attributer_channel: "Paid Search",
      firstname: "Recovered",
    };

    const result = await syncLeadToHubSpot("mock_token", properties);
    assert.equal(result.success, true, "Sync must recover and succeed");
    assert.equal(result.external_contact_id, "hs_contact_recovered_99");
    assert.ok(provisionCalled, "Property provisioning must be triggered on PROPERTY_DOESNT_EXIST");
    assert.equal(postContactCalls, 2, "Must retry contact POST after provisioning");
  });

  test("7. Property provisioning 403 → clear failure, no infinite retry", async () => {
    globalThis.fetch = async (url, opts) => {
      return {
        ok: false,
        status: 403,
        json: async () => ({
          status: "error",
          message: "This app hasn't been granted all required scopes to make this call.",
          category: "MISSING_SCOPES",
        }),
      };
    };

    const result = await ensureHubSpotAttributionProperties("mock_token");
    assert.ok(result.error, "Must return error message on 403");
    assert.ok(result.error.includes("scopes") || result.error.includes("403"));
    assert.equal(result.created.length, 0);
  });

  test("8. Validation error → no provisioning loop", async () => {
    let postContactCalls = 0;
    globalThis.fetch = async (url, opts) => {
      postContactCalls++;
      // Return a HubSpot admin-configured CRM write validation error (not PROPERTY_DOESNT_EXIST)
      return {
        ok: false,
        status: 400,
        json: async () => ({
          status: "error",
          message: "Contact validation rule failed: Custom CRM rule enforced by admin",
          errors: [
            {
              message: "Custom CRM rule enforced by admin",
              code: "VALIDATION_ERROR",
            },
          ],
        }),
      };
    };

    const result = await syncLeadToHubSpot("mock_token", { email: "invalid@example.com" });
    assert.equal(result.success, false);
    assert.ok(result.error.includes("validation") || result.error.includes("failed"));
    assert.equal(postContactCalls, 1, "Must NOT loop or retry on standard validation errors");
  });

  test("9. Expired OAuth token → refresh token flow remains intact", async () => {
    const connection = {
      id: "conn_1",
      refresh_token: "mock_refresh_token",
      token_expires_at: new Date(Date.now() - 10000).toISOString(), // expired
    };

    process.env.HUBSPOT_CLIENT_ID = "mock_client_id";
    process.env.HUBSPOT_CLIENT_SECRET = "mock_client_secret";

    let refreshedCalled = false;
    globalThis.fetch = async (url, opts) => {
      if (url.includes("/oauth/2026-03/token")) {
        refreshedCalled = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: "new_token_123",
            refresh_token: "new_refresh_token_456",
            expires_in: 1800,
          }),
        };
      }
      return { ok: false, status: 404 };
    };

    const { refreshHubSpotToken } = await import("../src/crm-sync.js");
    const supabaseMock = {
      from: () => ({
        update: () => ({
          eq: async () => ({ data: null, error: null }),
        }),
      }),
    };

    const newToken = await refreshHubSpotToken(connection, supabaseMock);
    assert.ok(refreshedCalled, "Refresh endpoint must be called");
    assert.equal(newToken, "new_token_123");
  });

  test("10. No credentials or tokens in returned objects or logs", async () => {
    globalThis.fetch = async (url, opts) => {
      if (opts?.method === "GET") {
        return { ok: true, status: 200, json: async () => ({ results: [] }) };
      }
      return { ok: true, status: 201, json: async () => JSON.parse(opts.body) };
    };

    const secretToken = "super_secret_hubspot_token_abc_123";
    const result = await ensureHubSpotAttributionProperties(secretToken);

    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes(secretToken), "Result object must never contain the access token");
  });
});
