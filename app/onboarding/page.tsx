import { redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createOnboardingProject } from "@/app/actions/projects";
import styles from "../Auth.module.css";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export const metadata = {
  title: "Welcome to Sorget — Onboarding",
  description: "Set up your first website and start tracking leads.",
};

export default async function OnboardingPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const error = params.error;

  return (
    <div className={styles.pageFlipped}>
      {/* Left: brand panel */}
      <div className={styles.brandSideFlipped}>
        <a href="https://sorget.site/" className={styles.brandLogo}>
          <Image src="/logo.png" alt="Sorget Logo" width={32} height={32} className={styles.brandLogoImg} priority />
          <span>Sorget</span>
        </a>

        <h2 className={styles.brandHeadline}>Stop guessing where your leads came from.</h2>

        <p className={styles.brandBody}>
          A lead fills out your form.<br />
          Your CRM tells you who they are.
        </p>

        <p className={styles.brandTagline}>But do you know:</p>

        <ul style={{ listStyle: "none", padding: 0, margin: "0.75rem 0 2rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {[
            "Which campaign brought them?",
            "Which channel did they come from?",
            "What was their first landing page?",
            "Which marketing effort generated the opportunity?",
          ].map((q) => (
            <li key={q} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "calc(.25rem * 4)", color: "rgba(255,255,255,0.8)", fontWeight: 500, lineHeight: 1.5 }}>
              <span style={{ color: "rgba(255,255,255,0.5)", flexShrink: 0, marginTop: "1px" }}>→</span>
              {q}
            </li>
          ))}
        </ul>

        <div className={styles.brandDivider} />

        <p className={styles.brandTaglineBody}>
          Sorget captures these details automatically.
        </p>
      </div>

      {/* Right: form */}
      <div className={styles.formSide}>
        <div className={styles.card}>
          <a href="https://sorget.site/" className={styles.logo} title="Back to Sorget">
            <Image src="/logo.png" alt="Sorget Logo" width={28} height={28} className={styles.logoImg} priority />
            <span>Sorget</span>
          </a>

          <h1 className={styles.title}>Welcome to Sorget</h1>
          <p className={styles.subtitle}>Let&apos;s get your first website set up.</p>

          {error && <div className={styles.alertError} role="alert">{error}</div>}

          <form action={createOnboardingProject} id="onboarding-form">
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="project-name">Website Name *</label>
              <input
                id="project-name"
                name="name"
                type="text"
                placeholder="e.g. My Website or Acme Inc"
                required
                autoFocus
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="project-website">Website URL *</label>
              <input
                id="project-website"
                name="website"
                type="text"
                placeholder="e.g. https://www.example.com"
                required
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup} style={{ marginBottom: "1.5rem" }}>
              <label className={styles.label} htmlFor="project-crm">CRM Used *</label>
              <select id="project-crm" name="crm" required className={styles.input} defaultValue="">
                <option value="" disabled>Select your CRM</option>
                <option value="hubspot">HubSpot</option>
                <option value="salesforce">Salesforce</option>
                <option value="pipedrive">Pipedrive</option>
                <option value="zoho">Zoho CRM</option>
                <option value="close">Close</option>
                <option value="other">Other / Custom</option>
              </select>
            </div>

            <button id="onboarding-submit" type="submit" className={styles.btnPrimary}>
              Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
