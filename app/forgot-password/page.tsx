import Link from "next/link";
import Image from "next/image";
import { requestPasswordReset } from "@/app/actions/auth";
import styles from "../Auth.module.css";

interface PageProps {
  searchParams: Promise<{ error?: string; success?: string }>;
}

export const metadata = {
  title: "Forgot Password — Sorget",
  description: "Reset your Sorget account password.",
};

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = params.error;
  const success = params.success;

  return (
    <div className={styles.page}>
      {/* Left: form */}
      <div className={styles.formSide}>
        <div className={styles.card}>
          <a href="https://sorget.site/" className={styles.logo} title="Back to Sorget">
            <Image src="/logo.png" alt="Sorget Logo" width={28} height={28} className={styles.logoImg} priority />
            <span>Sorget</span>
          </a>

          <h1 className={styles.title}>Reset password</h1>
          <p className={styles.subtitle}>Enter your email and we'll send you a secure link to reset your password.</p>

          {error && <div className={styles.alertError} role="alert">{error}</div>}
          {success && <div className={styles.alertSuccess} role="status"><span>✓</span><span>Password reset link sent! Please check your email inbox.</span></div>}

          {!success && (
            <form action={requestPasswordReset} id="forgot-form">
              <div className={styles.formGroup} style={{ marginBottom: "1.5rem" }}>
                <label className={styles.label} htmlFor="forgot-email">Email address</label>
                <input id="forgot-email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" className={styles.input} />
              </div>
              <button id="forgot-submit" type="submit" className={styles.btnPrimary}>Send Reset Link</button>
            </form>
          )}

          <div className={styles.footer}>
            Remember your password? <Link href="/login" id="back-login-link">Sign In</Link>
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
