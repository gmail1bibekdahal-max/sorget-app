import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/app/actions/projects";
import CopyButton from "@/app/components/CopyButton";
import MainNavigation from "@/app/components/MainNavigation";
import { buildHubSpotOAuthUrl, generateOAuthState } from "@/lib/crm";
import FormFieldsGuide from "./FormFieldsGuide";
import { Step1Illustration, Step2Illustration } from "./SetupIllustrations";

export const metadata = {
  title: "Getting Started — Sorget",
  description: "Set up Sorget marketing attribution tracking on your website.",
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

  const selectedWsId = params.workspace || userWorkspaces[0]?.id;

  // Fetch projects
  let projectsQuery = supabase
    .from("projects")
    .select("id, name, website, tracking_id, workspace_id, created_at")
    .order("created_at", { ascending: false });

  if (selectedWsId) {
    projectsQuery = projectsQuery.eq("workspace_id", selectedWsId);
  } else {
    projectsQuery = projectsQuery.eq("user_id", user.id);
  }

  const { data: projects } = await projectsQuery;
  const projectList = projects ?? [];

  const activeProject =
    projectList.find((p) => p.id === selectedProjectId) ||
    projectList[0] ||
    null;

  // Check lead count & HubSpot integration status for active project
  let leadCount = 0;
  let isHubSpotConnected = false;
  let webhookCount = 0;

  if (activeProject) {
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("project_id", activeProject.id);

    leadCount = count ?? 0;

    const { data: integrations } = await supabase
      .from("integrations")
      .select("provider, is_active")
      .eq("project_id", activeProject.id)
      .eq("provider", "hubspot")
      .eq("is_active", true);

    isHubSpotConnected = Boolean(integrations && integrations.length > 0);

    const { count: hookCount } = await supabase
      .from("webhooks")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", activeProject.workspace_id);

    webhookCount = hookCount ?? 0;
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://app.sorget.site";
  const hubspotOAuthUrl =
    activeProject && activeProject.workspace_id
      ? buildHubSpotOAuthUrl({
          state: generateOAuthState(activeProject.workspace_id, activeProject.id),
          redirectUri: `${siteUrl}/api/crm/hubspot/callback`,
        })
      : null;

  const step1Complete = Boolean(activeProject);
  const step2Complete = Boolean(activeProject?.tracking_id);
  const step3Complete = isHubSpotConnected || webhookCount > 0;
  const step4Complete = leadCount > 0;

  const appSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const scriptSrc = appSiteUrl ? `${appSiteUrl}/attributer.js` : "/attributer.js";
  const trackingSnippet = activeProject
    ? `<script type="text/javascript" src="${scriptSrc}" data-tracking-id="${activeProject.tracking_id}"></script>`
    : `<script type="text/javascript" src="${scriptSrc}" data-tracking-id="YOUR_TRACKING_ID"></script>`;

  return (
    <div className="dashboard-layout">
      <MainNavigation
        userEmail={user.email}
        workspaces={userWorkspaces}
        activeWorkspaceId={activeProject?.workspace_id ?? selectedWsId}
      />

      <main className="dashboard-main">
        {/* Alerts */}
        {errorMsg && (
          <div className="alert alert-error">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="alert alert-success">
            <span>✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Page Header matching visual reference */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                color: "var(--sorget-dark, #3A313C)",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--sorget-dark)" }}>
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
              </svg>
              Getting Started
            </h1>
          </div>
          <p style={{ color: "var(--text-muted, #64748b)", fontSize: "0.95rem", margin: 0 }}>
            Install Sorget onto your website and configure hidden form fields to capture marketing attribution.
          </p>
        </div>

        {/* Website Selector pills (if multiple projects) */}
        {projectList.length > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              background: "#ffffff",
              border: "1px solid var(--color-border)",
              borderRadius: "10px",
              padding: "0.65rem 1rem",
              marginBottom: "1.75rem",
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
                    padding: "0.25rem 0.75rem",
                    borderRadius: "6px",
                    fontSize: "0.8125rem",
                    textDecoration: "none",
                    fontWeight: p.id === activeProject?.id ? 700 : 500,
                    background:
                      p.id === activeProject?.id
                        ? "var(--sorget-dark, #3A313C)"
                        : "#f8fafc",
                    color:
                      p.id === activeProject?.id
                        ? "#ffffff"
                        : "var(--sorget-dark, #3A313C)",
                    border:
                      p.id === activeProject?.id
                        ? "1px solid var(--sorget-dark, #3A313C)"
                        : "1px solid var(--color-border)",
                  }}
                >
                  {p.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 2-Column SaaS Onboarding Layout */}
        <div className="getting-started-grid">
          {/* LEFT SIDE: Setup / Form Content */}
          <div className="getting-started-content">

            {/* STEP 1: Copy and paste Sorget code */}
            <div className="setup-card">
              <div className="setup-card-inner">
                <div className="setup-card-main">
                  <h2 className="setup-step-title">
                    Step 1
                  </h2>
                  <p className="setup-step-desc">
                    Copy and paste the Sorget code onto your website.{" "}
                    <Link href="/dashboard/support">Learn how here.</Link>
                  </p>

                  {/* Tracking Snippet Box */}
                  <div className="setup-code-box">
                    <span className="setup-code-text" title={trackingSnippet}>
                      {trackingSnippet}
                    </span>
                    <CopyButton text={trackingSnippet} label="Copy Script" />
                  </div>

                  {!activeProject && (
                    <div style={{ marginTop: "1.25rem", padding: "1rem", background: "#f8fafc", borderRadius: "10px", border: "1px solid var(--color-border)" }}>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.75rem", fontWeight: 600 }}>
                        Register your website to generate your unique tracking ID:
                      </p>
                      <form action={createProject} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        <input
                          name="name"
                          type="text"
                          placeholder="Website Name (e.g. My Domain)"
                          required
                          style={{ flex: "1 1 180px", fontSize: "0.875rem", padding: "0.5rem 0.75rem" }}
                        />
                        <input
                          name="website"
                          type="text"
                          placeholder="https://example.com"
                          style={{ flex: "1 1 200px", fontSize: "0.875rem", padding: "0.5rem 0.75rem" }}
                        />
                        <button type="submit" className="btn btn-primary btn-sm" style={{ height: "38px" }}>
                          Create Website
                        </button>
                      </form>
                    </div>
                  )}

                  {activeProject && (
                    <div style={{ marginTop: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                      <span style={{ color: "#059669", fontWeight: 700 }}>✓</span>
                      <span>Configured for <strong>{activeProject.name}</strong> ({activeProject.website || "All pages"})</span>
                    </div>
                  )}
                </div>

                <div className="setup-card-illustration">
                  <Step1Illustration />
                </div>
              </div>
            </div>

            {/* STEP 2: Add hidden fields to your forms */}
            <div className="setup-card">
              <div className="setup-card-inner">
                <div className="setup-card-main">
                  <h2 className="setup-step-title">
                    Step 2
                  </h2>
                  <p className="setup-step-desc">
                    Add hidden fields to your forms with specific default values. Instructions below:
                  </p>

                  <FormFieldsGuide fields={HIDDEN_FIELDS} />
                </div>

                <div className="setup-card-illustration">
                  <Step2Illustration />
                </div>
              </div>
            </div>

            {/* STEP 3: Connect CRM / Outbound Webhooks */}
            <div className="setup-card">
              <h2 className="setup-step-title">
                Step 3
              </h2>
              <p className="setup-step-desc">
                Connect your CRM or outbound webhook to automatically receive attribution data with every submission.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "1rem",
                }}
              >
                {/* HubSpot Card */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid var(--color-border)",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                      <span style={{ fontSize: "1.1rem" }}>🟠</span>
                      <strong style={{ color: "var(--sorget-dark)", fontSize: "0.95rem" }}>HubSpot CRM</strong>
                    </div>
                    <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.45 }}>
                      Creates &amp; updates contacts with channel, campaign, and keyword source data.
                    </p>
                  </div>
                  <div style={{ marginTop: "1rem" }}>
                    {isHubSpotConnected ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "#059669", fontSize: "0.8125rem", fontWeight: 700 }}>
                        ✓ Connected &amp; Syncing
                      </span>
                    ) : hubspotOAuthUrl ? (
                      <a
                        href={hubspotOAuthUrl}
                        className="btn btn-primary btn-sm"
                        style={{ textDecoration: "none", display: "inline-block", borderRadius: "6px" }}
                      >
                        Connect HubSpot →
                      </a>
                    ) : (
                      <Link
                        href={activeProject ? `/dashboard/projects/${activeProject.id}/integrations` : "/dashboard/integrations"}
                        className="btn btn-secondary btn-sm"
                        style={{ textDecoration: "none", display: "inline-block", borderRadius: "6px" }}
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
                    border: "1px solid var(--color-border)",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                      <span style={{ fontSize: "1.1rem" }}>⚡</span>
                      <strong style={{ color: "var(--sorget-dark)", fontSize: "0.95rem" }}>Outbound Webhooks</strong>
                    </div>
                    <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.45 }}>
                      Deliver signed JSON payloads to Zapier, Make, or custom API endpoints.
                    </p>
                  </div>
                  <div style={{ marginTop: "1rem" }}>
                    <Link
                      href={activeProject ? `/dashboard/projects/${activeProject.id}/integrations` : "/dashboard/integrations"}
                      className="btn btn-secondary btn-sm"
                      style={{ textDecoration: "none", display: "inline-block", borderRadius: "6px" }}
                    >
                      {webhookCount > 0 ? `✓ ${webhookCount} Webhook(s) Active` : "Configure Webhooks →"}
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 4: Test Installation & Verification */}
            <div className="setup-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                <h2 className="setup-step-title" style={{ margin: 0 }}>
                  Step 4
                </h2>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    padding: "0.25rem 0.65rem",
                    borderRadius: "999px",
                    background: step4Complete ? "rgba(16, 185, 129, 0.1)" : "#f1f5f9",
                    color: step4Complete ? "#059669" : "var(--text-muted)",
                    border: step4Complete ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid #e2e8f0",
                  }}
                >
                  {step4Complete ? `✓ ${leadCount} Submissions Verified` : "Pending Verification"}
                </span>
              </div>
              <p className="setup-step-desc">
                Test your website to verify the tracking snippet is detected and forms contain hidden fields.
              </p>

              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                {activeProject ? (
                  <Link
                    href={`/dashboard/projects/${activeProject.id}/debugger`}
                    className="btn btn-primary btn-sm"
                    style={{ textDecoration: "none", borderRadius: "6px" }}
                  >
                    🧪 Run Test Installation →
                  </Link>
                ) : (
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    Add a website in Step 1 first to run installation tests.
                  </span>
                )}
                {activeProject && (
                  <Link
                    href={`/dashboard/projects/${activeProject.id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ textDecoration: "none", borderRadius: "6px" }}
                  >
                    View Leads Log
                  </Link>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT SIDE: Dedicated Sorget Product Information / Education Panel */}
          <aside className="getting-started-panel">
            <div className="panel-kicker">Sorget Marketing Attribution</div>
            <h3 className="panel-title">Know where your customers came from.</h3>
            <p className="panel-desc">
              Sorget connects your marketing to revenue. It captures where every lead originated, preserves first-touch attribution parameters, and pushes clean source data into your CRM.
            </p>

            <div className="panel-benefit-list">
              <div className="panel-benefit-item">
                <span className="panel-check-icon">✓</span>
                <span><strong>Capture every lead's marketing source</strong> accurately without complex tracking setups.</span>
              </div>
              <div className="panel-benefit-item">
                <span className="panel-check-icon">✓</span>
                <span><strong>Preserve first-touch attribution</strong> across days, sessions, and multiple page navigations.</span>
              </div>
              <div className="panel-benefit-item">
                <span className="panel-check-icon">✓</span>
                <span><strong>Send attribution data into CRM systems</strong> including HubSpot, webhooks, and custom pipelines.</span>
              </div>
              <div className="panel-benefit-item">
                <span className="panel-check-icon">✓</span>
                <span><strong>Connect campaigns to revenue</strong> to understand which marketing channels drive actual paying customers.</span>
              </div>
            </div>

            {/* Visual Attribution Flow Diagram */}
            <div className="flow-diagram-box">
              <div className="flow-diagram-title">How Sorget Works</div>
              
              <div className="flow-step-pill">
                <span style={{ fontSize: "1rem" }}>🌐</span>
                <span>Visitor Arrives (Ads, Search, Social)</span>
              </div>

              <div className="flow-step-arrow">↓</div>

              <div className="flow-step-pill">
                <span style={{ fontSize: "1rem" }}>⚡</span>
                <span>Sorget Captures UTMs &amp; Referrer</span>
              </div>

              <div className="flow-step-arrow">↓</div>

              <div className="flow-step-pill">
                <span style={{ fontSize: "1rem" }}>📝</span>
                <span>Form Auto-Fills Hidden Fields</span>
              </div>

              <div className="flow-step-arrow">↓</div>

              <div className="flow-step-pill">
                <span style={{ fontSize: "1rem" }}>🎯</span>
                <span>CRM Enriched with Revenue Data</span>
              </div>
            </div>

            {/* Quick Setup Checklist */}
            <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                Setup Checklist
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.8125rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: step1Complete ? "#059669" : "var(--text-muted)" }}>
                  <span>Website Domain</span>
                  <span>{step1Complete ? "✓ Registered" : "Pending"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: step2Complete ? "#059669" : "var(--text-muted)" }}>
                  <span>Tracking Snippet</span>
                  <span>{step2Complete ? "✓ Ready" : "Pending"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#059669" }}>
                  <span>Form Hidden Fields</span>
                  <span>✓ 6 Standard Fields</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: step3Complete ? "#059669" : "var(--text-muted)" }}>
                  <span>CRM / Webhook Sync</span>
                  <span>{step3Complete ? "✓ Active" : "Optional"}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
