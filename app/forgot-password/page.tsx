import Link from "next/link";
import Image from "next/image";
import { requestPasswordReset } from "@/app/actions/auth";

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

        <h1>Reset password</h1>
        <p style={{ marginBottom: "2rem", color: "var(--text-muted)" }}>
          Enter your email address and we will send you a secure link to reset your password.
        </p>

        {error && (
          <div className="alert alert-error" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success" role="status">
            <span>✓</span>
            <span>Password reset link sent! Please check your email inbox.</span>
          </div>
        )}

        {!success && (
          <form action={requestPasswordReset} id="forgot-form">
            <div className="form-group" style={{ marginBottom: "1.75rem" }}>
              <label htmlFor="forgot-email">Email address</label>
              <input
                id="forgot-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <button id="forgot-submit" type="submit" className="btn btn-primary">
              Send Reset Link
            </button>
          </form>
        )}

        <div className="auth-footer">
          Remember your password?{" "}
          <Link href="/login" id="back-login-link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}