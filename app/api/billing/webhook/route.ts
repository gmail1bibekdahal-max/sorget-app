import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyRazorpayWebhookSignature } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret) {
      const isValid = verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const supabase = createAdminClient();

    // Event handling
    if (event === "subscription.activated" || event === "subscription.charged") {
      const subEntity = payload.payload?.subscription?.entity;
      const paymentEntity = payload.payload?.payment?.entity;
      const razorpaySubId = subEntity?.id;

      if (razorpaySubId) {
        // Update subscription record
        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            current_period_start: new Date(subEntity.current_start * 1000).toISOString(),
            current_period_end: new Date(subEntity.current_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_subscription_id", razorpaySubId);
      }
    } else if (event === "subscription.cancelled") {
      const subEntity = payload.payload?.subscription?.entity;
      if (subEntity?.id) {
        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_subscription_id", subEntity.id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[billing/webhook] Error:", err.message);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}