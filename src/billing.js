import crypto from "crypto";

export const PLANS = {
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
  },
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
  const plan = PLANS[planId] || PLANS.starter;
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