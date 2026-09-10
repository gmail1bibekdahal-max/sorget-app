export type CrmProvider = "hubspot";

export interface CrmConnection {
  id: string;
  workspace_id: string;
  provider: CrmProvider;
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  portal_id?: string | null;
  is_active: boolean;
}

export interface CrmSyncResult {
  success: boolean;
  external_contact_id?: string;
  error?: string;
}

export {
  HUBSPOT_FIELD_MAP,
  buildHubSpotProperties,
  isTokenExpired,
  buildHubSpotOAuthUrl,
  HUBSPOT_SCOPES,
  generateOAuthState,
  parseOAuthState,
} from "@/src/crm.js";

export { triggerHubSpotSync, refreshHubSpotToken, syncLeadToHubSpot } from "./crm-sync";