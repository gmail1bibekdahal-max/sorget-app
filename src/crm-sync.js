/**
 * CRM Lead Synchronization Engine (HubSpot & CRM providers)
 * Pure ESM JavaScript module compatible with both Node test runners and Next.js.
 */

import { buildHubSpotProperties, isTokenExpired } from "./crm.js";
import { REQUIRED_ATTRIBUTION_PROPERTIES } from "./hubspot-properties.js";

const VALID_ATTRIBUTION_PROPERTIES = new Set(
  REQUIRED_ATTRIBUTION_PROPERTIES.map((p) => p.name)
);

const STANDARD_HUBSPOT_PROPERTIES = new Set([
  "email",
  "firstname",
  "lastname",
  "phone",
  "company",
  "website",
  "address",
  "city",
  "state",
  "zip",
  "lifecyclestage",
  "jobtitle",
]);

/**
 * Sanitizes properties before sending to HubSpot CRM.
 * - Excludes undefined, null, and empty string values.
 * - Only includes valid standard contact fields and provisioned Sorget attribution properties.
 */
export function sanitizeHubSpotProperties(properties) {
  const clean = {};
  if (!properties || typeof properties !== "object") return clean;

  for (const [key, val] of Object.entries(properties)) {
    if (val === undefined || val === null) continue;
    const strVal = String(val).trim();
    if (strVal === "") continue;

    if (
      STANDARD_HUBSPOT_PROPERTIES.has(key) ||
      VALID_ATTRIBUTION_PROPERTIES.has(key)
    ) {
      clean[key] = strVal;
    }
  }

  // Ensure email is always present if provided
  if (properties.email && !clean.email) {
    clean.email = String(properties.email).trim();
  }

  return clean;
}

/**
 * Push a lead to HubSpot via REST API (server-side only).
 * Automatically falls back to PATCH if contact already exists (409 Conflict).
 */
export async function syncLeadToHubSpot(accessToken, properties, retried = false) {
  try {
    const payload = sanitizeHubSpotProperties(properties);

    const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties: payload }),
    });

    if (res.status === 409) {
      // Contact already exists — try PATCH by email
      const email = payload.email || properties.email;
      if (email) {
        console.log(`[crm-sync] Contact already exists (409 Conflict), falling back to PATCH for email=${email}`);
        let patchRes = await fetch(
          `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ properties: payload }),
          }
        );
        let patchData = await patchRes.json().catch(() => ({}));

        // If PATCH fails because a custom property is missing from HubSpot portal schema
        if (
          patchRes.status === 400 &&
          Array.isArray(patchData.errors) &&
          patchData.errors.some((e) => e.code === "PROPERTY_DOESNT_EXIST")
        ) {
          if (!retried) {
            try {
              console.log("[crm-sync] Missing custom property during PATCH; triggering automatic property provisioning");
              const { ensureHubSpotAttributionProperties } = await import("./hubspot-properties.js");
              const provResult = await ensureHubSpotAttributionProperties(accessToken);
              if (provResult?.created?.length > 0 || (provResult?.existing?.length > 0 && !provResult?.error)) {
                // Retry PATCH once with all properties now provisioned
                return syncLeadToHubSpot(accessToken, properties, true);
              }
            } catch (provErr) {
              console.error("[crm-sync] Property provisioning retry error on PATCH:", provErr.message);
            }
          }

          // Do NOT silently strip properties to fake success. Report actual failure.
          const missing = patchData.errors
            .filter((e) => e.code === "PROPERTY_DOESNT_EXIST")
            .map((e) => (e.context?.propertyName || [e.name || "unknown"]).join(", "))
            .join("; ");
          const errMsg = `HubSpot contact update: FAILED - Property does not exist (${missing})`;
          console.error(`[crm-sync] ${errMsg}`);
          return { success: false, error: errMsg };
        }

        if (patchRes.ok) {
          console.log(`[crm-sync] Contact updated successfully via PATCH: id=${patchData.id}`);
          return { success: true, external_contact_id: patchData.id };
        }

        const patchErrMsg = patchData.message || `HubSpot PATCH error (HTTP ${patchRes.status})`;
        console.error(`[crm-sync] Contact update failed: ${patchErrMsg}`);
        return { success: false, error: patchErrMsg };
      }
    }

    const data = await res.json().catch(() => ({}));

    // If POST fails because a custom property is missing from HubSpot portal schema
    if (
      res.status === 400 &&
      Array.isArray(data.errors) &&
      data.errors.some((e) => e.code === "PROPERTY_DOESNT_EXIST")
    ) {
      if (!retried) {
        try {
          console.log("[crm-sync] Missing custom property during POST; triggering automatic property provisioning");
          const { ensureHubSpotAttributionProperties } = await import("./hubspot-properties.js");
          const provResult = await ensureHubSpotAttributionProperties(accessToken);
          if (provResult?.created?.length > 0 || (provResult?.existing?.length > 0 && !provResult?.error)) {
            // Retry POST once with all properties now provisioned
            return syncLeadToHubSpot(accessToken, properties, true);
          }
        } catch (provErr) {
          console.error("[crm-sync] Property provisioning retry error on POST:", provErr.message);
        }
      }

      // Do NOT silently strip properties to fake success. Report actual failure.
      const missing = data.errors
        .filter((e) => e.code === "PROPERTY_DOESNT_EXIST")
        .map((e) => (e.context?.propertyName || [e.name || "unknown"]).join(", "))
        .join("; ");
      const errMsg = `HubSpot contact sync: FAILED - Property does not exist (${missing})`;
      console.error(`[crm-sync] ${errMsg}`);
      return { success: false, error: errMsg };
    }

    if (!res.ok) {
      const errMsg = data.message || `HubSpot API error (HTTP ${res.status})`;
      console.error(`[crm-sync] Contact creation failed: ${errMsg}`);
      return { success: false, error: errMsg };
    }

    console.log(`[crm-sync] Contact created successfully: id=${data.id}`);
    return { success: true, external_contact_id: data.id };
  } catch (err) {
    console.error(`[crm-sync] Unexpected error during syncLeadToHubSpot: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Attempts to refresh an expired HubSpot OAuth token using the stored refresh_token.
 * Uses the current HubSpot versioned token endpoint (/oauth/2026-03/token).
 * If the refresh token is invalid/revoked, marks the connection as is_active=false.
 */
export async function refreshHubSpotToken(connection, supabase) {
  try {
    const refreshToken = connection.refresh_token;
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;

    if (!refreshToken || !clientId || !clientSecret) {
      return null;
    }

    // Use HubSpot's current versioned OAuth endpoint (v1 deprecated Feb 2027)
    const res = await fetch("https://api.hubapi.com/oauth/2026-03/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }).toString(),
    });

    const data = await res.json();

    // If refresh token is invalid or revoked, mark connection as disconnected
    if (!res.ok || !data.access_token) {
      const isRevoked =
        res.status === 401 ||
        data.error === "invalid_grant" ||
        data.error === "INVALID_REFRESH_TOKEN";

      if (isRevoked && supabase) {
        await supabase
          .from("crm_connections")
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", connection.id);
      }
      return null;
    }

    const expiresAt = new Date(Date.now() + (data.expires_in || 1800) * 1000).toISOString();

    await supabase
      .from("crm_connections")
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    return data.access_token;
  } catch (err) {
    return null;
  }
}

/**
 * Triggers HubSpot contact creation / update after a lead is stored in Supabase.
 * - Resolves the workspace for the lead/project
 * - Checks for an active HubSpot connection
 * - Handles expired tokens
 * - Preserves immutable first-touch attribution across recurring submissions
 * - Updates or creates HubSpot contact with full attribution data
 * - Records sync status in crm_sync_log
 * - Completely non-blocking: lead data in Supabase is never affected if HubSpot fails.
 */
export async function triggerHubSpotSync(lead, project, supabase, options = {}) {
  try {
    if (!lead || !lead.email) {
      return { success: false, error: "Lead email is required for HubSpot sync" };
    }

    // 1. Resolve workspace_id
    let workspaceId = options.workspaceId || project?.workspace_id;

    if (!workspaceId && project?.id) {
      const { data: projData } = await supabase
        .from("projects")
        .select("workspace_id, user_id")
        .eq("id", project.id)
        .single();

      workspaceId = projData?.workspace_id;

      if (!workspaceId && projData?.user_id) {
        // Fallback: look up workspace for project owner
        const { data: member } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", projData.user_id)
          .limit(1)
          .single();

        workspaceId = member?.workspace_id;
      }
    }

    if (!workspaceId) {
      return { success: true, skipped: true };
    }

    // 2. Look up active HubSpot connection for this workspace
    const { data: connection, error: connError } = await supabase
      .from("crm_connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("provider", "hubspot")
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      // No active HubSpot connection for this workspace — safe skip
      return { success: true, skipped: true };
    }

    // 3. Check access token and expiration
    let accessToken = connection.access_token;
    if (!accessToken || isTokenExpired(connection.token_expires_at)) {
      // Attempt refresh
      const refreshed = await refreshHubSpotToken(connection, supabase);
      if (refreshed) {
        accessToken = refreshed;
      } else {
        const errorMsg = "HubSpot OAuth token is expired or invalid";
        await supabase.from("crm_sync_log").insert([
          {
            workspace_id: workspaceId,
            project_id: project?.id || null,
            lead_id: lead.id || null,
            provider: "hubspot",
            direction: "push",
            status: "error",
            error_message: `HubSpot contact sync: FAILED - Reason: ${errorMsg}`,
          },
        ]);
        return { success: false, error: errorMsg };
      }
    }

    // 4. Build HubSpot properties with attribution mapping
    const properties = buildHubSpotProperties(lead);

    // 4b. First-touch immutability: check if an earlier lead exists in Supabase for this email
    if (supabase && lead.email) {
      try {
        let query = supabase
          .from("leads")
          .select("channel, source, medium, campaign, content, term, drilldown1, drilldown2, drilldown3, landing_page, landing_page_group, created_at")
          .eq("email", lead.email);

        if (lead.id) {
          query = query.neq("id", lead.id);
        }

        const { data: priorLeads } = await query
          .order("created_at", { ascending: true })
          .limit(1);

        if (priorLeads && priorLeads.length > 0) {
          const firstLead = priorLeads[0];
          const firstTouchProps = buildHubSpotProperties(firstLead);
          for (const [k, v] of Object.entries(firstTouchProps)) {
            if ((k.startsWith("sorget_") || k.startsWith("attributer_")) && v) {
              properties[k] = v; // Guarantee original first-touch attribution remains immutable
            }
          }
        }
      } catch (e) {
        // Non-blocking query fallback
      }
    }

    // 5. Send to HubSpot API (syncLeadToHubSpot handles 409 conflict with PATCH fallback)
    const result = await syncLeadToHubSpot(accessToken, properties);

    const attributionFieldsAttempted = Object.keys(properties).filter(
      (k) => k.startsWith("sorget_") || k.startsWith("attributer_")
    );

    // 6. Record result in crm_sync_log & log observability event
    if (result.success) {
      await supabase.from("crm_sync_log").insert([
        {
          workspace_id: workspaceId,
          project_id: project?.id || null,
          lead_id: lead.id || null,
          provider: "hubspot",
          direction: "push",
          status: "success",
          external_contact_id: result.external_contact_id || null,
          error_message: null,
        },
      ]);

      console.log(
        `[crm-sync] Contact sync: SUCCESS | leadId=${lead.id || "n/a"} | projectId=${project?.id || "n/a"} | portalId=${connection.portal_id || "n/a"} | contactId=${result.external_contact_id} | fields=[${attributionFieldsAttempted.join(", ")}]`
      );
    } else {
      const safeErrorReason = result.error || "HubSpot API error";
      await supabase.from("crm_sync_log").insert([
        {
          workspace_id: workspaceId,
          project_id: project?.id || null,
          lead_id: lead.id || null,
          provider: "hubspot",
          direction: "push",
          status: "error",
          error_message: `HubSpot contact sync: FAILED - Reason: ${safeErrorReason}`,
        },
      ]);

      console.error(
        `[crm-sync] Contact sync: FAILED | leadId=${lead.id || "n/a"} | projectId=${project?.id || "n/a"} | portalId=${connection.portal_id || "n/a"} | fields=[${attributionFieldsAttempted.join(", ")}] | reason=${safeErrorReason}`
      );
    }

    return result;
  } catch (err) {
    console.error("[crm-sync] Unexpected error during HubSpot sync:", err.message);
    return { success: false, error: err.message };
  }
}

