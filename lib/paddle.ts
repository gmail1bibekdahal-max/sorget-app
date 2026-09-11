import crypto from "crypto";

/**
 * Paddle Price ID Mapping for Sorget Plans.
 * Reads configured Paddle Price IDs from server environment variables.
 * In Sandbox/Production, configure these variables in .env:
 * - PADDLE_PRICE_ID_LITE
 * - PADDLE_PRICE_ID_STARTER
 * - PADDLE_PRICE_ID_PRO
 * - PADDLE_PRICE_ID_10_SITES
 * - PADDLE_PRICE_ID_25_SITES
 * - PADDLE_PRICE_ID_50_SITES
 */
export const PADDLE_PRICE_IDS: Record<string, string> = {
  "1-site": process.env.PADDLE_PRICE_ID_1_SITE || process.env.PADDLE_PRICE_ID_LITE || "pri_01_1site_sandbox",
  "1_site": process.env.PADDLE_PRICE_ID_1_SITE || process.env.PADDLE_PRICE_ID_LITE || "pri_01_1site_sandbox",
  lite: process.env.PADDLE_PRICE_ID_1_SITE || process.env.PADDLE_PRICE_ID_LITE || "pri_01_1site_sandbox",
  starter: process.env.PADDLE_PRICE_ID_STARTER || "pri_01_starter_sandbox",
  "5-sites": process.env.PADDLE_PRICE_ID_5_SITES || process.env.PADDLE_PRICE_ID_PRO || "pri_01_5sites_sandbox",
  "5_sites": process.env.PADDLE_PRICE_ID_5_SITES || process.env.PADDLE_PRICE_ID_PRO || "pri_01_5sites_sandbox",
  pro: process.env.PADDLE_PRICE_ID_5_SITES || process.env.PADDLE_PRICE_ID_PRO || "pri_01_5sites_sandbox",
  professional: process.env.PADDLE_PRICE_ID_5_SITES || process.env.PADDLE_PRICE_ID_PRO || "pri_01_5sites_sandbox",
  "10-sites": process.env.PADDLE_PRICE_ID_10_SITES || "pri_01_10sites_sandbox",
  "10_sites": process.env.PADDLE_PRICE_ID_10_SITES || "pri_01_10sites_sandbox",
  "25-sites": process.env.PADDLE_PRICE_ID_25_SITES || "pri_01_25sites_sandbox",
  "25_sites": process.env.PADDLE_PRICE_ID_25_SITES || "pri_01_25sites_sandbox",
  "50-sites": process.env.PADDLE_PRICE_ID_50_SITES || "pri_01_50sites_sandbox",
  "50_sites": process.env.PADDLE_PRICE_ID_50_SITES || "pri_01_50sites_sandbox",
};

/**
 * Resolve a Sorget plan slug from a Paddle Price ID.
 */
export function getPlanFromPaddlePriceId(priceId: string): string | null {
  if (!priceId) return null;
  for (const [plan, pid] of Object.entries(PADDLE_PRICE_IDS)) {
    if (pid === priceId) return plan;
  }
  return null;
}

/**
 * Retrieve the configured Paddle price ID for a Sorget plan.
 */
export function getPaddlePriceId(planId: string): string | null {
  const key = String(planId || "").toLowerCase().replace(/\s+/g, "-");
  return PADDLE_PRICE_IDS[key] || null;
}

/**
 * Verifies a Paddle webhook signature according to Paddle v2 specifications.
 * Paddle-Signature header format: ts=123456789;h1=abcdef...
 * Signed payload is: `${ts}:${rawBody}`
 */
export function verifyPaddleWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secretKey: string | null | undefined
): boolean {
  if (!rawBody || !signatureHeader || !secretKey) {
    return false;
  }

  try {
    const parts = signatureHeader.split(";");
    let ts = "";
    let h1 = "";

    for (const part of parts) {
      const [key, value] = part.split("=");
      if (key?.trim() === "ts") ts = value?.trim();
      if (key?.trim() === "h1") h1 = value?.trim();
    }

    if (!ts || !h1) {
      return false;
    }

    const payload = `${ts}:${rawBody}`;
    const expectedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(h1, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch (err) {
    console.error("[verifyPaddleWebhookSignature] Error:", err);
    return false;
  }
}

/**
 * Paddle Environment Configuration
 */
export function getPaddleConfig() {
  const environment = process.env.PADDLE_ENV || "sandbox";
  const apiKey = process.env.PADDLE_API_KEY || "";
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET_KEY || "";
  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "";

  return {
    environment,
    apiKey,
    webhookSecret,
    clientToken,
    isSandbox: environment === "sandbox",
  };
}
