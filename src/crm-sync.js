/**
 * CRM Lead Synchronization Engine (HubSpot & CRM providers)
 * Pure ESM JavaScript module compatible with both Node test runners and Next.js.
 */

import { buildHubSpotProperties, isTokenExpired } from "./crm.js";

/**
 * Push a lead to HubSpot via REST API (server-side only).
 * Automatically falls back to PATCH if contact already exists (409 Conflict).
 */
export async function syncLeadToHubSpot(accessToken, properties, retried = false) {
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
        let patchRes = await fetch(
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
        let patchData = await patchRes.json().catch(() => ({}));

        // If PATCH fails because a custom property is missing from HubSpot portal schema
        if (patchRes.status === 400 && Array.isArray(patchData.errors) && patchData.errors.some(e => e.code === "PROPERTY_DOESNT_EXIST")) {
          if (!retried) {
            try {
              const { ensureHubSpotAttributionProperties } = await import("./hubspot-properties.js");
              const provResult = await ensureHubSpotAttributionProperties(accessToken);
              if (provResult?.created?.length > 0) {
                // Retry PATCH once with all properties now provisioned
                return syncLeadToHubSpot(accessToken, properties, true);
              }
            } catch {}
          }
          // Fall back to stripping unconfigured properties so standard fields update
          const invalidProps = new Set();
          for (const err of patchData.errors) {
            if (err.code === "PROPERTY_DOESNT_EXIST") {
              const names = err.context?.propertyName || err.context?.name || [];
              names.forEach(n => invalidProps.add(n));
              if (err.name) invalidProps.add(err.name);
            }
          }
          if (invalidProps.size > 0) {
            const safeProps = { ...properties };
            for (const p of invalidProps) delete safeProps[p];
            patchRes = await fetch(
              `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email`,
              {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ properties: safeProps }),
              }
            );
            patchData = await patchRes.json().catch(() => ({}));
          }
        }

        if (patchRes.ok) return { success: true, external_contact_id: patchData.id };
        return { success: false, error: patchData.message || "HubSpot PATCH error" };
      }
    }

    const data = await res.json().catch(() => ({}));

    // If POST fails because a custom property is missing from HubSpot portal schema
    if (res.status === 400 && Array.isArray(data.errors) && data.errors.some(e => e.code === "PROPERTY_DOESNT_EXIST")) {
      if (!retried) {
        try {
          const { ensureHubSpotAttributionProperties } = await import("./hubspot-properties.js");
          const provResult = await ensureHubSpotAttributionProperties(accessToken);
          if (provResult?.created?.length > 0) {
            // Retry POST once with all properties now provisioned
            return syncLeadToHubSpot(accessToken, properties, true);
          }
        } catch {}
      }
      // Fallback: strip invalid properties so contact is still created
      const invalidProps = new Set();
      for (const err of data.errors) {
        if (err.code === "PROPERTY_DOESNT_EXIST") {
          const names = err.context?.propertyName || err.context?.name || [];
          names.forEach(n => invalidProps.add(n));
          if (err.name) invalidProps.add(err.name);
        }
      }
      if (invalidProps.size > 0) {
        const safeProps = { ...properties };
        for (const p of invalidProps) delete safeProps[p];
        return syncLeadToHubSpot(accessToken, safeProps, true);
      }
    }

    if (!res.ok) return { success: false, error: data.message || "HubSpot API error" };
    return { success: true, external_contact_id: data.id };
  } catch (err) {
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
            lead_id: lead.id || null,
            provider: "hubspot",
            direction: "push",
            status: "error",
            error_message: errorMsg,
          },
        ]);
        return { success: false, error: errorMsg };
      }
    }

    // 4. Build HubSpot properties with attribution mapping
    const properties = buildHubSpotProperties(lead);

    // 5. Send to HubSpot API (syncLeadToHubSpot handles 409 conflict with PATCH fallback)
    const result = await syncLeadToHubSpot(accessToken, properties);

    // 6. Record result in crm_sync_log
    if (result.success) {
      await supabase.from("crm_sync_log").insert([
        {
          workspace_id: workspaceId,
          lead_id: lead.id || null,
          provider: "hubspot",
          direction: "push",
          status: "success",
          external_contact_id: result.external_contact_id || null,
        },
      ]);
    } else {
      await supabase.from("crm_sync_log").insert([
        {
          workspace_id: workspaceId,
          lead_id: lead.id || null,
          provider: "hubspot",
          direction: "push",
          status: "error",
          error_message: result.error || "HubSpot API error",
        },
      ]);
    }

    return result;
  } catch (err) {
    console.error("[crm-sync] Unexpected error during HubSpot sync:", err.message);
    return { success: false, error: err.message };
  }
}
