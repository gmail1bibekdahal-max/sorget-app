import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "@/app/actions/auth";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export const metadata = {
  title: "Set New Password — Sorget",
  description: "Set a new password for your Sorget account.",
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/forgot-password?error=" +
        encodeURIComponent("Your password reset session has expired or is invalid. Please request a new link.")
    );
  }

  const params = await searchParams;
  const error = params.error;

  return (
    <div className="page">
      <div className="card">
        {/* Brand Logo */}
        <a href="https://sorget.site/" className="logo" title="Back to Sorget">
          <Image
            src="/logo.png"
            alt="Sorget Logo"
            width={34}
            height={34}
            className="logo-img"
            priority
          />
          <span>Sorget</span>
        </a>

        <h1>Set new password</h1>
        <p style={{ marginBottom: "2rem", color: "var(--text-muted)" }}>
          Enter and confirm your new account password below.
        </p>

        {error && (
          <div className="alert alert-error" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form action={updatePassword} id="reset-password-form">
          <div className="form-group">
            <label htmlFor="reset-password">New Password</label>
            <input
              id="reset-password"
              name="password"
              type="password"
              placeholder="At least 6 characters"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group" style={{ marginBottom: "1.75rem" }}>
            <label htmlFor="reset-confirm-password">Confirm New Password</label>
            <input
              id="reset-confirm-password"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <button id="reset-submit" type="submit" className="btn btn-primary">
            Update Password
          </button>
        </form>

        <div className="auth-footer">
          <Link href="/login">Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}