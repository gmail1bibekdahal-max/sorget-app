import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/app/actions/projects";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export const metadata = {
  title: "Welcome to Attributer — Onboarding",
  description: "Set up your workspace and start tracking leads in minutes.",
};

export default async function OnboardingPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const error = params.error;

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: "560px", margin: "2rem auto" }}>
        <div className="logo" style={{ marginBottom: "1.5rem" }}>
          <div className="logo-icon">⚡</div>
          <span>Attributer</span>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <span className="pill" style={{ background: "var(--accent-glow, rgba(99,102,241,0.15))", color: "#818cf8" }}>
            Step 1 of 2: Setup Website
          </span>
        </div>

        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Welcome to Attributer!</h1>
        <p style={{ marginBottom: "2rem", color: "var(--text-secondary, #94a3b8)" }}>
          Let&apos;s configure your first website property to generate your tracking snippet.
        </p>

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: "1.5rem" }}>
            {error}
          </div>
        )}

        <form action={createProject} id="onboarding-form">
          <div className="form-group" style={{ marginBottom: "1.25rem" }}>
            <label htmlFor="project-name" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
              Website / Project Name
            </label>
            <input
              id="project-name"
              name="name"
              type="text"
              placeholder="e.g. My SaaS App"
              required
              autoFocus
            />
            <span style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem", display: "block" }}>
              A friendly name for your website or product.
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: "2rem" }}>
            <label htmlFor="project-website" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
              Website URL (Optional)
            </label>
            <input
              id="project-website"
              name="website"
              type="text"
              placeholder="https://example.com"
            />
            <span style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem", display: "block" }}>
              Your primary marketing domain or landing page.
            </span>
          </div>

          <button id="onboarding-submit" type="submit" className="btn btn-primary" style={{ width: "100%" }}>
            Generate Tracking Snippet →
          </button>
        </form>
      </div>
    </div>
  );
}