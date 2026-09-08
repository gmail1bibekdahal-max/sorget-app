import crypto from "crypto";

export const VALID_ROLES = ["owner", "admin", "member", "viewer"];
export const VALID_INVITATION_ROLES = ["admin", "member", "viewer"];

/**
 * Checks whether the caller's role allows inviting new team members.
 * Only workspace owners and admins can invite members.
 */
export function canInviteMembers(callerRole) {
  if (!callerRole) return false;
  return ["owner", "admin"].includes(callerRole);
}

/**
 * Checks whether the caller's role allows modifying other member roles.
 * Only workspace owners can change member roles.
 */
export function canModifyRoles(callerRole) {
  if (!callerRole) return false;
  return callerRole === "owner";
}

/**
 * Checks whether a member can be removed.
 * Only owners and admins can remove members.
 * The sole workspace owner cannot be removed.
 */
export function canRemoveMember(callerRole, targetMember, allMembersInWs = []) {
  if (!callerRole || !["owner", "admin"].includes(callerRole)) return false;

  if (targetMember.role === "owner") {
    const ownerCount = allMembersInWs.filter((m) => m.role === "owner").length;
    if (ownerCount <= 1) return false;
  }

  return true;
}

/**
 * Generates a cryptographically secure random invitation token.
 */
export function generateInvitationToken() {
  return crypto.randomUUID();
}

/**
 * Calculates standard invitation expiration (7 days from now).
 */
export function getInvitationExpiry(days = 7) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Validates whether an invitation token is still active and valid.
 */
export function isInvitationValid(invitation) {
  if (!invitation) return false;
  if (invitation.status !== "pending") return false;
  const expires = new Date(invitation.expires_at).getTime();
  return expires > Date.now();
}

/**
 * Creates a workspace invitation record in the database.
 * Does NOT assign the inviter's user_id to the invitee.
 */
export async function createWorkspaceInvitation(supabase, params) {
  const { workspaceId, email, role, invitedByUserId } = params;

  if (!workspaceId || !email) {
    return { success: false, error: "Workspace ID and email are required." };
  }

  if (!VALID_INVITATION_ROLES.includes(role)) {
    return { success: false, error: "Invalid role specified for invitation." };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const token = generateInvitationToken();
  const expiresAt = getInvitationExpiry(7);

  const newInvitation = {
    workspace_id: workspaceId,
    email: normalizedEmail,
    role,
    token,
    invited_by: invitedByUserId,
    status: "pending",
    expires_at: expiresAt,
  };

  const { data, error } = await supabase
    .from("workspace_invitations")
    .insert([newInvitation])
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, invitation: data };
}

/**
 * Accepts an invitation using its secure token.
 * Creates a workspace_members record for the accepting user with the invited role,
 * and marks the invitation as accepted.
 */
export async function acceptWorkspaceInvitation(supabase, params) {
  const { token, userId } = params;

  if (!token || !userId) {
    return { success: false, error: "Token and user ID are required." };
  }

  // 1. Fetch invitation
  const { data: invitation, error: fetchErr } = await supabase
    .from("workspace_invitations")
    .select("*")
    .eq("token", token)
    .single();

  if (fetchErr || !invitation) {
    return { success: false, error: "Invalid invitation token." };
  }

  if (invitation.status !== "pending") {
    return { success: false, error: `This invitation has already been ${invitation.status}.` };
  }

  if (!isInvitationValid(invitation)) {
    await supabase
      .from("workspace_invitations")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", invitation.id);

    return { success: false, error: "This invitation has expired." };
  }

  // 2. Check if user is already a member of this workspace
  const { data: existingMember } = await supabase
    .from("workspace_members")
    .select("id, role")
    .eq("workspace_id", invitation.workspace_id)
    .eq("user_id", userId)
    .single();

  if (existingMember) {
    await supabase
      .from("workspace_invitations")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", invitation.id);

    return {
      success: true,
      workspaceId: invitation.workspace_id,
      role: existingMember.role,
    };
  }

  // 3. Add user to workspace_members with the invited role
  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert([
      {
        workspace_id: invitation.workspace_id,
        user_id: userId,
        role: invitation.role,
      },
    ]);

  if (memberError) {
    return { success: false, error: memberError.message };
  }

  // 4. Update invitation status to accepted
  await supabase
    .from("workspace_invitations")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", invitation.id);

  return {
    success: true,
    workspaceId: invitation.workspace_id,
    role: invitation.role,
  };
}
