import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultWorkspace } from "@/lib/workspaces";
import CopyButton from "@/app/components/CopyButton";
import MainNavigation from "@/app/components/MainNavigation";
import styles from "../../Page.module.css";

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
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
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

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const [
    { data: memberRows },
    { data: allProjects },
    { count: webhookCount },
    { data: leadsRaw, error: leadsError },
  ] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("role, workspaces(id, name, slug)")
      .eq("user_id", user.id),
    supabase
      .from("projects")
      .select("id, workspace_id, name, website, tracking_id, user_id, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("webhooks")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
    supabase
      .from("leads")
      .select("id, name, email, channel, source, medium, campaign, content, term, gclid, gbraid, gad_campaignid, gad_source, referrer, landing_url, landing_page, created_at, project_id")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const project = (allProjects ?? []).find((proj) => proj.id === projectId && proj.user_id === user.id);
  if (!project) notFound();
  const p = project as Project;

  const userWorkspaces = (memberRows ?? [])
    .filter((r: any) => r.workspaces)
    .map((r: any) => ({ id: r.workspaces.id, name: r.workspaces.name, slug: r.workspaces.slug, role: r.role }));

  if (!p.workspace_id) {
    const ws = await getOrCreateDefaultWorkspace(supabase, user.id, user.email, user.user_metadata?.full_name);
    await supabase.from("projects").update({ workspace_id: ws.id }).eq("id", p.id);
    p.workspace_id = ws.id;
  }

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

  const leads: Lead[] = leadsRaw ?? [];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const scriptSrc = siteUrl ? `${siteUrl}/attributer.js` : "/attributer.js";
  const installSnippet = `<script src="${scriptSrc}" data-tracking-id="${p.tracking_id}"></script>`;

  return (
    <div className={styles.layout}>
      <MainNavigation
        userEmail={user.email}
        workspaces={userWorkspaces}
        activeWorkspaceId={p.workspace_id || undefined}
        projects={allProjects ?? []}
        activeProjectId={p.id}
      />

      <main className={styles.main}>
        {sp.error && <div className={styles.alertError}><span>⚠️</span><span>{sp.error}</span></div>}
        {sp.success && <div className={styles.alertSuccess}><span>✓</span><span>{sp.success}</span></div>}
        {leadsError && <div className={styles.alertError}><span>⚠️</span><span>Failed to load verification log: {leadsError.message}</span></div>}

        <Link href="/dashboard" className={styles.backLink}>← Back to Websites</Link>

        {/* Website Header */}
        <div className={styles.card} style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 className={styles.pageTitle} style={{ marginBottom: "0.25rem" }}>{p.name}</h1>
              {p.website ? (
                <a href={p.website} target="_blank" rel="noopener noreferrer" style={{ color: "#BB0C68", textDecoration: "none", fontSize: "calc(.25rem * 4)", fontWeight: 500 }}>
                  {p.website} ↗
                </a>
              ) : (
                <span className={styles.muted}>No URL specified</span>
              )}

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <Link
                  href={`/dashboard/projects/${p.id}`}
                  className={`${styles.btnSecondary} ${styles.btnSmall}`}
                  style={{ background: "#f3f4f6", fontWeight: 700, color: "#111827" }}
                >
                  Overview
                </Link>
                <Link
                  href={`/dashboard/projects/${p.id}/integrations`}
                  className={`${styles.btnSecondary} ${styles.btnSmall}`}
                >
                  Integrations
                </Link>
                <Link
                  href={`/dashboard/projects/${p.id}/leads`}
                  className={`${styles.btnSecondary} ${styles.btnSmall}`}
                >
                  Leads ({leads.length})
                </Link>
              </div>
            </div>
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.35rem" }}>
              <span className={styles.muted} style={{ fontSize: "calc(.25rem * 3)", textTransform: "uppercase", fontWeight: 600 }}>Tracking ID</span>
              <div className={styles.row}>
                <span className={styles.trackingId}>{p.tracking_id}</span>
                <CopyButton text={p.tracking_id} label="Copy" />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.cards}>
          {/* 1. Tracking Script */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>1. Tracking Script</h2>
              <span className={leads.length > 0 ? styles.badgeDone : styles.badgePending}>
                {leads.length > 0 ? "✓ Verified Active" : "Pending First Submission"}
              </span>
            </div>
            <p className={styles.cardSubtitle}>
              Paste this snippet into your HTML template before the closing <code>&lt;/head&gt;</code> tag on every page.
            </p>
            <div className={styles.codeBox}>
              <pre className={styles.codeText}>{installSnippet}</pre>
              <CopyButton text={installSnippet} className={styles.copyBtn} />
            </div>
          </div>

          {/* 2. Hidden Fields Reference */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle} style={{ marginBottom: "0.5rem" }}>2. Form Hidden Fields Reference</h2>
            <p className={styles.cardSubtitle}>
              Add these 6 hidden fields to any web form. Sorget automatically populates them with attribution source values.
            </p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: "25%" }}>Field Name</th>
                    <th style={{ width: "25%" }}>Captures</th>
                    <th style={{ width: "35%" }}>Example Values</th>
                    <th style={{ width: "15%", textAlign: "right" }}>Copy</th>
                  </tr>
                </thead>
                <tbody>
                  {HIDDEN_FIELDS.map((field) => (
                    <tr key={field.name}>
                      <td>
                        <code style={{ background: "#f3f4f6", color: "#3A313C", padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
                          {field.name}
                        </code>
                      </td>
                      <td style={{ fontWeight: 500, color: "#3A313C" }}>{field.label}</td>
                      <td className={styles.muted} style={{ fontSize: "0.75rem" }}>{field.example}</td>
                      <td style={{ textAlign: "right" }}>
                        <CopyButton text={field.name} label="Copy" id={`copy-f-${field.name}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Integrations & Testing */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>3. Integrations &amp; Testing</h2>
                <p className={styles.muted} style={{ marginTop: "4px" }}>Connected destinations receiving attribution data from this website.</p>
              </div>
              <div className={styles.row}>
                <Link href={`/dashboard/projects/${p.id}/debugger`} className={styles.btnSecondary}>Run Test →</Link>
                <Link href={`/dashboard/projects/${p.id}/integrations`} className={styles.btnSecondary}>Manage Integrations →</Link>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
              <div className={styles.subBox}>
                <div className={styles.row} style={{ justifyContent: "space-between", marginBottom: "0.35rem" }}>
                  <div className={styles.row}><span>🟠</span><strong style={{ fontSize: "calc(.25rem * 4)", color: "#3A313C" }}>HubSpot CRM</strong></div>
                  <span className={isHubSpotConnected ? styles.badgeDone : styles.badgePending}>{isHubSpotConnected ? "Connected" : "Not Connected"}</span>
                </div>
                <p className={styles.muted}>{isHubSpotConnected ? "Syncing contacts with channel and campaign properties." : "Connect HubSpot to auto-enrich contacts."}</p>
              </div>
              <div className={styles.subBox}>
                <div className={styles.row} style={{ justifyContent: "space-between", marginBottom: "0.35rem" }}>
                  <div className={styles.row}><span>⚡</span><strong style={{ fontSize: "calc(.25rem * 4)", color: "#3A313C" }}>Outbound Webhooks</strong></div>
                  <span className={(webhookCount ?? 0) > 0 ? styles.badgeDone : styles.badgePending}>{(webhookCount ?? 0) > 0 ? `${webhookCount} Active` : "None"}</span>
                </div>
                <p className={styles.muted}>{(webhookCount ?? 0) > 0 ? "Dispatching signed HTTP POST payloads." : "Configure webhooks for Zapier / Make."}</p>
              </div>
            </div>
          </div>

          {/* 4. Submissions Log */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>Recent Submissions</h2>
                <p className={styles.muted} style={{ marginTop: "4px" }}>Last 50 captured submissions for {p.name}.</p>
              </div>
              {leads.length > 0 && (
                <div className={styles.row}>
                  <a href={`/api/projects/${p.id}/export?format=csv`} className={styles.btnSecondary}>Export CSV</a>
                  <a href={`/api/projects/${p.id}/export?format=json`} className={styles.btnSecondary}>Export JSON</a>
                </div>
              )}
            </div>

            {leads.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyStateTitle}>No submissions recorded yet</p>
                <p className={styles.emptyStateText}>Install the script tag above and submit a form on your website to verify attribution capture.</p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th><th>Email</th><th>Channel</th><th>Source</th><th>Medium</th><th>GCLID</th><th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id}>
                        <td style={{ fontWeight: 500 }}>{lead.name ?? "—"}</td>
                        <td className={styles.muted}>{lead.email ?? "—"}</td>
                        <td><span className={channelBadgeClass(lead.channel)}>{lead.channel ?? "—"}</span></td>
                        <td>{lead.source ?? "—"}</td>
                        <td>{lead.medium ?? "—"}</td>
                        <td>{lead.gclid ? <code style={{ fontSize: "0.75rem" }}>{lead.gclid.slice(0, 14)}…</code> : "—"}</td>
                        <td style={{ whiteSpace: "nowrap", fontSize: "0.75rem" }} className={styles.muted}>{formatDate(lead.created_at)}</td>
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
