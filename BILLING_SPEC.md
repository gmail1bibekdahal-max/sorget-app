# Attributer — Billing & Subscriptions Specification (Razorpay)

## 1. Overview
Attributer uses **Razorpay Subscriptions** for recurring billing with automated webhooks and plan entitlement enforcement.

---

## 2. Subscription Plans

| Plan | Price (INR/mo) | Included Websites | Lead Limit / mo | Team Seats | Features |
|---|---|---|---|---|---|
| **Free / Trial** | ₹0 | 1 | 50 | 1 | Basic Attribution, 7-Day History |
| **Starter** | ₹1,999 | 3 | 1,000 | 3 | Full Attribution, 90-Day History, CSV Export |
| **Growth** | ₹4,999 | 10 | 10,000 | 10 | Real-Time Webhooks, CRM Integrations, Priority Support |
| **Scale** | ₹12,999 | Unlimited | 50,000+ | Unlimited | Dedicated Account Rep, Custom Attribution Rules |

---

## 3. Razorpay Integration Flow
1. **Checkout**: Customer selects a plan -> Server calls Razorpay Subscription API -> Opens Razorpay modal.
2. **Webhook Verification**: Razorpay posts `subscription.charged` / `subscription.cancelled` to `/api/billing/webhook`.
3. **Signature Verification**: Verifies `x-razorpay-signature` using `RAZORPAY_WEBHOOK_SECRET`.
4. **Entitlement Enforcement**: Workspace entitlements updated in database; verified server-side on resource creation.