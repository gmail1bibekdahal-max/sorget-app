import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CopyButton from "@/app/components/CopyButton";
import MainNavigation from "@/app/components/MainNavigation";

export const metadata = {
  title: "Support & Documentation — Sorget",
  description: "Help, troubleshooting, and field references for installing Sorget.",
};

const HIDDEN_FIELDS = [
  { name: "channel", label: "Channel", desc: "High-level marketing channel (e.g. Paid Search, Organic Search, Paid Social, Direct, Referral)" },
  { name: "channeldrilldown1", label: "Channel Drilldown 1", desc: "Specific platform or network (e.g. google, facebook, linkedin, bing)" },
  { name: "channeldrilldown2", label: "Channel Drilldown 2", desc: "Campaign name or search engine name" },
  { name: "channeldrilldown3", label: "Channel Drilldown 3", desc: "Ad group, keyword search term, or creative variation" },
  { name: "landingpage", label: "Landing Page", desc: "Relative path where the visitor first arrived (e.g. /pricing, /request-demo)" },
  { name: "landingpagegroup", label: "Landing Page Group", desc: "Top-level directory grouping (e.g. /features, /solutions, /blog)" },
];

export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Fetch workspaces for navigation
  const { data: memberRows } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name, slug)")
    .eq("user_id", user.id);

  const userWorkspaces = (memberRows ?? [])
    .filter((r: any) => r.workspaces)
    .map((r: any) => ({
      id: r.workspaces.id,
      name: r.workspaces.name,
      slug: r.workspaces.slug,
      role: r.role,
    }));

  return (
    <div className="dashboard-layout" style={{ minHeight: "100vh" }}>
      <MainNavigation userEmail={user.email} workspaces={userWorkspaces} />

      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>
            Support &amp; Documentation
          </h1>
          <p style={{ color: "var(--text-secondary, #94a3b8)", margin: 0, fontSize: "0.95rem" }}>
            Guides, hidden form field references, and troubleshooting help for Sorget.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Section 1: How Sorget Works */}
          <div
            className="card"
            style={{
              maxWidth: "100%",
              padding: "1.75rem",
              background: "var(--color-card, #1a1a26)",
              border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
              borderRadius: "14px",
            }}
          >
            <h2 style={{ fontSize: "1.25rem", margin: "0 0 1rem 0", color: "#ffffff" }}>
              How Sorget Works
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6, marginBottom: "1.25rem" }}>
              Sorget is built on a straightforward product philosophy: <strong>collect and pass attribution data into your CRM and forms; analyze it where your revenue data lives.</strong>
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: "1rem",
              }}
            >
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "8px" }}>
                <span style={{ fontSize: "1.25rem" }}>1️⃣</span>
                <div style={{ fontWeight: 600, color: "#ffffff", marginTop: "0.5rem" }}>Visitor Lands</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  Script parses UTMs, GCLID, and organic referrers, persisting them in cookies/localStorage.
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "8px" }}>
                <span style={{ fontSize: "1.25rem" }}>2️⃣</span>
                <div style={{ fontWeight: 600, color: "#ffffff", marginTop: "0.5rem" }}>Fills Hidden Fields</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  When forms render, Sorget populates the 6 standard hidden fields automatically.
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "8px" }}>
                <span style={{ fontSize: "1.25rem" }}>3️⃣</span>
                <div style={{ fontWeight: 600, color: "#ffffff", marginTop: "0.5rem" }}>Form Submitted</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  Attribution travels alongside form responses to your backend, email, or webhook.
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "8px" }}>
                <span style={{ fontSize: "1.25rem" }}>4️⃣</span>
                <div style={{ fontWeight: 600, color: "#ffffff", marginTop: "0.5rem" }}>Enriches CRM</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  HubSpot contacts or custom webhooks receive clean attribution properties.
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Hidden Fields Reference */}
          <div
            className="card"
            style={{
              maxWidth: "100%",
              padding: "1.75rem",
              background: "var(--color-card, #1a1a26)",
              border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
              borderRadius: "14px",
            }}
          >
            <h2 style={{ fontSize: "1.25rem", margin: "0 0 1rem 0", color: "#ffffff" }}>
              Hidden Form Fields Reference
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6, marginBottom: "1.25rem" }}>
              Add these 6 hidden fields to your forms. You can use standard <code>&lt;input type=&quot;hidden&quot; name=&quot;...&quot;&gt;</code> tags or your form builder&apos;s hidden field generator.
            </p>

            <div className="table-container" style={{ margin: 0 }}>
              <table className="leads-table">
                <thead>
                  <tr>
                    <th style={{ width: "220px" }}>Field Name</th>
                    <th>Description</th>
                    <th style={{ width: "80px", textAlign: "right" }}>Copy</th>
                  </tr>
                </thead>
                <tbody>
                  {HIDDEN_FIELDS.map((field) => (
                    <tr key={field.name}>
                      <td>
                        <code style={{ background: "rgba(108, 99, 255, 0.15)", color: "#9d96ff", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.85rem", fontWeight: 600 }}>
                          {field.name}
                        </code>
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {field.desc}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <CopyButton text={field.name} label="Copy" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Testing & Debugging */}
          <div
            className="card"
            style={{
              maxWidth: "100%",
              padding: "1.75rem",
              background: "var(--color-card, #1a1a26)",
              border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
              borderRadius: "14px",
            }}
          >
            <h2 style={{ fontSize: "1.25rem", margin: "0 0 1rem 0", color: "#ffffff" }}>
              How to Test Your Installation
            </h2>
            <ol style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.8, paddingLeft: "1.25rem", margin: 0 }}>
              <li>Open an <strong>Incognito / Private</strong> browser window.</li>
              <li>Visit your website with test UTM parameters appended:
                <br />
                <code style={{ color: "#3ecfcf", fontSize: "0.8rem", background: "rgba(0,0,0,0.3)", padding: "0.2rem 0.4rem", borderRadius: "4px" }}>
                  https://yourwebsite.com/?utm_source=google&amp;utm_medium=cpc&amp;utm_campaign=test_campaign&amp;gclid=test_gclid_123
                </code>
              </li>
              <li>Navigate to your form and inspect the hidden inputs using browser DevTools. You should see the values populated.</li>
              <li>Submit the form with a test email.</li>
              <li>Check your <strong>Websites Dashboard</strong> verification log to verify that the submission was recorded with Channel = <em>Paid Search</em>.</li>
            </ol>
          </div>

          {/* Section 4: Contact Support */}
          <div
            className="card"
            style={{
              maxWidth: "100%",
              padding: "1.75rem",
              background: "var(--color-card, #1a1a26)",
              border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
              borderRadius: "14px",
            }}
          >
            <h2 style={{ fontSize: "1.25rem", margin: "0 0 0.5rem 0", color: "#ffffff" }}>
              Need Help?
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6, margin: "0 0 1rem 0" }}>
              Have questions about your CRM mapping, custom forms, or tracking setup? We&apos;re here to help.
            </p>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
              <a
                href="mailto:support@sorget.com"
                className="btn btn-primary btn-sm"
                style={{ textDecoration: "none" }}
              >
                ✉ Email Support (support@sorget.com)
              </a>
              <Link
                href="/docs"
                className="btn btn-ghost btn-sm"
                style={{ textDecoration: "none" }}
              >
                View Full Documentation →
              </Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
