/**
 * HubSpot CRM Property Provisioning Helper
 * Automatically ensures all 11 required Sorget attribution properties exist in the connected portal.
 * Pure ESM module compatible with Node test runners and Next.js.
 */

export const REQUIRED_ATTRIBUTION_PROPERTIES = [
  {
    name: "attributer_channel",
    label: "Attributer Channel",
    description: "Sorget marketing attribution data.",
    groupName: "contactinformation",
    type: "string",
    fieldType: "text",
  },
  {
    name: "attributer_drilldown1",
    label: "Attributer Drilldown 1",
    description: "Sorget marketing attribution data.",
    groupName: "contactinformation",
    type: "string",
    fieldType: "text",
  },
  {
    name: "attributer_drilldown2",
    label: "Attributer Drilldown 2",
    description: "Sorget marketing attribution data.",
    groupName: "contactinformation",
    type: "string",
    fieldType: "text",
  },
  {
    name: "attributer_drilldown3",
    label: "Attributer Drilldown 3",
    description: "Sorget marketing attribution data.",
    groupName: "contactinformation",
    type: "string",
    fieldType: "text",
  },
  {
    name: "attributer_landing_page",
    label: "Attributer Landing Page",
    description: "Sorget marketing attribution data.",
    groupName: "contactinformation",
    type: "string",
    fieldType: "text",
  },
  {
    name: "attributer_landing_page_group",
    label: "Attributer Landing Page Group",
    description: "Sorget marketing attribution data.",
    groupName: "contactinformation",
    type: "string",
    fieldType: "text",
  },
  {
    name: "attributer_source",
    label: "Attributer Source",
    description: "Sorget marketing attribution data.",
    groupName: "contactinformation",
    type: "string",
    fieldType: "text",
  },
  {
    name: "attributer_medium",
    label: "Attributer Medium",
    description: "Sorget marketing attribution data.",
    groupName: "contactinformation",
    type: "string",
    fieldType: "text",
  },
  {
    name: "attributer_campaign",
    label: "Attributer Campaign",
    description: "Sorget marketing attribution data.",
    groupName: "contactinformation",
    type: "string",
    fieldType: "text",
  },
  {
    name: "attributer_content",
    label: "Attributer Content",
    description: "Sorget marketing attribution data.",
    groupName: "contactinformation",
    type: "string",
    fieldType: "text",
  },
  {
    name: "attributer_term",
    label: "Attributer Term",
    description: "Sorget marketing attribution data.",
    groupName: "contactinformation",
    type: "string",
    fieldType: "text",
  },
];

/**
 * Ensures all 11 required Sorget attribution properties exist on Contacts in the HubSpot portal.
 * Idempotent, non-destructive, and never returns or logs credentials.
 *
 * @param {string} accessToken - HubSpot OAuth access token
 * @returns {Promise<{ created: string[], existing: string[], failed: Array<{name: string, error: string}>, error?: string }>}
 */
export async function ensureHubSpotAttributionProperties(accessToken) {
  const result = {
    created: [],
    existing: [],
    failed: [],
  };

  if (!accessToken) {
    result.error = "Missing access token for property provisioning";
    return result;
  }

  try {
    // 1. Fetch current contact properties from HubSpot
    const listRes = await fetch("https://api.hubapi.com/crm/v3/properties/contacts", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!listRes.ok) {
      const errData = await listRes.json().catch(() => ({}));
      const errMsg = errData.message || `Failed to fetch contact properties (HTTP ${listRes.status})`;
      result.error = errMsg;
      result.failed = REQUIRED_ATTRIBUTION_PROPERTIES.map((p) => ({
        name: p.name,
        error: errMsg,
      }));
      return result;
    }

    const listData = await listRes.json();
    const existingNames = new Set((listData.results || []).map((p) => p.name));

    // 2. Classify properties into existing vs to-create
    const toCreate = [];
    for (const prop of REQUIRED_ATTRIBUTION_PROPERTIES) {
      if (existingNames.has(prop.name)) {
        result.existing.push(prop.name);
      } else {
        toCreate.push(prop);
      }
    }

    // If all exist, return immediately (fast path, zero mutations)
    if (toCreate.length === 0) {
      return result;
    }

    // 3. Create missing properties sequentially
    for (const prop of toCreate) {
      try {
        const createRes = await fetch("https://api.hubapi.com/crm/v3/properties/contacts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: prop.name,
            label: prop.label,
            description: prop.description,
            groupName: prop.groupName,
            type: prop.type,
            fieldType: prop.fieldType,
          }),
        });

        if (createRes.ok) {
          result.created.push(prop.name);
        } else if (createRes.status === 409) {
          // Idempotency: concurrent creation conflict — property was already created
          result.existing.push(prop.name);
        } else {
          const errBody = await createRes.json().catch(() => ({}));
          result.failed.push({
            name: prop.name,
            error: errBody.message || `HTTP ${createRes.status}`,
          });
        }
      } catch (postErr) {
        result.failed.push({
          name: prop.name,
          error: postErr.message || "Network error during property creation",
        });
      }
    }

    return result;
  } catch (err) {
    result.error = err.message || "Unexpected error in ensureHubSpotAttributionProperties";
    return result;
  }
}
