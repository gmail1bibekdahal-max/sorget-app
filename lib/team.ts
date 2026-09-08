import {
  VALID_ROLES as _VALID_ROLES,
  VALID_INVITATION_ROLES as _VALID_INVITATION_ROLES,
  canInviteMembers as _canInviteMembers,
  canModifyRoles as _canModifyRoles,
  canRemoveMember as _canRemoveMember,
  generateInvitationToken as _generateInvitationToken,
  getInvitationExpiry as _getInvitationExpiry,
  isInvitationValid as _isInvitationValid,
  createWorkspaceInvitation as _createWorkspaceInvitation,
  acceptWorkspaceInvitation as _acceptWorkspaceInvitation,
} from "@/src/team.js";

export type TeamRole = "owner" | "admin" | "member" | "viewer";
export type InvitationRole = "admin" | "member" | "viewer";
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: InvitationRole;
  token: string;
  invited_by: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
  updated_at?: string;
}

export const VALID_ROLES = _VALID_ROLES;
export const VALID_INVITATION_ROLES = _VALID_INVITATION_ROLES;
export const canInviteMembers = _canInviteMembers;
export const canModifyRoles = _canModifyRoles;
export const canRemoveMember = _canRemoveMember;
export const generateInvitationToken = _generateInvitationToken;
export const getInvitationExpiry = _getInvitationExpiry;
export const isInvitationValid = _isInvitationValid;
export const createWorkspaceInvitation = _createWorkspaceInvitation;
export const acceptWorkspaceInvitation = _acceptWorkspaceInvitation;
