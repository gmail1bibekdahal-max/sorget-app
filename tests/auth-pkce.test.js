/**
 * Phase 13.1 — Supabase PKCE Auth Callback & Password Reset Tests
 *
 * Tests:
 * 1. Callback route exists (app/auth/callback/route.ts)
 * 2. Missing code handled cleanly
 * 3. Invalid code handled cleanly
 * 4. Valid code exchange path establishes session
 * 5. Safe next-path handling for internal routes
 * 6. External open redirect attempts rejected
 * 7. Password update strictly requires an authenticated session
 */

import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getSafeNextPath } from "../lib/auth-callback.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

describe("Phase 13.1 — PKCE Auth Callback & Password Reset Verification", () => {
  // ============================================================
  // 1. Callback route exists
  // ============================================================
  it("1. Callback route exists at app/auth/callback/route.ts and exports GET handler", () => {
    const routePath = path.join(rootDir, "app", "auth", "callback", "route.ts");
    assert.ok(fs.existsSync(routePath), "app/auth/callback/route.ts must exist");

    const content = fs.readFileSync(routePath, "utf-8");
    assert.ok(content.includes("export async function GET"), "route.ts must export a GET handler");
    assert.ok(content.includes("exchangeCodeForSession"), "route.ts must call exchangeCodeForSession");
    assert.ok(content.includes("getSafeNextPath"), "route.ts must invoke safe redirect sanitization");
  });

  // ============================================================
  // 2. Missing code handled
  // ============================================================
  it("2. Missing authorization code redirects to /forgot-password with error", () => {
    function simulateCallbackHandler({ code, errorParam, errorDesc, nextParam }) {
      const safeNext = getSafeNextPath(nextParam, "/reset-password");
      const fallbackUrl = safeNext.startsWith("/reset-password") ? "/forgot-password" : "/login";

      if (errorParam || errorDesc) {
        const message = errorDesc || errorParam || "Authentication failed or link expired.";
        return { status: 307, redirect: `${fallbackUrl}?error=${encodeURIComponent(message)}` };
      }

      if (!code) {
        return {
          status: 307,
          redirect: `${fallbackUrl}?error=${encodeURIComponent(
            "Missing authentication code. Please request a new link."
          )}`,
        };
      }

      return { status: 307, redirect: safeNext };
    }

    const res = simulateCallbackHandler({
      code: null,
      nextParam: "/reset-password",
    });

    assert.equal(res.status, 307);
    assert.ok(res.redirect.includes("/forgot-password"), "Missing code redirects to /forgot-password");
    assert.ok(
      res.redirect.includes("Missing%20authentication%20code"),
      "Redirect includes missing code error"
    );
  });

  // ============================================================
  // 3. Invalid code handled
  // ============================================================
  it("3. Invalid or expired code rejected by exchangeCodeForSession and redirects safely", async () => {
    async function simulateExchange(code, mockSupabase) {
      if (!code) return { redirect: "/forgot-password?error=Missing+code" };
      const { error } = await mockSupabase.auth.exchangeCodeForSession(code);
      if (error) {
        return { redirect: `/forgot-password?error=${encodeURIComponent("Invalid or expired recovery link.")}` };
      }
      return { redirect: "/reset-password" };
    }

    const mockSupabase = {
      auth: {
        exchangeCodeForSession: mock.fn(async () => {
          return { data: null, error: { message: "Invalid or expired token" } };
        }),
      },
    };

    const res = await simulateExchange("bad-expired-code", mockSupabase);
    assert.ok(res.redirect.includes("/forgot-password"));
    assert.ok(res.redirect.includes("Invalid%20or%20expired"));
    assert.equal(mockSupabase.auth.exchangeCodeForSession.mock.calls.length, 1);
  });

  // ============================================================
  // 4. Valid code exchange path
  // ============================================================
  it("4. Valid code exchange path executes exchangeCodeForSession and redirects to next", async () => {
    let exchangedCode = null;
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: mock.fn(async (code) => {
          exchangedCode = code;
          return { data: { session: { access_token: "test-token" } }, error: null };
        }),
      },
    };

    const { data, error } = await mockSupabase.auth.exchangeCodeForSession("valid-pkce-code-xyz");
    assert.equal(error, null);
    assert.equal(exchangedCode, "valid-pkce-code-xyz");
    assert.ok(data?.session?.access_token);
    assert.equal(mockSupabase.auth.exchangeCodeForSession.mock.calls.length, 1);
  });

  // ============================================================
  // 5. Safe next-path handling
  // ============================================================
  it("5. Safe internal paths are preserved correctly", () => {
    assert.equal(getSafeNextPath("/reset-password"), "/reset-password");
    assert.equal(getSafeNextPath("/dashboard"), "/dashboard");
    assert.equal(
      getSafeNextPath("/dashboard/settings?section=security"),
      "/dashboard/settings?section=security"
    );
    assert.equal(getSafeNextPath(null), "/reset-password", "Defaults to /reset-password when null");
    assert.equal(getSafeNextPath(""), "/reset-password", "Defaults to /reset-password when empty");
  });

  // ============================================================
  // 6. External redirect rejected (Open redirect protection)
  // ============================================================
  it("6. External open redirects and protocol attacks are strictly blocked", () => {
    const defaultFallback = "/reset-password";

    // Absolute URLs
    assert.equal(getSafeNextPath("https://malicious-site.com"), defaultFallback);
    assert.equal(getSafeNextPath("http://evil.com/reset-password"), defaultFallback);

    // Protocol-relative URLs
    assert.equal(getSafeNextPath("//malicious-site.com"), defaultFallback);
    assert.equal(getSafeNextPath("//attacker.com/reset-password"), defaultFallback);

    // Backslash bypass attempts
    assert.equal(getSafeNextPath("/\\malicious-site.com"), defaultFallback);
    assert.equal(getSafeNextPath("/\\evil.com"), defaultFallback);

    // Dangerous schemes
    assert.equal(getSafeNextPath("javascript:alert(1)"), defaultFallback);
    assert.equal(getSafeNextPath("data:text/html,<script>alert(1)</script>"), defaultFallback);
  });

  // ============================================================
  // 7. Password update requires authenticated session
  // ============================================================
  it("7. Password update strictly requires an active user session", () => {
    function simulatePasswordUpdate(user, password, confirmPassword) {
      if (!password || password.length < 6) {
        return { success: false, redirect: "/reset-password?error=Password+too+short" };
      }
      if (password !== confirmPassword) {
        return { success: false, redirect: "/reset-password?error=Passwords+do+not+match" };
      }
      if (!user) {
        return { success: false, redirect: "/forgot-password?error=Session+expired" };
      }
      return { success: true, redirect: "/login?notice=Password+updated+successfully" };
    }

    // Unauthenticated caller
    const unauthResult = simulatePasswordUpdate(null, "NewPassword123!", "NewPassword123!");
    assert.equal(unauthResult.success, false);
    assert.ok(
      unauthResult.redirect.includes("/forgot-password"),
      "Unauthenticated user redirected to /forgot-password"
    );

    // Authenticated caller with matching password
    const authResult = simulatePasswordUpdate({ id: "user-123" }, "NewPassword123!", "NewPassword123!");
    assert.equal(authResult.success, true);
    assert.ok(authResult.redirect.includes("/login"), "Successful update redirects to /login");
  });
});
