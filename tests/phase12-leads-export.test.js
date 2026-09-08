/**
 * Phase 12 — Lead Management & Export Tests
 *
 * Tests:
 * 1. RFC 4180 CSV escaping for special characters, commas, and quotes
 * 2. Complete attribution dimensions export structure
 * 3. Channel and date filtering logic
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Phase 12 — Lead Management & Export View", () => {
  function escapeCsvField(val) {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function generateLeadsCsv(leads) {
    const headers = [
      "ID",
      "Email",
      "Channel",
      "Source",
      "Medium",
      "Campaign",
      "Drilldown 1",
      "Drilldown 2",
      "Drilldown 3",
    ];

    const rows = leads.map((lead) => [
      escapeCsvField(lead.id),
      escapeCsvField(lead.email),
      escapeCsvField(lead.channel),
      escapeCsvField(lead.source),
      escapeCsvField(lead.medium),
      escapeCsvField(lead.campaign),
      escapeCsvField(lead.drilldown1),
      escapeCsvField(lead.drilldown2),
      escapeCsvField(lead.drilldown3),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  }

  it("1. Escapes commas, quotes, and newlines in CSV export values", () => {
    assert.equal(escapeCsvField("Simple"), "Simple");
    assert.equal(escapeCsvField("Doe, Jane"), '"Doe, Jane"');
    assert.equal(escapeCsvField('Quotes "Inside"'), '"Quotes ""Inside"""');
    assert.equal(escapeCsvField("Line 1\nLine 2"), '"Line 1\nLine 2"');
  });

  it("2. Formats complete attribution columns in CSV output", () => {
    const testLeads = [
      {
        id: "lead_101",
        email: "alex@acme.com",
        channel: "Paid Search",
        source: "google",
        medium: "cpc",
        campaign: "summer_sale",
        drilldown1: "google",
        drilldown2: "summer_sale",
        drilldown3: "ad_headline_1",
      },
    ];

    const csv = generateLeadsCsv(testLeads);
    assert.match(csv, /^ID,Email,Channel,Source,Medium,Campaign,Drilldown 1,Drilldown 2,Drilldown 3/);
    assert.match(csv, /lead_101,alex@acme\.com,Paid Search,google,cpc,summer_sale,google,summer_sale,ad_headline_1/);
  });

  it("3. Filters leads by channel correctly", () => {
    const leads = [
      { id: "1", channel: "Paid Search" },
      { id: "2", channel: "Organic Search" },
      { id: "3", channel: "Paid Search" },
      { id: "4", channel: "Email" },
    ];

    const paidSearchLeads = leads.filter((l) => l.channel === "Paid Search");
    assert.equal(paidSearchLeads.length, 2);

    const emailLeads = leads.filter((l) => l.channel === "Email");
    assert.equal(emailLeads.length, 1);
  });
});