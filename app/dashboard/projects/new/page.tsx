import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/app/actions/projects";
import MainNavigation from "@/app/components/MainNavigation";

export const metadata = {
  title: "Add Website — Sorget",
  description: "Track a new website and generate its unique tracking snippet.",
};

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewProjectPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const errorMsg = params.error;

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

  return (
    <div className="dashboard-layout" style={{ minHeight: "100vh" }}>
      <MainNavigation
        userEmail={user.email}
        workspaces={userWorkspaces}
      />

      <main className="dashboard-main" style={{ maxWidth: "600px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <Link href="/dashboard" style={{ color: "var(--accent, #6366f1)", fontSize: "0.875rem", textDecoration: "none" }}>
            ← Back to Websites
          </Link>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.25rem 0", color: "#ffffff" }}>
            Add New Website
          </h1>
          <p style={{ color: "var(--text-secondary, #94a3b8)", margin: 0, fontSize: "0.95rem" }}>
            Generate a unique tracking ID and code snippet for your website.
          </p>
        </div>

        {errorMsg && <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>{errorMsg}</div>}

        <div className="card" style={{ maxWidth: "100%", padding: "2rem", background: "var(--color-card, #1a1a26)", border: "1px solid var(--color-border)", borderRadius: "14px" }}>
          <form action={createProject} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="new-proj-name" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                Website Name *
              </label>
              <input id="new-proj-name" name="name" type="text" placeholder="e.g. Acme SaaS" required autoFocus />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="new-proj-website" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                Website URL (optional)
              </label>
              <input id="new-proj-website" name="website" type="text" placeholder="e.g. https://example.com" />
              <span className="text-muted" style={{ fontSize: "0.8rem", marginTop: "0.3rem", display: "block" }}>
                Primary marketing domain where the tracking code will be installed.
              </span>
            </div>
            <button
              id="create-project-submit"
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", height: "42px", marginTop: "0.5rem" }}
            >
              Add Website &amp; Generate Snippet →
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}