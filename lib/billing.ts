import {
  PLANS as BASE_PLANS,
  canAddWebsite as _canAddWebsite,
  canInviteMember as _canInviteMember,
  canUseCrmIntegrations as _canUseCrmIntegrations,
  verifyRazorpayWebhookSignature as _verifyRazorpayWebhookSignature,
} from "@/src/billing.js";

export interface PlanConfig {
  id: "starter" | "growth" | "enterprise";
  name: string;
  priceMonthlyUsd: number;
  priceMonthlyInr: number;
  websiteLimit: number;
  memberLimit: number;
  leadsMonthlyLimit: number;
  crmIntegrations: boolean;
  customWebhooks: boolean;
  prioritySupport: boolean;
}

export const PLANS: Record<string, PlanConfig> = BASE_PLANS as any;

export const canAddWebsite = _canAddWebsite;
export const canInviteMember = _canInviteMember;
export const canUseCrmIntegrations = _canUseCrmIntegrations;
export const verifyRazorpayWebhookSignature = _verifyRazorpayWebhookSignature;