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
    <div className="dashboard-layout">
      <MainNavigation
        userEmail={user.email}
        workspaces={userWorkspaces}
      />

      <main className="dashboard-main" style={{ maxWidth: "650px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <Link href="/dashboard" style={{ color: "var(--sorget-pink, #BB0C68)", fontSize: "0.875rem", textDecoration: "none", fontWeight: 500 }}>
            ← Back to Websites
          </Link>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.25rem 0", color: "var(--sorget-dark, #3A313C)" }}>
            Add New Website
          </h1>
          <p style={{ color: "var(--sorget-grey, #64748b)", margin: 0, fontSize: "0.95rem" }}>
            Generate a unique tracking ID and code snippet for your website.
          </p>
        </div>

        {errorMsg && <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>{errorMsg}</div>}

        <div className="card" style={{ maxWidth: "100%", padding: "2rem", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <form action={createProject} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="new-proj-name" style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--sorget-dark, #3A313C)" }}>
                Website Name *
              </label>
              <input id="new-proj-name" name="name" type="text" placeholder="e.g. Acme SaaS" required autoFocus />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="new-proj-website" style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--sorget-dark, #3A313C)" }}>
                Website URL (optional)
              </label>
              <input id="new-proj-website" name="website" type="text" placeholder="e.g. https://example.com" />
              <span className="text-muted" style={{ fontSize: "0.8rem", marginTop: "0.3rem", display: "block", color: "var(--sorget-grey, #64748b)" }}>
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