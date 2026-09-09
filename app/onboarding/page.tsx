import { redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/app/actions/projects";
import styles from "../Auth.module.css";

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

          <h1 className={styles.title}>Welcome to Attributer</h1>
          <p className={styles.subtitle}>Let's get your first website set up.</p>

          {error && <div className={styles.alertError} role="alert">{error}</div>}

          <form action={createProject} id="onboarding-form">
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="project-website">What website do you want to use Attributer on? *</label>
              <input id="project-website" name="website" type="text" placeholder="www.mysite.com" required autoFocus className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="project-cms">What website builder does this site use? *</label>
              <select id="project-cms" name="cms" required className={styles.input} defaultValue="">
                <option value="" disabled>Select your CMS</option>
                <option value="wordpress">WordPress</option>
                <option value="webflow">Webflow</option>
                <option value="squarespace">Squarespace</option>
                <option value="wix">Wix</option>
                <option value="shopify">Shopify</option>
                <option value="framer">Framer</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="project-form-tool">What form tool does this website use? *</label>
              <select id="project-form-tool" name="form_tool" required className={styles.input} defaultValue="">
                <option value="" disabled>Select your form tool</option>
                <option value="gravity_forms">Gravity Forms</option>
                <option value="wpforms">WPForms</option>
                <option value="typeform">Typeform</option>
                <option value="hubspot_forms">HubSpot Forms</option>
                <option value="marketo">Marketo</option>
                <option value="pardot">Pardot</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className={styles.formGroup} style={{ marginBottom: "1.5rem" }}>
              <label className={styles.label} htmlFor="project-crm">Where do you want to send the attribution information? *</label>
              <select id="project-crm" name="crm" required className={styles.input} defaultValue="">
                <option value="" disabled>Select your CRM or destination</option>
                <option value="salesforce">Salesforce</option>
                <option value="hubspot">HubSpot</option>
                <option value="pipedrive">Pipedrive</option>
                <option value="zoho">Zoho CRM</option>
                <option value="close">Close</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button id="onboarding-submit" type="submit" className={styles.btnPrimary}>
              Continue Setup
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
