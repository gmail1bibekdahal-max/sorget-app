import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultWorkspace } from "@/lib/workspaces";
import CopyButton from "@/app/components/CopyButton";
import MainNavigation from "@/app/components/MainNavigation";

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  channel: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  gclid: string | null;
  gbraid: string | null;
  gad_campaignid: string | null;
  gad_source: string | null;
  referrer: string | null;
  landing_url: string | null;
  landing_page: string | null;
  created_at: string;
  project_id: string | null;
}

interface Project {
  id: string;
  workspace_id: string | null;
  name: string;
  website: string | null;
  tracking_id: string;
  user_id: string;
  created_at: string;
}

interface PageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}

function channelBadgeClass(channel: string | null): string {
  const c = (channel ?? "").toLowerCase();
  if (c.includes("paid search")) return "badge badge-paid-search";
  if (c.includes("paid social")) return "badge badge-paid-social";
  if (c.includes("organic")) return "badge badge-organic";
  if (c === "direct") return "badge badge-direct";
  if (c === "referral") return "badge badge-referral";
  return "badge badge-other";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const HIDDEN_FIELDS = [
  { name: "channel", label: "Channel", example: "Paid Search, Organic Search, Paid Social, Direct" },
  { name: "channeldrilldown1", label: "Channel Drilldown 1", example: "google, facebook, linkedin, bing" },
  { name: "channeldrilldown2", label: "Channel Drilldown 2", example: "Campaign name, ad network, search engine" },
  { name: "channeldrilldown3", label: "Channel Drilldown 3", example: "Ad group, keyword term, ad content" },
  { name: "landingpage", label: "Landing Page", example: "/pricing, /request-demo, /product" },
  { name: "landingpagegroup", label: "Landing Page Group", example: "/features, /solutions, /blog" },
];

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return { title: `Website Setup — Sorget`, description: `Sorget website setup for ${projectId}` };
}

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  const sp = await searchParams;
  const errorMsg = sp.error;
  const successMsg = sp.success;

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

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

  // Strict ownership check
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, workspace_id, name, website, tracking_id, user_id, created_at")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) notFound();
  const p = project as Project;

  if (!p.workspace_id) {
    const ws = await getOrCreateDefaultWorkspace(
      supabase,
      user.id,
      user.email,
      user.user_metadata?.full_name
    );
    await supabase
      .from("projects")
      .update({ workspace_id: ws.id })
      .eq("id", p.id);
    p.workspace_id = ws.id;
  }

  // Check HubSpot connection status
  let isHubSpotConnected = false;
  if (p.workspace_id) {
    const { data: crmConn } = await supabase
      .from("crm_connections")
      .select("id, is_active")
      .eq("workspace_id", p.workspace_id)
      .eq("provider", "hubspot")
      .eq("is_active", true)
      .single();
    isHubSpotConnected = Boolean(crmConn);
  }

  // Check webhooks count
  const { count: webhookCount } = await supabase
    .from("webhooks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", p.id);

  // Fetch recent leads strictly as a verification log
  const { data: leadsRaw, error: leadsError } = await supabase
    .from("leads")
    .select("id, name, email, channel, source, medium, campaign, content, term, gclid, gbraid, gad_campaignid, gad_source, referrer, landing_url, landing_page, created_at, project_id")
    .eq("project_id", p.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const leads: Lead[] = leadsRaw ?? [];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const scriptSrc = siteUrl ? `${siteUrl}/attributer.js` : "/attributer.js";
  const installSnippet = `<script\n  src="${scriptSrc}"\n  data-tracking-id="${p.tracking_id}">\n</script>`;

  return (
    <div className="dashboard-layout" style={{ minHeight: "100vh" }}>
      <MainNavigation
        userEmail={user.email}
        workspaces={userWorkspaces}
        activeWorkspaceId={p.workspace_id || undefined}
      />

      <main className="dashboard-main" style={{ maxWidth: "1000px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {errorMsg && <div className="alert alert-error" style={{ marginBottom: "1.25rem" }}>{errorMsg}</div>}
        {successMsg && <div className="alert alert-success" style={{ marginBottom: "1.25rem" }}>{successMsg}</div>}
        {leadsError && <div className="alert alert-error" style={{ marginBottom: "1.25rem" }}>Failed to load verification log.</div>}

        {/* 1. Website / Domain Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "2rem",
            background: "var(--color-card, #1a1a26)",
            border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
            borderRadius: "14px",
            padding: "1.75rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <Link href="/dashboard" style={{ color: "var(--text-muted)", fontSize: "0.8125rem", textDecoration: "none" }}>
                ← Back to Websites
              </Link>
            </div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0.25rem 0", color: "#ffffff" }}>
              {p.name}
            </h1>
            {p.website ? (
              <a
                href={p.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#3ecfcf", textDecoration: "none", fontSize: "0.875rem" }}
              >
                {p.website} ↗
              </a>
            ) : (
              <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No website URL configured</span>
            )}
          </div>

          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
              Tracking ID
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <code
                id="project-tracking-id-display"
                style={{
                  fontSize: "0.875rem",
                  background: "rgba(62, 207, 207, 0.1)",
                  color: "#3ecfcf",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "6px",
                  fontWeight: 600,
                }}
              >
                {p.tracking_id}
              </code>
              <CopyButton text={p.tracking_id} label="Copy" />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

          {/* 2. Tracking Code */}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h2 style={{ fontSize: "1.2rem", margin: 0, color: "#ffffff" }}>
                1. Tracking Code
              </h2>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "0.25rem 0.65rem",
                  borderRadius: "999px",
                  background: leads.length > 0 ? "rgba(62, 207, 142, 0.15)" : "rgba(245, 158, 11, 0.15)",
                  color: leads.length > 0 ? "#3ecf8e" : "#f59e0b",
                }}
              >
                {leads.length > 0 ? "✓ Active (Submissions Captured)" : "Pending First Submission"}
              </span>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: 1.5 }}>
              Paste this snippet into your website HTML template right before the closing <code>&lt;/head&gt;</code> tag on every page.
            </p>
            <div className="code-block" style={{ margin: 0 }}>
              <div className="code-block-header">
                <span className="code-block-label">HTML Script Tag</span>
                <CopyButton text={installSnippet} label="Copy Snippet" />
              </div>
              <pre id="install-snippet" className="code-pre">{installSnippet}</pre>
            </div>
          </div>

          {/* 3. Hidden Field Reference */}
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
            <h2 style={{ fontSize: "1.2rem", margin: "0 0 0.5rem 0", color: "#ffffff" }}>
              2. Form Hidden Fields Reference
            </h2>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Add these 6 hidden fields to any web form (Gravity Forms, HubSpot Forms, Webflow, Typeform, or standard HTML). When a visitor arrives, Sorget automatically writes their attribution into these fields.
            </p>
            <div className="table-container" style={{ margin: 0 }}>
              <table className="leads-table">
                <thead>
                  <tr>
                    <th style={{ width: "220px" }}>Field Name</th>
                    <th>Attribution Dimension</th>
                    <th>Example Values</th>
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
                      <td style={{ fontWeight: 500, color: "#ffffff" }}>{field.label}</td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>{field.example}</td>
                      <td style={{ textAlign: "right" }}>
                        <CopyButton text={field.name} label="Copy" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Integration Status */}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", margin: "0 0 0.25rem 0", color: "#ffffff" }}>
                  3. Integration Status
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
                  Connected destinations receiving attribution data from this website.
                </p>
              </div>
              <Link
                href={`/dashboard/projects/${p.id}/integrations`}
                className="btn btn-ghost btn-sm"
                style={{ textDecoration: "none", fontSize: "0.8125rem" }}
              >
                Manage Integrations →
              </Link>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
              {/* HubSpot Status */}
              <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "1.25rem", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>🟠</span>
                    <strong style={{ color: "#ffffff" }}>HubSpot CRM</strong>
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: isHubSpotConnected ? "#3ecf8e" : "var(--text-muted)" }}>
                    {isHubSpotConnected ? "✓ Connected" : "Not Connected"}
                  </span>
                </div>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: 0 }}>
                  {isHubSpotConnected ? "Syncing contacts with channel and campaign properties." : "Connect to auto-enrich HubSpot contacts."}
                </p>
              </div>

              {/* Webhooks Status */}
              <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "1.25rem", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>⚡</span>
                    <strong style={{ color: "#ffffff" }}>Outbound Webhooks</strong>
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: (webhookCount ?? 0) > 0 ? "#3ecf8e" : "var(--text-muted)" }}>
                    {(webhookCount ?? 0) > 0 ? `✓ ${webhookCount} Active` : "None"}
                  </span>
                </div>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: 0 }}>
                  {(webhookCount ?? 0) > 0 ? "Dispatching signed HTTP POST payloads on submission." : "Receive real-time lead payloads in Zapier / Make."}
                </p>
              </div>
            </div>
          </div>

          {/* 5. Test Installation */}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", margin: "0 0 0.25rem 0", color: "#ffffff" }}>
                  4. Test Installation
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
                  Verify that your tracking snippet is installed and hidden fields are detected on your live pages.
                </p>
              </div>
              <Link
                href={`/dashboard/projects/${p.id}/debugger`}
                className="btn btn-primary btn-sm"
                id="test-installation-btn"
                style={{ textDecoration: "none" }}
              >
                🧪 Run Test Installation →
              </Link>
            </div>
          </div>

          {/* 6. Recent Submission Verification Log */}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", margin: "0 0 0.25rem 0", color: "#ffffff" }}>
                  5. Recent Submissions (Verification Log)
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", margin: 0 }}>
                  Inspection log of recent submissions captured on {p.name}. Use this strictly for verification.
                </p>
              </div>
              {leads.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <a
                    href={`/api/projects/${p.id}/export?format=csv`}
                    className="btn btn-secondary btn-sm"
                    style={{ textDecoration: "none", fontSize: "0.8125rem" }}
                  >
                    Export CSV
                  </a>
                  <a
                    href={`/api/projects/${p.id}/export?format=json`}
                    className="btn btn-ghost btn-sm"
                    style={{ textDecoration: "none", fontSize: "0.8125rem" }}
                  >
                    Export JSON
                  </a>
                </div>
              )}
            </div>

            {leads.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem 1rem", background: "rgba(255, 255, 255, 0.02)", borderRadius: "8px" }}>
                <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.875rem" }}>
                  No submissions recorded yet for this website.
                </p>
                <p style={{ color: "var(--text-muted)", margin: "0.25rem 0 0 0", fontSize: "0.8125rem" }}>
                  Install the script tag above and submit a form on your website to verify attribution capture.
                </p>
              </div>
            ) : (
              <div className="table-container" style={{ margin: 0 }}>
                <table className="leads-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Channel</th>
                      <th>Source</th>
                      <th>Medium</th>
                      <th>GCLID</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id}>
                        <td style={{ fontWeight: 500 }}>{lead.name ?? "—"}</td>
                        <td style={{ color: "var(--text-secondary)" }}>{lead.email ?? "—"}</td>
                        <td>
                          <span className={channelBadgeClass(lead.channel)}>
                            {lead.channel ?? "—"}
                          </span>
                        </td>
                        <td>{lead.source ?? "—"}</td>
                        <td>{lead.medium ?? "—"}</td>
                        <td
                          style={{
                            fontFamily: "monospace",
                            fontSize: "0.75rem",
                            color: "#3ecfcf",
                          }}
                        >
                          {lead.gclid ? lead.gclid.slice(0, 16) + "…" : "—"}
                        </td>
                        <td style={{ whiteSpace: "nowrap", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                          {formatDate(lead.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}