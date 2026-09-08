/**
 * Phase 17 — CRM Connector Framework Tests
 *
 * Tests:
 * 1. HubSpot property payload construction from lead record
 * 2. Token expiry detection with 1-minute buffer
 * 3. HubSpot OAuth URL generation
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildHubSpotProperties,
  isTokenExpired,
  buildHubSpotOAuthUrl,
  HUBSPOT_FIELD_MAP,
} from "../src/crm.js";

describe("Phase 17 — CRM Connector Framework (HubSpot)", () => {
  const mockLead = {
    email: "sarah.connor@cyberdyne.com",
    name: "Sarah Connor",
    channel: "Paid Search",
    source: "google",
    medium: "cpc",
    campaign: "enterprise_2026",
    gclid: "gcl_live_9921",
    drilldown1: "google",
    drilldown2: "enterprise_2026",
    drilldown3: null,
    landing_page: "/demo",
    landing_page_group: "/demo",
    submit_page: "/demo/request",
  };

  it("1. Builds correct HubSpot properties from lead record", () => {
    const props = buildHubSpotProperties(mockLead);

    assert.equal(props.email, "sarah.connor@cyberdyne.com");
    assert.equal(props.firstname, "Sarah");
    assert.equal(props.lastname, "Connor");
    assert.equal(props[HUBSPOT_FIELD_MAP.channel], "Paid Search");
    assert.equal(props[HUBSPOT_FIELD_MAP.source], "google");
    assert.equal(props[HUBSPOT_FIELD_MAP.gclid], "gcl_live_9921");
    // Null fields should not be included
    assert.equal(props[HUBSPOT_FIELD_MAP.drilldown3], undefined);
  });

  it("3. Correctly detects expired and valid tokens with 1-minute buffer", () => {
    const expiredTime = new Date(Date.now() - 60000).toISOString(); // 1 min ago
    const validTime   = new Date(Date.now() + 3600000).toISOString(); // 1 hr from now
    const almostGone  = new Date(Date.now() + 30000).toISOString();   // 30 seconds — within buffer

    assert.equal(isTokenExpired(expiredTime), true, "Past token should be expired");
    assert.equal(isTokenExpired(validTime), false, "Future token should be valid");
    assert.equal(isTokenExpired(almostGone), true, "Token within 1-min buffer should be considered expired");
    assert.equal(isTokenExpired(null), true, "Null token should be treated as expired");
  });

  it("4. Builds valid HubSpot OAuth authorization URL", () => {
    const url = buildHubSpotOAuthUrl("my_client_id", "https://app.example.com/api/crm/hubspot/callback", "ws_abc");
    assert.match(url, /^https:\/\/app\.hubspot\.com\/oauth\/authorize/);
    assert.match(url, /client_id=my_client_id/);
    assert.match(url, /state=ws_abc/);
    assert.match(url, /crm\.objects\.contacts\.write/);
  });
});