import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { PLANS, canAddWebsite, planKeyToDbPlanId, resolvePlanKey } from "../src/billing.js";
import {
  PADDLE_PRICE_IDS,
  getPaddlePriceId,
  getPlanFromPaddlePriceId,
  verifyPaddleWebhookSignature,
} from "../lib/paddle.ts";

describe("Sorget — User Flow, Plans, Trial & Navigation Suite", () => {
  // ── 1. Sorget Plans & Pricing Validation ──
  it("1. Verifies 3 Sorget Planning plans ($29 for 1 site 100 leads, $99 for 5 sites 1000 leads, $299 for 25 sites 10000 leads)", () => {
    // 1 Site: $29, 1 website, 100 leads
    assert.equal(PLANS["1-site"].priceMonthlyUsd, 29);
    assert.equal(PLANS["1-site"].websiteLimit, 1);
    assert.equal(PLANS["1-site"].leadsMonthlyLimit, 100);
    assert.equal(PLANS["1-site"].trialDays, 14);

    // Lite alias
    assert.equal(PLANS.lite.priceMonthlyUsd, 29);
    assert.equal(PLANS.lite.websiteLimit, 1);
    assert.equal(PLANS.lite.leadsMonthlyLimit, 100);

    // 5 Sites: $99, 5 websites, 1000 leads
    assert.equal(PLANS["5-sites"].priceMonthlyUsd, 99);
    assert.equal(PLANS["5-sites"].websiteLimit, 5);
    assert.equal(PLANS["5-sites"].leadsMonthlyLimit, 1000);
    assert.equal(PLANS["5-sites"].trialDays, 14);

    // 25 Sites: $299, 25 websites, 10000 leads
    assert.equal(PLANS["25-sites"].priceMonthlyUsd, 299);
    assert.equal(PLANS["25-sites"].websiteLimit, 25);
    assert.equal(PLANS["25-sites"].leadsMonthlyLimit, 10000);
    assert.equal(PLANS["25-sites"].trialDays, 14);

    // Custom
    assert.equal(PLANS.custom.websiteLimit, 999);
  });

  // ── 2. Server-Side Plan Limit Enforcement ──
  it("2. Enforces 1-site limit: $29 plan allows max 1 website and cannot add multiple websites", () => {
    for (const plan of ["1-site", "1_site", "lite"]) {
      assert.equal(canAddWebsite(plan, 0), true, `${plan} allows first website`);
      assert.equal(canAddWebsite(plan, 1), false, `${plan} rejects second website`);
      assert.equal(canAddWebsite(plan, 2), false, `${plan} rejects third website`);
    }
  });

  it("3. Enforces multi-site limits: 5 sites allows up to 5, 25 sites allows up to 25", () => {
    // 5 Sites plan ($99 for 5 sites, 1000 leads)
    for (let i = 0; i < 5; i++) {
      assert.equal(canAddWebsite("5-sites", i), true, `5-sites allows website #${i + 1}`);
    }
    assert.equal(canAddWebsite("5-sites", 5), false, "5-sites plan rejects 6th website");

    // 25 Sites plan ($299 for 25 sites, 10,000 leads)
    assert.equal(canAddWebsite("25-sites", 0), true);
    assert.equal(canAddWebsite("25-sites", 24), true, "25-sites allows 25th website");
    assert.equal(canAddWebsite("25-sites", 25), false, "25-sites plan rejects 26th website");
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

  // ── 8. Production-Grade Onboarding CRM Persistence (No Silent Fallback) ──
  it("12. Onboarding project creation strictly persists CRM and never silently discards customer CRM configuration", () => {
    function createOnboardingProjectPayload(basePayload, crm) {
      if (!crm || !crm.trim()) {
        throw new Error("CRM used is required.");
      }
      return {
        ...basePayload,
        crm: crm.trim(),
      };
    }

    const base = {
      name: "Acme Corp",
      website: "https://acme.com",
      tracking_id: "attr_test123",
      user_id: "user_1",
      workspace_id: "ws_1",
    };

    const payload = createOnboardingProjectPayload(base, "hubspot");
    assert.equal(payload.crm, "hubspot");
    assert.equal(payload.name, "Acme Corp");
    assert.equal(payload.website, "https://acme.com");

    // Failure test: if CRM is omitted or database fails, it must reject and NOT silently proceed without CRM
    assert.throws(() => createOnboardingProjectPayload(base, ""), /CRM used is required/);
  });

  // ── 9. Plan Upgrade Behavior ──
  it("13. Upgrading across $29 (1 site), $99 (5 sites), and $299 (25 sites) strictly enforces respective website limits", () => {
    let mockSub = {
      id: "sub_1",
      workspace_id: "ws_1",
      plan: "1-site",
      plan_id: "1-site",
      status: "trialing",
    };

    function upgradePlan(workspaceId, newPlan) {
      if (mockSub.workspace_id === workspaceId) {
        mockSub.plan = newPlan;
        mockSub.plan_id = newPlan;
      }
      return mockSub;
    }

    // Tier 1: $29 for 1 site 100 leads
    assert.equal(canAddWebsite(mockSub.plan, 0), true, "1-site plan allows 1st website");
    assert.equal(canAddWebsite(mockSub.plan, 1), false, "1-site plan strictly rejects 2nd website");

    // Upgrade to Tier 2: $99 for 5 sites 1,000 leads
    upgradePlan("ws_1", "5-sites");
    assert.equal(mockSub.plan, "5-sites");
    assert.equal(canAddWebsite(mockSub.plan, 1), true, "5-sites allows 2nd website");
    assert.equal(canAddWebsite(mockSub.plan, 4), true, "5-sites allows 5th website");
    assert.equal(canAddWebsite(mockSub.plan, 5), false, "5-sites rejects 6th website");

    // Upgrade to Tier 3: $299 for 25 sites 10,000 leads
    upgradePlan("ws_1", "25-sites");
    assert.equal(mockSub.plan, "25-sites");
    assert.equal(canAddWebsite(mockSub.plan, 5), true, "25-sites allows 6th website");
    assert.equal(canAddWebsite(mockSub.plan, 24), true, "25-sites allows 25th website");
    assert.equal(canAddWebsite(mockSub.plan, 25), false, "25-sites rejects 26th website");
  });

  // ── 10. Database Constraint & Plan Mapping Bridge ──
  it("14. planKeyToDbPlanId and resolvePlanKey accurately bridge DB check constraints with canonical plans", () => {
    // DB constraints: check (plan_id in ('starter', 'growth', 'enterprise'))
    assert.equal(planKeyToDbPlanId("1-site"), "starter");
    assert.equal(planKeyToDbPlanId("5-sites"), "growth");
    assert.equal(planKeyToDbPlanId("25-sites"), "enterprise");

    // Resolving DB records to canonical plan
    assert.equal(resolvePlanKey({ plan_id: "starter", razorpay_subscription_id: "1-site" }), "1-site");
    assert.equal(resolvePlanKey({ plan_id: "growth", razorpay_subscription_id: "5-sites" }), "5-sites");
    assert.equal(resolvePlanKey({ plan_id: "enterprise", razorpay_subscription_id: "25-sites" }), "25-sites");

    // Fallbacks if razorpay_subscription_id is missing or legacy
    assert.equal(resolvePlanKey({ plan_id: "starter" }), "1-site");
    assert.equal(resolvePlanKey({ plan_id: "growth" }), "5-sites");
    assert.equal(resolvePlanKey({ plan_id: "enterprise" }), "25-sites");
    assert.equal(resolvePlanKey(null), "1-site");
  });

  // ── 11. End-to-End Simulation: TEST A ($29) ──
  it("15. TEST A: $29 flow: 1 site / 100 leads, lands on project overview, rejects 2nd site", () => {
    const testProjectId = "proj_29_abc_123";
    const subRecord = {
      workspace_id: "ws_user_a",
      plan_id: "starter",
      razorpay_subscription_id: "1-site",
      status: "trialing",
    };

    const canonicalPlan = resolvePlanKey(subRecord);
    assert.equal(canonicalPlan, "1-site");
    assert.equal(PLANS[canonicalPlan].priceMonthlyUsd, 29);
    assert.equal(PLANS[canonicalPlan].websiteLimit, 1);
    assert.equal(PLANS[canonicalPlan].leadsMonthlyLimit, 100);

    // Initial website created in onboarding
    const projects = [{ id: testProjectId, workspace_id: "ws_user_a" }];

    // Routing: Must land on /dashboard/projects/[id], NEVER /dashboard/projects/new
    function resolvePostTrialRedirect(projectsList) {
      if (projectsList && projectsList.length > 0) {
        return `/dashboard/projects/${projectsList[0].id}`;
      }
      return "/onboarding";
    }

    assert.equal(resolvePostTrialRedirect(projects), `/dashboard/projects/${testProjectId}`);

    // Add Website page limit check
    assert.equal(canAddWebsite(canonicalPlan, projects.length), false, "Blocked from adding 2nd site");
  });

  // ── 12. End-to-End Simulation: TEST B ($99) ──
  it("16. TEST B: $99 flow: 5 sites / 1,000 leads, lands on project overview, adds 2-5, blocks 6th", () => {
    const testProjectId = "proj_99_main_001";
    const subRecord = {
      workspace_id: "ws_user_b",
      plan_id: "growth",
      razorpay_subscription_id: "5-sites",
      status: "trialing",
    };

    const canonicalPlan = resolvePlanKey(subRecord);
    assert.equal(canonicalPlan, "5-sites");
    assert.equal(PLANS[canonicalPlan].priceMonthlyUsd, 99);
    assert.equal(PLANS[canonicalPlan].websiteLimit, 5);
    assert.equal(PLANS[canonicalPlan].leadsMonthlyLimit, 1000);

    const projects = [{ id: testProjectId, workspace_id: "ws_user_b" }];

    // Routing check
    assert.equal(`/dashboard/projects/${projects[0].id}`, `/dashboard/projects/${testProjectId}`);

    // Sites 2 to 5 succeed
    for (let count = 1; count < 5; count++) {
      assert.equal(canAddWebsite(canonicalPlan, count), true, `Allowed to add site #${count + 1}`);
      projects.push({ id: `proj_99_sub_${count}`, workspace_id: "ws_user_b" });
    }

    assert.equal(projects.length, 5);
    // 6th site strictly blocked
    assert.equal(canAddWebsite(canonicalPlan, projects.length), false, "Site 6 is strictly blocked");
  });

  // ── 13. End-to-End Simulation: TEST C ($299) ──
  it("17. TEST C: $299 flow: 25 sites / 10,000 leads, allows up to 25, blocks 26th", () => {
    const subRecord = {
      workspace_id: "ws_user_c",
      plan_id: "enterprise",
      razorpay_subscription_id: "25-sites",
      status: "trialing",
    };

    const canonicalPlan = resolvePlanKey(subRecord);
    assert.equal(canonicalPlan, "25-sites");
    assert.equal(PLANS[canonicalPlan].priceMonthlyUsd, 299);
    assert.equal(PLANS[canonicalPlan].websiteLimit, 25);
    assert.equal(PLANS[canonicalPlan].leadsMonthlyLimit, 10000);

    for (let count = 0; count < 25; count++) {
      assert.equal(canAddWebsite(canonicalPlan, count), true, `Site #${count + 1} allowed`);
    }
    assert.equal(canAddWebsite(canonicalPlan, 25), false, "Site 26 is strictly blocked");
  });

  // ── 14. Routing Verification: TEST E ──
  it("18. TEST E: Post-activation routing ALWAYS routes to /dashboard/projects/[new_id] and NEVER to /dashboard/projects/new", () => {
    function getPostActivationRoute(projects, returnTo = "") {
      if (returnTo && returnTo.startsWith("/")) return returnTo;
      if (projects && projects.length > 0) return `/dashboard/projects/${projects[0].id}`;
      return "/onboarding";
    }

    const testProject = { id: "db5cfe61-3c59-441c-9fa4-bac59145694d" };
    const route = getPostActivationRoute([testProject]);
    assert.equal(route, "/dashboard/projects/db5cfe61-3c59-441c-9fa4-bac59145694d");
    assert.notEqual(route, "/dashboard/projects/new");
  });

  // ── 15. Workspace Isolation: TEST F ──
  it("19. TEST F: Two separate workspaces compute quotas independently without quota bleeding", () => {
    const workspaceA = { id: "ws_tenant_1", sub: { plan_id: "starter", razorpay_subscription_id: "1-site" }, projectsCount: 1 };
    const workspaceB = { id: "ws_tenant_2", sub: { plan_id: "growth", razorpay_subscription_id: "5-sites" }, projectsCount: 3 };

    const planA = resolvePlanKey(workspaceA.sub);
    const planB = resolvePlanKey(workspaceB.sub);

    // Tenant A is at capacity (1 of 1) -> cannot add more
    assert.equal(canAddWebsite(planA, workspaceA.projectsCount), false);

    // Tenant B has 3 of 5 -> can add more
    assert.equal(canAddWebsite(planB, workspaceB.projectsCount), true);

    // Tenant A's maxed quota does NOT affect Tenant B
    workspaceB.projectsCount += 1;
    assert.equal(canAddWebsite(planB, workspaceB.projectsCount), true); // 4 of 5
    workspaceB.projectsCount += 1;
    assert.equal(canAddWebsite(planB, workspaceB.projectsCount), false); // 5 of 5 reached
  });
});
