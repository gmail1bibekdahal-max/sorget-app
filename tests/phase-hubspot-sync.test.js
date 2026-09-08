/**
 * Phase 2 — HubSpot Lead Sync Integration Regression Tests
 *
 * Requirements:
 * A. Lead without HubSpot connection: lead is saved, no crash
 * B. Lead with HubSpot connection: sync function is called
 * C. HubSpot sync succeeds: lead remains saved, sync status is successful in crm_sync_log
 * D. HubSpot sync fails: lead remains saved, failure is recorded in crm_sync_log
 * E. Invalid OAuth token: lead remains saved, sync failure handled safely
 * F. Duplicate email: existing contact is updated (PATCH) rather than creating duplicates
 * G. Attribution fields are passed correctly
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { triggerHubSpotSync, syncLeadToHubSpot, refreshHubSpotToken } from "../src/crm-sync.js";
import { buildHubSpotProperties, HUBSPOT_FIELD_MAP, generateOAuthState, parseOAuthState, HUBSPOT_SCOPES } from "../src/crm.js";

describe("Phase 2 — HubSpot Lead Sync & Error Handling", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function createMockSupabase(options = {}) {
    const crmConnections = options.crmConnections || [];
    const crmSyncLog = [];
    const projects = options.projects || [
      { id: "proj_1", workspace_id: "ws_1", name: "Test Project", tracking_id: "attr_test1" },
    ];

    return {
      _crmSyncLog: crmSyncLog,
      from(table) {
        if (table === "crm_connections") {
          return {
            select(cols = "*") {
              return {
                eq(col1, val1) {
                  return {
                    eq(col2, val2) {
                      return {
                        eq(col3, val3) {
                          return {
                            single: async () => {
                              const found = crmConnections.find(
                                (c) => c[col1] === val1 && c[col2] === val2 && c[col3] === val3
                              );
                              if (!found) return { data: null, error: new Error("No connection") };
                              return { data: found, error: null };
                            },
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
            update() {
              return { eq: () => ({ error: null }) };
            },
          };
        }

        if (table === "projects") {
          return {
            select() {
              return {
                eq(col, val) {
                  return {
                    single: async () => {
                      const p = projects.find((item) => item[col] === val);
                      return { data: p || null, error: p ? null : new Error("Not found") };
                    },
                  };
                },
              };
            },
          };
        }

        if (table === "crm_sync_log") {
          return {
            insert(records) {
              crmSyncLog.push(...records);
              return { error: null };
            },
          };
        }
      },
    };
  }

  const baseLead = {
    id: "lead_123",
    email: "test.visitor@example.com",
    name: "Alex Doe",
    channel: "Paid Search",
    source: "google",
    medium: "cpc",
    campaign: "spring_launch",
    gclid: "gcl_abc999",
    drilldown1: "google",
    drilldown2: "spring_launch",
    landing_page: "https://example.com/pricing",
    submit_page: "https://example.com/signup",
  };

  const project = { id: "proj_1", workspace_id: "ws_1" };

  it("A. Lead without HubSpot connection: lead saved, no crash, gracefully skipped", async () => {
    const supabase = createMockSupabase({ crmConnections: [] });

    const result = await triggerHubSpotSync(baseLead, project, supabase);

    assert.equal(result.success, true);
    assert.equal(result.skipped, true);
    assert.equal(supabase._crmSyncLog.length, 0, "Should not record sync log when not connected");
  });

  it("B. Lead with HubSpot connection: sync function is called with access token", async () => {
    let fetchCalled = false;
    let authHeader = "";

    globalThis.fetch = async (url, opts) => {
      fetchCalled = true;
      authHeader = opts.headers?.Authorization;
      return {
        ok: true,
        status: 201,
        json: async () => ({ id: "hs_contact_999" }),
      };
    };

    const supabase = createMockSupabase({
      crmConnections: [
        {
          id: "conn_1",
          workspace_id: "ws_1",
          provider: "hubspot",
          access_token: "test_access_token_123",
          token_expires_at: new Date(Date.now() + 3600000).toISOString(),
          is_active: true,
        },
      ],
    });

    const result = await triggerHubSpotSync(baseLead, project, supabase);

    assert.equal(fetchCalled, true, "HubSpot API fetch must be called");
    assert.equal(authHeader, "Bearer test_access_token_123");
    assert.equal(result.success, true);
    assert.equal(result.external_contact_id, "hs_contact_999");
  });

  it("C. HubSpot sync succeeds: sync status 'success' is recorded in crm_sync_log", async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 201,
      json: async () => ({ id: "hs_contact_456" }),
    });

    const supabase = createMockSupabase({
      crmConnections: [
        {
          id: "conn_1",
          workspace_id: "ws_1",
          provider: "hubspot",
          access_token: "valid_token",
          token_expires_at: new Date(Date.now() + 3600000).toISOString(),
          is_active: true,
        },
      ],
    });

    const result = await triggerHubSpotSync(baseLead, project, supabase);

    assert.equal(result.success, true);
    assert.equal(supabase._crmSyncLog.length, 1);
    assert.equal(supabase._crmSyncLog[0].status, "success");
    assert.equal(supabase._crmSyncLog[0].external_contact_id, "hs_contact_456");
    assert.equal(supabase._crmSyncLog[0].provider, "hubspot");
    assert.equal(supabase._crmSyncLog[0].direction, "push");
  });

  it("D. HubSpot sync fails: failure status 'error' is recorded in crm_sync_log without throwing", async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      json: async () => ({ message: "Internal server error at HubSpot" }),
    });

    const supabase = createMockSupabase({
      crmConnections: [
        {
          id: "conn_1",
          workspace_id: "ws_1",
          provider: "hubspot",
          access_token: "valid_token",
          token_expires_at: new Date(Date.now() + 3600000).toISOString(),
          is_active: true,
        },
      ],
    });

    const result = await triggerHubSpotSync(baseLead, project, supabase);

    assert.equal(result.success, false);
    assert.match(result.error, /HubSpot/);
    assert.equal(supabase._crmSyncLog.length, 1);
    assert.equal(supabase._crmSyncLog[0].status, "error");
    assert.match(supabase._crmSyncLog[0].error_message, /Internal server error/);
  });

  it("E. Invalid or expired OAuth token: sync failure handled safely and recorded", async () => {
    const expiredTimestamp = new Date(Date.now() - 3600000).toISOString(); // 1 hr in past

    const supabase = createMockSupabase({
      crmConnections: [
        {
          id: "conn_1",
          workspace_id: "ws_1",
          provider: "hubspot",
          access_token: "expired_token",
          token_expires_at: expiredTimestamp,
          refresh_token: null, // No refresh token configured
          is_active: true,
        },
      ],
    });

    const result = await triggerHubSpotSync(baseLead, project, supabase);

    assert.equal(result.success, false);
    assert.match(result.error, /expired/i);
    assert.equal(supabase._crmSyncLog.length, 1);
    assert.equal(supabase._crmSyncLog[0].status, "error");
    assert.match(supabase._crmSyncLog[0].error_message, /expired/i);
  });

  it("F. Duplicate email: existing contact updated (PATCH) when 409 conflict occurs", async () => {
    let postAttempted = false;
    let patchAttempted = false;
    let patchUrl = "";

    globalThis.fetch = async (url, opts) => {
      if (opts.method === "POST") {
        postAttempted = true;
        // HubSpot returns 409 Conflict when contact already exists
        return {
          ok: false,
          status: 409,
          json: async () => ({ message: "Contact already exists. Existing ID: 888" }),
        };
      }
      if (opts.method === "PATCH") {
        patchAttempted = true;
        patchUrl = url;
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "888" }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    };

    const properties = buildHubSpotProperties(baseLead);
    const result = await syncLeadToHubSpot("test_token", properties);

    assert.equal(postAttempted, true, "Must first attempt POST");
    assert.equal(patchAttempted, true, "Must fall back to PATCH on 409 Conflict");
    assert.match(patchUrl, /contacts\/test\.visitor%40example\.com\?idProperty=email/);
    assert.equal(result.success, true);
    assert.equal(result.external_contact_id, "888");
  });

  it("G. Attribution fields are passed correctly in HubSpot payload", () => {
    const fullAttributionLead = {
      email: "growth.lead@acme.com",
      name: "Jane Smith",
      channel: "Paid Social",
      source: "linkedin",
      medium: "paid_social",
      campaign: "b2b_q1",
      gclid: "gcl_fake_123",
      drilldown1: "linkedin",
      drilldown2: "b2b_q1",
      drilldown3: null,
      landing_page: "https://acme.com/case-studies",
      landing_page_group: "/case-studies",
      submit_page: "https://acme.com/book-call",
      last_touch_source: "linkedin_remarketing",
      last_touch_medium: "cpm",
      last_touch_campaign: "re-engage",
    };

    const properties = buildHubSpotProperties(fullAttributionLead);

    assert.equal(properties.email, "growth.lead@acme.com");
    assert.equal(properties.firstname, "Jane");
    assert.equal(properties.lastname, "Smith");
    assert.equal(properties[HUBSPOT_FIELD_MAP.channel], "Paid Social");
    assert.equal(properties[HUBSPOT_FIELD_MAP.source], "linkedin");
    assert.equal(properties[HUBSPOT_FIELD_MAP.medium], "paid_social");
    assert.equal(properties[HUBSPOT_FIELD_MAP.campaign], "b2b_q1");
    assert.equal(properties[HUBSPOT_FIELD_MAP.gclid], "gcl_fake_123");
    assert.equal(properties[HUBSPOT_FIELD_MAP.drilldown1], "linkedin");
    assert.equal(properties[HUBSPOT_FIELD_MAP.drilldown2], "b2b_q1");
    assert.equal(properties[HUBSPOT_FIELD_MAP.landing_page], "https://acme.com/case-studies");
    assert.equal(properties[HUBSPOT_FIELD_MAP.landing_page_group], "/case-studies");
    assert.equal(properties[HUBSPOT_FIELD_MAP.submit_page], "https://acme.com/book-call");
    assert.equal(properties[HUBSPOT_FIELD_MAP.last_touch_source], "linkedin_remarketing");
    assert.equal(properties[HUBSPOT_FIELD_MAP.last_touch_medium], "cpm");
    assert.equal(properties[HUBSPOT_FIELD_MAP.last_touch_campaign], "re-engage");
    assert.equal(properties[HUBSPOT_FIELD_MAP.drilldown3], undefined, "Null fields must not be included");
  });

  // ---------------------------------------------------------------------------
  // NEW TESTS (Phase 2 enhancements)
  // ---------------------------------------------------------------------------

  it("H. refreshHubSpotToken uses /oauth/2026-03/token endpoint (not deprecated v1)", async () => {
    let capturedUrl = "";

    globalThis.fetch = async (url, opts) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: "new_access_token_xyz",
          refresh_token: "new_refresh_token_xyz",
          expires_in: 1800,
        }),
      };
    };

    const mockSupabase = {
      from: () => ({
        update: () => ({ eq: () => ({ error: null }) }),
      }),
    };

    const connection = {
      id: "conn_test",
      refresh_token: "valid_refresh_token",
    };

    const originalClientId = process.env.HUBSPOT_CLIENT_ID;
    const originalClientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    process.env.HUBSPOT_CLIENT_ID = "test_client_id";
    process.env.HUBSPOT_CLIENT_SECRET = "test_client_secret";

    const result = await refreshHubSpotToken(connection, mockSupabase);

    process.env.HUBSPOT_CLIENT_ID = originalClientId;
    process.env.HUBSPOT_CLIENT_SECRET = originalClientSecret;

    assert.equal(result, "new_access_token_xyz", "Must return new access token");
    assert.match(
      capturedUrl,
      /\/oauth\/2026-03\/token/,
      "Must use /oauth/2026-03/token (NOT deprecated /oauth/v1/token)"
    );
    assert.ok(
      !capturedUrl.includes("/oauth/v1/"),
      "Must NOT call deprecated /oauth/v1/token endpoint"
    );
  });

  it("I. Revoked refresh token (401/invalid_grant) marks connection is_active=false", async () => {
    let updatedConnection = null;

    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: "invalid_grant", message: "Refresh token revoked" }),
    });

    const mockSupabase = {
      from: (table) => ({
        update: (data) => ({
          eq: (col, val) => {
            if (table === "crm_connections") {
              updatedConnection = { ...data };
            }
            return { error: null };
          },
        }),
      }),
    };

    const connection = {
      id: "conn_revoked",
      refresh_token: "revoked_refresh_token",
    };

    const originalClientId = process.env.HUBSPOT_CLIENT_ID;
    const originalClientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    process.env.HUBSPOT_CLIENT_ID = "test_client_id";
    process.env.HUBSPOT_CLIENT_SECRET = "test_client_secret";

    const result = await refreshHubSpotToken(connection, mockSupabase);

    process.env.HUBSPOT_CLIENT_ID = originalClientId;
    process.env.HUBSPOT_CLIENT_SECRET = originalClientSecret;

    assert.equal(result, null, "Must return null when refresh token is revoked");
    assert.ok(updatedConnection, "Must update crm_connections row");
    assert.equal(updatedConnection.is_active, false, "Must set is_active=false when token is revoked");
  });

  it("J. Last-touch attribution fields are mapped correctly in HubSpot payload", () => {
    const leadWithLastTouch = {
      email: "lasttouch@example.com",
      name: "Sam Test",
      channel: "Paid Search",
      source: "google",
      medium: "cpc",
      campaign: "first-campaign",
      last_touch_source: "linkedin",
      last_touch_medium: "organic",
      last_touch_campaign: "last-campaign",
      last_touch_content: "variant-b",
      last_touch_term: "attribution software",
    };

    const properties = buildHubSpotProperties(leadWithLastTouch);

    assert.equal(
      properties[HUBSPOT_FIELD_MAP.last_touch_source],
      "linkedin",
      "last_touch_source must be mapped"
    );
    assert.equal(
      properties[HUBSPOT_FIELD_MAP.last_touch_medium],
      "organic",
      "last_touch_medium must be mapped"
    );
    assert.equal(
      properties[HUBSPOT_FIELD_MAP.last_touch_campaign],
      "last-campaign",
      "last_touch_campaign must be mapped"
    );
  });

  it("K. OAuth state generation and parsing round-trip (CSRF safety)", () => {
    const workspaceId = "ws-test-123";
    const projectId = "proj-test-456";

    // Generate state
    const { state, nonce } = generateOAuthState(workspaceId, projectId);

    assert.ok(state, "Must produce a non-empty state string");
    assert.ok(nonce, "Must produce a non-empty nonce");
    assert.ok(state.length > 20, "State must be long enough to contain payload");

    // Parse back
    const parsed = parseOAuthState(state);

    assert.ok(parsed, "Must parse back successfully");
    assert.equal(parsed.workspaceId, workspaceId, "workspaceId must survive round-trip");
    assert.equal(parsed.projectId, projectId, "projectId must survive round-trip");
    assert.equal(parsed.nonce, nonce, "nonce must survive round-trip");

    // Tampered state must fail or return null workspaceId
    const tampered = parseOAuthState("aGVsbG8gd29ybGQ="); // base64url of "hello world"
    assert.ok(!tampered || !tampered.workspaceId, "Tampered/invalid state must not yield a valid workspaceId");

    // Null state must return null
    assert.equal(parseOAuthState(null), null);
    assert.equal(parseOAuthState(""), null);
  });

  it("L. HUBSPOT_SCOPES contains only required contact scopes (principle of least privilege)", () => {
    assert.ok(Array.isArray(HUBSPOT_SCOPES), "HUBSPOT_SCOPES must be an array");
    assert.ok(HUBSPOT_SCOPES.includes("crm.objects.contacts.write"), "Must include contacts write");
    assert.ok(HUBSPOT_SCOPES.includes("crm.objects.contacts.read"), "Must include contacts read");
    assert.ok(HUBSPOT_SCOPES.includes("crm.schemas.contacts.write"), "Must include schema contacts write");
    // Must NOT request unnecessary scopes
    const unnecessaryScopes = ["contacts", "crm.objects.deals.write", "content", "reports", "social"];
    for (const scope of unnecessaryScopes) {
      assert.ok(!HUBSPOT_SCOPES.includes(scope), `Must NOT request unnecessary scope: ${scope}`);
    }
  });
});
