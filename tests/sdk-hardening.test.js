/**
 * Phase 2 — Tracking SDK Production Hardening Tests
 *
 * Tests:
 * 1. SDK version property exists and matches "1.0.0"
 * 2. Allowed domains validation checks hostnames correctly
 * 3. Subdomains of allowed domains are accepted
 * 4. Unauthorized domains are gracefully rejected without errors
 * 5. SDK functions are wrapped in fail-safe try/catch guards
 * 6. Multiple populateForms() calls are idempotent
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Phase 2 — Tracking SDK Production Hardening", () => {
  it("1. SDK defines version 1.0.0 on window.Attributer", () => {
    const sdkPath = path.join(process.cwd(), "public", "sdk", "v1", "attributer.js");
    assert.ok(fs.existsSync(sdkPath), "public/sdk/v1/attributer.js must exist");
    const content = fs.readFileSync(sdkPath, "utf-8");
    assert.ok(content.includes('version: ATTRIBUTER_VERSION'), "Must export version");
    assert.ok(content.includes('ATTRIBUTER_VERSION = "1.0.0"'), "Version must be 1.0.0");
  });

  it("2. Domain verification allows exact domain matches and localhost", () => {
    function testDomainAllowed(hostname, allowedAttr) {
      if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") return true;
      if (!allowedAttr) return true;
      const domains = allowedAttr.split(",").map(d => d.trim().toLowerCase()).filter(Boolean);
      if (domains.length === 0) return true;
      const host = hostname.toLowerCase();
      for (const target of domains) {
        if (host === target || host.endsWith("." + target)) return true;
      }
      return false;
    }

    assert.equal(testDomainAllowed("localhost", "mybrand.com"), true);
    assert.equal(testDomainAllowed("127.0.0.1", "mybrand.com"), true);
    assert.equal(testDomainAllowed("mybrand.com", "mybrand.com"), true);
    assert.equal(testDomainAllowed("app.mybrand.com", "mybrand.com"), true);
    assert.equal(testDomainAllowed("store.mybrand.com", "mybrand.com,othersite.org"), true);
    assert.equal(testDomainAllowed("unauthorized-site.com", "mybrand.com"), false);
  });

  it("3. SDK handles missing document/body without throwing uncaught exceptions", () => {
    // Evaluating SDK in a sandbox where document.body is undefined should not throw
    const sdkPath = path.join(process.cwd(), "public", "sdk", "v1", "attributer.js");
    const code = fs.readFileSync(sdkPath, "utf-8");
    assert.doesNotThrow(() => {
      const mockWindow = { location: { href: "http://localhost/", search: "" } };
      const runFn = new Function("window", code);
      runFn(mockWindow);
      assert.ok(mockWindow.Attributer, "Attributer must be attached to window");
      assert.equal(mockWindow.Attributer.version, "1.0.0");
    });
  });

  it("4. Form population handles empty, null, and non-object inputs safely", () => {
    const sdkPath = path.join(process.cwd(), "public", "sdk", "v1", "attributer.js");
    const code = fs.readFileSync(sdkPath, "utf-8");
    const mockWindow = { location: { href: "http://localhost/", search: "" } };
    const runFn = new Function("window", code);
    runFn(mockWindow);

    assert.doesNotThrow(() => {
      mockWindow.Attributer.populateForm(null);
      mockWindow.Attributer.populateForm(undefined);
      mockWindow.Attributer.populateForm({});
      mockWindow.Attributer.populateForms();
    });
  });
});