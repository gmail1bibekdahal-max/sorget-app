/**
 * Phase 1.1 — Workspace RLS Security & Membership Isolation Regression Tests
 *
 * Requirements:
 * A. User A cannot add themselves to User B's workspace.
 * B. User A cannot read User B's workspace data.
 * C. User A cannot modify User B's workspace data.
 * D. Legitimate workspace creation still works.
 * E. Legitimate membership/invitation flow still works.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Phase 1.1 — Workspace RLS Security & Tenant Isolation", () => {
  // Simulates Postgres RLS policy engine for workspaces and workspace_members
  function createDatabaseState() {
    let workspaces = [
      { id: "ws_user_b", name: "User B Workspace", slug: "user-b-ws" },
    ];

    let workspaceMembers = [
      { id: "wm_1", workspace_id: "ws_user_b", user_id: "user_b", role: "owner" },
    ];

    let projects = [
      { id: "proj_b1", workspace_id: "ws_user_b", user_id: "user_b", name: "B Project", tracking_id: "attr_b1" },
    ];

    let leads = [
      { id: "lead_b1", project_id: "proj_b1", email: "secret@lead.com", channel: "Direct" },
    ];

    function isWorkspaceMember(wsId, authUid) {
      return workspaceMembers.some((m) => m.workspace_id === wsId && m.user_id === authUid);
    }

    // RLS: workspace_members INSERT policy (0007_invitations_and_rls_fix.sql)
    function insertWorkspaceMember(authUid, newMember) {
      const isOwnerOrAdmin = workspaceMembers.some(
        (m) => m.workspace_id === newMember.workspace_id &&
               m.user_id === authUid &&
               ["owner", "admin"].includes(m.role)
      );

      const hasNoExistingMembers = !workspaceMembers.some(
        (m) => m.workspace_id === newMember.workspace_id
      );

      const isInitialOwnerClaim = (
        newMember.user_id === authUid &&
        newMember.role === "owner" &&
        hasNoExistingMembers
      );

      if (!isOwnerOrAdmin && !isInitialOwnerClaim) {
        throw new Error("RLS violation: new row violates row-level security policy for table workspace_members");
      }

      const row = { id: `wm_${Date.now()}_${Math.random()}`, ...newMember };
      workspaceMembers.push(row);
      return row;
    }

    // RLS: workspaces SELECT policy
    function selectWorkspaces(authUid) {
      return workspaces.filter((ws) => isWorkspaceMember(ws.id, authUid));
    }

    // RLS: workspaces UPDATE policy
    function updateWorkspace(authUid, wsId, updates) {
      const isOwnerOrAdmin = workspaceMembers.some(
        (m) => m.workspace_id === wsId && m.user_id === authUid && ["owner", "admin"].includes(m.role)
      );
      if (!isOwnerOrAdmin) {
        throw new Error("RLS violation: update on table workspaces denied");
      }
      const ws = workspaces.find((w) => w.id === wsId);
      if (ws) Object.assign(ws, updates);
      return ws;
    }

    // RLS: projects SELECT policy
    function selectProjects(authUid) {
      return projects.filter(
        (p) => p.user_id === authUid || (p.workspace_id && isWorkspaceMember(p.workspace_id, authUid))
      );
    }

    // RLS: leads SELECT policy
    function selectLeads(authUid) {
      const accessibleProjectIds = selectProjects(authUid).map((p) => p.id);
      return leads.filter((l) => accessibleProjectIds.includes(l.project_id));
    }

    return {
      workspaces,
      workspaceMembers,
      projects,
      leads,
      insertWorkspaceMember,
      selectWorkspaces,
      updateWorkspace,
      selectProjects,
      selectLeads,
    };
  }

  it("A. User A cannot add themselves to User B's workspace", () => {
    const db = createDatabaseState();

    // User A attempts to insert themselves into User B's workspace
    assert.throws(
      () => {
        db.insertWorkspaceMember("user_a", {
          workspace_id: "ws_user_b",
          user_id: "user_a",
          role: "member",
        });
      },
      /RLS violation/
    );

    // User A attempts to insert themselves as owner into User B's workspace
    assert.throws(
      () => {
        db.insertWorkspaceMember("user_a", {
          workspace_id: "ws_user_b",
          user_id: "user_a",
          role: "owner",
        });
      },
      /RLS violation/
    );

    // Verify User A was not added
    const membersInB = db.workspaceMembers.filter((m) => m.workspace_id === "ws_user_b");
    assert.equal(membersInB.length, 1);
    assert.equal(membersInB[0].user_id, "user_b");
  });

  it("B. User A cannot read User B's workspace data", () => {
    const db = createDatabaseState();

    // User A tries to view User B's workspaces
    const visibleWorkspaces = db.selectWorkspaces("user_a");
    assert.equal(visibleWorkspaces.length, 0, "User A must not see User B's workspace");

    // User A tries to view User B's projects
    const visibleProjects = db.selectProjects("user_a");
    assert.equal(visibleProjects.length, 0, "User A must not see User B's projects");

    // User A tries to view User B's leads
    const visibleLeads = db.selectLeads("user_a");
    assert.equal(visibleLeads.length, 0, "User A must not see User B's leads");
  });

  it("C. User A cannot modify User B's workspace data", () => {
    const db = createDatabaseState();

    assert.throws(
      () => {
        db.updateWorkspace("user_a", "ws_user_b", { name: "Hacked Workspace" });
      },
      /RLS violation/
    );

    const ws = db.workspaces.find((w) => w.id === "ws_user_b");
    assert.equal(ws.name, "User B Workspace", "Workspace name must remain unchanged");
  });

  it("D. Legitimate workspace creation still works", () => {
    const db = createDatabaseState();

    // User A creates their own new workspace
    const newWs = { id: "ws_user_a", name: "User A Corp", slug: "user-a-corp" };
    db.workspaces.push(newWs);

    // User A claims initial owner role on the new workspace with 0 members
    const member = db.insertWorkspaceMember("user_a", {
      workspace_id: "ws_user_a",
      user_id: "user_a",
      role: "owner",
    });

    assert.equal(member.workspace_id, "ws_user_a");
    assert.equal(member.user_id, "user_a");
    assert.equal(member.role, "owner");

    // User A can now read their own workspace
    const userAWorkspaces = db.selectWorkspaces("user_a");
    assert.equal(userAWorkspaces.length, 1);
    assert.equal(userAWorkspaces[0].id, "ws_user_a");
  });

  it("E. Legitimate membership/invitation flow still works", () => {
    const db = createDatabaseState();

    // User B (owner) legitimately adds User C to their workspace
    const newMember = db.insertWorkspaceMember("user_b", {
      workspace_id: "ws_user_b",
      user_id: "user_c",
      role: "member",
    });

    assert.equal(newMember.workspace_id, "ws_user_b");
    assert.equal(newMember.user_id, "user_c");
    assert.equal(newMember.role, "member");

    // User C can now view User B's workspace data
    const userCWorkspaces = db.selectWorkspaces("user_c");
    assert.equal(userCWorkspaces.length, 1);
    assert.equal(userCWorkspaces[0].id, "ws_user_b");
  });
});
