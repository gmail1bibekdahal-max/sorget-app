import crypto from "crypto";

export const PLANS = {
  // --- Sorget Planning Plans ---
  "1-site": {
    id: "1-site",
    name: "1 Site",
    priceMonthlyUsd: 29,
    priceMonthlyInr: 2499,
    websiteLimit: 1,
    memberLimit: 2,
    leadsMonthlyLimit: 100,
    crmIntegrations: true,
    customWebhooks: true,
    prioritySupport: false,
    trialDays: 14,
  },
  "1_site": {
    id: "1-site",
    name: "1 Site",
    priceMonthlyUsd: 29,
    priceMonthlyInr: 2499,
    websiteLimit: 1,
    memberLimit: 2,
    leadsMonthlyLimit: 100,
    crmIntegrations: true,
    customWebhooks: true,
    prioritySupport: false,
    trialDays: 14,
  },
  "5-sites": {
    id: "5-sites",
    name: "5 Sites",
    priceMonthlyUsd: 99,
    priceMonthlyInr: 7999,
    websiteLimit: 5,
    memberLimit: 10,
    leadsMonthlyLimit: 1000,
    crmIntegrations: true,
    customWebhooks: true,
    prioritySupport: true,
    trialDays: 14,
  },
  "5_sites": {
    id: "5-sites",
    name: "5 Sites",
    priceMonthlyUsd: 99,
    priceMonthlyInr: 7999,
    websiteLimit: 5,
    memberLimit: 10,
    leadsMonthlyLimit: 1000,
    crmIntegrations: true,
    customWebhooks: true,
    prioritySupport: true,
    trialDays: 14,
  },
  "25-sites": {
    id: "25-sites",
    name: "25 Sites",
    priceMonthlyUsd: 299,
    priceMonthlyInr: 24999,
    websiteLimit: 25,
    memberLimit: 30,
    leadsMonthlyLimit: 10000,
    crmIntegrations: true,
    customWebhooks: true,
    prioritySupport: true,
    trialDays: 14,
  },
  "25_sites": {
    id: "25-sites",
    name: "25 Sites",
    priceMonthlyUsd: 299,
    priceMonthlyInr: 24999,
    websiteLimit: 25,
    memberLimit: 30,
    leadsMonthlyLimit: 10000,
    crmIntegrations: true,
    customWebhooks: true,
    prioritySupport: true,
    trialDays: 14,
  },

  // --- Aliases & Backward Compatibility Keys ---
  lite: {
    id: "1-site",
    name: "1 Site",
    priceMonthlyUsd: 29,
    priceMonthlyInr: 2499,
    websiteLimit: 1,
    memberLimit: 2,
    leadsMonthlyLimit: 100,
    crmIntegrations: true,
    customWebhooks: true,
    prioritySupport: false,
    trialDays: 14,
  },
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthlyUsd: 49,
    priceMonthlyInr: 3999,
    websiteLimit: 1,
    memberLimit: 3,
    leadsMonthlyLimit: 10000,
    crmIntegrations: false,
    customWebhooks: true,
    prioritySupport: false,
    trialDays: 14,
  },
  pro: {
    id: "5-sites",
    name: "5 Sites",
    priceMonthlyUsd: 99,
    priceMonthlyInr: 7999,
    websiteLimit: 5,
    memberLimit: 10,
    leadsMonthlyLimit: 1000,
    crmIntegrations: true,
    customWebhooks: true,
    prioritySupport: true,
    trialDays: 14,
  },
  professional: {
    id: "5-sites",
    name: "5 Sites",
    priceMonthlyUsd: 99,
    priceMonthlyInr: 7999,
    websiteLimit: 5,
    memberLimit: 10,
    leadsMonthlyLimit: 1000,
    crmIntegrations: true,
    customWebhooks: true,
    prioritySupport: true,
    trialDays: 14,
  },
  "10-sites": {
    id: "10-sites",
    name: "10 Sites",
    priceMonthlyUsd: 199,
    priceMonthlyInr: 15999,
    websiteLimit: 10,
    memberLimit: 15,
    leadsMonthlyLimit: 25000,
    crmIntegrations: true,
    customWebhooks: true,
    prioritySupport: true,
    trialDays: 14,
  },
  "10_sites": {
    id: "10_sites",
    name: "10 Sites",
    priceMonthlyUsd: 199,
    priceMonthlyInr: 15999,
    websiteLimit: 10,
    memberLimit: 15,
    leadsMonthlyLimit: 25000,
    crmIntegrations: true,
    customWebhooks: true,
    prioritySupport: true,
    trialDays: 14,
  },
  "50-sites": {
    id: "50-sites",
    name: "50 Sites",
    priceMonthlyUsd: 399,
    priceMonthlyInr: 32999,
    websiteLimit: 50,
    memberLimit: 50,
    leadsMonthlyLimit: 150000,
    crmIntegrations: true,
    customWebhooks: true,
    prioritySupport: true,
    trialDays: 14,
  },
  "50_sites": {
    id: "50_sites",
    name: "50 Sites",
    priceMonthlyUsd: 399,
    priceMonthlyInr: 32999,
    websiteLimit: 50,
    memberLimit: 50,
    leadsMonthlyLimit: 150000,
    crmIntegrations: true,
    customWebhooks: true,
    prioritySupport: true,
    trialDays: 14,
  },
  custom: {
    id: "custom",
    name: "Custom",
    priceMonthlyUsd: 0,
    priceMonthlyInr: 0,
    websiteLimit: 999,
    memberLimit: 999,
    leadsMonthlyLimit: 1000000,
    crmIntegrations: true,
    customWebhooks: true,
    prioritySupport: true,
    trialDays: 14,
  },

  // --- Legacy Compatibility Keys ---
  growth: {
    id: "growth",
    name: "Growth",
    priceMonthlyUsd: 119,
    priceMonthlyInr: 9999,
    websiteLimit: 5,
    memberLimit: 10,
    leadsMonthlyLimit: 50000,
    crmIntegrations: true,
    customWebhooks: true,
    prioritySupport: true,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    priceMonthlyUsd: 299,
    priceMonthlyInr: 24999,
    websiteLimit: 999,
    memberLimit: 999,
    leadsMonthlyLimit: 1000000,
    crmIntegrations: true,
    customWebhooks: true,
    prioritySupport: true,
  },
};

export function planKeyToDbPlanId(planKey = "") {
  const norm = String(planKey || "").toLowerCase().replace(/[\s_]+/g, "-");
  if (norm.startsWith("25-site") || norm === "enterprise") {
    return "enterprise";
  }
  if (norm.startsWith("5-site") || norm === "pro" || norm === "professional" || norm === "growth") {
    return "growth";
  }
  return "starter";
}

export function resolvePlanKey(sub) {
  if (!sub) return "1-site";

  // Check stored canonical slug in razorpay_subscription_id
  const slug = String(sub.razorpay_subscription_id || "").toLowerCase().replace(/[\s_]+/g, "-");
  if (slug === "1-site" || slug === "5-sites" || slug === "25-sites") {
    return slug;
  }

  // Check plan or plan_id
  const raw = String(sub.plan || sub.plan_id || "").toLowerCase().replace(/[\s_]+/g, "-");
  if (raw === "25-sites" || raw === "enterprise") {
    return "25-sites";
  }
  if (raw === "5-sites" || raw === "growth" || raw === "pro" || raw === "professional") {
    return "5-sites";
  }
  return "1-site";
}

export function canAddWebsite(planId = "1-site", currentWebsiteCount = 0) {
  const resolvedKey = resolvePlanKey(typeof planId === "object" && planId !== null ? planId : { plan_id: planId });
  const plan = PLANS[resolvedKey] || PLANS[planId] || PLANS["1-site"];
  return currentWebsiteCount < plan.websiteLimit;
}

export function canInviteMember(planId = "starter", currentMemberCount = 0) {
  const plan = PLANS[planId] || PLANS.starter;
  return currentMemberCount < plan.memberLimit;
}

export function canUseCrmIntegrations(planId = "starter") {
  const plan = PLANS[planId] || PLANS.starter;
  return plan.crmIntegrations;
}

export function verifyRazorpayWebhookSignature(bodyString, signature, secret) {
  if (!signature || !secret || !bodyString) return false;
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(bodyString)
      .digest("hex");

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}