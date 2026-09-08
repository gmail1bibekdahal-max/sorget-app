import {
  REQUIRED_ATTRIBUTION_PROPERTIES as _REQUIRED_ATTRIBUTION_PROPERTIES,
  ensureHubSpotAttributionProperties as _ensureHubSpotAttributionProperties,
} from "@/src/hubspot-properties.js";

export interface PropertyProvisioningResult {
  created: string[];
  existing: string[];
  failed: Array<{ name: string; error: string }>;
  error?: string;
}

export const REQUIRED_ATTRIBUTION_PROPERTIES = _REQUIRED_ATTRIBUTION_PROPERTIES;
export const ensureHubSpotAttributionProperties: (
  accessToken: string
) => Promise<PropertyProvisioningResult> = _ensureHubSpotAttributionProperties;
