import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MainNavigation from "@/app/components/MainNavigation";
import styles from "../../../Page.module.css";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export const metadata = {
  title: "Test Installation — Sorget",
  description: "Test your installation and simulate attribution outcomes.",
};

export default async function DebuggerPage({ params }: PageProps) {
  const { projectId: id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: project, error },
    { data: memberRows },
    { data: allProjects },
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),
    supabase.from("workspace_members").select("role, workspaces(id, name, slug)").eq("user_id", user.id),
    supabase.from("projects").select("id, name, created_at").order("created_at", { ascending: true }).order("id", { ascending: true }),
  ]);

  if (error || !project) redirect("/dashboard");

  const userWorkspaces = (memberRows ?? [])
    .filter((r: any) => r.workspaces)
    .map((r: any) => ({ id: r.workspaces.id, name: r.workspaces.name, slug: r.workspaces.slug, role: r.role }));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const scriptSrc = siteUrl ? `${siteUrl}/attributer.js` : "/attributer.js";
  const snippet = `<script src="${scriptSrc}" data-tracking-id="${project.tracking_id}"></script>`;

  return (
    <div className={styles.layout}>
      <MainNavigation
        userEmail={user.email}
        workspaces={userWorkspaces}
        activeWorkspaceId={project.workspace_id || undefined}
        projects={allProjects ?? []}
        activeProjectId={project.id}
        activeProjectName={project.name}
        activeProjectHref={`/dashboard/projects/${project.id}`}
      />

      <main className={styles.main}>
        <Link href={`/dashboard/projects/${project.id}`} className={styles.backLink}>← Back to {project.name}</Link>

        <div className={styles.pageHeaderRow}>
          <div>
            <h1 className={styles.pageTitle}>Test Installation</h1>
            <p className={styles.pageSubtitle}>Verify tracking snippet detection and simulate real-time attribution capture for {project.name}.</p>
          </div>
          <span className={styles.trackingId}>{project.tracking_id}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
          {/* Card 1: Snippet Verification */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle} style={{ marginBottom: "0.5rem" }}>1. Installation Script Tag</h2>
            <p className={styles.cardSubtitle}>
              Verify this script tag is present before the closing <code>&lt;/head&gt;</code> tag:
            </p>
            <div className={styles.codeDark} style={{ marginBottom: "1.25rem" }}>{snippet}</div>

            <h3 style={{ fontSize: "calc(.25rem * 5)", fontWeight: 700, color: "#3A313C", marginBottom: "0.35rem" }}>Verify Website Tag</h3>
            <p className={styles.muted} style={{ marginBottom: "0.5rem" }}>Check whether the Sorget script is running on your domain.</p>
            <div className={styles.row}>
              <input
                id="verify-url-input"
                type="text"
                defaultValue={project.website || ""}
                placeholder="https://example.com"
                className={styles.input}
                style={{ flex: 1 }}
              />
              <button id="btn-run-verify" className={styles.btnPrimary}>Verify Tag</button>
            </div>
            <div id="verify-result-box" style={{ marginTop: "0.75rem", fontSize: "calc(.25rem * 4)" }} />
          </div>

          {/* Card 2: Attribution Simulator */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle} style={{ marginBottom: "0.5rem" }}>2. Attribution Simulator</h2>
            <p className={styles.cardSubtitle}>
              Simulate a landing URL to inspect the exact attribution fields Sorget writes into form hidden fields:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div>
                <label className={styles.inputLabel}>Simulation URL / Query</label>
                <input
                  id="sim-url-input"
                  type="text"
                  defaultValue="https://mysite.com/?utm_source=google&utm_medium=cpc&utm_campaign=summer_promo&gclid=test_gclid_123"
                  className={styles.input}
                  style={{ marginTop: "0.2rem" }}
                />
              </div>
              <button id="btn-run-sim" className={styles.btnSecondary} style={{ alignSelf: "flex-start" }}>Simulate Attribution</button>
            </div>

            <div id="sim-result-box" className={styles.codeDark} style={{ lineHeight: 1.6 }}>
              <div>Channel: <strong style={{ color: "#ffffff" }}>Paid Search</strong></div>
              <div>Source: google</div>
              <div>Medium: cpc</div>
              <div>Campaign: summer_promo</div>
              <div>GCLID: test_gclid_123</div>
              <div>Drilldown 1: google</div>
              <div>Drilldown 2: summer_promo</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
