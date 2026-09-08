import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";

interface PageProps {
  searchParams: Promise<{ error?: string; success?: string }>;
}

export const metadata = {
  title: "Forgot Password — Attributer",
  description: "Reset your Attributer account password.",
};

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = params.error;
  const success = params.success;

  return (
    <div className="page">
      <div className="card">
        <div className="logo">
          <div className="logo-icon">⚡</div>
          <span>Attributer</span>
        </div>

        <h1>Reset Password</h1>
        <p style={{ marginBottom: "2rem" }}>
          Enter your email address and we will send you a link to reset your password.
        </p>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" role="status">
            Password reset link sent! Please check your inbox.
          </div>
        )}

        {!success && (
          <form action={requestPasswordReset} id="forgot-form">
            <div className="form-group" style={{ marginBottom: "1.5rem" }}>
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

        <div className="auth-footer" style={{ marginTop: "2rem" }}>
          Remember your password?{" "}
          <Link href="/login" id="back-login-link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}