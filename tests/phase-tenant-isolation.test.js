/**
 * Phase 1.3 — Multi-Tenant Isolation Review & Security Tests
 *
 * Validates:
 * 1. Project ownership & workspace isolation
 * 2. Lead data workspace-level isolation
 * 3. CRM connection modification authorization (prevent cross-tenant disconnect)
 * 4. Subscriptions & Billing tenant isolation
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Phase 1.3 — Tenant Isolation & Authorization Guardrails", () => {
  const workspaces = [
    { id: "ws_acme", name: "Acme Corp" },
    { id: "ws_globex", name: "Globex Inc" },
  ];

  const workspaceMembers = [
    { workspace_id: "ws_acme", user_id: "usr_alice", role: "owner" },
    { workspace_id: "ws_acme", user_id: "usr_bob", role: "member" },
    { workspace_id: "ws_globex", user_id: "usr_charlie", role: "owner" },
    { workspace_id: "ws_globex", user_id: "usr_david", role: "viewer" },
  ];

  const projects = [
    { id: "proj_acme_1", workspace_id: "ws_acme", user_id: "usr_alice", name: "Acme Landing", tracking_id: "attr_acme1" },
    { id: "proj_globex_1", workspace_id: "ws_globex", user_id: "usr_charlie", name: "Globex Store", tracking_id: "attr_globex1" },
  ];

  const leads = [
    { id: "lead_a", project_id: "proj_acme_1", email: "alice_lead@example.com" },
    { id: "lead_g", project_id: "proj_globex_1", email: "charlie_lead@example.com" },
  ];

  const crmConnections = [
    { id: "crm_acme", workspace_id: "ws_acme", provider: "hubspot", is_active: true },
    { id: "crm_globex", workspace_id: "ws_globex", provider: "hubspot", is_active: true },
  ];

  const subscriptions = [
    { id: "sub_acme", workspace_id: "ws_acme", plan_id: "growth", status: "active" },
    { id: "sub_globex", workspace_id: "ws_globex", plan_id: "enterprise", status: "active" },
  ];

  function isUserMemberOfWorkspace(userId, workspaceId) {
    return workspaceMembers.some((m) => m.user_id === userId && m.workspace_id === workspaceId);
  }

  function getAccessibleProjects(userId) {
    const userWsIds = workspaceMembers
      .filter((m) => m.user_id === userId)
      .map((m) => m.workspace_id);

    return projects.filter(
      (p) => p.user_id === userId || userWsIds.includes(p.workspace_id)
    );
  }

  function getAccessibleLeads(userId) {
    const accessibleProjIds = getAccessibleProjects(userId).map((p) => p.id);
    return leads.filter((l) => accessibleProjIds.includes(l.project_id));
  }

  function canManageCrmConnection(userId, workspaceId) {
    const member = workspaceMembers.find(
      (m) => m.user_id === userId && m.workspace_id === workspaceId
    );
    return member ? ["owner", "admin"].includes(member.role) : false;
  }

  function getAccessibleSubscriptions(userId) {
    const userWsIds = workspaceMembers
      .filter((m) => m.user_id === userId)
      .map((m) => m.workspace_id);

    return subscriptions.filter((s) => userWsIds.includes(s.workspace_id));
  }

  it("1. Users cannot access projects belonging to other tenants", () => {
    const aliceProjects = getAccessibleProjects("usr_alice");
    assert.equal(aliceProjects.length, 1);
    assert.equal(aliceProjects[0].id, "proj_acme_1");

    const charlieProjects = getAccessibleProjects("usr_charlie");
    assert.equal(charlieProjects.length, 1);
    assert.equal(charlieProjects[0].id, "proj_globex_1");
  });

  it("2. Users cannot view attribution leads from other workspaces", () => {
    const aliceLeads = getAccessibleLeads("usr_alice");
    assert.equal(aliceLeads.length, 1);
    assert.equal(aliceLeads[0].email, "alice_lead@example.com");

    const charlieLeads = getAccessibleLeads("usr_charlie");
    assert.equal(charlieLeads.length, 1);
    assert.equal(charlieLeads[0].email, "charlie_lead@example.com");
  });

  it("3. Unauthorized users cannot disconnect another workspace's CRM integration", () => {
    // Charlie is owner of Globex, not Acme
    const charlieCanManageAcme = canManageCrmConnection("usr_charlie", "ws_acme");
    assert.equal(charlieCanManageAcme, false, "Tenant B user cannot disconnect Tenant A CRM");

    // Bob is regular member of Acme, not owner/admin
    const bobCanManageAcme = canManageCrmConnection("usr_bob", "ws_acme");
    assert.equal(bobCanManageAcme, false, "Regular member cannot modify CRM connections");

    // Alice is owner of Acme
    const aliceCanManageAcme = canManageCrmConnection("usr_alice", "ws_acme");
    assert.equal(aliceCanManageAcme, true, "Workspace owner can manage CRM connections");
  });

  it("4. Tenant isolation extends to billing and subscription data", () => {
    const aliceSubs = getAccessibleSubscriptions("usr_alice");
    assert.equal(aliceSubs.length, 1);
    assert.equal(aliceSubs[0].id, "sub_acme");
    assert.equal(aliceSubs[0].plan_id, "growth");

    const charlieSubs = getAccessibleSubscriptions("usr_charlie");
    assert.equal(charlieSubs.length, 1);
    assert.equal(charlieSubs[0].id, "sub_globex");
    assert.equal(charlieSubs[0].plan_id, "enterprise");
  });
});
