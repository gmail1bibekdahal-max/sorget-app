/**
 * Architecture & App-Only Route Verification Tests
 *
 * Verifies:
 * 1. Project B root route (app/page.tsx) is app-only and redirects / -> /dashboard (auth) or /login (unauth)
 * 2. Root page contains no marketing landing page elements
 * 3. Edge proxy/middleware redirects / and protects all /dashboard subroutes
 * 4. Auth actions redirect correctly (login -> /dashboard, logout -> /login)
 * 5. Project A (marketing) CTAs point exclusively to app.sorget.site
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectBRoot = path.resolve(__dirname, "..");
const projectARoot = path.resolve(__dirname, "../../olvy-clone");

describe("Project B App-Only Architecture & Route Protection", () => {
  it("1. Root route (app/page.tsx) contains no marketing content", () => {
    const rootPagePath = path.join(projectBRoot, "app", "page.tsx");
    assert.ok(fs.existsSync(rootPagePath), "app/page.tsx must exist");

    const content = fs.readFileSync(rootPagePath, "utf-8");
    // Ensure marketing sections were removed
    assert.ok(!content.includes("Know exactly which ads"), "Must not contain marketing hero");
    assert.ok(!content.includes("Production SaaS Marketing Attribution Platform"), "Must not contain marketing badge");
    assert.ok(!content.includes("id=\"interactive-demo\""), "Must not contain marketing interactive demo");
    assert.ok(!content.includes("PLANS"), "Must not import or display marketing plans on root page");

    // Ensure it implements auth check and redirect
    assert.ok(content.includes("createClient"), "Must use server client for auth check");
    assert.ok(content.includes("/dashboard"), "Must redirect authenticated users to /dashboard");
    assert.ok(content.includes("/login"), "Must redirect unauthenticated users to /login");
  });

  it("2. Middleware (lib/supabase/middleware.ts) strictly redirects / and protects all /dashboard paths", () => {
    const middlewarePath = path.join(projectBRoot, "lib", "supabase", "middleware.ts");
    assert.ok(fs.existsSync(middlewarePath), "middleware.ts must exist");

    const content = fs.readFileSync(middlewarePath, "utf-8");

    // Verify root redirect logic exists
    assert.ok(content.includes('pathname === "/"'), "Must handle root path redirect");
    assert.ok(content.includes('targetUrl.pathname = user ? "/dashboard" : "/login"'), "Must route / to /dashboard or /login");

    // Verify protected paths
    assert.ok(content.includes('"/dashboard"'), "Must include /dashboard in protected paths");
    assert.ok(content.includes('loginUrl.pathname = "/login"'), "Must redirect unauthenticated to /login");

    // Verify auth paths redirect authenticated users away
    assert.ok(content.includes('"/login"'), "Must handle /login auth route");
    assert.ok(content.includes('"/signup"'), "Must handle /signup auth route");
    assert.ok(content.includes('dashboardUrl.pathname = "/dashboard"'), "Must redirect authenticated users to /dashboard");
  });

  it("3. Auth actions redirect behavior: login -> /dashboard, logout -> /login", () => {
    const authActionsPath = path.join(projectBRoot, "app", "actions", "auth.ts");
    const content = fs.readFileSync(authActionsPath, "utf-8");

    // Login redirects to dashboard
    assert.ok(content.includes('redirect("/dashboard")'), "login action must redirect to /dashboard");
    // Logout redirects to login
    assert.ok(content.includes('redirect("/login")'), "logout action must redirect to /login");
  });

  it("4. Dashboard subpages require authentication", () => {
    const subpages = [
      "app/dashboard/page.tsx",
      "app/dashboard/integrations/page.tsx",
      "app/dashboard/settings/page.tsx",
      "app/dashboard/support/page.tsx",
    ];

    for (const subpage of subpages) {
      const fullPath = path.join(projectBRoot, subpage);
      assert.ok(fs.existsSync(fullPath), `${subpage} must exist`);
      const content = fs.readFileSync(fullPath, "utf-8");
      assert.ok(content.includes("getUser()"), `${subpage} must verify session with getUser()`);
      assert.ok(content.includes('redirect("/login")'), `${subpage} must redirect unauthenticated users to /login`);
    }
  });
});

describe("Project A Marketing -> App Flow Alignment", () => {
  it("5. Project A Navbar points to app.sorget.site for Login and Signup", () => {
    const navbarPath = path.join(projectARoot, "components", "Navbar.tsx");
    assert.ok(fs.existsSync(navbarPath), "Project A Navbar.tsx must exist");

    const content = fs.readFileSync(navbarPath, "utf-8");
    assert.ok(content.includes("${APP_URL}/login") || content.includes("app.sorget.site/login"), "Navbar must point Sign In to app.sorget.site/login");
    assert.ok(content.includes("${APP_URL}/signup") || content.includes("app.sorget.site/signup"), "Navbar must point Start for Free to app.sorget.site/signup");
    assert.ok(!content.includes('href="/login"'), "Navbar must not have hardcoded local /login link");
    assert.ok(!content.includes('href="/signup"'), "Navbar must not have hardcoded local /signup link");
  });

  it("6. Project A Hero and GetStarted point to app.sorget.site/signup", () => {
    const heroPath = path.join(projectARoot, "components", "Hero.tsx");
    const heroContent = fs.readFileSync(heroPath, "utf-8");
    assert.ok(heroContent.includes("${APP_URL}/signup") || heroContent.includes("app.sorget.site/signup"), "Hero CTA must point to app.sorget.site/signup");
    assert.ok(!heroContent.includes('href="/signup"'), "Hero must not link to local /signup");

    const getStartedPath = path.join(projectARoot, "components", "GetStarted.tsx");
    const getStartedContent = fs.readFileSync(getStartedPath, "utf-8");
    assert.ok(getStartedContent.includes("${APP_URL}/signup") || getStartedContent.includes("app.sorget.site/signup"), "GetStarted CTA must point to app.sorget.site/signup");
    assert.ok(!getStartedContent.includes('href="/signup"'), "GetStarted must not link to local /signup");
  });

  it("7. Project A next.config.ts configures safety redirects to app.sorget.site", () => {
    const configPath = path.join(projectARoot, "next.config.ts");
    assert.ok(fs.existsSync(configPath), "next.config.ts must exist in Project A");

    const content = fs.readFileSync(configPath, "utf-8");
    assert.ok(content.includes("source: \"/login\""), "Must redirect /login");
    assert.ok(content.includes("source: \"/signup\""), "Must redirect /signup");
    assert.ok(content.includes("app.sorget.site"), "Must target app.sorget.site");
  });
});
