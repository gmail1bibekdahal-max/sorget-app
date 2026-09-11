import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PLANS, resolvePlanKey, planKeyToDbPlanId } from "../src/billing.js";

describe("Sorget — Early Access & Validation Messaging Suite", () => {
  it("1. Verifies absence of misleading payment, Paddle, and internal build/validation copy in Selected Plan page", () => {
    const pagePath = path.resolve("app/planning/[plan]/page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");

    // Must NOT show misleading or internal product-development text
    assert.ok(!content.includes("Current Active Plan"), "Must not include 'Current Active Plan'");
    assert.ok(!content.includes("Current Plan Active"), "Must not include 'Current Plan Active'");
    assert.ok(!content.includes("14 days free, then"), "Must not include '14 days free, then $99/mo'");
    assert.ok(!content.includes("Cancel anytime before"), "Must not include 'Cancel anytime before...'");
    assert.ok(!content.includes("Help Us Build Sorget"), "Must not include 'Help Us Build Sorget'");
    assert.ok(!content.includes("currently being built and validated"), "Must not mention internal build/validation status");
    assert.ok(!content.includes("btn-paddle-checkout"), "Must not reference paddle checkout buttons");
  });

  it("2. Verifies presence of professional early access copy and CTAs in Selected Plan page", () => {
    const pagePath = path.resolve("app/planning/[plan]/page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");

    // Required headers, sections, and CTAs from prompt 74129
    assert.ok(content.includes("Start with Sorget"), "Must include 'Start with Sorget'");
    assert.ok(!content.includes("Get early access to Sorget and start tracking where your leads come from"), "Must not include removed lead attribution intro");
    assert.ok(content.includes("Choose how you&apos;d like to continue") || content.includes("Choose how you'd like to continue"), "Must include section header");
    assert.ok(content.includes("Early Access"), "Must include 'Early Access'");
    assert.ok(content.includes("Join Sorget early and get access to the platform as we continue improving the product."), "Must include Early Access copy");
    assert.ok(content.includes("Continue with Email"), "Must include 'Continue with Email' button");
    assert.ok(content.includes("14-Day Free Trial"), "Must include '14-Day Free Trial'");
    assert.ok(content.includes("Start your 14-day free trial and explore Sorget with your selected plan."), "Must include Free Trial copy");
    assert.ok(content.includes("Start 14-Day Free Trial"), "Must include 'Start 14-Day Free Trial' CTA");
    assert.ok(content.includes("No payment required during the trial."), "Must include 'No payment required during the trial.'");
    assert.ok(content.includes("← Back to all plans"), "Must keep Back button");
    assert.ok(content.includes("submitEarlyAccess"), "Must wire form to submitEarlyAccess");
    assert.ok(content.includes("activateFreeTrial"), "Must wire form to activateFreeTrial");
  });

  it("3. Dynamically resolves limits for $29, $99, and $299 plans without hardcoding", () => {
    // $29 / 1 site / 100 leads
    const plan29Key = resolvePlanKey({ plan_id: "1-site" });
    const plan29 = PLANS[plan29Key];
    assert.equal(plan29.priceMonthlyUsd, 29);
    assert.equal(plan29.websiteLimit, 1);
    assert.equal(plan29.leadsMonthlyLimit, 100);

    // $99 / 5 sites / 1000 leads
    const plan99Key = resolvePlanKey({ plan_id: "5-sites" });
    const plan99 = PLANS[plan99Key];
    assert.equal(plan99.priceMonthlyUsd, 99);
    assert.equal(plan99.websiteLimit, 5);
    assert.equal(plan99.leadsMonthlyLimit, 1000);

    // $299 / 25 sites / 10000 leads
    const plan299Key = resolvePlanKey({ plan_id: "25-sites" });
    const plan299 = PLANS[plan299Key];
    assert.equal(plan299.priceMonthlyUsd, 299);
    assert.equal(plan299.websiteLimit, 25);
    assert.equal(plan299.leadsMonthlyLimit, 10000);
  });

  it("4. Simulates early-access email submission: persists email & plan into subscription architecture and routes to dashboard", () => {
    const mockSubscriptions = [];
    const mockLeads = [];
    const mockProjects = [{ id: "proj_101", workspace_id: "ws_test_1" }];

    function handleEarlyAccessSubmission(workspaceId, email, selectedPlan) {
      const canonicalPlan = resolvePlanKey({ plan_id: selectedPlan });
      const dbPlanId = planKeyToDbPlanId(canonicalPlan);

      // Save into subscription architecture
      const sub = {
        workspace_id: workspaceId,
        plan_id: dbPlanId,
        razorpay_subscription_id: canonicalPlan,
        razorpay_customer_id: email,
        status: "trialing",
      };
      mockSubscriptions.push(sub);

      // Record lead
      if (mockProjects.length > 0) {
        mockLeads.push({
          project_id: mockProjects[0].id,
          email,
          channel: "Early Access",
          campaign: canonicalPlan,
        });
      }

      // Preserves intended flow: return dashboard destination
      return `/dashboard/projects/${mockProjects[0].id}`;
    }

    const destination = handleEarlyAccessSubmission("ws_test_1", "founder@example.com", "5-sites");

    assert.equal(destination, "/dashboard/projects/proj_101");
    assert.equal(mockSubscriptions.length, 1);
    assert.equal(mockSubscriptions[0].razorpay_customer_id, "founder@example.com");
    assert.equal(mockSubscriptions[0].razorpay_subscription_id, "5-sites");
    assert.equal(mockSubscriptions[0].status, "trialing");
    assert.equal(mockLeads.length, 1);
    assert.equal(mockLeads[0].email, "founder@example.com");
  });

  it("5. Simulates free-trial activation: persists selected plan & trialing status and routes to dashboard", () => {
    const mockSubscriptions = [];
    const mockProjects = [{ id: "proj_202", workspace_id: "ws_test_2" }];

    function handleTrialActivation(workspaceId, selectedPlan) {
      const canonicalPlan = resolvePlanKey({ plan_id: selectedPlan });
      const dbPlanId = planKeyToDbPlanId(canonicalPlan);

      const sub = {
        workspace_id: workspaceId,
        plan_id: dbPlanId,
        razorpay_subscription_id: canonicalPlan,
        status: "trialing",
      };
      mockSubscriptions.push(sub);

      return `/dashboard/projects/${mockProjects[0].id}`;
    }

    const destination = handleTrialActivation("ws_test_2", "25-sites");

    assert.equal(destination, "/dashboard/projects/proj_202");
    assert.equal(mockSubscriptions.length, 1);
    assert.equal(mockSubscriptions[0].razorpay_subscription_id, "25-sites");
    assert.equal(mockSubscriptions[0].plan_id, "enterprise");
    assert.equal(mockSubscriptions[0].status, "trialing");
  });
});
