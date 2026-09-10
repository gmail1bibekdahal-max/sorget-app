import crypto from "crypto";

export const PLANS = {
  // --- Sorget Plans ---
  lite: {
    id: "lite",
    name: "Lite",
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
    id: "pro",
    name: "Professional",
    priceMonthlyUsd: 99,
    priceMonthlyInr: 7999,
    websiteLimit: 1,
    memberLimit: 5,
    leadsMonthlyLimit: 1000,
    crmIntegrations: true,
    customWebhooks: true,
    prioritySupport: true,
    trialDays: 14,
  },
  professional: {
    id: "professional",
    name: "Professional",
    priceMonthlyUsd: 99,
    priceMonthlyInr: 7999,
    websiteLimit: 1,
    memberLimit: 5,
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
  "25-sites": {
    id: "25-sites",
    name: "25 Sites",
    priceMonthlyUsd: 299,
    priceMonthlyInr: 24999,
    websiteLimit: 25,
    memberLimit: 30,
    leadsMonthlyLimit: 75000,
    crmIntegrations: true,
    customWebhooks: true,
    prioritySupport: true,
    trialDays: 14,
  },
  "25_sites": {
    id: "25_sites",
    name: "25 Sites",
    priceMonthlyUsd: 299,
    priceMonthlyInr: 24999,
    websiteLimit: 25,
    memberLimit: 30,
    leadsMonthlyLimit: 75000,
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

export function canAddWebsite(planId = "starter", currentWebsiteCount = 0) {
  const normalizedKey = String(planId || "starter").toLowerCase().replace(/\s+/g, "-");
  const plan = PLANS[normalizedKey] || PLANS[planId] || PLANS.starter;
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