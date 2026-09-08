/**
 * Phase 4 — Browser Storage Hardening Tests
 *
 * Tests:
 * 1. Attribution saved in versioned envelope with version, storedAt, expiresAt, and data
 * 2. 90-day default TTL correctly computed
 * 3. Expired attribution record (now > expiresAt) is automatically evicted and returns null
 * 4. Legacy flat attribution record without envelope is transparently migrated
 * 5. Corrupted / invalid storage primitives are safely cleaned up without throwing
 * 6. First-touch immutability preserved within valid TTL
 * 7. Last-touch updates with fresh TTL metadata
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  saveFirstTouch,
  getFirstTouch,
  saveLastTouch,
  getLastTouch,
  clearAllAttribution,
  wrapStorageEnvelope,
  DEFAULT_TTL_MS,
  STORAGE_SCHEMA_VERSION,
} from "../src/storage.js";

describe("Phase 4 — Browser Storage Hardening", () => {
  const memoryStore = new Map();

  beforeEach(() => {
    memoryStore.clear();
    globalThis.localStorage = {
      getItem: (k) => memoryStore.get(k) ?? null,
      setItem: (k, v) => memoryStore.set(k, String(v)),
      removeItem: (k) => memoryStore.delete(k),
      clear: () => memoryStore.clear(),
    };
    clearAllAttribution();
  });

  it("1. Saves attribution inside versioned envelope with 90-day TTL", () => {
    const rawAttr = { channel: "Paid Search", source: "google", medium: "cpc" };
    saveFirstTouch(rawAttr);

    const rawStored = memoryStore.get("attributer_first_touch");
    assert.ok(rawStored, "Must store string in localStorage");

    const parsed = JSON.parse(rawStored);
    assert.equal(parsed.version, 1);
    assert.equal(typeof parsed.storedAt, "number");
    assert.equal(typeof parsed.expiresAt, "number");
    assert.ok(parsed.expiresAt > parsed.storedAt);
    assert.equal(parsed.expiresAt - parsed.storedAt, DEFAULT_TTL_MS);
    assert.deepEqual(parsed.data, rawAttr);

    // Reading through API un-wraps envelope data transparently
    const read = getFirstTouch();
    assert.deepEqual(read, rawAttr);
  });

  it("2. Expired record is evicted automatically and returns null", () => {
    const rawAttr = { channel: "Organic Search", source: "google" };
    // Save with negative TTL (already expired in the past)
    saveFirstTouch(rawAttr, -1000);

    // Should detect expiration, remove from storage, and return null
    const result = getFirstTouch();
    assert.equal(result, null, "Expired record must return null");
    assert.equal(memoryStore.get("attributer_first_touch"), undefined, "Expired record must be evicted from storage");
  });

  it("3. Legacy flat attribution record is transparently migrated to versioned envelope", () => {
    const legacyFlat = {
      channel: "Paid Social",
      source: "facebook",
      medium: "paid_social",
      campaign: "retargeting",
      landingPage: "/pricing",
    };

    // Inject legacy flat record directly into storage
    memoryStore.set("attributer_first_touch", JSON.stringify(legacyFlat));

    // First read should return the data AND migrate storage to envelope
    const read = getFirstTouch();
    assert.deepEqual(read, legacyFlat);

    // Inspect storage to verify migration happened
    const rawStored = memoryStore.get("attributer_first_touch");
    const parsedEnvelope = JSON.parse(rawStored);
    assert.equal(parsedEnvelope.version, 1);
    assert.ok(parsedEnvelope.data);
    assert.equal(parsedEnvelope.data.channel, "Paid Social");
  });

  it("4. Corrupted JSON or invalid types are safely removed without throwing", () => {
    memoryStore.set("attributer_first_touch", "INVALID_JSON_{{");
    assert.equal(getFirstTouch(), null);
    assert.equal(memoryStore.get("attributer_first_touch"), undefined);

    memoryStore.set("attributer_first_touch", "12345");
    assert.equal(getFirstTouch(), null);
    assert.equal(memoryStore.get("attributer_first_touch"), undefined);

    memoryStore.set("attributer_first_touch", "true");
    assert.equal(getFirstTouch(), null);

    memoryStore.set("attributer_first_touch", JSON.stringify(["an", "array"]));
    assert.equal(getFirstTouch(), null);
  });

  it("5. Last-touch updates with fresh TTL envelope", () => {
    const attr1 = { channel: "Paid Search", source: "google" };
    const attr2 = { channel: "Paid Social", source: "linkedin" };

    saveLastTouch(attr1);
    assert.equal(getLastTouch().source, "google");

    saveLastTouch(attr2);
    assert.equal(getLastTouch().source, "linkedin");

    const rawLast = JSON.parse(memoryStore.get("attributer_last_touch"));
    assert.equal(rawLast.version, 1);
    assert.equal(rawLast.data.source, "linkedin");
  });
});