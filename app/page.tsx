import Link from "next/link";
import { PLANS } from "@/lib/billing";

export const metadata = {
  title: "Attributer — Marketing Attribution for Forms & CRMs",
  description: "Capture UTMs, Google Ads GCLIDs, channel classification, and multi-touch drilldown attribution in your website form submissions automatically.",
};

export default function HomePage() {
  return (
    <div style={{ background: "#0a0f1d", color: "#f8fafc", minHeight: "100vh", fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)" }}>
      {/* Top Navbar */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.25rem 2rem",
          maxWidth: "1240px",
          margin: "0 auto",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "2.5rem" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", color: "#fff", fontWeight: 700, fontSize: "1.25rem" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #6366f1, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>⚡</div>
            <span>Attributer</span>
          </Link>
          <div style={{ display: "flex", gap: "1.75rem", fontSize: "0.9375rem" }}>
            <a href="#features" style={{ color: "#94a3b8", textDecoration: "none", transition: "color 0.2s" }}>Features</a>
            <a href="#how-it-works" style={{ color: "#94a3b8", textDecoration: "none", transition: "color 0.2s" }}>How It Works</a>
            <a href="#integrations" style={{ color: "#94a3b8", textDecoration: "none", transition: "color 0.2s" }}>Integrations</a>
            <a href="#pricing" style={{ color: "#94a3b8", textDecoration: "none", transition: "color 0.2s" }}>Pricing</a>
            <Link href="/docs" style={{ color: "#94a3b8", textDecoration: "none", transition: "color 0.2s" }}>Docs</Link>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/login" style={{ color: "#cbd5e1", textDecoration: "none", fontSize: "0.9375rem", fontWeight: 500 }}>
            Sign In
          </Link>
          <Link
            href="/signup"
            className="btn btn-primary"
            style={{
              padding: "0.55rem 1.25rem",
              fontSize: "0.9375rem",
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              borderRadius: "8px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Start Free Trial →
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={{ padding: "5rem 2rem 4rem", maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(99, 102, 241, 0.12)", border: "1px solid rgba(99, 102, 241, 0.25)", padding: "0.35rem 1rem", borderRadius: "100px", color: "#818cf8", fontSize: "0.875rem", fontWeight: 500, marginBottom: "1.75rem" }}>
          <span>✨</span> Production SaaS Marketing Attribution Platform
        </div>

        <h1 style={{ fontSize: "3.5rem", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.025em", margin: "0 auto 1.5rem", maxWidth: "900px" }}>
          Know exactly which ads &amp; campaigns{" "}
          <span style={{ background: "linear-gradient(135deg, #818cf8, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            generate your revenue
          </span>
        </h1>

        <p style={{ fontSize: "1.25rem", color: "#94a3b8", maxWidth: "720px", margin: "0 auto 2.5rem", lineHeight: 1.6 }}>
          Attributer automatically captures UTMs, Google Ads GCLIDs, and traffic channels, then writes clean attribution dimensions directly into hidden fields on every form submission.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "4rem" }}>
          <Link
            href="/signup"
            style={{
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "#fff",
              padding: "0.85rem 2rem",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "1.0625rem",
              textDecoration: "none",
              boxShadow: "0 10px 25px rgba(99, 102, 241, 0.4)",
            }}
          >
            Get Started Free
          </Link>
          <a
            href="#interactive-demo"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#f8fafc",
              padding: "0.85rem 1.75rem",
              borderRadius: "10px",
              fontWeight: 500,
              fontSize: "1.0625rem",
              textDecoration: "none",
            }}
          >
            See Live Simulator
          </a>
        </div>

        {/* Live Attribution Simulator Graphic */}
        <div
          id="interactive-demo"
          style={{
            background: "#0f172a",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "16px",
            padding: "2rem",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            textAlign: "left",
            maxWidth: "960px",
            margin: "0 auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
              <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
              <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
              <span style={{ fontSize: "0.8125rem", color: "#64748b", marginLeft: "0.75rem", fontFamily: "monospace" }}>
                https://yourcompany.com/?utm_source=google&amp;utm_medium=cpc&amp;utm_campaign=enterprise_2026&amp;gclid=gcl_live_9921
              </span>
            </div>
            <span className="pill" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", fontSize: "0.75rem" }}>
              ● Tag Active
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#94a3b8", marginBottom: "0.75rem" }}>
                1. Customer Form Submission
              </div>
              <div style={{ background: "#1e293b", padding: "1.25rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ marginBottom: "0.75rem" }}>
                  <label style={{ fontSize: "0.75rem", color: "#64748b" }}>Full Name</label>
                  <div style={{ fontSize: "0.875rem", color: "#e2e8f0" }}>Sarah Connor</div>
                </div>
                <div style={{ marginBottom: "0.75rem" }}>
                  <label style={{ fontSize: "0.75rem", color: "#64748b" }}>Work Email</label>
                  <div style={{ fontSize: "0.875rem", color: "#e2e8f0" }}>sarah@cyberdyne.com</div>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#64748b" }}>Hidden Form Fields</label>
                  <div style={{ fontSize: "0.75rem", color: "#10b981", fontFamily: "monospace" }}>✓ 8 Attribution Fields Injected</div>
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#94a3b8", marginBottom: "0.75rem" }}>
                2. CRM / Lead Ingestion Record
              </div>
              <div style={{ background: "#060913", padding: "1.25rem", borderRadius: "8px", border: "1px solid rgba(99, 102, 241, 0.25)", fontFamily: "monospace", fontSize: "0.8125rem", color: "#cbd5e1" }}>
                <div>Channel: <span style={{ color: "#38bdf8" }}>&quot;Paid Search&quot;</span></div>
                <div>Source: <span style={{ color: "#38bdf8" }}>&quot;google&quot;</span></div>
                <div>Medium: <span style={{ color: "#38bdf8" }}>&quot;cpc&quot;</span></div>
                <div>Campaign: <span style={{ color: "#38bdf8" }}>&quot;enterprise_2026&quot;</span></div>
                <div>GCLID: <span style={{ color: "#f59e0b" }}>&quot;gcl_live_9921&quot;</span></div>
                <div>Drilldown 1: <span style={{ color: "#10b981" }}>&quot;google&quot;</span></div>
                <div>Drilldown 2: <span style={{ color: "#10b981" }}>&quot;enterprise_2026&quot;</span></div>
                <div>Landing Group: <span style={{ color: "#818cf8" }}>&quot;/demo&quot;</span></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section id="features" style={{ padding: "5rem 2rem", maxWidth: "1160px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <h2 style={{ fontSize: "2.25rem", fontWeight: 700, margin: "0 0 1rem" }}>Engineered for Real Marketing ROI</h2>
          <p style={{ color: "#94a3b8", fontSize: "1.125rem", maxWidth: "600px", margin: "0 auto" }}>
            Attributer is purpose-built to solve data loss across organic, paid, social, and email traffic.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
          <div className="card" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.75rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🎯</div>
            <h3 style={{ fontSize: "1.25rem", margin: "0 0 0.5rem" }}>10 Standard Channels</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.875rem", lineHeight: 1.6, margin: 0 }}>
              Deterministic classification covering Paid Search, Paid Social, Organic Search, Organic Social, Email, Display, Affiliates, and Direct traffic.
            </p>
          </div>

          <div className="card" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.75rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
            <h3 style={{ fontSize: "1.25rem", margin: "0 0 0.5rem" }}>Dual Persistence &amp; 90-day TTL</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.875rem", lineHeight: 1.6, margin: 0 }}>
              First-touch attribution is locked on day 1 and never overwritten by subsequent direct visits, while last-touch tracks the converting touchpoint.
            </p>
          </div>

          <div className="card" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.75rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚡</div>
            <h3 style={{ fontSize: "1.25rem", margin: "0 0 0.5rem" }}>Zero Cookie Dependency</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.875rem", lineHeight: 1.6, margin: 0 }}>
              Privacy-first local storage envelope avoids third-party cookie blocking in modern browsers (Safari ITP, Brave, iOS 17+).
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ padding: "5rem 2rem", background: "rgba(15, 23, 42, 0.4)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: "1160px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <h2 style={{ fontSize: "2.25rem", fontWeight: 700, margin: "0 0 1rem" }}>Transparent, Predictable Pricing</h2>
            <p style={{ color: "#94a3b8", fontSize: "1.125rem", margin: 0 }}>
              Choose the plan that fits your growth stage. 14-day free trial on all plans.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
            {Object.values(PLANS).map((plan) => (
              <div
                key={plan.id}
                style={{
                  background: plan.id === "growth" ? "#1e293b" : "#0f172a",
                  border: plan.id === "growth" ? "2px solid #6366f1" : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px",
                  padding: "2rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                }}
              >
                {plan.id === "growth" && (
                  <div style={{ position: "absolute", top: "-12px", right: "24px", background: "#6366f1", color: "#fff", fontSize: "0.75rem", fontWeight: 700, padding: "0.2rem 0.75rem", borderRadius: "100px" }}>
                    MOST POPULAR
                  </div>
                )}
                <div>
                  <h3 style={{ fontSize: "1.375rem", margin: "0 0 0.5rem" }}>{plan.name}</h3>
                  <div style={{ fontSize: "2.5rem", fontWeight: 800, margin: "1rem 0" }}>
                    ${plan.priceMonthlyUsd}
                    <span style={{ fontSize: "1rem", color: "#94a3b8", fontWeight: 400 }}> /month</span>
                  </div>

                  <ul style={{ listStyle: "none", padding: 0, margin: "1.5rem 0", fontSize: "0.875rem", color: "#cbd5e1", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <li>✓ {plan.leadsMonthlyLimit.toLocaleString()} Monthly Tracked Leads</li>
                    <li>✓ {plan.websiteLimit === 999 ? "Unlimited" : plan.websiteLimit} Tracked Website(s)</li>
                    <li>✓ {plan.memberLimit === 999 ? "Unlimited" : plan.memberLimit} Team Members</li>
                    <li>{plan.crmIntegrations ? "✓ CRM Integrations (HubSpot/Salesforce)" : "— Basic form hidden fields"}</li>
                    <li>✓ Outbound Webhooks</li>
                  </ul>
                </div>

                <Link
                  href="/signup"
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    fontWeight: 600,
                    textDecoration: "none",
                    background: plan.id === "growth" ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "rgba(255,255,255,0.08)",
                    color: "#fff",
                  }}
                >
                  Start 14-Day Free Trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "4rem 2rem 2rem", maxWidth: "1240px", margin: "0 auto", color: "#64748b", fontSize: "0.875rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "2rem" }}>
          <div>© {new Date().getFullYear()} Attributer. All rights reserved.</div>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <Link href="/docs" style={{ color: "#94a3b8", textDecoration: "none" }}>Documentation</Link>
            <Link href="/login" style={{ color: "#94a3b8", textDecoration: "none" }}>Sign In</Link>
            <Link href="/signup" style={{ color: "#94a3b8", textDecoration: "none" }}>Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}