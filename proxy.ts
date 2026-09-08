/**
 * proxy.ts
 *
 * Next.js Edge Proxy — must be at the repo root to be recognized.
 * (Replaces the deprecated middleware.ts convention in Next.js 16+.)
 *
 * Responsibilities:
 *   1. Refresh the Supabase auth session on every request.
 *   2. Redirect unauthenticated requests to /dashboard → /login.
 *   3. Redirect authenticated users away from /login and /signup → /dashboard.
 *
 * Public routes that bypass auth:
 *   - /api/leads       — public lead ingestion endpoint used by tracking SDK
 *   - /api/health      — health check
 *   - /sdk/*           — versioned tracking scripts served statically
 *   - Static assets (_next/static, _next/image, favicon, etc.)
 */

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static      (Next.js static files)
     * - _next/image       (Next.js image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - /sdk/*            (tracking script CDN paths — always public)
     * - /api/leads        (public lead ingestion — tracking SDK calls this cross-origin)
     * - /api/health       (public health check)
     * - /health           (root health check)
     * - /api/billing/webhook (Razorpay webhook — called by Razorpay servers, not browsers)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|sdk/|api/leads|api/health|health|api/billing/webhook).*)",
  ],
};


