import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signup } from "@/app/actions/auth";
import GoogleSignInButton from "@/app/components/GoogleSignInButton";
import styles from "../Auth.module.css";

interface PageProps {
  searchParams: Promise<{ error?: string; success?: string; code?: string; next?: string }>;
}

export const metadata = {
  title: "Create Account — Sorget",
  description: "Create your Sorget account to start tracking lead attribution.",
};

export default async function SignupPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = params.error;
  const success = params.success === "1";

  // If user lands on /signup with an OAuth PKCE code, forward to /auth/callback
  if (params.code) {
    redirect(`/auth/callback?code=${encodeURIComponent(params.code)}&next=${encodeURIComponent(params.next || "/onboarding")}`);
  }

  return (
    <div className={styles.page}>
      {/* Left: form */}
      <div className={styles.formSide}>
        <div className={styles.card}>
          <a href="https://sorget.site/" className={styles.logo} title="Back to Sorget">
            <Image src="/logo.png" alt="Sorget Logo" width={28} height={28} className={styles.logoImg} priority />
            <span>Sorget</span>
          </a>

          <h1 className={styles.title}>Create your account</h1>
          <p className={styles.subtitle}>Start tracking where your leads and revenue actually come from.</p>

          {error && <div className={styles.alertError} role="alert">{error}</div>}

          {success ? (
            <div className={styles.alertSuccess} role="alert">
              <span>✓</span>
              <span>
                Account created! Check your email to confirm your address, then{" "}
                <Link href="/login" style={{ color: "inherit", fontWeight: 700, textDecoration: "underline" }}>sign in</Link>.
              </span>
            </div>
          ) : (
            <>
              <GoogleSignInButton text="Sign up with Google" />
              <div className={styles.divider}><span>or sign up with email</span></div>

              <form action={signup} id="signup-form">
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="signup-name">Full Name (optional)</label>
                  <input id="signup-name" name="name" type="text" placeholder="Jane Doe" autoComplete="name" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="signup-email">Work Email</label>
                  <input id="signup-email" name="email" type="email" placeholder="you@company.com" required autoComplete="email" className={styles.input} />
                </div>
                <div className={styles.formGroup} style={{ marginBottom: "1.5rem" }}>
                  <label className={styles.label} htmlFor="signup-password">Password</label>
                  <input id="signup-password" name="password" type="password" placeholder="Minimum 6 characters" required minLength={6} autoComplete="new-password" className={styles.input} />
                </div>
                <button id="signup-submit" type="submit" className={styles.btnPrimary}>Create Account</button>
              </form>
            </>
          )}

          <div className={styles.footer}>
            Already have an account? <Link href="/login" id="login-link">Sign In</Link>
          </div>
        </div>
      </div>

      {/* Right: brand panel */}
      <div className={styles.brandSide}>
        <a href="https://sorget.site/" className={styles.brandLogo}>
          <Image src="/logo.png" alt="Sorget Logo" width={32} height={32} className={styles.brandLogoImg} priority />
          <span>Sorget</span>
        </a>

        <h2 className={styles.brandHeadline}>Know where your leads come from.</h2>
        <p className={styles.brandBody}>
          Sorget captures the marketing journey behind every lead — from the first visit to the form submission.
        </p>

        <div className={styles.brandDivider} />

        <p className={styles.brandTagline}>Capture. Attribute. Connect.</p>
        <p className={styles.brandTaglineBody}>
          Track sources, campaigns, landing pages, and first-touch attribution, then send the data where your team already works.
        </p>

        <div className={styles.brandFlow}>
          Marketing &rarr; Leads &rarr; Revenue
        </div>
      </div>
    </div>
  );
}
