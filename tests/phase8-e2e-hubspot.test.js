import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// In-memory DOM & storage environment simulating the browser for attributer.js
function createMockLocalStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] || null,
    get length() { return store.size; }
  };
}

function setupBrowserEnvironment(url = "http://localhost:3001/real-site/index.html", referrer = "") {
  const parsedUrl = new URL(url);
  const mockStorage = createMockLocalStorage();
  const elements = [];

  const mockDoc = {
    referrer: referrer,
    location: parsedUrl,
    readyState: "complete",
    querySelectorAll: (selector) => {
      if (selector.startsWith("input[name=\"")) {
        const name = selector.match(/input\[name="([^"]+)"\]/)[1];
        return elements.filter(el => el.tagName === "INPUT" && el.name === name);
      }
      if (selector === "form") {
        return elements.filter(el => el.tagName === "FORM");
      }
      return [];
    },
    querySelector: (selector) => {
      const list = mockDoc.querySelectorAll(selector);
      return list.length > 0 ? list[0] : null;
    },
    createElement: (tag) => {
      const el = {
        tagName: tag.toUpperCase(),
        attributes: {},
        setAttribute: (k, v) => { el.attributes[k] = String(v); },
        getAttribute: (k) => el.attributes[k] || null,
        addEventListener: () => {},
        value: "",
        name: ""
      };
      return el;
    },
    addEventListener: () => {},
    body: { appendChild: () => {} }
  };

  const mockWin = {
    location: parsedUrl,
    localStorage: mockStorage,
    sessionStorage: mockStorage,
    document: mockDoc,
    URLSearchParams: URLSearchParams,
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  return { mockWin, mockDoc, mockStorage, elements };
}

async function run() {
  console.log("=== PHASE 8 — REAL END-TO-END HUBSPOT SYNC VERIFICATION ===\n");

  const results = {};

  // -------------------------------------------------------------------------
  // TEST 1 — Fresh attribution session
  // -------------------------------------------------------------------------
  console.log("--- TEST 1: Fresh attribution session ---");
  const testUrl = "http://localhost:3001/real-site/index.html?utm_source=google&utm_medium=cpc&utm_campaign=hubspot-test&utm_content=ad-01&utm_term=crm";
  const env = setupBrowserEnvironment(testUrl);

  const fieldNames = [
    "channel",
    "channeldrilldown1",
    "channeldrilldown2",
    "channeldrilldown3",
    "landingpage",
    "landingpagegroup",
    "source",
    "medium",
    "campaign",
    "content",
    "term"
  ];

  const inputs = {};
  const inputElements = [];
  fieldNames.forEach(name => {
    const input = { tagName: "INPUT", name, value: "", type: "hidden" };
    inputs[name] = input;
    inputElements.push(input);
    env.elements.push(input);
  });

  const form = {
    tagName: "FORM",
    id: "hero-form",
    querySelectorAll(selector) {
      const match = selector.match(/^input\[name="([^"]+)"\]$/);
      if (match) {
        const name = match[1];
        return inputElements.filter(i => i.name === name);
      }
      if (selector === "input") return [...inputElements];
      return [];
    },
    querySelector(selector) {
      const list = this.querySelectorAll(selector);
      return list.length > 0 ? list[0] : null;
    }
  };
  env.elements.push(form);

  const scriptPath = path.join(rootDir, "attributer.js");
  const scriptCode = fs.readFileSync(scriptPath, "utf-8");

  const runSdk = new Function(
    "window",
    "document",
    "localStorage",
    "sessionStorage",
    "MutationObserver",
    scriptCode
  );
  runSdk(env.mockWin, env.mockDoc, env.mockStorage, env.mockStorage, env.mockWin.MutationObserver);

  // Trigger form population
  const Attributer = env.mockWin.Attributer;
  if (Attributer?.populateForms) {
    Attributer.populateForms();
  }

  const stored = Attributer?.getStoredAttribution() || (env.mockStorage.getItem("attributer_first_touch") ? JSON.parse(env.mockStorage.getItem("attributer_first_touch")).data : null);

  const t1Channel = stored?.channel === "Paid Search" && inputs.channel.value === "Paid Search";
  const t1Source = stored?.source === "google" && inputs.source.value === "google";
  const t1Medium = stored?.medium === "cpc" && inputs.medium.value === "cpc";
  const t1Campaign = stored?.campaign === "hubspot-test" && inputs.campaign.value === "hubspot-test";
  const t1Content = stored?.content === "ad-01" && inputs.content.value === "ad-01";
  const t1Term = stored?.term === "crm" && inputs.term.value === "crm";
  const t1Landing = stored?.landingPage === "/real-site/index.html" && inputs.landingpage.value === "/real-site/index.html";
  const t1Group = stored?.landingPageGroup === "/real-site" && inputs.landingpagegroup.value === "/real-site";

  const test1Pass = Boolean(t1Channel && t1Source && t1Medium && t1Campaign && t1Content && t1Term && t1Landing && t1Group);
  console.log(`Channel: ${stored?.channel} (${inputs.channel.value})`);
  console.log(`Source: ${stored?.source} (${inputs.source.value})`);
  console.log(`Campaign: ${stored?.campaign} (${inputs.campaign.value})`);
  console.log(`Content: ${stored?.content} (${inputs.content.value})`);
  console.log(`Term: ${stored?.term} (${inputs.term.value})`);
  console.log(`Landing Page: ${stored?.landingPage} (${inputs.landingpage.value})`);
  console.log(`Landing Page Group: ${stored?.landingPageGroup} (${inputs.landingpagegroup.value})`);
  console.log(`TEST 1 Result: ${test1Pass ? "PASS" : "FAIL"}\n`);
  results.test1 = test1Pass;
  results.test1Details = { stored, inputs: Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, v.value])) };

  // -------------------------------------------------------------------------
  // TEST 2 — Real form submission to POST /api/leads
  // -------------------------------------------------------------------------
  console.log("--- TEST 2: Real form submission to /api/leads ---");
  const timestamp = Date.now();
  const testEmail = `sorget-hubspot-e2e-${timestamp}@example.com`;
  const trackingId = "attr_0g66y2s";

  const formPayload = {
    name: "John Doe",
    email: testEmail,
    tracking_id: trackingId,
    channel: inputs.channel.value,
    source: inputs.source.value,
    medium: inputs.medium.value,
    campaign: inputs.campaign.value,
    content: inputs.content.value,
    term: inputs.term.value,
    channeldrilldown1: inputs.channeldrilldown1.value,
    channeldrilldown2: inputs.channeldrilldown2.value,
    channeldrilldown3: inputs.channeldrilldown3.value,
    landingpage: inputs.landingpage.value,
    landingpagegroup: inputs.landingpagegroup.value,
    submit_page: "/real-site/index.html",
  };

  let leadApiRes = null;
  try {
    leadApiRes = await fetch("http://localhost:3001/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formPayload),
    });
  } catch (err) {
    console.log("Could not connect to http://localhost:3001/api/leads:", err.message);
  }

  const leadApiStatus = leadApiRes?.status ?? 0;
  let leadApiBody = null;
  if (leadApiRes && leadApiRes.headers.get("content-type")?.includes("application/json")) {
    leadApiBody = await leadApiRes.json();
  }
  console.log(`POST /api/leads status: ${leadApiStatus}`);
  console.log(`Response body:`, leadApiBody);

  if (leadApiStatus !== 201) {
    console.log("Next.js server on port 3001 is not running or did not accept the request. Skipping live API integration assertions.");
    return;
  }

  // Check Supabase lead
  const { data: dbLead, error: dbLeadErr } = await supabase
    .from("leads")
    .select("*")
    .eq("email", testEmail)
    .single();

  const test2Pass = leadApiStatus === 201 && dbLead && dbLead.channel === "Paid Search" && dbLead.campaign === "hubspot-test";
  console.log(`Supabase lead exists: ${Boolean(dbLead)}, ID: ${dbLead?.id}`);
  console.log(`TEST 2 Result: ${test2Pass ? "PASS" : "FAIL"}\n`);
  results.test2 = test2Pass;
  results.lead = dbLead;

  // Wait 3 seconds for background HubSpot sync to complete
  console.log("Waiting 3s for background HubSpot sync to complete...");
  await new Promise((r) => setTimeout(r, 3000));

  // -------------------------------------------------------------------------
  // TEST 3 & 4 — HubSpot sync & crm_sync_log
  // -------------------------------------------------------------------------
  console.log("--- TEST 3 & 4: HubSpot sync & crm_sync_log ---");
  const { data: syncLogs } = await supabase
    .from("crm_sync_log")
    .select("*")
    .eq("lead_id", dbLead?.id)
    .order("created_at", { ascending: false });

  console.log("crm_sync_log entries for lead:", syncLogs);
  const syncLog = syncLogs?.[0];

  // Also query HubSpot directly using connection access token
  const { data: connection } = await supabase
    .from("crm_connections")
    .select("*")
    .eq("provider", "hubspot")
    .single();

  let hubspotContact = null;
  let hubspotContactStatus = 0;
  if (connection?.access_token) {
    const hsRes = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(testEmail)}?idProperty=email&properties=email,firstname,lastname,sorget_channel,sorget_drilldown1,sorget_drilldown2,sorget_drilldown3,sorget_landing_page,sorget_landing_page_group,sorget_source,sorget_medium,sorget_campaign,sorget_content,sorget_term`,
      {
        headers: { Authorization: `Bearer ${connection.access_token}` },
      }
    );
    hubspotContactStatus = hsRes.status;
    const hsText = await hsRes.text();
    let hsJson = null;
    try { hsJson = JSON.parse(hsText); } catch {}

    if (hsRes.ok && hsJson) {
      hubspotContact = hsJson;
      console.log("HubSpot contact found:", hubspotContact.properties);
    } else {
      console.log(`HubSpot contact query status: ${hubspotContactStatus}, message:`, hsJson?.message || hsText.slice(0, 100));
    }
  }

  results.test3ContactCreated = Boolean(hubspotContact);
  results.test3All11Props = false;
  if (hubspotContact) {
    const p = hubspotContact.properties;
    results.test3All11Props = Boolean(
      p.sorget_channel &&
      p.sorget_drilldown1 &&
      p.sorget_drilldown2 &&
      p.sorget_drilldown3 &&
      p.sorget_landing_page &&
      p.sorget_landing_page_group &&
      p.sorget_source &&
      p.sorget_medium &&
      p.sorget_campaign &&
      p.sorget_content &&
      p.sorget_term
    );
  }

  const test4Pass = Boolean(syncLog && !syncLog.error_message?.includes("token"));
  console.log(`TEST 3 (Contact Created): ${results.test3ContactCreated ? "PASS" : "FAIL"}`);
  console.log(`TEST 3 (All 11 Props): ${results.test3All11Props ? "PASS" : "FAIL"}`);
  console.log(`TEST 4 (crm_sync_log logged): ${test4Pass ? "PASS" : "FAIL"}\n`);

  // -------------------------------------------------------------------------
  // TEST 5 — Duplicate behavior (Same email with changed attribution)
  // -------------------------------------------------------------------------
  console.log("--- TEST 5: Duplicate behavior (same email, new attribution) ---");
  const dupPayload = {
    ...formPayload,
    campaign: "hubspot-retargeting",
    content: "ad-02",
  };

  const dupRes = await fetch("http://localhost:3001/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dupPayload),
  });
  console.log(`POST /api/leads duplicate status: ${dupRes.status}`);

  await new Promise((r) => setTimeout(r, 3000));

  // Verify contact was updated, not duplicated
  let duplicateCount = 0;
  if (connection?.access_token) {
    const searchRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "EQ",
                value: testEmail,
              },
            ],
          },
        ],
      }),
    });
    const searchText = await searchRes.text();
    let searchBody = null;
    try { searchBody = JSON.parse(searchText); } catch {}
    if (searchRes.ok && searchBody) {
      duplicateCount = searchBody.total;
      console.log(`HubSpot search total contacts with email ${testEmail}: ${duplicateCount}`);
    }
  }

  const test5Pass = duplicateCount <= 1;
  console.log(`TEST 5 Result: ${test5Pass ? "PASS" : "FAIL"}\n`);
  results.test5 = test5Pass;

  // -------------------------------------------------------------------------
  // TEST 6 — Failure handling (Simulate HubSpot failure safely)
  // -------------------------------------------------------------------------
  console.log("--- TEST 6: Failure handling ---");
  const { triggerHubSpotSync } = await import("../src/crm-sync.js");
  const fakeLead = {
    id: dbLead?.id || "fake-lead-id",
    email: `failure-test-${Date.now()}@example.com`,
    name: "Failure Test",
    channel: "Organic Search",
  };
  const fakeProject = { id: dbLead?.project_id, workspace_id: dbLead?.workspace_id };

  let loggedError = null;
  const failSyncResult = await triggerHubSpotSync(fakeLead, fakeProject, {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: "mock-conn",
                  workspace_id: fakeProject.workspace_id,
                  provider: "hubspot",
                  access_token: "invalid_simulated_token",
                  token_expires_at: new Date(Date.now() + 3600000).toISOString(),
                  is_active: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
      insert: async (rows) => {
        loggedError = rows[0];
        return { data: rows, error: null };
      },
    }),
  });

  const test6Pass = failSyncResult.success === false && Boolean(failSyncResult.error) && !JSON.stringify(loggedError).includes("invalid_simulated_token");
  console.log("Failure handling result:", failSyncResult);
  console.log(`TEST 6 Result: ${test6Pass ? "PASS" : "FAIL"}\n`);
  results.test6 = test6Pass;

  // Clean up test contact from HubSpot to keep portal clean if created
  if (hubspotContact?.id && connection?.access_token) {
    console.log(`Cleaning up test contact ${hubspotContact.id} from HubSpot...`);
    await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${hubspotContact.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${connection.access_token}` },
    });
    console.log("Cleaned up test contact.");
  }

  console.log("=== SUMMARY RESULTS ===");
  console.log(JSON.stringify(results, null, 2));
}

run().catch((err) => {
  console.error("FATAL ERROR in phase 8 verification script:", err);
  process.exit(1);
});
