"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  canInviteMembers,
  canModifyRoles,
  canRemoveMember,
  createWorkspaceInvitation,
  acceptWorkspaceInvitation,
  InvitationRole,
} from "@/lib/team";

/**
 * Creates a team invitation for the specified email and role.
 * Does NOT assign the inviter's user_id to the invitee.
 * Returns pending invitation state without falsely claiming an email was delivered.
 */
export async function inviteTeamMember(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const workspaceId = (formData.get("workspace_id") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const role = ((formData.get("role") as string)?.trim() || "member") as InvitationRole;

  if (!workspaceId || !email) {
    redirect("/dashboard?error=" + encodeURIComponent("Workspace ID and email are required."));
  }

  const validRoles: InvitationRole[] = ["admin", "member", "viewer"];
  if (!validRoles.includes(role)) {
    redirect("/dashboard?error=" + encodeURIComponent("Invalid member role."));
  }

  // Check caller permission: must be owner or admin
  const { data: callerMember } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!callerMember || !canInviteMembers(callerMember.role)) {
    redirect("/dashboard?error=" + encodeURIComponent("Permission denied: You must be an owner or admin to invite members."));
  }

  // Check if a pending invitation already exists for this email
  const { data: existingInvite } = await supabase
    .from("workspace_invitations")
    .select("id, status")
    .eq("workspace_id", workspaceId)
    .eq("email", email)
    .eq("status", "pending")
    .single();

  if (existingInvite) {
    redirect(
      `/dashboard/team?workspace=${workspaceId}&notice=` +
        encodeURIComponent(`An invitation is already pending for ${email}.`)
    );
  }

  // Create proper invitation record via secure helper (never assigning inviter's user_id as member)
  const result = await createWorkspaceInvitation(supabase, {
    workspaceId,
    email,
    role,
    invitedByUserId: user.id,
  });

  if (!result.success) {
    redirect(`/dashboard/team?workspace=${workspaceId}&error=` + encodeURIComponent(result.error || "Failed to create invitation."));
  }

  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard");
  redirect(
    `/dashboard/team?workspace=${workspaceId}&notice=` +
      encodeURIComponent(`Invitation created for ${email} as ${role}. Status: Pending acceptance.`)
  );
}

/**
 * Revokes a pending workspace invitation.
 */
export async function revokeInvitation(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const workspaceId = (formData.get("workspace_id") as string)?.trim();
  const invitationId = (formData.get("invitation_id") as string)?.trim();

  if (!workspaceId || !invitationId) {
    redirect("/dashboard?error=" + encodeURIComponent("Missing required fields."));
  }

  // Check caller role: must be owner or admin
  const { data: callerMember } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!callerMember || !canInviteMembers(callerMember.role)) {
    redirect("/dashboard?error=" + encodeURIComponent("Permission denied."));
  }

  const { error: updateError } = await supabase
    .from("workspace_invitations")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", invitationId)
    .eq("workspace_id", workspaceId);

  if (updateError) {
    redirect(`/dashboard/team?workspace=${workspaceId}&error=` + encodeURIComponent(updateError.message));
  }

  revalidatePath("/dashboard/team");
  redirect(`/dashboard/team?workspace=${workspaceId}&notice=` + encodeURIComponent("Invitation revoked."));
}

/**
 * Accepts a workspace invitation using its secure token.
 */
export async function acceptInvitationAction(token: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`);
  }

  // Use admin client to perform the membership insert and invitation update safely
  const adminClient = createAdminClient();
  const result = await acceptWorkspaceInvitation(adminClient, {
    token,
    userId: user.id,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/dashboard");
  return { success: true, workspaceId: result.workspaceId };
}

export async function updateMemberRole(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const workspaceId = (formData.get("workspace_id") as string)?.trim();
  const memberId = (formData.get("member_id") as string)?.trim();
  const newRole = (formData.get("role") as string)?.trim();

  if (!workspaceId || !memberId || !newRole) {
    redirect("/dashboard?error=" + encodeURIComponent("Missing required fields."));
  }

  const validRoles = ["owner", "admin", "member", "viewer"];
  if (!validRoles.includes(newRole)) {
    redirect("/dashboard?error=" + encodeURIComponent("Invalid role."));
  }

  // Only owner can change roles
  const { data: callerMember } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!callerMember || !canModifyRoles(callerMember.role)) {
    redirect("/dashboard?error=" + encodeURIComponent("Only workspace owners can modify member roles."));
  }

  const { error: updateError } = await supabase
    .from("workspace_members")
    .update({ role: newRole })
    .eq("id", memberId)
    .eq("workspace_id", workspaceId);

  if (updateError) {
    redirect("/dashboard?error=" + encodeURIComponent(updateError.message));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/team");
  redirect(`/dashboard/team?workspace=${workspaceId}&success=` + encodeURIComponent("Member role updated."));
}

export async function removeMember(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const workspaceId = (formData.get("workspace_id") as string)?.trim();
  const memberId = (formData.get("member_id") as string)?.trim();

  if (!workspaceId || !memberId) {
    redirect("/dashboard?error=" + encodeURIComponent("Missing required fields."));
  }

  // Check caller role: must be owner or admin
  const { data: callerMember } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!callerMember || !canInviteMembers(callerMember.role)) {
    redirect("/dashboard?error=" + encodeURIComponent("Permission denied."));
  }

  // Prevent removing the sole workspace owner
  const { data: targetMember } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("id", memberId)
    .single();

  if (targetMember?.role === "owner") {
    const { data: allOwners } = await supabase
      .from("workspace_members")
      .select("id, role")
      .eq("workspace_id", workspaceId)
      .eq("role", "owner");

    if (!allOwners || allOwners.length <= 1) {
      redirect("/dashboard/team?workspace=" + workspaceId + "&error=" + encodeURIComponent("Cannot remove the sole workspace owner."));
    }
  }

  const { error: deleteError } = await supabase
    .from("workspace_members")
    .delete()
    .eq("id", memberId)
    .eq("workspace_id", workspaceId);

  if (deleteError) {
    redirect("/dashboard/team?workspace=" + workspaceId + "&error=" + encodeURIComponent(deleteError.message));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/team");
  redirect(`/dashboard/team?workspace=${workspaceId}&notice=` + encodeURIComponent("Member removed from workspace."));
}