import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/app/actions/projects";
import CopyButton from "@/app/components/CopyButton";
import MainNavigation from "@/app/components/MainNavigation";
import { buildHubSpotOAuthUrl, generateOAuthState } from "@/lib/crm";

export const metadata = {
  title: "Getting Started — Sorget Setup Guide",
  description: "Simple 6-step setup guide to install Sorget and start passing attribution data.",
};

const HIDDEN_FIELDS = [
  {
    name: "channel",
    label: "Channel",
    example: "Paid Search, Organic Search, Paid Social, Direct, Referral",
  },
  {
    name: "channeldrilldown1",
    label: "Channel Drilldown 1",
    example: "google, facebook, linkedin, bing",
  },
  {
    name: "channeldrilldown2",
    label: "Channel Drilldown 2",
    example: "Campaign name, ad network, search engine",
  },
  {
    name: "channeldrilldown3",
    label: "Channel Drilldown 3",
    example: "Ad group, keyword term, ad creative content",
  },
  {
    name: "landingpage",
    label: "Landing Page",
    example: "/pricing, /request-demo, /get-started",
  },
  {
    name: "landingpagegroup",
    label: "Landing Page Group",
    example: "/features, /solutions, /blog",
  },
];

interface PageProps {
  searchParams: Promise<{
    project?: string;
    workspace?: string;
    error?: string;
    success?: string;
  }>;
}

export default async function GettingStartedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const errorMsg = params.error;
  const successMsg = params.success;
  const selectedProjectId = params.project;

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Fetch workspaces
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

  // Fetch projects (websites)
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, website, tracking_id, workspace_id, created_at")
    .order("created_at", { ascending: false });

  const projectList = projects ?? [];
  const activeProject =
    projectList.find((p) => p.id === selectedProjectId) ||
    projectList[0] ||
    null;

  // Check HubSpot connection status for active project's workspace
  let isHubSpotConnected = false;
  if (activeProject?.workspace_id) {
    const { data: crmConn } = await supabase
      .from("crm_connections")
      .select("id, status")
      .eq("workspace_id", activeProject.workspace_id)
      .eq("provider", "hubspot")
      .eq("status", "connected")
      .maybeSingle();

    isHubSpotConnected = Boolean(crmConn);
  }

  // Count leads/submissions for active project
  let leadCount = 0;
  if (activeProject) {
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("project_id", activeProject.id);

    leadCount = count ?? 0;
  }

  // Count outbound webhooks
  let webhookCount = 0;
  if (activeProject?.workspace_id) {
    const { count } = await supabase
      .from("webhooks")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", activeProject.workspace_id);

    webhookCount = count ?? 0;
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
  const hubspotOAuthUrl =
    activeProject && activeProject.workspace_id
      ? buildHubSpotOAuthUrl({
          state: generateOAuthState(activeProject.workspace_id, activeProject.id),
          redirectUri: `${siteUrl}/api/crm/hubspot/callback`,
        })
      : null;

  // Compute step statuses
  const step1Complete = Boolean(activeProject);
  const step2Complete = Boolean(activeProject?.tracking_id);
  const step3Complete = true; // Field schema always ready to copy
  const step4Complete = isHubSpotConnected || webhookCount > 0;
  const step5Complete = leadCount > 0;
  const isSetupComplete = step1Complete && step2Complete && step5Complete;

  const appSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const scriptSrc = appSiteUrl ? `${appSiteUrl}/attributer.js` : "/attributer.js";
  const trackingSnippet = activeProject
    ? `<script src="${scriptSrc}" data-tracking-id="${activeProject.tracking_id}"></script>`
    : `<script src="${scriptSrc}" data-tracking-id="YOUR_TRACKING_ID"></script>`;

  return (
    <div className="dashboard-layout">
      <MainNavigation
        userEmail={user.email}
        workspaces={userWorkspaces}
        activeWorkspaceId={activeProject?.workspace_id ?? undefined}
      />

      <main className="dashboard-main" style={{ maxWidth: "1000px" }}>
        {/* Alerts */}
        {errorMsg && (
          <div className="alert alert-error">
            <span>⚠️</span><span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="alert alert-success">
            <span>✓</span><span>{successMsg}</span>
          </div>
        )}

        {/* Page Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--sorget-pink, #BB0C68)",
                background: "var(--sorget-pink-light, rgba(187, 12, 104, 0.08))",
                border: "1px solid var(--sorget-pink-border, rgba(187, 12, 104, 0.25))",
                padding: "0.25rem 0.65rem",
                borderRadius: "999px",
              }}
            >
              Setup Wizard
            </span>
            {projectList.length > 1 && (
              <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                · Active website: <strong>{activeProject?.name}</strong>
              </span>
            )}
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--sorget-dark, #3A313C)", margin: "0.25rem 0 0.5rem 0" }}>
            Getting Started with Sorget
          </h1>
          <p style={{ color: "var(--text-muted, #64748b)", fontSize: "0.95rem", margin: 0, lineHeight: 1.6 }}>
            Follow these 6 simple steps to install the Sorget tracking script, add hidden form fields, and send clean marketing attribution straight into your CRM.
          </p>
        </div>

        {/* Website Selector (if user has multiple websites) */}
        {projectList.length > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              background: "#ffffff",
              border: "1.5px solid var(--color-border, #e2e8f0)",
              borderRadius: "10px",
              padding: "0.75rem 1rem",
              marginBottom: "2rem",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
              Configuring website:
            </span>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {projectList.map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/getting-started?project=${p.id}`}
                  style={{
                    padding: "0.3rem 0.75rem",
                    borderRadius: "6px",
                    fontSize: "0.8125rem",
                    textDecoration: "none",
                    fontWeight: p.id === activeProject?.id ? 700 : 500,
                    background:
                      p.id === activeProject?.id
                        ? "var(--sorget-pink, #BB0C68)"
                        : "#f8fafc",
                    color:
                      p.id === activeProject?.id
                        ? "#ffffff"
                        : "var(--sorget-dark, #3A313C)",
                    border:
                      p.id === activeProject?.id
                        ? "1px solid var(--sorget-pink, #BB0C68)"
                        : "1px solid var(--color-border, #e2e8f0)",
                  }}
                >
                  {p.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 6 Steps List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

          {/* STEP 1 — Add Website */}
          <div
            className="card"
            style={{
              maxWidth: "100%",
              padding: "1.75rem 2rem",
              background: "#ffffff",
              border: "1.5px solid var(--color-border, #e2e8f0)",
              borderRadius: "14px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--sorget-pink, #BB0C68)", textTransform: "uppercase" }}>
                  Step 1
                </span>
                <h2 style={{ fontSize: "1.35rem", margin: "0.25rem 0 0 0", color: "var(--sorget-dark, #3A313C)" }}>
                  Add Website
                </h2>
              </div>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  padding: "0.3rem 0.75rem",
                  borderRadius: "999px",
                  background: step1Complete ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.12)",
                  color: step1Complete ? "#059669" : "#b45309",
                  border: step1Complete ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(245, 158, 11, 0.25)",
                }}
              >
                {step1Complete ? "✓ Website Added" : "Action Required"}
              </span>
            </div>

            {activeProject ? (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid var(--color-border, #e2e8f0)",
                  borderRadius: "10px",
                  padding: "1rem 1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "var(--sorget-dark, #3A313C)" }}>{activeProject.name}</div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                    {activeProject.website || "No URL specified"} · Tracking ID: <code style={{ color: "var(--sorget-pink)", fontWeight: 700 }}>{activeProject.tracking_id}</code>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--sorget-pink, #BB0C68)",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  Manage Websites →
                </Link>
              </div>
            ) : (
              <div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
                  Register your website property to generate your unique tracking ID.
                </p>
                <form
                  action={createProject}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "1rem",
                    alignItems: "end",
                  }}
                >
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="step1-name" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                      Website Name *
                    </label>
                    <input
                      id="step1-name"
                      name="name"
                      type="text"
                      placeholder="e.g. Acme Marketing"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="step1-website" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                      Website URL (optional)
                    </label>
                    <input
                      id="step1-website"
                      name="website"
                      type="text"
                      placeholder="https://example.com"
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ height: "42px", borderRadius: "8px" }}
                  >
                    Add Website →
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* STEP 2 — Install Sorget Tracking Code */}
          <div
            className="card"
            style={{
              maxWidth: "100%",
              padding: "1.75rem 2rem",
              background: "#ffffff",
              border: "1.5px solid var(--color-border, #e2e8f0)",
              borderRadius: "14px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--sorget-pink, #BB0C68)", textTransform: "uppercase" }}>
                  Step 2
                </span>
                <h2 style={{ fontSize: "1.35rem", margin: "0.25rem 0 0 0", color: "var(--sorget-dark, #3A313C)" }}>
                  Install Sorget Tracking Code
                </h2>
              </div>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  padding: "0.3rem 0.75rem",
                  borderRadius: "999px",
                  background: step2Complete ? "rgba(16, 185, 129, 0.1)" : "#f1f5f9",
                  color: step2Complete ? "#059669" : "var(--text-muted)",
                  border: step2Complete ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid #e2e8f0",
                }}
              >
                {step2Complete ? "Snippet Ready" : "Pending Step 1"}
              </span>
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem", lineHeight: 1.5 }}>
              Paste this tracking snippet into the <code>&lt;head&gt;</code> of your website template on every page you wish to track.
            </p>

            <div
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <code
                id="getting-started-snippet"
                style={{
                  fontSize: "0.85rem",
                  color: "#38bdf8",
                  fontFamily: "'SF Mono', Consolas, Monaco, monospace",
                  wordBreak: "break-all",
                }}
              >
                {trackingSnippet}
              </code>
              <CopyButton text={trackingSnippet} label="Copy Script" />
            </div>
          </div>

          {/* STEP 3 — Add Hidden Form Fields */}
          <div
            className="card"
            style={{
              maxWidth: "100%",
              padding: "1.75rem 2rem",
              background: "#ffffff",
              border: "1.5px solid var(--color-border, #e2e8f0)",
              borderRadius: "14px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--sorget-pink, #BB0C68)", textTransform: "uppercase" }}>
                  Step 3
                </span>
                <h2 style={{ fontSize: "1.35rem", margin: "0.25rem 0 0 0", color: "var(--sorget-dark, #3A313C)" }}>
                  Add Hidden Form Fields
                </h2>
              </div>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  padding: "0.3rem 0.75rem",
                  borderRadius: "999px",
                  background: "rgba(16, 185, 129, 0.1)",
                  color: "#059669",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                }}
              >
                Field Schema
              </span>
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Add these 6 hidden fields to any form on your site (Gravity Forms, HubSpot Forms, Webflow, Typeform, or standard HTML). When a visitor submits a form, Sorget automatically discovers and populates them:
            </p>

            <div className="table-container" style={{ margin: 0 }}>
              <table className="leads-table">
                <thead>
                  <tr>
                    <th style={{ width: "220px" }}>Hidden Field Name</th>
                    <th>Attribution Data</th>
                    <th>Example Values</th>
                    <th style={{ width: "90px", textAlign: "right" }}>Copy</th>
                  </tr>
                </thead>
                <tbody>
                  {HIDDEN_FIELDS.map((field) => (
                    <tr key={field.name}>
                      <td>
                        <code
                          style={{
                            background: "var(--sorget-pink-light, rgba(187, 12, 104, 0.08))",
                            color: "var(--sorget-pink, #BB0C68)",
                            border: "1px solid var(--sorget-pink-border, rgba(187, 12, 104, 0.25))",
                            padding: "0.25rem 0.55rem",
                            borderRadius: "6px",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            fontFamily: "'SF Mono', Consolas, monospace",
                          }}
                        >
                          {field.name}
                        </code>
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--sorget-dark, #3A313C)" }}>{field.label}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                        {field.example}
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

          {/* STEP 4 — Connect HubSpot / Webhook */}
          <div
            className="card"
            style={{
              maxWidth: "100%",
              padding: "1.75rem 2rem",
              background: "#ffffff",
              border: "1.5px solid var(--color-border, #e2e8f0)",
              borderRadius: "14px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--sorget-pink, #BB0C68)", textTransform: "uppercase" }}>
                  Step 4
                </span>
                <h2 style={{ fontSize: "1.35rem", margin: "0.25rem 0 0 0", color: "var(--sorget-dark, #3A313C)" }}>
                  Connect HubSpot / Webhook
                </h2>
              </div>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  padding: "0.3rem 0.75rem",
                  borderRadius: "999px",
                  background: step4Complete ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.12)",
                  color: step4Complete ? "#059669" : "#b45309",
                  border: step4Complete ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(245, 158, 11, 0.25)",
                }}
              >
                {step4Complete ? "✓ Integration Configured" : "Recommended"}
              </span>
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Sorget passes attribution directly to your external tools. Connect HubSpot via OAuth or set up an outbound webhook.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1rem",
              }}
            >
              {/* HubSpot Card */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1.5px solid var(--color-border, #e2e8f0)",
                  borderRadius: "12px",
                  padding: "1.35rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "1.25rem" }}>🟠</span>
                    <strong style={{ color: "var(--sorget-dark, #3A313C)", fontSize: "1.05rem" }}>HubSpot CRM</strong>
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                    Automatically creates and enriches contacts with channel and campaign attribution properties.
                  </p>
                </div>
                <div style={{ marginTop: "1.25rem" }}>
                  {isHubSpotConnected ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        color: "#059669",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                      }}
                    >
                      ✓ Connected &amp; Syncing
                    </span>
                  ) : hubspotOAuthUrl ? (
                    <a
                      href={hubspotOAuthUrl}
                      className="btn btn-primary btn-sm"
                      style={{ textDecoration: "none", display: "inline-block", borderRadius: "8px" }}
                    >
                      Connect HubSpot →
                    </a>
                  ) : (
                    <Link
                      href={activeProject ? `/dashboard/projects/${activeProject.id}/integrations` : "/dashboard/integrations"}
                      className="btn btn-secondary btn-sm"
                      style={{ textDecoration: "none", display: "inline-block", borderRadius: "8px" }}
                    >
                      Configure HubSpot
                    </Link>
                  )}
                </div>
              </div>

              {/* Webhooks Card */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1.5px solid var(--color-border, #e2e8f0)",
                  borderRadius: "12px",
                  padding: "1.35rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "1.25rem" }}>⚡</span>
                    <strong style={{ color: "var(--sorget-dark, #3A313C)", fontSize: "1.05rem" }}>Outbound Webhooks</strong>
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                    Receive real-time signed JSON payloads on every lead submission for Zapier, Make, or custom backends.
                  </p>
                </div>
                <div style={{ marginTop: "1.25rem" }}>
                  <Link
                    href={activeProject ? `/dashboard/projects/${activeProject.id}/integrations` : "/dashboard/integrations"}
                    className="btn btn-secondary btn-sm"
                    style={{ textDecoration: "none", display: "inline-block", borderRadius: "8px" }}
                  >
                    {webhookCount > 0 ? `✓ ${webhookCount} Webhook(s) Active` : "Configure Webhooks →"}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 5 — Test Installation */}
          <div
            className="card"
            style={{
              maxWidth: "100%",
              padding: "1.75rem 2rem",
              background: "#ffffff",
              border: "1.5px solid var(--color-border, #e2e8f0)",
              borderRadius: "14px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--sorget-pink, #BB0C68)", textTransform: "uppercase" }}>
                  Step 5
                </span>
                <h2 style={{ fontSize: "1.35rem", margin: "0.25rem 0 0 0", color: "var(--sorget-dark, #3A313C)" }}>
                  Test Installation
                </h2>
              </div>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  padding: "0.3rem 0.75rem",
                  borderRadius: "999px",
                  background: step5Complete ? "rgba(16, 185, 129, 0.1)" : "#f1f5f9",
                  color: step5Complete ? "#059669" : "var(--text-muted)",
                  border: step5Complete ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid #e2e8f0",
                }}
              >
                {step5Complete ? `✓ ${leadCount} Submissions Verified` : "Pending Verification"}
              </span>
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Use the built-in Installation Tester to inspect your website HTML, verify that the Sorget script tag is found, and ensure forms have the required hidden inputs.
            </p>

            <div>
              {activeProject ? (
                <Link
                  href={`/dashboard/projects/${activeProject.id}/debugger`}
                  className="btn btn-primary btn-sm"
                  style={{ textDecoration: "none", display: "inline-block", borderRadius: "8px" }}
                >
                  🧪 Run Test Installation →
                </Link>
              ) : (
                <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                  Add a website in Step 1 first to run installation tests.
                </span>
              )}
            </div>
          </div>

          {/* STEP 6 — Setup Complete */}
          <div
            className="card"
            style={{
              maxWidth: "100%",
              padding: "1.75rem 2rem",
              background: isSetupComplete ? "rgba(16, 185, 129, 0.06)" : "#ffffff",
              border: isSetupComplete
                ? "1.5px solid rgba(16, 185, 129, 0.35)"
                : "1.5px solid var(--color-border, #e2e8f0)",
              borderRadius: "14px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "1.5rem" }}>🎉</span>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: isSetupComplete ? "#059669" : "var(--sorget-pink, #BB0C68)", textTransform: "uppercase" }}>
                  Step 6
                </span>
                <h2 style={{ fontSize: "1.35rem", margin: "0.1rem 0 0 0", color: "var(--sorget-dark, #3A313C)" }}>
                  Setup Complete
                </h2>
              </div>
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Once your tracking script is installed and hidden fields are embedded, Sorget works silently in the background. It captures visitor attribution on landing and populates form fields upon submission.
            </p>

            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Link
                href="/dashboard"
                className="btn btn-primary btn-sm"
                style={{ textDecoration: "none", display: "inline-block", borderRadius: "8px" }}
              >
                Go to Websites Dashboard →
              </Link>
              {activeProject && (
                <Link
                  href={`/dashboard/projects/${activeProject.id}`}
                  className="btn btn-secondary btn-sm"
                  style={{ textDecoration: "none", display: "inline-block", borderRadius: "8px" }}
                >
                  View Submission Verification Log →
                </Link>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
