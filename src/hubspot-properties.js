/**
 * HubSpot CRM Property Provisioning Helper
 * Automatically ensures all 11 required Sorget attribution properties exist in the connected portal.
 * Pure ESM module compatible with Node test runners and Next.js.
 */

export const REQUIRED_ATTRIBUTION_PROPERTIES = [
  {
    name: "sorget_channel",
    label: "Channel",
    description: "Sorget marketing attribution data.",
    groupName: "contactinformation",
    type: "string",
    fieldType: "text",
  },
  {
    name: "sorget_drilldown1",
    label: "Drilldown 1",
    description: "Sorget marketing attribution data.",
    groupName: "contactinformation",
    type: "string",
    fieldType: "text",
  },
  {
    name: "sorget_drilldown2",
    label: "Drilldown 2",
    description: "Sorget marketing attribution data.",
    groupName: "contactinformation",
    type: "string",
    fieldType: "text",
  },
  {
    name: "sorget_drilldown3",
    label: "Drilldown 3",
    description: "Sorget marketing attribution data.",
    groupName: "contactinformation",
    type: "string",
    fieldType: "text",
  },
  {
    name: "sorget_landing_page",
    label: "Landing Page",
    description: "Sorget marketing attribution data.",
    groupName: "contactinformation",
    type: "string",
    fieldType: "text",
  },
  {
    name: "sorget_landing_page_group",
    label: "Landing Page Group",
    description: "Sorget marketing attribution data.",
    groupName: "contactinformation",
    type: "string",
    fieldType: "text",
  },
  {
    name: "sorget_source",
    label: "Source",
    description: "Sorget marketing attribution data.",
    groupName: "contactinformation",
    type: "string",
    fieldType: "text",
  },
  {
    name: "sorget_medium",
    label: "Medium",
    description: "Sorget marketing attribution data.",
    groupName: "contactinformation",
    type: "string",
    fieldType: "text",
  },
  {
    name: "sorget_campaign",
    label: "Campaign",
    description: "Sorget marketing attribution data.",
    groupName: "contactinformation",
    type: "string",
    fieldType: "text",
  },
  {
    name: "sorget_content",
    label: "Content",
    description: "Sorget marketing attribution data.",
    groupName: "contactinformation",
    type: "string",
    fieldType: "text",
  },
  {
    name: "sorget_term",
    label: "Term",
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
    // 1. Fetch current contact properties from HubSpot (Discovery)
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
      console.error(`[hubspot-properties] Discovery failed: HTTP ${listRes.status}, reason: ${errMsg}`);
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

    console.log(
      `[hubspot-properties] Discovery complete: ${result.existing.length} verified existing, ${toCreate.length} to create`
    );

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
          console.log(`[hubspot-properties] Property created: ${prop.name} (HTTP ${createRes.status})`);
        } else if (createRes.status === 409) {
          // Idempotency: concurrent creation conflict — property was already created
          result.existing.push(prop.name);
          console.log(`[hubspot-properties] Property already exists (409 conflict): ${prop.name}`);
        } else {
          const errBody = await createRes.json().catch(() => ({}));
          const errMsg = errBody.message || `HTTP ${createRes.status}`;
          console.error(`[hubspot-properties] Property creation failed for ${prop.name}: HTTP ${createRes.status}, reason: ${errMsg}`);
          result.failed.push({
            name: prop.name,
            error: errMsg,
          });
        }
      } catch (postErr) {
        console.error(`[hubspot-properties] Network error creating ${prop.name}: ${postErr.message}`);
        result.failed.push({
          name: prop.name,
          error: postErr.message || "Network error during property creation",
        });
      }
    }

    return result;
  } catch (err) {
    console.error(`[hubspot-properties] Unexpected error: ${err.message}`);
    result.error = err.message || "Unexpected error in ensureHubSpotAttributionProperties";
    return result;
  }
}
