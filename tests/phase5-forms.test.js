/**
 * Phase 5 — Form Detection & Field Mapping Tests
 *
 * Tests:
 * 1. data-attributer-field attribute selector mapping
 * 2. Custom user-defined field mapping (options.fieldMapping)
 * 3. CRM aliases (LeadSource, First_Click_Source__c, GCLID, first_touch_channel)
 * 4. CMS form builder aliases (wpcf7-channel, gform_channel, hs_lead_source)
 * 5. Input elements support: text/hidden input, textarea, select dropdown
 * 6. Preserves existing non-empty values
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { populateForm, getCustomFieldMapping } from "../src/form-attribution.js";

describe("Phase 5 — Form Detection & Field Mapping", () => {
  const sampleAttribution = {
    channel: "Paid Search",
    source: "google",
    medium: "cpc",
    campaign: "q1_growth",
    content: "ad_variant_a",
    term: "saas attribution",
    gclid: "test_gclid_999",
    drilldown1: "google",
    drilldown2: "q1_growth",
    drilldown3: "ad_variant_a",
    landingPage: "/demo",
    landingPageGroup: "/demo",
    submitPage: "/demo",
  };

  function createMockForm(fieldElements) {
    return {
      querySelectorAll: (selector) => {
        // Handle attribute selector [data-attributer-field="..."]
        const dataMatch = selector.match(/\[data-attributer-field="([^"]+)"\]/);
        if (dataMatch) {
          const field = dataMatch[1];
          const matches = [];
          for (const el of fieldElements) {
            if (el.dataset && el.dataset.attributerField === field) {
              matches.push(el);
            }
          }
          return matches;
        }

        // Handle name selector [name="..."]
        const nameMatch = selector.match(/name="([^"]+)"/);
        if (nameMatch) {
          const name = nameMatch[1];
          const matches = [];
          for (const el of fieldElements) {
            if (el.name === name) {
              matches.push(el);
            }
          }
          return matches;
        }

        return [];
      },
    };
  }

  it("1. Matches and populates elements with data-attributer-field attribute", () => {
    const el1 = { tagName: "INPUT", name: "any_custom_name_1", dataset: { attributerField: "channel" }, value: "", trim: () => "" };
    const el2 = { tagName: "INPUT", name: "any_custom_name_2", dataset: { attributerField: "gclid" }, value: "", trim: () => "" };

    const mockForm = createMockForm([el1, el2]);
    populateForm(mockForm, sampleAttribution);

    assert.equal(el1.value, "Paid Search");
    assert.equal(el2.value, "test_gclid_999");
  });

  it("2. Applies custom user-defined field mapping via options", () => {
    const customInput1 = { tagName: "INPUT", name: "lead_chn_custom", value: "", trim: () => "" };
    const customInput2 = { tagName: "TEXTAREA", name: "lead_src_custom", value: "", trim: () => "" };

    const mockForm = createMockForm([customInput1, customInput2]);
    populateForm(mockForm, sampleAttribution, {
      fieldMapping: {
        "lead_chn_custom": "channel",
        "lead_src_custom": "source",
      },
    });

    assert.equal(customInput1.value, "Paid Search");
    assert.equal(customInput2.value, "google");
  });

  it("3. Populates standard CRM field aliases (LeadSource, First_Click_Source__c, GCLID)", () => {
    const sf1 = { tagName: "INPUT", name: "LeadSource", value: "", trim: () => "" };
    const sf2 = { tagName: "INPUT", name: "First_Click_Source__c", value: "", trim: () => "" };
    const sf3 = { tagName: "INPUT", name: "GCLID", value: "", trim: () => "" };
    const sf4 = { tagName: "INPUT", name: "first_touch_channel", value: "", trim: () => "" };

    const mockForm = createMockForm([sf1, sf2, sf3, sf4]);
    populateForm(mockForm, sampleAttribution);

    assert.equal(sf1.value, "google");
    assert.equal(sf2.value, "google");
    assert.equal(sf3.value, "test_gclid_999");
    assert.equal(sf4.value, "Paid Search");
  });

  it("4. Populates WordPress and Contact Form 7 / Gravity Forms aliases", () => {
    const wp1 = { tagName: "INPUT", name: "wpcf7-channel", value: "", trim: () => "" };
    const wp2 = { tagName: "INPUT", name: "gform_channel", value: "", trim: () => "" };
    const hs1 = { tagName: "INPUT", name: "hs_lead_source", value: "", trim: () => "" };

    const mockForm = createMockForm([wp1, wp2, hs1]);
    populateForm(mockForm, sampleAttribution);

    assert.equal(wp1.value, "Paid Search");
    assert.equal(wp2.value, "Paid Search");
    assert.equal(hs1.value, "google");
  });

  it("5. Supports SELECT dropdown and preserves pre-filled values", () => {
    const selectEmpty = { tagName: "SELECT", name: "channel", value: "", trim: () => "" };
    const inputPreFilled = { tagName: "INPUT", name: "source", value: "Manual_Override", trim: () => "Manual_Override" };

    const mockForm = createMockForm([selectEmpty, inputPreFilled]);
    populateForm(mockForm, sampleAttribution);

    assert.equal(selectEmpty.value, "Paid Search");
    assert.equal(inputPreFilled.value, "Manual_Override", "Pre-filled value must be preserved");
  });
});