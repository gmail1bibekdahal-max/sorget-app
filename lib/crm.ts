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

export { triggerHubSpotSync, refreshHubSpotToken } from "./crm-sync";

/**
 * Push a lead to HubSpot via REST API (server-side only).
 */
export async function syncLeadToHubSpot(
  accessToken: string,
  properties: Record<string, string>
): Promise<CrmSyncResult> {
  try {
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
    });

    if (res.status === 409) {
      // Contact already exists — try PATCH by email
      const email = properties.email;
      if (email) {
        const patchRes = await fetch(
          `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ properties }),
          }
        );
        const patchData = await patchRes.json();
        if (patchRes.ok) return { success: true, external_contact_id: patchData.id };
        return { success: false, error: patchData.message };
      }
    }

    const data = await res.json();
    if (!res.ok) return { success: false, error: data.message || "HubSpot API error" };
    return { success: true, external_contact_id: data.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}