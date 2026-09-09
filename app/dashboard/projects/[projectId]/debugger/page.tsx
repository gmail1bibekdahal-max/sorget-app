import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MainNavigation from "@/app/components/MainNavigation";

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
  if (!user) {
    redirect("/login");
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) {
    redirect("/dashboard");
  }

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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const scriptSrc = siteUrl ? `${siteUrl}/attributer.js` : "/attributer.js";
  const snippet = `<script src="${scriptSrc}" data-tracking-id="${project.tracking_id}"></script>`;

  return (
    <div className="dashboard-layout">
      <MainNavigation
        userEmail={user.email}
        workspaces={userWorkspaces}
        activeWorkspaceId={project.workspace_id || undefined}
      />

      <main className="dashboard-main" style={{ maxWidth: "1050px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <Link href={`/dashboard/projects/${project.id}`} style={{ color: "var(--sorget-pink, #BB0C68)", fontSize: "0.875rem", textDecoration: "none", fontWeight: 500 }}>
            ← Back to {project.name}
          </Link>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, color: "var(--sorget-dark, #3A313C)" }}>
              Test Installation
            </h1>
            <p style={{ color: "var(--sorget-grey, #64748b)", margin: "0.25rem 0 0 0", fontSize: "0.95rem" }}>
              Verify tracking snippet detection and simulate real-time attribution capture for {project.name}.
            </p>
          </div>
          <span
            style={{
              background: "rgba(187, 12, 104, 0.08)",
              color: "var(--sorget-pink, #BB0C68)",
              border: "1px solid rgba(187, 12, 104, 0.2)",
              fontFamily: "monospace",
              fontSize: "0.85rem",
              fontWeight: 600,
              padding: "0.35rem 0.75rem",
              borderRadius: "6px",
            }}
          >
            {project.tracking_id}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
          {/* Card 1: Snippet & Tag Verification */}
          <div className="card" style={{ maxWidth: "100%", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "1.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <h2 style={{ fontSize: "1.125rem", marginTop: 0, marginBottom: "0.75rem", color: "var(--sorget-dark, #3A313C)" }}>1. Installation Script Tag</h2>
            <p style={{ fontSize: "0.875rem", color: "var(--sorget-grey, #64748b)", marginBottom: "1rem" }}>
              Verify this script tag is present before the closing <code>&lt;/head&gt;</code> tag:
            </p>
            <pre
              style={{
                background: "#1e293b",
                padding: "1rem",
                borderRadius: "8px",
                fontSize: "0.8125rem",
                overflowX: "auto",
                color: "#38bdf8",
                fontFamily: "monospace",
                marginBottom: "1.25rem",
              }}
            >
              {snippet}
            </pre>

            <h3 style={{ fontSize: "0.9375rem", marginBottom: "0.5rem", color: "var(--sorget-dark, #3A313C)" }}>Verify Website Tag</h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--sorget-grey, #64748b)", marginBottom: "0.75rem" }}>
              Check whether Sorget script is running on your domain.
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                id="verify-url-input"
                type="text"
                defaultValue={project.website || ""}
                placeholder="https://example.com"
                style={{ flex: 1, padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", color: "var(--sorget-dark, #3A313C)", fontSize: "0.875rem" }}
              />
              <button
                id="btn-run-verify"
                className="btn btn-primary"
                style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
              >
                Verify Tag
              </button>
            </div>
            <div id="verify-result-box" style={{ marginTop: "1rem", fontSize: "0.875rem" }} />
          </div>

          {/* Card 2: Attribution Simulator */}
          <div className="card" style={{ maxWidth: "100%", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "1.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <h2 style={{ fontSize: "1.125rem", marginTop: 0, marginBottom: "0.75rem", color: "var(--sorget-dark, #3A313C)" }}>2. Attribution Simulator</h2>
            <p style={{ fontSize: "0.875rem", color: "var(--sorget-grey, #64748b)", marginBottom: "1rem" }}>
              Simulate a landing URL to inspect the exact attribution fields Sorget writes into form hidden fields:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8125rem", color: "var(--sorget-grey, #64748b)", fontWeight: 500 }}>Simulation URL / Query</label>
                <input
                  id="sim-url-input"
                  type="text"
                  defaultValue="https://mysite.com/?utm_source=google&utm_medium=cpc&utm_campaign=summer_promo&gclid=test_gclid_123"
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", color: "var(--sorget-dark, #3A313C)", fontSize: "0.8125rem", marginTop: "0.25rem" }}
                />
              </div>
              <button
                id="btn-run-sim"
                className="btn btn-secondary"
                style={{ alignSelf: "flex-start", padding: "0.4rem 0.85rem", fontSize: "0.8125rem" }}
              >
                Simulate Attribution
              </button>
            </div>

            <div
              id="sim-result-box"
              style={{
                background: "#1e293b",
                padding: "1rem",
                borderRadius: "8px",
                fontSize: "0.8125rem",
                fontFamily: "monospace",
                color: "#38bdf8",
                lineHeight: 1.6,
              }}
            >
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
