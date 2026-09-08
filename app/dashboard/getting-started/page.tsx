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
  let hubspotOAuthUrl: string | null = null;

  if (activeProject?.workspace_id) {
    const { data: crmConn } = await supabase
      .from("crm_connections")
      .select("id, is_active")
      .eq("workspace_id", activeProject.workspace_id)
      .eq("provider", "hubspot")
      .eq("is_active", true)
      .single();

    isHubSpotConnected = Boolean(crmConn);

    const clientId = (process.env.HUBSPOT_CLIENT_ID || "").trim();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
    const redirectUri = `${siteUrl}/api/crm/hubspot/callback`;

    if (clientId && clientId !== "your_actual_client_id") {
      const { state } = generateOAuthState(
        activeProject.workspace_id,
        activeProject.id
      );
      hubspotOAuthUrl = buildHubSpotOAuthUrl(clientId, redirectUri, state);
    }
  }

  // Check webhooks for active project
  let webhookCount = 0;
  if (activeProject) {
    const { count } = await supabase
      .from("webhooks")
      .select("id", { count: "exact", head: true })
      .eq("project_id", activeProject.id);
    webhookCount = count ?? 0;
  }

  // Check if any leads have been captured
  let leadCount = 0;
  if (activeProject) {
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("project_id", activeProject.id);
    leadCount = count ?? 0;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const scriptSrc = siteUrl ? `${siteUrl}/attributer.js` : "/attributer.js";
  const trackingSnippet = activeProject
    ? `<script src="${scriptSrc}" data-tracking-id="${activeProject.tracking_id}"></script>`
    : `<script src="${scriptSrc}" data-tracking-id="attr_YOUR_TRACKING_ID"></script>`;

  // Step completion status
  const step1Complete = Boolean(activeProject);
  const step2Complete = step1Complete; // script is generated
  const step3Complete = true; // reference always available
  const step4Complete = isHubSpotConnected || webhookCount > 0;
  const step5Complete = leadCount > 0;
  const isSetupComplete = step1Complete && (step4Complete || step5Complete);

  return (
    <div className="dashboard-layout" style={{ minHeight: "100vh" }}>
      <MainNavigation
        userEmail={user.email}
        workspaces={userWorkspaces}
        activeWorkspaceId={activeProject?.workspace_id || undefined}
      />

      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {/* Banners */}
        {errorMsg && (
          <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="alert alert-success" style={{ marginBottom: "1.5rem" }}>
            {successMsg}
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
                color: "#3ecfcf",
                background: "rgba(62, 207, 207, 0.12)",
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
          <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: "0.25rem 0 0.5rem 0" }}>
            Getting Started with Sorget
          </h1>
          <p style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.95rem", margin: 0, lineHeight: 1.6 }}>
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
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "2rem",
            }}
          >
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Configuring website:
            </span>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {projectList.map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/getting-started?project=${p.id}`}
                  style={{
                    padding: "0.25rem 0.65rem",
                    borderRadius: "6px",
                    fontSize: "0.8125rem",
                    textDecoration: "none",
                    fontWeight: p.id === activeProject?.id ? 600 : 400,
                    background:
                      p.id === activeProject?.id
                        ? "rgba(108, 99, 255, 0.25)"
                        : "rgba(255, 255, 255, 0.05)",
                    color:
                      p.id === activeProject?.id
                        ? "#ffffff"
                        : "var(--text-secondary)",
                    border:
                      p.id === activeProject?.id
                        ? "1px solid rgba(108, 99, 255, 0.5)"
                        : "1px solid transparent",
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
              padding: "1.75rem",
              background: "var(--color-card, #1a1a26)",
              border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
              borderRadius: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6c63ff", textTransform: "uppercase" }}>
                  Step 1
                </span>
                <h2 style={{ fontSize: "1.25rem", margin: "0.25rem 0 0 0", color: "#f0f0ff" }}>
                  Add Website
                </h2>
              </div>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  padding: "0.3rem 0.75rem",
                  borderRadius: "999px",
                  background: step1Complete ? "rgba(62, 207, 142, 0.15)" : "rgba(245, 158, 11, 0.15)",
                  color: step1Complete ? "#3ecf8e" : "#f59e0b",
                }}
              >
                {step1Complete ? "✓ Website Added" : "Action Required"}
              </span>
            </div>

            {activeProject ? (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                  padding: "1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: "#ffffff" }}>{activeProject.name}</div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                    {activeProject.website || "No URL specified"} · Tracking ID: <code style={{ color: "#3ecfcf" }}>{activeProject.tracking_id}</code>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  style={{
                    fontSize: "0.8125rem",
                    color: "#6c63ff",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  Manage Websites →
                </Link>
              </div>
            ) : (
              <div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
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
                    <label htmlFor="step1-name" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
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
                    <label htmlFor="step1-website" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
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
                    style={{ height: "42px" }}
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
              padding: "1.75rem",
              background: "var(--color-card, #1a1a26)",
              border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
              borderRadius: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6c63ff", textTransform: "uppercase" }}>
                  Step 2
                </span>
                <h2 style={{ fontSize: "1.25rem", margin: "0.25rem 0 0 0", color: "#f0f0ff" }}>
                  Install Sorget Tracking Code
                </h2>
              </div>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  padding: "0.3rem 0.75rem",
                  borderRadius: "999px",
                  background: step2Complete ? "rgba(62, 207, 142, 0.15)" : "rgba(255, 255, 255, 0.05)",
                  color: step2Complete ? "#3ecf8e" : "var(--text-muted)",
                }}
              >
                {step2Complete ? "Snippet Ready" : "Pending Step 1"}
              </span>
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1rem", lineHeight: 1.5 }}>
              Paste this tracking snippet into the <code>&lt;head&gt;</code> of your website template on every page you wish to track.
            </p>

            <div
              style={{
                background: "#0d0d14",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
                padding: "1rem",
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
                  color: "#3ecfcf",
                  fontFamily: "monospace",
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
              padding: "1.75rem",
              background: "var(--color-card, #1a1a26)",
              border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
              borderRadius: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6c63ff", textTransform: "uppercase" }}>
                  Step 3
                </span>
                <h2 style={{ fontSize: "1.25rem", margin: "0.25rem 0 0 0", color: "#f0f0ff" }}>
                  Add Hidden Form Fields
                </h2>
              </div>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  padding: "0.3rem 0.75rem",
                  borderRadius: "999px",
                  background: "rgba(62, 207, 142, 0.15)",
                  color: "#3ecf8e",
                }}
              >
                Field Schema
              </span>
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
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
                            background: "rgba(108, 99, 255, 0.15)",
                            color: "#9d96ff",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                          }}
                        >
                          {field.name}
                        </code>
                      </td>
                      <td style={{ fontWeight: 500 }}>{field.label}</td>
                      <td style={{ color: "#94a3b8", fontSize: "0.8125rem" }}>
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
              padding: "1.75rem",
              background: "var(--color-card, #1a1a26)",
              border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
              borderRadius: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6c63ff", textTransform: "uppercase" }}>
                  Step 4
                </span>
                <h2 style={{ fontSize: "1.25rem", margin: "0.25rem 0 0 0", color: "#f0f0ff" }}>
                  Connect HubSpot / Webhook
                </h2>
              </div>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  padding: "0.3rem 0.75rem",
                  borderRadius: "999px",
                  background: step4Complete ? "rgba(62, 207, 142, 0.15)" : "rgba(245, 158, 11, 0.15)",
                  color: step4Complete ? "#3ecf8e" : "#f59e0b",
                }}
              >
                {step4Complete ? "✓ Integration Configured" : "Recommended"}
              </span>
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
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
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "10px",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "1.25rem" }}>🟠</span>
                    <strong style={{ color: "#ffffff" }}>HubSpot CRM</strong>
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: 0 }}>
                    Automatically creates and enriches contacts with channel and campaign attribution properties.
                  </p>
                </div>
                <div style={{ marginTop: "1rem" }}>
                  {isHubSpotConnected ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        color: "#3ecf8e",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                      }}
                    >
                      ✓ Connected &amp; Syncing
                    </span>
                  ) : hubspotOAuthUrl ? (
                    <a
                      href={hubspotOAuthUrl}
                      className="btn btn-primary btn-sm"
                      style={{ textDecoration: "none", display: "inline-block" }}
                    >
                      Connect HubSpot →
                    </a>
                  ) : (
                    <Link
                      href={activeProject ? `/dashboard/projects/${activeProject.id}/integrations` : "/dashboard/integrations"}
                      className="btn btn-ghost btn-sm"
                      style={{ textDecoration: "none", display: "inline-block" }}
                    >
                      Configure HubSpot
                    </Link>
                  )}
                </div>
              </div>

              {/* Webhooks Card */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "10px",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "1.25rem" }}>⚡</span>
                    <strong style={{ color: "#ffffff" }}>Outbound Webhooks</strong>
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: 0 }}>
                    Receive real-time signed JSON payloads on every lead submission for Zapier, Make, or custom backends.
                  </p>
                </div>
                <div style={{ marginTop: "1rem" }}>
                  <Link
                    href={activeProject ? `/dashboard/projects/${activeProject.id}/integrations` : "/dashboard/integrations"}
                    className="btn btn-ghost btn-sm"
                    style={{ textDecoration: "none", display: "inline-block" }}
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
              padding: "1.75rem",
              background: "var(--color-card, #1a1a26)",
              border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
              borderRadius: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6c63ff", textTransform: "uppercase" }}>
                  Step 5
                </span>
                <h2 style={{ fontSize: "1.25rem", margin: "0.25rem 0 0 0", color: "#f0f0ff" }}>
                  Test Installation
                </h2>
              </div>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  padding: "0.3rem 0.75rem",
                  borderRadius: "999px",
                  background: step5Complete ? "rgba(62, 207, 142, 0.15)" : "rgba(255, 255, 255, 0.05)",
                  color: step5Complete ? "#3ecf8e" : "var(--text-muted)",
                }}
              >
                {step5Complete ? `✓ ${leadCount} Submissions Verified` : "Pending Verification"}
              </span>
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Use the built-in Installation Tester to inspect your website HTML, verify that the Sorget script tag is found, and ensure forms have the required hidden inputs.
            </p>

            <div>
              {activeProject ? (
                <Link
                  href={`/dashboard/projects/${activeProject.id}/debugger`}
                  className="btn btn-primary btn-sm"
                  style={{ textDecoration: "none", display: "inline-block" }}
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
              padding: "1.75rem",
              background: isSetupComplete ? "rgba(62, 207, 142, 0.08)" : "var(--color-card, #1a1a26)",
              border: isSetupComplete
                ? "1px solid rgba(62, 207, 142, 0.3)"
                : "1px solid var(--color-border, rgba(255,255,255,0.08))",
              borderRadius: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "1.5rem" }}>🎉</span>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: isSetupComplete ? "#3ecf8e" : "#6c63ff", textTransform: "uppercase" }}>
                  Step 6
                </span>
                <h2 style={{ fontSize: "1.25rem", margin: "0.1rem 0 0 0", color: "#f0f0ff" }}>
                  Setup Complete
                </h2>
              </div>
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Once your tracking script is installed and hidden fields are embedded, Sorget works silently in the background. It captures visitor attribution on landing and populates form fields upon submission.
            </p>

            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Link
                href="/dashboard"
                className="btn btn-primary btn-sm"
                style={{ textDecoration: "none", display: "inline-block" }}
              >
                Go to Websites Dashboard →
              </Link>
              {activeProject && (
                <Link
                  href={`/dashboard/projects/${activeProject.id}`}
                  className="btn btn-ghost btn-sm"
                  style={{ textDecoration: "none", display: "inline-block" }}
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
