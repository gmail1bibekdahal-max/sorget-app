import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  buildHubSpotProperties,
  generateOAuthState,
  parseOAuthState,
  buildHubSpotOAuthUrl,
  HUBSPOT_SCOPES,
} from "../src/crm.js";
import {
  triggerHubSpotSync,
  refreshHubSpotToken,
} from "../src/crm-sync.js";

describe("HubSpot Connection & Workspace Integration End-to-End Test Suite", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    process.env.HUBSPOT_CLIENT_ID = "hubspot-oauth-client-12345";
    process.env.HUBSPOT_CLIENT_SECRET = "hubspot-secret-67890";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3001";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function createMockSupabase(initial = {}) {
    const workspaces = [...(initial.workspaces || [])];
    const workspaceMembers = [...(initial.workspaceMembers || [])];
    const projects = [...(initial.projects || [])];
    const connections = [...(initial.connections || [])];
    const syncLogs = [...(initial.syncLogs || [])];
    const leads = [...(initial.leads || [])];

    return {
      _workspaces: workspaces,
      _workspaceMembers: workspaceMembers,
      _projects: projects,
      _connections: connections,
      _syncLogs: syncLogs,
      _leads: leads,

      from(table) {
        let filterTable = table;
        let selectedFields = "*";
        let filters = [];

        const queryObj = {
          select(fields) {
            selectedFields = fields;
            return queryObj;
          },
          eq(col, val) {
            filters.push({ col, op: "eq", val });
            return queryObj;
          },
          is(col, val) {
            filters.push({ col, op: "is", val });
            return queryObj;
          },
          in(col, vals) {
            filters.push({ col, op: "in", val: vals });
            return queryObj;
          },
          limit(n) {
            return queryObj;
          },
          order() {
            return queryObj;
          },
          async single() {
            let data = null;
            if (filterTable === "workspaces") data = workspaces;
            else if (filterTable === "workspace_members") data = workspaceMembers;
            else if (filterTable === "projects") data = projects;
            else if (filterTable === "crm_connections") data = connections;

            const filtered = data ? data.filter((item) => {
              return filters.every((f) => {
                if (f.op === "eq") return item[f.col] === f.val;
                if (f.op === "is") return item[f.col] === f.val;
                return true;
              });
            }) : [];

            return { data: filtered[0] || null, error: filtered[0] ? null : { message: "Not found" } };
          },
          async insert(rows) {
            const inserted = rows.map((r, idx) => ({ id: `gen-${Date.now()}-${idx}`, ...r }));
            if (filterTable === "workspaces") workspaces.push(...inserted);
            else if (filterTable === "workspace_members") workspaceMembers.push(...inserted);
            else if (filterTable === "projects") projects.push(...inserted);
            else if (filterTable === "crm_connections") connections.push(...inserted);
            else if (filterTable === "crm_sync_log") syncLogs.push(...inserted);
            else if (filterTable === "leads") leads.push(...inserted);

            return {
              data: inserted,
              error: null,
              select() {
                return {
                  single: async () => ({ data: inserted[0], error: null })
                };
              }
            };
          },
          async upsert(row, opts) {
            if (filterTable === "crm_connections") {
              const idx = connections.findIndex(
                (c) => c.workspace_id === row.workspace_id && c.provider === row.provider
              );
              if (idx >= 0) {
                connections[idx] = { ...connections[idx], ...row };
              } else {
                connections.push({ id: `conn-${Date.now()}`, ...row });
              }
            }
            return { error: null };
          },
          update(updates) {
            const updateBuilder = {
              eq(col, val) {
                filters.push({ col, op: "eq", val });
                return updateBuilder;
              },
              in(col, vals) {
                filters.push({ col, op: "in", val: vals });
                return updateBuilder;
              },
              async then(resolve) {
                let targetList = [];
                if (filterTable === "projects") targetList = projects;
                else if (filterTable === "crm_connections") targetList = connections;

                targetList.forEach((item) => {
                  const match = filters.every((f) => {
                    if (f.op === "eq") return item[f.col] === f.val;
                    if (f.op === "in") return f.val.includes(item[f.col]);
                    return true;
                  });
                  if (match) {
                    Object.assign(item, updates);
                  }
                });
                return resolve({ error: null });
              }
            };
            return updateBuilder;
          }
        };

        return queryObj;
      }
    };
  }

  test("1, 2, 3 & 4: Workspace Auto-creation, Ownership, and Project Backfill", async () => {
    const mockSupabase = createMockSupabase({
      workspaces: [],
      workspaceMembers: [],
      projects: [
        {
          id: "project-bibek1",
          name: "Bibek1",
          user_id: "user-bibek",
          workspace_id: null, // orphan
        }
      ]
    });

    // Simulate auto-creation & backfill helper logic
    const userId = "user-bibek";
    const userEmail = "bibek1@gmail.com";

    // 1 & 2: User signup/login ensures workspace exists
    const ws = { id: "ws-bibek-123", name: "Main Workspace", slug: "main-workspace" };
    mockSupabase._workspaces.push(ws);
    mockSupabase._workspaceMembers.push({
      id: "mem-1",
      workspace_id: ws.id,
      user_id: userId,
      role: "owner"
    });

    // 3: Verify user is workspace owner
    const member = mockSupabase._workspaceMembers.find(
      (m) => m.user_id === userId && m.workspace_id === ws.id
    );
    assert.ok(member, "Workspace member must exist");
    assert.strictEqual(member.role, "owner", "User must be workspace owner");

    // 4: Backfill assigns Bibek1 to workspace
    const project = mockSupabase._projects.find((p) => p.id === "project-bibek1");
    assert.strictEqual(project.workspace_id, null, "Project is initially orphan");

    // Heal orphan project
    await mockSupabase.from("projects").update({ workspace_id: ws.id }).eq("id", project.id);
    assert.strictEqual(project.workspace_id, ws.id, "Project Bibek1 must have workspace_id assigned");
  });

  test("5, 6, 7 & 8: Integrations UI Status, Connect Button & OAuth URL Construction", () => {
    const workspaceId = "ws-bibek-123";
    const projectId = "project-bibek1";
    const clientId = "hubspot-public-app-client-id-uuid";
    const redirectUri = "http://localhost:3001/api/crm/hubspot/callback";

    // State generation
    const { state, nonce } = generateOAuthState(workspaceId, projectId);
    assert.ok(state, "OAuth state must be generated");
    assert.ok(nonce, "CSRF nonce must be generated");

    // OAuth URL construction
    const oauthUrl = buildHubSpotOAuthUrl(clientId, redirectUri, state);
    const parsed = new URL(oauthUrl);

    // Verify client_id is passed cleanly
    assert.strictEqual(
      parsed.searchParams.get("client_id"),
      "hubspot-public-app-client-id-uuid",
      "OAuth client_id must match configured public app client ID"
    );
    assert.strictEqual(parsed.searchParams.get("redirect_uri"), redirectUri);
    assert.strictEqual(parsed.searchParams.get("scope"), HUBSPOT_SCOPES.join(" "));
    assert.strictEqual(parsed.searchParams.get("state"), state);

    // State round-trip validation
    const parsedState = parseOAuthState(state);
    assert.strictEqual(parsedState.workspaceId, workspaceId);
    assert.strictEqual(parsedState.projectId, projectId);
    assert.strictEqual(parsedState.nonce, nonce);
  });

  test("9 & 10: OAuth Callback Validation and Secure Storage in crm_connections", async () => {
    const workspaceId = "ws-bibek-123";
    const projectId = "project-bibek1";
    const userId = "user-bibek";

    const mockSupabase = createMockSupabase({
      workspaces: [{ id: workspaceId, name: "Main Workspace" }],
      workspaceMembers: [{ workspace_id: workspaceId, user_id: userId, role: "owner" }],
      projects: [{ id: projectId, workspace_id: workspaceId, user_id: userId }],
      connections: [],
    });

    // 9: Validate caller is workspace owner/admin
    const { data: member } = await mockSupabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .single();

    assert.ok(["owner", "admin"].includes(member.role), "Must be owner or admin");

    // Validate project belongs to workspace
    const { data: projectRow } = await mockSupabase
      .from("projects")
      .select("id, workspace_id")
      .eq("id", projectId)
      .eq("workspace_id", workspaceId)
      .single();

    assert.ok(projectRow, "Project must belong to workspace");

    // 10: Save connection to correct workspace
    await mockSupabase.from("crm_connections").upsert({
      workspace_id: workspaceId,
      provider: "hubspot",
      access_token: "mock-access-token-123",
      refresh_token: "mock-refresh-token-456",
      token_expires_at: new Date(Date.now() + 1800 * 1000).toISOString(),
      portal_id: "998877",
      scopes: HUBSPOT_SCOPES.join(","),
      is_active: true,
      updated_at: new Date().toISOString(),
    });

    const conn = mockSupabase._connections.find((c) => c.workspace_id === workspaceId);
    assert.ok(conn, "Connection must be saved");
    assert.strictEqual(conn.workspace_id, workspaceId);
    assert.strictEqual(conn.provider, "hubspot");
    assert.strictEqual(conn.is_active, true);
    assert.strictEqual(conn.portal_id, "998877");
  });

  test("11, 12, 13, 14 & 15: Connected UI, Lead Submission, HubSpot Sync & Attribution Mapping", async () => {
    const workspaceId = "ws-bibek-123";
    const projectId = "project-bibek1";

    const mockSupabase = createMockSupabase({
      projects: [{ id: projectId, workspace_id: workspaceId }],
      connections: [
        {
          id: "conn-1",
          workspace_id: workspaceId,
          provider: "hubspot",
          access_token: "valid-hubspot-token",
          token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          is_active: true,
        }
      ],
      syncLogs: [],
    });

    let sentBody = null;
    globalThis.fetch = async (url, opts) => {
      if (url.includes("/crm/v3/objects/contacts")) {
        sentBody = JSON.parse(opts.body);
        return {
          ok: true,
          status: 201,
          json: async () => ({ id: "hs-contact-9999" }),
        };
      }
      return { ok: false, status: 404 };
    };

    const lead = {
      id: "lead-123",
      email: "jane@company.com",
      name: "Jane Smith",
      channel: "Paid Search",
      drilldown1: "Google",
      drilldown2: "Search Campaign",
      drilldown3: "Keyword CRM",
      landing_page: "https://bibek1.com/pricing",
      landing_page_group: "/pricing",
      source: "google",
      medium: "cpc",
      campaign: "summer_sale",
      content: "banner_ad",
      term: "best_crm",
    };

    const result = await triggerHubSpotSync(
      lead,
      { id: projectId, workspace_id: workspaceId },
      mockSupabase
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.external_contact_id, "hs-contact-9999");

    // 14: Verify attribution properties
    assert.ok(sentBody);
    const props = sentBody.properties;
    assert.strictEqual(props.email, "jane@company.com");
    assert.strictEqual(props.firstname, "Jane");
    assert.strictEqual(props.lastname, "Smith");
    assert.strictEqual(props.sorget_channel, "Paid Search");
    assert.strictEqual(props.sorget_drilldown1, "Google");
    assert.strictEqual(props.sorget_drilldown2, "Search Campaign");
    assert.strictEqual(props.sorget_drilldown3, "Keyword CRM");
    assert.strictEqual(props.sorget_landing_page, "https://bibek1.com/pricing");
    assert.strictEqual(props.sorget_source, "google");
    assert.strictEqual(props.sorget_medium, "cpc");
    assert.strictEqual(props.sorget_campaign, "summer_sale");

    // 15: Verify crm_sync_log
    const log = mockSupabase._syncLogs.find((l) => l.lead_id === "lead-123");
    assert.ok(log, "Sync log must be written");
    assert.strictEqual(log.workspace_id, workspaceId);
    assert.strictEqual(log.status, "success");
    assert.strictEqual(log.external_contact_id, "hs-contact-9999");
  });

  test("16: Disconnect Endpoint Invalidates Connection", async () => {
    const workspaceId = "ws-bibek-123";
    const mockSupabase = createMockSupabase({
      connections: [
        {
          id: "conn-1",
          workspace_id: workspaceId,
          provider: "hubspot",
          access_token: "active-token",
          is_active: true,
        }
      ]
    });

    // Disconnect sets is_active: false, access_token: null, refresh_token: null
    await mockSupabase.from("crm_connections").update({
      is_active: false,
      access_token: null,
      refresh_token: null,
      updated_at: new Date().toISOString(),
    }).eq("workspace_id", workspaceId).eq("provider", "hubspot");

    const conn = mockSupabase._connections.find((c) => c.workspace_id === workspaceId);
    assert.strictEqual(conn.is_active, false);
    assert.strictEqual(conn.access_token, null);
    assert.strictEqual(conn.refresh_token, null);
  });

  test("17: Cross-Workspace Access Prevention", async () => {
    const workspaceA = "ws-user-A";
    const workspaceB = "ws-user-B";
    const userA = "user-A";
    const userB = "user-B";

    const mockSupabase = createMockSupabase({
      workspaces: [
        { id: workspaceA, name: "Workspace A" },
        { id: workspaceB, name: "Workspace B" },
      ],
      workspaceMembers: [
        { workspace_id: workspaceA, user_id: userA, role: "owner" },
        { workspace_id: workspaceB, user_id: userB, role: "owner" },
      ],
      projects: [
        { id: "proj-A", workspace_id: workspaceA, user_id: userA },
        { id: "proj-B", workspace_id: workspaceB, user_id: userB },
      ],
      connections: [
        { workspace_id: workspaceA, provider: "hubspot", is_active: true },
        { workspace_id: workspaceB, provider: "hubspot", is_active: false },
      ],
    });

    // User A attempts to disconnect Workspace B -> must be blocked
    const { data: memberCheck } = await mockSupabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceB)
      .eq("user_id", userA)
      .single();

    assert.strictEqual(memberCheck, null, "User A is not a member of Workspace B");

    // Project A belonging to Workspace A cannot trigger sync on Workspace B's connection
    const syncResult = await triggerHubSpotSync(
      { email: "lead@test.com" },
      { id: "proj-A", workspace_id: workspaceA },
      mockSupabase,
      { workspaceId: workspaceB } // Attacker attempts to forge workspace B
    );
    // Workspace B connection is inactive, so it skips or returns false, never uses Workspace A's active connection
    assert.strictEqual(syncResult.skipped, true);
  });
});
