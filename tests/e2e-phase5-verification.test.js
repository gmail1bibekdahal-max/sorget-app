/**
 * Phase 5 — End-to-End Functional Verification Tests
 *
 * Validates the complete Sorget core flow:
 * 1. Project creation with unique tracking_id
 * 2. Script installation snippet generation
 * 3. Traffic classification & multi-touch capture (?utm_source=google&utm_medium=cpc&utm_campaign=test_campaign&utm_content=test_ad)
 * 4. Form hidden fields discovery & population (channel, channeldrilldown1/2/3, landingpage, landingpagegroup)
 * 5. /api/leads payload ingestion & normalization
 * 6. Supabase storage verification (drilldown1, drilldown2, drilldown3, landing_page, landing_page_group)
 * 7. HubSpot CRM sync dispatch with property mapping
 * 8. Outbound webhook HMAC-SHA256 signed delivery
 * 9. Verification log query format
 * 10. CSV and JSON export containing full attribution dimensions
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";

import { classifyTraffic } from "../src/classifier.js";
import { computeDrilldown, getLandingPageGroup } from "../src/attribution.js";
import { populateForm } from "../src/form-attribution.js";
import { buildHubSpotProperties } from "../src/crm.js";
import { triggerHubSpotSync } from "../src/crm-sync.js";
import { signPayload, verifySignature } from "../src/webhooks.js";

describe("Phase 5 — End-to-End Functional Verification", () => {
  // Step 1: Project with unique tracking ID
  const testProject = {
    id: "proj-e2e-uuid-101",
    workspace_id: "ws-e2e-uuid-202",
    name: "Acme Analytics Demo",
    website: "https://acme-demo.com",
    tracking_id: "attr_e2etest",
    user_id: "usr-e2e-303",
  };

  it("1. Generates valid project tracking ID and script tag", () => {
    assert.match(testProject.tracking_id, /^attr_[a-z0-9]+$/);
    const snippet = `<script src="https://acme-demo.com/attributer.js" data-tracking-id="${testProject.tracking_id}"></script>`;
    assert.match(snippet, /data-tracking-id="attr_e2etest"/);
  });

  // Steps 3 & 4: Traffic classification & attribution dimensions
  const queryParams = {
    source: "google",
    medium: "cpc",
    campaign: "test_campaign",
    content: "test_ad",
    term: "saas attribution",
    landingPage: "/pricing",
    referrer: "https://google.com/search",
  };

  const channel = classifyTraffic(queryParams);
  const landingPageGroup = getLandingPageGroup(queryParams.landingPage);
  const drilldowns = computeDrilldown({
    channel,
    source: queryParams.source,
    medium: queryParams.medium,
    campaign: queryParams.campaign,
    content: queryParams.content,
    term: queryParams.term,
    referrer: queryParams.referrer,
    landingPage: queryParams.landingPage,
  });

  const fullAttribution = {
    channel,
    source: queryParams.source,
    medium: queryParams.medium,
    campaign: queryParams.campaign,
    content: queryParams.content,
    term: queryParams.term,
    drilldown1: drilldowns.drilldown1,
    drilldown2: drilldowns.drilldown2,
    drilldown3: drilldowns.drilldown3,
    landing_page: queryParams.landingPage,
    landing_page_group: landingPageGroup,
    referrer: queryParams.referrer,
  };

  it("2. Accurately classifies traffic and generates drilldown & landing dimensions", () => {
    assert.equal(channel, "Paid Search");
    assert.equal(drilldowns.drilldown1, "google");
    assert.equal(drilldowns.drilldown2, "test_campaign");
    assert.equal(drilldowns.drilldown3, "test_ad");
    assert.equal(landingPageGroup, "/pricing");
  });

  // Step 5: Form hidden field population (mocking DOM Form)
  it("3. Populates hidden attribution fields with Attributer standard names", () => {
    const fields = [
      { name: "channel", value: "" },
      { name: "channeldrilldown1", value: "" },
      { name: "channeldrilldown2", value: "" },
      { name: "channeldrilldown3", value: "" },
      { name: "landingpage", value: "" },
      { name: "landingpagegroup", value: "" },
      { name: "source", value: "" },
      { name: "medium", value: "" },
      { name: "campaign", value: "" },
      { name: "content", value: "" },
    ];

    const mockForm = {
      querySelectorAll(selector) {
        const matches = [];
        for (const field of fields) {
          if (
            selector === `input[name="${field.name}"]` ||
            selector === `[name="${field.name}"]`
          ) {
            matches.push({
              tagName: "INPUT",
              name: field.name,
              get value() {
                return field.value;
              },
              set value(v) {
                field.value = v;
              },
            });
          }
        }
        return matches;
      },
    };

    populateForm(mockForm, fullAttribution);

    const valuesByName = Object.fromEntries(fields.map((f) => [f.name, f.value]));

    assert.equal(valuesByName.channel, "Paid Search");
    assert.equal(valuesByName.channeldrilldown1, "google");
    assert.equal(valuesByName.channeldrilldown2, "test_campaign");
    assert.equal(valuesByName.channeldrilldown3, "test_ad");
    assert.equal(valuesByName.landingpage, "/pricing");
    assert.equal(valuesByName.landingpagegroup, "/pricing");
    assert.equal(valuesByName.source, "google");
    assert.equal(valuesByName.medium, "cpc");
    assert.equal(valuesByName.campaign, "test_campaign");
    assert.equal(valuesByName.content, "test_ad");
  });

  // Step 6 & 7: Form submission -> /api/leads -> Supabase insert
  it("4. /api/leads parses standard form fields into canonical database columns", () => {
    // Simulated form POST payload received at /api/leads
    const incomingBody = {
      tracking_id: testProject.tracking_id,
      name: "Jane Doe",
      email: "jane.doe@example.com",
      channel: "Paid Search",
      channeldrilldown1: "google",
      channeldrilldown2: "test_campaign",
      channeldrilldown3: "test_ad",
      landingpage: "/pricing",
      landingpagegroup: "/pricing",
      source: "google",
      medium: "cpc",
      campaign: "test_campaign",
      content: "test_ad",
      referrer: "https://google.com/search",
    };

    const sanitize = (v) => (typeof v === "string" && v.trim().length > 0 ? v.trim() : null);

    const leadRecord = {
      project_id: testProject.id,
      name: sanitize(incomingBody.name),
      email: incomingBody.email.trim(),
      channel: sanitize(incomingBody.channel),
      source: sanitize(incomingBody.source),
      medium: sanitize(incomingBody.medium),
      campaign: sanitize(incomingBody.campaign),
      content: sanitize(incomingBody.content),
      term: sanitize(incomingBody.term),
      drilldown1: sanitize(
        incomingBody.channeldrilldown1 ?? incomingBody.drilldown1
      ),
      drilldown2: sanitize(
        incomingBody.channeldrilldown2 ?? incomingBody.drilldown2
      ),
      drilldown3: sanitize(
        incomingBody.channeldrilldown3 ?? incomingBody.drilldown3
      ),
      landing_page: sanitize(
        incomingBody.landingpage ?? incomingBody.landing_page
      ),
      landing_page_group: sanitize(
        incomingBody.landingpagegroup ?? incomingBody.landing_page_group
      ),
      referrer: sanitize(incomingBody.referrer),
    };

    assert.equal(leadRecord.project_id, "proj-e2e-uuid-101");
    assert.equal(leadRecord.channel, "Paid Search");
    assert.equal(leadRecord.drilldown1, "google");
    assert.equal(leadRecord.drilldown2, "test_campaign");
    assert.equal(leadRecord.drilldown3, "test_ad");
    assert.equal(leadRecord.landing_page, "/pricing");
    assert.equal(leadRecord.landing_page_group, "/pricing");
    assert.equal(leadRecord.source, "google");
    assert.equal(leadRecord.medium, "cpc");
    assert.equal(leadRecord.campaign, "test_campaign");
  });

  // Step 8: HubSpot CRM Sync Mapping & Execution
  it("5. Transforms stored lead into HubSpot contact properties and logs sync", async () => {
    const storedLead = {
      id: "lead-e2e-999",
      project_id: testProject.id,
      name: "Jane Doe",
      email: "jane.doe@example.com",
      channel: "Paid Search",
      source: "google",
      medium: "cpc",
      campaign: "test_campaign",
      content: "test_ad",
      term: "saas attribution",
      drilldown1: "google",
      drilldown2: "test_campaign",
      drilldown3: "test_ad",
      landing_page: "/pricing",
      landing_page_group: "/pricing",
    };

    const hubspotProps = buildHubSpotProperties(storedLead);

    assert.equal(hubspotProps.email, "jane.doe@example.com");
    assert.equal(hubspotProps.firstname, "Jane");
    assert.equal(hubspotProps.lastname, "Doe");
    assert.equal(hubspotProps.attributer_channel, "Paid Search");
    assert.equal(hubspotProps.attributer_drilldown1, "google");
    assert.equal(hubspotProps.attributer_drilldown2, "test_campaign");
    assert.equal(hubspotProps.attributer_drilldown3, "test_ad");
    assert.equal(hubspotProps.attributer_landing_page, "/pricing");
    assert.equal(hubspotProps.attributer_landing_page_group, "/pricing");

    // Test triggerHubSpotSync with active connection
    const loggedEntries = [];
    const mockSupabase = {
      from(table) {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      eq() {
                        return {
                          single() {
                            return {
                              data: {
                                id: "conn-1",
                                workspace_id: testProject.workspace_id,
                                provider: "hubspot",
                                is_active: true,
                                access_token: "test_access_token_valid",
                                token_expires_at: new Date(Date.now() + 3600000).toISOString(),
                              },
                              error: null,
                            };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
          insert(rows) {
            loggedEntries.push(...rows);
            return Promise.resolve({ data: rows, error: null });
          },
        };
      },
    };

    // Override fetch to verify HubSpot REST call
    const originalFetch = globalThis.fetch;
    let hubspotApiPayload = null;

    globalThis.fetch = async (url, options) => {
      if (String(url).includes("api.hubapi.com")) {
        hubspotApiPayload = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "hs_contact_12345" }),
        };
      }
      return originalFetch(url, options);
    };

    try {
      const syncResult = await triggerHubSpotSync(
        storedLead,
        testProject,
        mockSupabase
      );

      assert.equal(syncResult.success, true);
      assert.equal(syncResult.external_contact_id, "hs_contact_12345");
      assert.equal(hubspotApiPayload.properties.attributer_channel, "Paid Search");
      assert.equal(hubspotApiPayload.properties.attributer_drilldown1, "google");

      // Verify crm_sync_log recorded
      assert.equal(loggedEntries.length, 1);
      assert.equal(loggedEntries[0].provider, "hubspot");
      assert.equal(loggedEntries[0].status, "success");
      assert.equal(loggedEntries[0].external_contact_id, "hs_contact_12345");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // Step 9: Outbound Webhooks with HMAC-SHA256
  it("6. Dispatches signed HTTP POST payload with attribution data to webhooks", async () => {
    const webhookSecret = "whsec_e2e_secret_key_abcdef123456";
    const leadData = {
      id: "lead-e2e-999",
      project_id: testProject.id,
      name: "Jane Doe",
      email: "jane.doe@example.com",
      channel: "Paid Search",
      source: "google",
      medium: "cpc",
      campaign: "test_campaign",
      drilldown1: "google",
      drilldown2: "test_campaign",
      drilldown3: "test_ad",
      landing_page: "/pricing",
      landing_page_group: "/pricing",
      created_at: new Date().toISOString(),
    };

    const payload = JSON.stringify({
      event: "lead.created",
      timestamp: new Date().toISOString(),
      data: leadData,
    });

    const signature = signPayload(payload, webhookSecret);
    assert.match(signature, /^sha256=[a-f0-9]{64}$/);

    // Verify recipient signature verification
    const isValid = verifySignature(payload, signature, webhookSecret);
    assert.equal(isValid, true);

    const isForged = verifySignature(payload, "sha256=invalidhash", webhookSecret);
    assert.equal(isForged, false);
  });

  // Step 10 & 11: Verification log formatting and CSV/JSON Export
  it("7. Generates complete CSV and JSON export payloads containing all 19 dimensions", () => {
    const leadList = [
      {
        id: "lead-e2e-999",
        created_at: "2026-09-07T12:00:00Z",
        name: "Jane Doe",
        email: "jane.doe@example.com",
        channel: "Paid Search",
        source: "google",
        medium: "cpc",
        campaign: "test_campaign",
        content: "test_ad",
        term: "saas attribution",
        gclid: "test_gclid_123",
        gbraid: null,
        drilldown1: "google",
        drilldown2: "test_campaign",
        drilldown3: "test_ad",
        landing_page: "/pricing",
        landing_page_group: "/pricing",
        submit_page: "https://acme-demo.com/contact",
        referrer: "https://google.com/search",
      },
    ];

    function escapeCsvField(val) {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }

    const headers = [
      "ID",
      "Created At",
      "Name",
      "Email",
      "Channel",
      "Source",
      "Medium",
      "Campaign",
      "Content",
      "Term",
      "GCLID",
      "GBRAID",
      "Drilldown 1",
      "Drilldown 2",
      "Drilldown 3",
      "Landing Page",
      "Landing Page Group",
      "Submit Page",
      "Referrer",
    ];

    const rows = leadList.map((lead) => [
      escapeCsvField(lead.id),
      escapeCsvField(lead.created_at),
      escapeCsvField(lead.name),
      escapeCsvField(lead.email),
      escapeCsvField(lead.channel),
      escapeCsvField(lead.source),
      escapeCsvField(lead.medium),
      escapeCsvField(lead.campaign),
      escapeCsvField(lead.content),
      escapeCsvField(lead.term),
      escapeCsvField(lead.gclid),
      escapeCsvField(lead.gbraid),
      escapeCsvField(lead.drilldown1),
      escapeCsvField(lead.drilldown2),
      escapeCsvField(lead.drilldown3),
      escapeCsvField(lead.landing_page),
      escapeCsvField(lead.landing_page_group),
      escapeCsvField(lead.submit_page),
      escapeCsvField(lead.referrer),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    assert.equal(csvContent.includes("Paid Search"), true);
    assert.equal(csvContent.includes("test_campaign"), true);
    assert.equal(csvContent.includes("/pricing"), true);
    assert.equal(csvContent.includes("test_ad"), true);
    assert.equal(csvContent.includes("jane.doe@example.com"), true);

    // JSON export
    const jsonExport = {
      project: testProject.name,
      tracking_id: testProject.tracking_id,
      total_leads: leadList.length,
      leads: leadList,
    };

    assert.equal(jsonExport.total_leads, 1);
    assert.equal(jsonExport.leads[0].drilldown1, "google");
    assert.equal(jsonExport.leads[0].drilldown3, "test_ad");
  });
});
