import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/app/actions/projects";
import MainNavigation from "@/app/components/MainNavigation";
import styles from "../../Page.module.css";

export const metadata = {
  title: "Add Website — Sorget",
  description: "Track a new website and generate its unique tracking snippet.",
};

import { canAddWebsite, PLANS } from "@/lib/billing";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewProjectPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const errorMsg = params.error;

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { data: memberRows } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name, slug)")
    .eq("user_id", user.id);

  const userWorkspaces = (memberRows ?? [])
    .filter((r: any) => r.workspaces)
    .map((r: any) => ({ id: r.workspaces.id, name: r.workspaces.name, slug: r.workspaces.slug, role: r.role }));

  const activeWsId = userWorkspaces[0]?.id;

  const { data: allProjects } = await supabase
    .from("projects")
    .select("id, name")
    .order("created_at", { ascending: true });

  const projectList = allProjects ?? [];

  // Check workspace subscription and current website limit
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, plan_id, status")
    .eq("workspace_id", activeWsId)
    .single();

  const activePlanKey = sub?.plan || sub?.plan_id || "starter";
  const planConfig = PLANS[activePlanKey] || PLANS.starter;
  const isAllowed = canAddWebsite(activePlanKey, projectList.length);
  const maxWebsites = planConfig.websiteLimit || 1;

  return (
    <div className={styles.layout}>
      <MainNavigation
        userEmail={user.email}
        workspaces={userWorkspaces}
        projects={projectList}
      />

      <main className={styles.main} style={{ maxWidth: "600px" }}>
        <Link href="/dashboard" className={styles.backLink}>← Back to Websites</Link>

        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Add New Website</h1>
          <p className={styles.pageSubtitle}>Generate a unique tracking snippet and ID for your website.</p>
        </div>

        {errorMsg && <div className={styles.alertError}><span>⚠️</span><span>{errorMsg}</span></div>}

        {!isAllowed ? (
          <div className={styles.card} style={{ borderLeft: "4px solid #BB0C68" }}>
            <h2 className={styles.cardTitle} style={{ color: "#3A313C", marginBottom: "0.5rem" }}>
              Website Limit Reached
            </h2>
            <p style={{ color: "#4b5563", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1.25rem" }}>
              Your current <strong>{planConfig.name}</strong> plan supports up to {maxWebsites} {maxWebsites === 1 ? "website" : "websites"}.
              You are currently tracking {projectList.length} {projectList.length === 1 ? "website" : "websites"}.
              Upgrade your plan to track additional websites.
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <Link href="/planning" className={styles.btnPrimary} style={{ textDecoration: "none" }}>
                Upgrade Plan →
              </Link>
              <Link href="/dashboard" className={styles.btnSecondary} style={{ textDecoration: "none" }}>
                Return to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className={styles.card}>
            <form action={createProject} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className={styles.formGroup}>
                <label className={styles.inputLabel} htmlFor="new-proj-name">Website Name *</label>
                <input id="new-proj-name" name="name" type="text" placeholder="e.g. Acme SaaS" required autoFocus className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.inputLabel} htmlFor="new-proj-website">Website URL (optional)</label>
                <input id="new-proj-website" name="website" type="text" placeholder="https://example.com" className={styles.input} />
                <span className={styles.muted} style={{ marginTop: "0.2rem" }}>Primary domain where tracking will be installed.</span>
              </div>
              <button id="create-project-submit" type="submit" className={styles.btnPrimary} style={{ width: "100%", justifyContent: "center" }}>
                Add Website &amp; Generate Snippet →
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
