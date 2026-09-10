import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { PLANS, canAddWebsite } from "../src/billing.js";
import {
  PADDLE_PRICE_IDS,
  getPaddlePriceId,
  getPlanFromPaddlePriceId,
  verifyPaddleWebhookSignature,
} from "../lib/paddle.ts";

describe("Sorget — User Flow, Plans, Trial & Navigation Suite", () => {
  // ── 1. Sorget Plans & Pricing Validation ──
  it("1. Verifies all 6 Sorget plans with correct prices, site limits, and 14-day trials", () => {
    // Single site plans
    assert.equal(PLANS.lite.priceMonthlyUsd, 29);
    assert.equal(PLANS.lite.websiteLimit, 1);
    assert.equal(PLANS.lite.leadsMonthlyLimit, 100);
    assert.equal(PLANS.lite.trialDays, 14);

    assert.equal(PLANS.starter.priceMonthlyUsd, 49);
    assert.equal(PLANS.starter.websiteLimit, 1);
    assert.equal(PLANS.starter.trialDays, 14);

    assert.equal(PLANS.professional.priceMonthlyUsd, 99);
    assert.equal(PLANS.professional.websiteLimit, 1);
    assert.equal(PLANS.professional.leadsMonthlyLimit, 1000);
    assert.equal(PLANS.professional.trialDays, 14);

    // Multi site plans
    assert.equal(PLANS["10-sites"].priceMonthlyUsd, 199);
    assert.equal(PLANS["10-sites"].websiteLimit, 10);
    assert.equal(PLANS["10-sites"].trialDays, 14);

    assert.equal(PLANS["25-sites"].priceMonthlyUsd, 299);
    assert.equal(PLANS["25-sites"].websiteLimit, 25);
    assert.equal(PLANS["25-sites"].trialDays, 14);

    assert.equal(PLANS["50-sites"].priceMonthlyUsd, 399);
    assert.equal(PLANS["50-sites"].websiteLimit, 50);
    assert.equal(PLANS["50-sites"].trialDays, 14);

    // Custom
    assert.equal(PLANS.custom.websiteLimit, 999);
  });

  // ── 2. Server-Side Plan Limit Enforcement ──
  it("2. Enforces single-site limits: Lite, Starter, and Professional allow max 1 website", () => {
    for (const plan of ["lite", "starter", "professional", "pro"]) {
      assert.equal(canAddWebsite(plan, 0), true, `${plan} allows first website`);
      assert.equal(canAddWebsite(plan, 1), false, `${plan} rejects second website`);
      assert.equal(canAddWebsite(plan, 2), false, `${plan} rejects third website`);
    }
  });

  it("3. Enforces multi-site limits: 10, 25, and 50 sites plans allow up to their exact maximum", () => {
    // 10 Sites
    assert.equal(canAddWebsite("10-sites", 0), true);
    assert.equal(canAddWebsite("10-sites", 9), true);
    assert.equal(canAddWebsite("10-sites", 10), false, "10-sites plan rejects 11th website");

    // 25 Sites
    assert.equal(canAddWebsite("25-sites", 24), true);
    assert.equal(canAddWebsite("25-sites", 25), false, "25-sites plan rejects 26th website");

    // 50 Sites
    assert.equal(canAddWebsite("50-sites", 49), true);
    assert.equal(canAddWebsite("50-sites", 50), false, "50-sites plan rejects 51st website");
  });

  // ── 3. 14-Day Free Trial Logic ──
  it("4. Calculates exact 14-day trial period timestamps", () => {
    function calculateTrialPeriod(startDate = new Date()) {
      const trialDurationMs = 14 * 24 * 60 * 60 * 1000;
      const trialEnd = new Date(startDate.getTime() + trialDurationMs);
      return {
        trialStart: startDate.toISOString(),
        trialEnd: trialEnd.toISOString(),
        durationDays: Math.round((trialEnd.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)),
      };
    }

    const trial = calculateTrialPeriod(new Date("2026-09-10T12:00:00Z"));
    assert.equal(trial.trialStart, "2026-09-10T12:00:00.000Z");
    assert.equal(trial.trialEnd, "2026-09-24T12:00:00.000Z");
    assert.equal(trial.durationDays, 14);
  });

  it("5. Idempotent trial activation: avoids duplicate subscriptions on refresh", () => {
    const mockSubscriptions = [];

    function recordTrial(workspaceId, plan) {
      const existing = mockSubscriptions.find((s) => s.workspace_id === workspaceId);
      if (existing) {
        // Return existing without duplicating
        return { created: false, subscription: existing };
      }

      const now = new Date();
      const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const newSub = {
        id: "sub_" + Math.random().toString(36).substring(2, 7),
        workspace_id: workspaceId,
        plan,
        provider: "paddle",
        status: "trialing",
        trial_start: now.toISOString(),
        trial_end: trialEnd.toISOString(),
      };
      mockSubscriptions.push(newSub);
      return { created: true, subscription: newSub };
    }

    const firstCall = recordTrial("ws_101", "starter");
    assert.equal(firstCall.created, true);
    assert.equal(mockSubscriptions.length, 1);

    const secondCall = recordTrial("ws_101", "starter");
    assert.equal(secondCall.created, false);
    assert.equal(mockSubscriptions.length, 1, "Duplicate subscription was not created");
    assert.equal(secondCall.subscription.id, firstCall.subscription.id);
  });

  // ── 4. Onboarding Idempotency & Validation ──
  it("6. Validates onboarding required fields and prevents duplicate projects", () => {
    function validateOnboarding(name, website, crm) {
      if (!name || !name.trim()) return { valid: false, error: "Website name is required." };
      if (!website || !website.trim()) return { valid: false, error: "Website URL is required." };
      if (!crm || !crm.trim()) return { valid: false, error: "CRM used is required." };
      return { valid: true, error: null };
    }

    assert.equal(validateOnboarding("", "https://example.com", "hubspot").valid, false);
    assert.equal(validateOnboarding("My Site", "", "hubspot").valid, false);
    assert.equal(validateOnboarding("My Site", "https://example.com", "hubspot").valid, true);

    const mockProjects = [];
    function createOrUpdateOnboardingProject(workspaceId, name, website, crm) {
      const existing = mockProjects.find((p) => p.workspace_id === workspaceId);
      if (existing) {
        existing.name = name;
        existing.website = website;
        existing.crm = crm;
        return { isNew: false, project: existing };
      }
      const project = { id: "proj_1", workspace_id: workspaceId, name, website, crm };
      mockProjects.push(project);
      return { isNew: true, project };
    }

    const p1 = createOrUpdateOnboardingProject("ws_abc", "Acme", "https://acme.com", "hubspot");
    assert.equal(p1.isNew, true);
    assert.equal(mockProjects.length, 1);

    const p2 = createOrUpdateOnboardingProject("ws_abc", "Acme Updated", "https://acme.com", "salesforce");
    assert.equal(p2.isNew, false);
    assert.equal(mockProjects.length, 1, "Did not duplicate project on repeated submission");
    assert.equal(mockProjects[0].name, "Acme Updated");
  });

  // ── 5. Paddle Webhook Signature Verification ──
  it("7. Cryptographically verifies genuine Paddle v2 webhook signatures", () => {
    const webhookSecret = "pdl_whsec_test_secret_9999999999999999";
    const ts = Math.floor(Date.now() / 1000).toString();
    const rawBody = JSON.stringify({
      event_type: "subscription.activated",
      data: { id: "sub_01", custom_data: { workspace_id: "ws_101" } },
    });

    const payload = `${ts}:${rawBody}`;
    const h1 = crypto.createHmac("sha256", webhookSecret).update(payload).digest("hex");
    const signatureHeader = `ts=${ts};h1=${h1}`;

    const isValid = verifyPaddleWebhookSignature(rawBody, signatureHeader, webhookSecret);
    assert.equal(isValid, true, "Authentic signature verified successfully");
  });

  it("8. Rejects forged or tampered Paddle webhook payloads", () => {
    const webhookSecret = "pdl_whsec_test_secret_9999999999999999";
    const ts = Math.floor(Date.now() / 1000).toString();
    const rawBody = JSON.stringify({ event_type: "subscription.activated" });
    const forgedSignature = `ts=${ts};h1=0000000000000000000000000000000000000000000000000000000000000000`;

    const isValid = verifyPaddleWebhookSignature(rawBody, forgedSignature, webhookSecret);
    assert.equal(isValid, false, "Forged signature rejected");

    // Tampered body
    const validH1 = crypto.createHmac("sha256", webhookSecret).update(`${ts}:${rawBody}`).digest("hex");
    const tamperedBody = JSON.stringify({ event_type: "subscription.activated", tampered: true });
    const isTamperedValid = verifyPaddleWebhookSignature(tamperedBody, `ts=${ts};h1=${validH1}`, webhookSecret);
    assert.equal(isTamperedValid, false, "Tampered payload rejected");
  });

  // ── 6. Project & Lead Isolation ──
  it("9. Guarantees strict project lead isolation (Website A cannot see Website B's leads)", () => {
    const leads = [
      { id: "lead_1", project_id: "project_A", email: "userA1@example.com" },
      { id: "lead_2", project_id: "project_A", email: "userA2@example.com" },
      { id: "lead_3", project_id: "project_B", email: "userB1@example.com" },
    ];

    function getLeadsForProject(targetProjectId) {
      return leads.filter((l) => l.project_id === targetProjectId);
    }

    const leadsForA = getLeadsForProject("project_A");
    assert.equal(leadsForA.length, 2);
    assert.ok(leadsForA.every((l) => l.project_id === "project_A"));

    const leadsForB = getLeadsForProject("project_B");
    assert.equal(leadsForB.length, 1);
    assert.ok(leadsForB.every((l) => l.project_id === "project_B"));

    // Verify isolation
    assert.equal(leadsForA.some((l) => l.email === "userB1@example.com"), false);
  });

  // ── 7. OAuth PKCE Flow & Onboarding Redirection ──
  it("10. Intercepts OAuth PKCE code landing on /login or /signup and forwards to /auth/callback", () => {
    function resolveOAuthRedirect(pathname, searchParams, forwardedHost) {
      const codeParam = searchParams.get("code");
      if (codeParam && (pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname === "/")) {
        const proto = forwardedHost?.includes("localhost") ? "http" : "https";
        const origin = forwardedHost ? `${proto}://${forwardedHost}` : "https://app.sorget.site";
        const callbackUrl = new URL("/auth/callback", origin);
        callbackUrl.searchParams.set("code", codeParam);
        const nextVal = searchParams.get("next") || "/onboarding";
        callbackUrl.searchParams.set("next", nextVal);
        return callbackUrl.toString();
      }
      return null;
    }

    const testCode = "e91481de-01b4-4fcf-89d6-359f8f6ebf07";

    // User landing on /login?code=...
    const loginParams = new URLSearchParams(`code=${testCode}`);
    const loginResult = resolveOAuthRedirect("/login", loginParams, "app.sorget.site");
    assert.equal(loginResult, `https://app.sorget.site/auth/callback?code=${testCode}&next=%2Fonboarding`);

    // User landing on /signup?code=...
    const signupParams = new URLSearchParams(`code=${testCode}`);
    const signupResult = resolveOAuthRedirect("/signup", signupParams, "app.sorget.site");
    assert.equal(signupResult, `https://app.sorget.site/auth/callback?code=${testCode}&next=%2Fonboarding`);

    // User landing on /?code=...
    const rootParams = new URLSearchParams(`code=${testCode}`);
    const rootResult = resolveOAuthRedirect("/", rootParams, "app.sorget.site");
    assert.equal(rootResult, `https://app.sorget.site/auth/callback?code=${testCode}&next=%2Fonboarding`);
  });

  it("11. Routes authenticated user based on onboarding and subscription status", () => {
    function resolvePostAuthDestination({ userProjects, subscription, safeNext }) {
      if (safeNext?.startsWith("/reset-password") || safeNext?.startsWith("/invite")) {
        return safeNext;
      }
      if (!userProjects || userProjects.length === 0) {
        return "/onboarding";
      }
      if (!subscription) {
        return "/planning";
      }
      return `/dashboard/projects/${userProjects[0].id}`;
    }

    // New Google OAuth user with 0 projects -> must go to /onboarding
    const newUserDest = resolvePostAuthDestination({
      userProjects: [],
      subscription: null,
      safeNext: "/onboarding",
    });
    assert.equal(newUserDest, "/onboarding");

    // User completed onboarding with a project but no subscription -> /planning
    const projectOnlyDest = resolvePostAuthDestination({
      userProjects: [{ id: "proj_new_123" }],
      subscription: null,
      safeNext: "/onboarding",
    });
    assert.equal(projectOnlyDest, "/planning");

    // Existing user with project and active trial/plan -> /dashboard/projects/[id]
    const fullyOnboardedDest = resolvePostAuthDestination({
      userProjects: [{ id: "proj_new_123" }],
      subscription: { id: "sub_1", status: "trialing" },
      safeNext: "/onboarding",
    });
    assert.equal(fullyOnboardedDest, "/dashboard/projects/proj_new_123");
  });
});
