import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/app/actions/projects";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export const metadata = {
  title: "Welcome to Sorget — Onboarding",
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
      <div className="card" style={{ maxWidth: "540px", margin: "2rem auto" }}>
        <Link href="/" className="logo" style={{ marginBottom: "1.5rem" }}>
          <Image
            src="/logo.png"
            alt="Sorget Logo"
            width={34}
            height={34}
            className="logo-img"
            priority
          />
          <span>Sorget</span>
        </Link>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <span
            className="pill"
            style={{
              background: "var(--sorget-pink-light)",
              color: "var(--sorget-pink)",
              border: "1px solid var(--sorget-pink-border)",
              fontWeight: 700,
            }}
          >
            Step 1 of 2: Setup Website
          </span>
        </div>

        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Welcome to Sorget</h1>
        <p style={{ marginBottom: "2rem", color: "var(--text-muted)" }}>
          Let&apos;s configure your first website property to generate your tracking snippet.
        </p>

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: "1.5rem" }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form action={createProject} id="onboarding-form">
          <div className="form-group" style={{ marginBottom: "1.25rem" }}>
            <label htmlFor="project-name" style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
              Website / Project Name *
            </label>
            <input
              id="project-name"
              name="name"
              type="text"
              placeholder="e.g. My SaaS App"
              required
              autoFocus
            />
            <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.35rem", display: "block" }}>
              A friendly name for your website or product.
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: "2rem" }}>
            <label htmlFor="project-website" style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
              Website URL (Optional)
            </label>
            <input
              id="project-website"
              name="website"
              type="text"
              placeholder="https://example.com"
            />
            <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.35rem", display: "block" }}>
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