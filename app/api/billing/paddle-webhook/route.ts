import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaddleWebhookSignature, getPlanFromPaddlePriceId, getPaddleConfig } from "@/lib/paddle";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/paddle-webhook
 *
 * Handles server-side Paddle Billing webhooks with cryptographic HMAC signature verification.
 * Source of truth for active subscriptions, payment confirmations, and plan limits.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("paddle-signature") || "";
    const { webhookSecret } = getPaddleConfig();

    if (webhookSecret) {
      const isValid = verifyPaddleWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.warn("[paddle-webhook] Invalid Paddle webhook signature rejected");
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.event_type;
    const data = payload.data;

    if (!eventType || !data) {
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Extract workspace ID from custom_data attached during checkout
    const workspaceId =
      data.custom_data?.workspace_id ||
      data.custom_data?.workspaceId ||
      data.metadata?.workspace_id;

    const subscriptionId = data.id || data.subscription_id;
    const customerId = data.customer_id;

    // Resolve plan
    const firstItemPriceId = data.items?.[0]?.price?.id || data.items?.[0]?.price_id;
    const resolvedPlan =
      (firstItemPriceId && getPlanFromPaddlePriceId(firstItemPriceId)) ||
      data.custom_data?.plan ||
      "starter";

    const currentPeriodStart = data.current_billing_period?.starts_at || new Date().toISOString();
    const currentPeriodEnd = data.current_billing_period?.ends_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (eventType === "subscription.created" || eventType === "subscription.activated" || eventType === "subscription.updated") {
      const status = data.status === "trialing" ? "trialing" : "active";

      if (workspaceId) {
        // Upsert workspace subscription
        await supabase.from("subscriptions").upsert(
          {
            workspace_id: workspaceId,
            plan: resolvedPlan,
            provider: "paddle",
            provider_customer_id: customerId,
            provider_subscription_id: subscriptionId,
            status,
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id" }
        );
      } else if (subscriptionId) {
        await supabase
          .from("subscriptions")
          .update({
            plan: resolvedPlan,
            status,
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("provider_subscription_id", subscriptionId);
      }
    } else if (eventType === "subscription.canceled" || eventType === "subscription.past_due") {
      const status = eventType === "subscription.canceled" ? "canceled" : "past_due";
      if (subscriptionId) {
        await supabase
          .from("subscriptions")
          .update({
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("provider_subscription_id", subscriptionId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[paddle-webhook] Error processing webhook:", err.message);
    return NextResponse.json({ error: "Paddle webhook processing error" }, { status: 500 });
  }
}
