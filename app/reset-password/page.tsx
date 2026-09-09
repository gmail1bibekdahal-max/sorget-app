import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "@/app/actions/auth";
import styles from "../Auth.module.css";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export const metadata = {
  title: "Set New Password — Sorget",
  description: "Set a new password for your Sorget account.",
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/forgot-password?error=" + encodeURIComponent("Your password reset session has expired or is invalid. Please request a new link."));
  }

  const params = await searchParams;
  const error = params.error;

  return (
    <div className={styles.page}>
      {/* Left: form */}
      <div className={styles.formSide}>
        <div className={styles.card}>
          <a href="https://sorget.site/" className={styles.logo} title="Back to Sorget">
            <Image src="/logo.png" alt="Sorget Logo" width={28} height={28} className={styles.logoImg} priority />
            <span>Sorget</span>
          </a>

          <h1 className={styles.title}>Set new password</h1>
          <p className={styles.subtitle}>Enter and confirm your new account password below.</p>

          {error && <div className={styles.alertError} role="alert">{error}</div>}

          <form action={updatePassword} id="reset-password-form">
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="reset-password">New Password</label>
              <input id="reset-password" name="password" type="password" placeholder="At least 6 characters" required minLength={6} autoComplete="new-password" className={styles.input} />
            </div>
            <div className={styles.formGroup} style={{ marginBottom: "1.5rem" }}>
              <label className={styles.label} htmlFor="reset-confirm-password">Confirm New Password</label>
              <input id="reset-confirm-password" name="confirmPassword" type="password" placeholder="Confirm your password" required minLength={6} autoComplete="new-password" className={styles.input} />
            </div>
            <button id="reset-submit" type="submit" className={styles.btnPrimary}>Update Password</button>
          </form>

          <div className={styles.footer}>
            <Link href="/login">Back to Sign In</Link>
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
