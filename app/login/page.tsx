import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { login } from "@/app/actions/auth";
import GoogleSignInButton from "@/app/components/GoogleSignInButton";
import styles from "../Auth.module.css";

interface PageProps {
  searchParams: Promise<{ error?: string; notice?: string; code?: string; next?: string }>;
}

export const metadata = {
  title: "Sign In — Sorget",
  description: "Sign in to your Sorget account.",
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = params.error;
  const notice = params.notice;

  // If user lands on /login with an OAuth PKCE code, forward to /auth/callback
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

          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to your Sorget account.</p>

          {error && <div className={styles.alertError} role="alert">{error}</div>}
          {notice && <div className={styles.alertSuccess} role="status"><span>✓</span><span>{notice}</span></div>}

          <GoogleSignInButton text="Continue with Google" />

          <div className={styles.divider}><span>or continue with email</span></div>

          <form action={login} id="login-form">
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="login-email">Email address</label>
              <input id="login-email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" className={styles.input} />
            </div>

            <div className={styles.formGroup} style={{ marginBottom: "1.5rem" }}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="login-password">Password</label>
                <Link href="/forgot-password" className={styles.forgotLink}>Forgot password?</Link>
              </div>
              <input id="login-password" name="password" type="password" placeholder="Your password" required autoComplete="current-password" className={styles.input} />
            </div>

            <button id="login-submit" type="submit" className={styles.btnPrimary}>Sign In</button>
          </form>

          <div className={styles.footer}>
            Don&apos;t have an account? <Link href="/signup" id="signup-link">Sign up free</Link>
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
