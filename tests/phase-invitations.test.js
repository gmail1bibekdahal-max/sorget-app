/**
 * Phase 1.2 — Team Invitation Bug Fix & Secure Workflow Regression Tests
 *
 * Requirements:
 * - inviter creates invitation
 * - invitation belongs to correct workspace
 * - invited email is stored correctly
 * - inviter is stored as invited_by
 * - invitee is not incorrectly assigned inviter's user_id
 * - unauthorized users cannot create invitations
 * - expired/invalid invitations cannot be accepted
 * - accepting an invitation creates membership for the correct authenticated user
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canInviteMembers,
  createWorkspaceInvitation,
  acceptWorkspaceInvitation,
  isInvitationValid,
  generateInvitationToken,
} from "../src/team.js";

describe("Phase 1.2 — Team Invitation Bug Fix & Secure Architecture", () => {
  // Mock Supabase client for invitations & membership
  function createMockSupabaseClient() {
    const invitations = [];
    const workspaceMembers = [
      { id: "wm_owner", workspace_id: "ws_acme", user_id: "usr_alice", role: "owner" },
      { id: "wm_admin", workspace_id: "ws_acme", user_id: "usr_bob", role: "admin" },
      { id: "wm_member", workspace_id: "ws_acme", user_id: "usr_charlie", role: "member" },
      { id: "wm_viewer", workspace_id: "ws_acme", user_id: "usr_david", role: "viewer" },
    ];

    return {
      _invitations: invitations,
      _workspaceMembers: workspaceMembers,
      from(table) {
        if (table === "workspace_invitations") {
          return {
            insert(records) {
              const inserted = records.map((r) => ({
                id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                created_at: new Date().toISOString(),
                ...r,
              }));
              invitations.push(...inserted);
              return {
                select: () => ({
                  single: async () => ({ data: inserted[0], error: null }),
                }),
              };
            },
            select(cols = "*") {
              return {
                eq(col, val) {
                  return {
                    single: async () => {
                      const found = invitations.find((i) => i[col] === val);
                      if (!found) return { data: null, error: new Error("Not found") };
                      return { data: { ...found }, error: null };
                    },
                    eq(col2, val2) {
                      return {
                        single: async () => {
                          const found = invitations.find((i) => i[col] === val && i[col2] === val2);
                          if (!found) return { data: null, error: new Error("Not found") };
                          return { data: { ...found }, error: null };
                        },
                      };
                    },
                  };
                },
              };
            },
            update(updates) {
              return {
                eq(col, val) {
                  const inv = invitations.find((i) => i[col] === val);
                  if (inv) Object.assign(inv, updates);
                  return { error: null };
                },
              };
            },
          };
        }

        if (table === "workspace_members") {
          return {
            select(cols = "*") {
              return {
                eq(col1, val1) {
                  return {
                    eq(col2, val2) {
                      return {
                        single: async () => {
                          const m = workspaceMembers.find(
                            (item) => item[col1] === val1 && item[col2] === val2
                          );
                          if (!m) return { data: null, error: new Error("Member not found") };
                          return { data: m, error: null };
                        },
                      };
                    },
                  };
                },
              };
            },
            insert(records) {
              const inserted = records.map((r) => ({
                id: `wm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                ...r,
              }));
              workspaceMembers.push(...inserted);
              return { error: null };
            },
          };
        }
      },
    };
  }

  it("1. Inviter creates invitation with correct workspace_id, email, and invited_by", async () => {
    const supabase = createMockSupabaseClient();

    const result = await createWorkspaceInvitation(supabase, {
      workspaceId: "ws_acme",
      email: "colleague@example.com",
      role: "admin",
      invitedByUserId: "usr_alice",
    });

    assert.equal(result.success, true);
    assert.ok(result.invitation);
    assert.equal(result.invitation.workspace_id, "ws_acme");
    assert.equal(result.invitation.email, "colleague@example.com");
    assert.equal(result.invitation.role, "admin");
    assert.equal(result.invitation.invited_by, "usr_alice");
    assert.equal(result.invitation.status, "pending");
    assert.ok(result.invitation.token, "Must generate secure token");
    assert.ok(new Date(result.invitation.expires_at) > new Date(), "Must have future expiry");
  });

  it("2. Invitee is NOT incorrectly assigned inviter's user_id in workspace_members", async () => {
    const supabase = createMockSupabaseClient();

    const initialMemberCount = supabase._workspaceMembers.length;

    // Creating an invitation must NOT touch workspace_members
    await createWorkspaceInvitation(supabase, {
      workspaceId: "ws_acme",
      email: "newuser@example.com",
      role: "member",
      invitedByUserId: "usr_alice", // Alice is inviter
    });

    // Verify workspace_members count did not increase upon invite creation
    assert.equal(supabase._workspaceMembers.length, initialMemberCount);

    // Verify no member row exists with Alice's user_id having a duplicate or modified membership
    const aliceMemberships = supabase._workspaceMembers.filter(
      (m) => m.workspace_id === "ws_acme" && m.user_id === "usr_alice"
    );
    assert.equal(aliceMemberships.length, 1);
    assert.equal(aliceMemberships[0].role, "owner"); // Still original owner, not changed to member
  });

  it("3. Unauthorized users (member, viewer) cannot create invitations", () => {
    assert.equal(canInviteMembers("owner"), true);
    assert.equal(canInviteMembers("admin"), true);
    assert.equal(canInviteMembers("member"), false, "Member must not have invite permissions");
    assert.equal(canInviteMembers("viewer"), false, "Viewer must not have invite permissions");
    assert.equal(canInviteMembers(null), false);
  });

  it("4. Expired or invalid invitations cannot be accepted", async () => {
    const supabase = createMockSupabaseClient();

    // Expired token
    const expiredToken = "expired_token_123";
    supabase._invitations.push({
      id: "inv_exp",
      workspace_id: "ws_acme",
      email: "late@example.com",
      role: "member",
      token: expiredToken,
      invited_by: "usr_alice",
      status: "pending",
      expires_at: new Date(Date.now() - 10000).toISOString(), // 10s in past
    });

    const expiredResult = await acceptWorkspaceInvitation(supabase, {
      token: expiredToken,
      userId: "usr_late",
    });

    assert.equal(expiredResult.success, false);
    assert.match(expiredResult.error, /expired/i);

    // Non-existent token
    const invalidResult = await acceptWorkspaceInvitation(supabase, {
      token: "non_existent_token",
      userId: "usr_random",
    });
    assert.equal(invalidResult.success, false);
    assert.match(invalidResult.error, /invalid/i);
  });

  it("5. Accepting an invitation creates membership for the correct authenticated user", async () => {
    const supabase = createMockSupabaseClient();
    const token = generateInvitationToken();

    supabase._invitations.push({
      id: "inv_valid",
      workspace_id: "ws_acme",
      email: "invited_dev@example.com",
      role: "admin",
      token,
      invited_by: "usr_alice",
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    });

    // Accepting user is Eve (usr_eve)
    const result = await acceptWorkspaceInvitation(supabase, {
      token,
      userId: "usr_eve",
    });

    assert.equal(result.success, true);
    assert.equal(result.workspaceId, "ws_acme");

    // Verify workspace_members now contains usr_eve with admin role
    const eveMember = supabase._workspaceMembers.find(
      (m) => m.workspace_id === "ws_acme" && m.user_id === "usr_eve"
    );
    assert.ok(eveMember, "Eve must now be in workspace_members");
    assert.equal(eveMember.role, "admin");

    // Verify invitation is marked as accepted
    const updatedInv = supabase._invitations.find((i) => i.token === token);
    assert.equal(updatedInv.status, "accepted");

    // Attempting to accept again must fail
    const duplicateAccept = await acceptWorkspaceInvitation(supabase, {
      token,
      userId: "usr_someone_else",
    });
    assert.equal(duplicateAccept.success, false);
    assert.match(duplicateAccept.error, /already/i);
  });
});
