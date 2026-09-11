import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { sortProjectsCanonically } from "@/lib/projects";
import CopyButton from "@/app/components/CopyButton";
import MainNavigation from "@/app/components/MainNavigation";
import styles from "./Page.module.css";

export const metadata = {
  title: "Dashboard — Sorget",
  description: "Overview of your tracked websites, attribution metrics, and captured leads.",
};

interface Project {
  id: string;
  name: string;
  website: string | null;
  tracking_id: string;
  created_at: string;
  lead_count?: number;
}

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  channel: string | null;
  source: string | null;
  medium: string | null;
  gclid: string | null;
  created_at: string;
  project_id: string | null;
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

interface PageProps {
  searchParams: Promise<{ error?: string; success?: string; workspace?: string }>;
}

export default async function DashboardWebsitesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const errorMsg = params.error;
  const successMsg = params.success;
  const selectedWsId = params.workspace;

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const [
    { data: memberRows },
    { data: projects, error: projectsError },
    { data: leads, error: leadsError },
  ] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("role, workspaces(id, name, slug)")
      .eq("user_id", user.id),
    supabase
      .from("projects")
      .select("id, name, website, tracking_id, created_at")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("leads")
      .select("id, name, email, channel, source, medium, gclid, created_at, project_id")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const userWorkspaces = (memberRows ?? [])
    .filter((r: any) => r.workspaces)
    .map((r: any) => ({ id: r.workspaces.id, name: r.workspaces.name, slug: r.workspaces.slug, role: r.role }));

  const projectList: Project[] = sortProjectsCanonically(
    (projects ?? []).map((p) => ({
      ...p,
      lead_count: (leads ?? []).filter((l) => l.project_id === p.id).length,
    }))
  );

  // Target User Flow: users without a tracked website must complete onboarding first
  if (projectList.length === 0) {
    redirect("/onboarding");
  }

  const leadList: Lead[] = leads ?? [];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const scriptSrc = siteUrl ? `${siteUrl}/attributer.js` : "/attributer.js";

  const totalLeads = leadList.length;
  const activeProjects = projectList.filter((p) => (p.lead_count ?? 0) > 0).length;
  const channels = [...new Set(leadList.map((l) => l.channel).filter(Boolean))].length;

  return (
    <div className={styles.layout}>
      <MainNavigation
        userEmail={user.email}
        workspaces={userWorkspaces}
        activeWorkspaceId={selectedWsId}
        projects={projectList}
      />

      <main className={styles.main}>
        {errorMsg && <div className={styles.alertError}><span>⚠️</span><span>{errorMsg}</span></div>}
        {successMsg && <div className={styles.alertSuccess}><span>✓</span><span>{successMsg}</span></div>}
        {projectsError && <div className={styles.alertError}><span>⚠️</span><span>Failed to load websites: {projectsError.message}</span></div>}
        {leadsError && <div className={styles.alertError}><span>⚠️</span><span>Failed to load submissions: {leadsError.message}</span></div>}

        <div className={styles.pageHeaderRow}>
          <div>
            <h1 className={styles.pageTitle}>Dashboard</h1>
            <p className={styles.pageSubtitle}>Track attribution across your domains.</p>
          </div>
          <Link href="/dashboard/projects/new" className={styles.btnPrimary}>+ Add Website</Link>
        </div>

        {/* Stat Cards */}
        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Tracked Websites</p>
            <p className={styles.statValue}>{projectList.length}</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Submissions Captured</p>
            <p className={styles.statValue}>{totalLeads}</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Channels Detected</p>
            <p className={styles.statValue}>{channels}</p>
          </div>
        </div>

        <div className={styles.cards}>
          {/* Websites Table */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Your Websites</h2>
              {projectList.length > 0 && <span className={styles.muted}>{projectList.length} {projectList.length === 1 ? "site" : "sites"}</span>}
            </div>

            {projectList.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>🌐</div>
                <h3 className={styles.emptyStateTitle}>No websites tracked yet</h3>
                <p className={styles.emptyStateText}>Add your first domain to generate a tracking snippet and start capturing visitor sources.</p>
                <div className={styles.row} style={{ justifyContent: "center" }}>
                  <Link href="/dashboard/projects/new" className={styles.btnPrimary}>Add Website</Link>
                </div>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: "28%" }}>Website</th>
                      <th style={{ width: "32%" }}>Tracking Snippet</th>
                      <th style={{ width: "18%" }}>Status</th>
                      <th style={{ width: "22%", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectList.map((project) => {
                      const snippet = `<script src="${scriptSrc}" data-tracking-id="${project.tracking_id}"></script>`;
                      const hasSubmissions = (project.lead_count ?? 0) > 0;
                      return (
                        <tr key={project.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: "#3A313C" }}>{project.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "#717680", marginTop: "2px" }}>{project.website ?? "All domains"}</div>
                          </td>
                          <td>
                            <div className={styles.row}>
                              <span className={styles.trackingId} title={project.tracking_id}>{project.tracking_id}</span>
                              <CopyButton text={snippet} label="Copy" id={`copy-${project.id}`} />
                            </div>
                          </td>
                          <td>
                            {hasSubmissions ? (
                              <span className={styles.badgeDone}>✓ {project.lead_count} {project.lead_count === 1 ? "lead" : "leads"}</span>
                            ) : (
                              <span className={styles.badgePending}>Awaiting traffic</span>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <Link href={`/dashboard/projects/${project.id}`} className={`${styles.btnSecondary} ${styles.btnSmall}`}>Configure</Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Submissions */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>Recent Submissions</h2>
                <p className={styles.cardSubtitle} style={{ marginBottom: 0 }}>Last 50 captured submissions with attribution data.</p>
              </div>
              {leadList.length > 0 && <span className={styles.muted}>{leadList.length} entries</span>}
            </div>

            {leadList.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>📋</div>
                <h3 className={styles.emptyStateTitle}>No submissions yet</h3>
                <p className={styles.emptyStateText}>Submissions appear here once your forms include hidden attribution fields and visitors submit them.</p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
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
                    {leadList.map((lead) => (
                      <tr key={lead.id}>
                        <td style={{ fontWeight: 500 }}>{lead.name ?? "—"}</td>
                        <td style={{ color: "#717680" }}>{lead.email ?? "—"}</td>
                        <td><span className={channelBadgeClass(lead.channel)}>{lead.channel ?? "—"}</span></td>
                        <td>{lead.source ?? "—"}</td>
                        <td>{lead.medium ?? "—"}</td>
                        <td>
                          {lead.gclid ? (
                            <code style={{ fontSize: "0.75rem", color: "#717680" }}>{lead.gclid.slice(0, 14)}…</code>
                          ) : "—"}
                        </td>
                        <td style={{ whiteSpace: "nowrap", fontSize: "0.75rem", color: "#717680" }}>{formatDate(lead.created_at)}</td>
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
