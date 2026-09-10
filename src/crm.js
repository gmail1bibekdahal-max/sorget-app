/**
 * CRM Connector — HubSpot integration helpers.
 * All token operations and contact sync are performed server-side only.
 */

import crypto from "crypto";

// ---------------------------------------------------------------------------
// Field mapping: attribution fields → CRM properties
// ---------------------------------------------------------------------------

export const HUBSPOT_FIELD_MAP = {
  channel: "sorget_channel",
  source: "sorget_source",
  medium: "sorget_medium",
  campaign: "sorget_campaign",
  content: "sorget_content",
  term: "sorget_term",
  gclid: "sorget_gclid",
  drilldown1: "sorget_drilldown1",
  drilldown2: "sorget_drilldown2",
  drilldown3: "sorget_drilldown3",
  landing_page: "sorget_landing_page",
  landing_page_group: "sorget_landing_page_group",
  submit_page: "sorget_submit_page",
  first_touch_source: "sorget_source",
  first_touch_medium: "sorget_medium",
  first_touch_campaign: "sorget_campaign",
  last_touch_source: "sorget_last_touch_source",
  last_touch_medium: "sorget_last_touch_medium",
  last_touch_campaign: "sorget_last_touch_campaign",
};

// ---------------------------------------------------------------------------
// Build CRM property payload from a lead record
// ---------------------------------------------------------------------------

export function buildHubSpotProperties(lead) {
  const props = {};
  for (const [leadField, crmProp] of Object.entries(HUBSPOT_FIELD_MAP)) {
    const val = lead[leadField];
    if (val !== undefined && val !== null && val !== "") {
      props[crmProp] = String(val);
    }
  }
  if (lead.email) props.email = lead.email;
  if (lead.name) {
    const [firstname = "", ...rest] = lead.name.split(" ");
    props.firstname = firstname;
    props.lastname = rest.join(" ") || "";
  }
  return props;
}

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

export function isTokenExpired(expiresAt) {
  if (!expiresAt) return true;
  return new Date(expiresAt) < new Date(Date.now() + 60 * 1000); // 1-min buffer
}

// ---------------------------------------------------------------------------
// OAuth scopes — single source of truth
// Must match exactly what is configured in the HubSpot developer app.
// ---------------------------------------------------------------------------
export const HUBSPOT_SCOPES = [
  "crm.objects.contacts.write",
  "crm.objects.contacts.read",
  "crm.schemas.contacts.write",
];

// ---------------------------------------------------------------------------
// OAuth state helpers — CSRF protection
// State encodes workspaceId + projectId + a random nonce.
// The callback validates the nonce to prevent CSRF attacks.
// ---------------------------------------------------------------------------

/**
 * Generates a cryptographically safe OAuth state value.
 * Encodes workspaceId, projectId, and a random CSRF nonce as base64 JSON.
 * Store the nonce in a short-lived server-side session/cookie to validate on callback.
 */
export function generateOAuthState(workspaceId, projectId) {
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = { workspaceId, projectId, nonce };
  return {
    state: Buffer.from(JSON.stringify(payload)).toString("base64url"),
    nonce,
  };
}

/**
 * Decodes and parses an OAuth state string.
 * Returns { workspaceId, projectId, nonce } or null if invalid.
 */
export function parseOAuthState(rawState) {
  if (!rawState) return null;
  try {
    const decoded = Buffer.from(rawState, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);
    if (!parsed.workspaceId || !parsed.nonce) return null;
    return parsed;
  } catch {
    // Fallback: try legacy plain base64 (atob-style, from earlier implementation)
    try {
      const decoded = Buffer.from(rawState, "base64").toString("utf8");
      const parsed = JSON.parse(decoded);
      if (!parsed.workspaceId) return null;
      return parsed;
    } catch {
      return null;
    }
  }
}

export function buildHubSpotOAuthUrl(clientId, redirectUri, state) {
  const params = new URLSearchParams({
    client_id: (clientId || "").trim(),
    redirect_uri: redirectUri,
    scope: HUBSPOT_SCOPES.join(" "),
    state,
  });
  return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
}