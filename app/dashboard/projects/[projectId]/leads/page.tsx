import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MainNavigation from "@/app/components/MainNavigation";
import styles from "../../../Page.module.css";

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

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return {
    title: `Leads & Attribution — Sorget`,
    description: `Tracked attribution leads for website ${projectId}`,
  };
}

export default async function ProjectLeadsPage({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const [
    { data: memberRows },
    { data: allProjects },
    { data: leadsRaw, error: leadsError },
  ] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("role, workspaces(id, name, slug)")
      .eq("user_id", user.id),
    supabase
      .from("projects")
      .select("id, name, website, tracking_id, workspace_id, user_id, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("leads")
      .select(
        "id, name, email, channel, source, medium, campaign, content, term, gclid, gbraid, gad_campaignid, gad_source, referrer, landing_url, landing_page, created_at, project_id"
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const projectList = allProjects ?? [];
  const project = projectList.find((p) => p.id === projectId);
  if (!project) notFound();

  const userWorkspaces = (memberRows ?? [])
    .filter((r: any) => r.workspaces)
    .map((r: any) => ({
      id: r.workspaces.id,
      name: r.workspaces.name,
      slug: r.workspaces.slug,
      role: r.role,
    }));

  const isOwner = project.user_id === user.id;
  const isMember = userWorkspaces.some((w) => w.id === project.workspace_id);
  if (!isOwner && !isMember) notFound();

  const leads: Lead[] = leadsRaw ?? [];

  return (
    <div className={styles.layout}>
      <MainNavigation
        userEmail={user.email}
        workspaces={userWorkspaces}
        activeWorkspaceId={project.workspace_id || undefined}
        projects={projectList}
        activeProjectId={project.id}
      />

      <main className={styles.main}>
        {sp.error && <div className={styles.alertError}><span>⚠️</span><span>{sp.error}</span></div>}
        {sp.success && <div className={styles.alertSuccess}><span>✓</span><span>{sp.success}</span></div>}
        {leadsError && <div className={styles.alertError}><span>⚠️</span><span>Failed to load leads: {leadsError.message}</span></div>}

        <div className={styles.pageHeaderRow}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <Link href={`/dashboard/projects/${project.id}`} className={styles.backLink} style={{ margin: 0 }}>
                ← {project.name}
              </Link>
            </div>
            <h1 className={styles.pageTitle}>Captured Leads</h1>
            <p className={styles.pageSubtitle}>
              Attribution sources and touchpoint logs captured for {project.name}.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link href={`/dashboard/projects/${project.id}`} className={styles.btnSecondary}>
              Website Overview
            </Link>
            <Link href={`/dashboard/projects/${project.id}/integrations`} className={styles.btnSecondary}>
              Integrations
            </Link>
          </div>
        </div>

        {/* Lead Summary Stats */}
        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Total Leads Captured</p>
            <p className={styles.statValue}>{leads.length}</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Channels Detected</p>
            <p className={styles.statValue}>
              {[...new Set(leads.map((l) => l.channel).filter(Boolean))].length}
            </p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Paid Click IDs (GCLID)</p>
            <p className={styles.statValue}>
              {leads.filter((l) => l.gclid).length}
            </p>
          </div>
        </div>

        {/* Leads Table */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Attribution Log</h2>
              <p className={styles.cardSubtitle} style={{ marginBottom: 0 }}>
                Every form submission with first-touch and UTM parameters.
              </p>
            </div>
            {leads.length > 0 && <span className={styles.muted}>{leads.length} submissions</span>}
          </div>

          {leads.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>📋</div>
              <h3 className={styles.emptyStateTitle}>No leads captured yet for this website</h3>
              <p className={styles.emptyStateText}>
                Once visitors submit forms containing Sorget hidden fields, full source, campaign, and landing page details appear here.
              </p>
              <div className={styles.row} style={{ justifyContent: "center" }}>
                <Link href={`/dashboard/projects/${project.id}`} className={styles.btnPrimary}>
                  View Tracking Snippet &amp; Fields
                </Link>
              </div>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name / Email</th>
                    <th>Channel</th>
                    <th>Source / Medium</th>
                    <th>Campaign</th>
                    <th>Landing Page</th>
                    <th>GCLID</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "#3A313C" }}>{lead.name ?? "—"}</div>
                        <div style={{ fontSize: "0.75rem", color: "#717680" }}>{lead.email ?? "—"}</div>
                      </td>
                      <td>
                        <span className={channelBadgeClass(lead.channel)}>
                          {lead.channel ?? "Direct"}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: "#3A313C" }}>{lead.source ?? "—"}</div>
                        <div style={{ fontSize: "0.75rem", color: "#717680" }}>{lead.medium ?? "—"}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.8rem", color: "#3A313C" }}>
                          {lead.campaign ?? "—"}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.75rem", color: "#4b5563" }} title={lead.landing_url ?? ""}>
                          {lead.landing_page ?? lead.landing_url ?? "—"}
                        </span>
                      </td>
                      <td>
                        {lead.gclid ? (
                          <code style={{ fontSize: "0.75rem", color: "#717680" }}>
                            {lead.gclid.slice(0, 14)}…
                          </code>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ whiteSpace: "nowrap", fontSize: "0.75rem", color: "#717680" }}>
                        {formatDate(lead.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
