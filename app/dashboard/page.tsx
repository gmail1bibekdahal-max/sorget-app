import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/app/actions/projects";
import CopyButton from "@/app/components/CopyButton";
import MainNavigation from "@/app/components/MainNavigation";

export const metadata = {
  title: "Websites — Sorget",
  description: "Manage your tracked websites and verify incoming attribution submissions.",
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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Fetch workspaces for this user
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
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, name, website, tracking_id, created_at")
    .order("created_at", { ascending: false });

  // Fetch recent leads strictly as a verification log
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, name, email, channel, source, medium, gclid, created_at, project_id")
    .order("created_at", { ascending: false })
    .limit(50);

  const projectList: Project[] = (projects ?? []).map((p) => ({
    ...p,
    lead_count: (leads ?? []).filter((l) => l.project_id === p.id).length,
  }));

  const leadList: Lead[] = leads ?? [];

  return (
    <div className="dashboard-layout" style={{ minHeight: "100vh" }}>
      <MainNavigation
        userEmail={user.email}
        workspaces={userWorkspaces}
        activeWorkspaceId={selectedWsId}
      />

      <main className="dashboard-main" style={{ maxWidth: "1100px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {/* Banners */}
        {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
        {successMsg && <div className="alert alert-success">{successMsg}</div>}
        {projectsError && (
          <div className="alert alert-error">
            Failed to load websites: {projectsError.message}
          </div>
        )}
        {leadsError && (
          <div className="alert alert-error">
            Failed to load verification log: {leadsError.message}
          </div>
        )}

        {/* Section Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.875rem", fontWeight: 700, margin: "0 0 0.25rem 0" }}>
              Websites
            </h1>
            <p style={{ color: "var(--text-secondary, #94a3b8)", margin: 0, fontSize: "0.95rem" }}>
              Tracked domains where Sorget captures visitor attribution.
            </p>
          </div>
          <Link
            href="/dashboard/projects/new"
            className="btn btn-primary btn-sm"
            id="new-project-btn"
            style={{ textDecoration: "none" }}
          >
            + Add Website
          </Link>
        </div>

        {/* Quick Add Website Card */}
        <div
          className="card"
          style={{
            maxWidth: "100%",
            marginBottom: "2.5rem",
            padding: "1.5rem",
            background: "var(--color-card, #1a1a26)",
            border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
            borderRadius: "12px",
          }}
        >
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem", color: "#3ecfcf" }}>
            Quick Add Website
          </h2>
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
              <label htmlFor="proj-name" style={{ fontSize: "0.8125rem" }}>Website Name *</label>
              <input
                id="proj-name"
                name="name"
                type="text"
                placeholder="e.g. Acme Marketing"
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="proj-website" style={{ fontSize: "0.8125rem" }}>Website URL (optional)</label>
              <input
                id="proj-website"
                name="website"
                type="text"
                placeholder="https://example.com"
              />
            </div>
            <button
              id="create-project-submit"
              type="submit"
              className="btn btn-primary"
              style={{ height: "42px" }}
            >
              Add Website
            </button>
          </form>
        </div>

        {/* Websites List */}
        {projectList.length === 0 ? (
          <div className="empty-state" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
            <div className="empty-state-icon" style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🌐</div>
            <h3 style={{ fontSize: "1.2rem", margin: "0 0 0.5rem 0", color: "#ffffff" }}>No websites tracked yet</h3>
            <p className="text-muted" style={{ fontSize: "0.875rem", maxWidth: "420px", margin: "0 auto 1.5rem auto" }}>
              Add your first website above, or launch the Getting Started guide for step-by-step installation instructions.
            </p>
            <Link
              href="/dashboard/getting-started"
              className="btn btn-primary btn-sm"
              style={{ textDecoration: "none" }}
            >
              🚀 Launch Getting Started Guide →
            </Link>
          </div>
        ) : (
          <div className="projects-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem", marginBottom: "3rem" }}>
            {projectList.map((project) => {
              const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
              const scriptSrc = siteUrl ? `${siteUrl}/attributer.js` : "/attributer.js";
              const snippet = `<script src="${scriptSrc}" data-tracking-id="${project.tracking_id}"></script>`;

              return (
                <div
                  key={project.id}
                  className="project-card"
                  style={{
                    background: "var(--color-card, #1a1a26)",
                    border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <div>
                        <div className="project-name" style={{ fontWeight: 600, fontSize: "1.05rem", color: "#ffffff" }}>
                          {project.name}
                        </div>
                        {project.website && (
                          <div className="project-meta" style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                            {project.website}
                          </div>
                        )}
                      </div>
                      <span
                        className="project-tracking-id"
                        style={{
                          fontSize: "0.75rem",
                          fontFamily: "monospace",
                          background: "rgba(62, 207, 207, 0.1)",
                          color: "#3ecfcf",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                        }}
                      >
                        {project.tracking_id}
                      </span>
                    </div>

                    {/* Script Snippet Box */}
                    <div
                      style={{
                        marginTop: "0.75rem",
                        background: "#090d16",
                        border: "1px solid var(--color-border)",
                        borderRadius: "6px",
                        padding: "0.6rem 0.75rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <code
                        style={{
                          fontSize: "0.725rem",
                          color: "#94a3b8",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginRight: "0.5rem",
                        }}
                      >
                        {snippet}
                      </code>
                      <CopyButton text={snippet} label="Copy" />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "1rem",
                      paddingTop: "0.75rem",
                      borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                        {project.lead_count} {project.lead_count === 1 ? "submission" : "submissions"}
                      </span>
                    </div>
                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      className="btn btn-ghost btn-sm"
                      id={`view-project-${project.id}`}
                      style={{ textDecoration: "none", fontSize: "0.8125rem" }}
                    >
                      Configure &amp; Log →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Submissions Verification Log */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0, color: "#ffffff" }}>
              Recent Submissions (Verification Log)
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", margin: "0.25rem 0 0 0" }}>
              Inspection log showing the last 50 captured submissions with full attribution parameters.
            </p>
          </div>
        </div>

        {leadList.length === 0 ? (
          <div className="empty-state" style={{ padding: "2.5rem 1rem", textAlign: "center" }}>
            <div className="empty-state-icon" style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎯</div>
            <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>No submissions recorded yet.</p>
            <p className="text-muted" style={{ marginTop: "0.25rem", fontSize: "0.8125rem" }}>
              Submissions appear here automatically once your website forms include the hidden fields and visitors convert.
            </p>
          </div>
        ) : (
          <div className="table-container" style={{ background: "var(--color-card, #1a1a26)", borderRadius: "10px", border: "1px solid var(--color-border)" }}>
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
                {leadList.map((lead) => (
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
      </main>
    </div>
  );
}
