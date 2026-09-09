import Link from "next/link";
import Image from "next/image";
import { login } from "@/app/actions/auth";
import GoogleSignInButton from "@/app/components/GoogleSignInButton";

interface PageProps {
  searchParams: Promise<{ error?: string; notice?: string }>;
}

export const metadata = {
  title: "Sign In — Sorget",
  description: "Sign in to your Sorget account.",
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = params.error;
  const notice = params.notice;

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

        <h1>Welcome back</h1>
        <p style={{ marginBottom: "1.5rem", color: "var(--text-muted)" }}>
          Sign in to your Sorget account.
        </p>

        {error && (
          <div className="alert alert-error" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="alert alert-success" role="status">
            <span>✓</span>
            <span>{notice}</span>
          </div>
        )}

        {/* Continue with Google */}
        <GoogleSignInButton text="Continue with Google" />

        <div className="auth-divider">
          <span>or continue with email</span>
        </div>

        <form action={login} id="login-form">
          <div className="form-group">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group" style={{ marginBottom: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label htmlFor="login-password">Password</label>
              <Link
                href="/forgot-password"
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--sorget-pink)",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="login-password"
              name="password"
              type="password"
              placeholder="Your password"
              required
              autoComplete="current-password"
            />
          </div>

          <button id="login-submit" type="submit" className="btn btn-primary">
            Sign In
          </button>
        </form>

        <div className="auth-footer">
          Don&apos;t have an account?{" "}
          <Link href="/signup" id="signup-link">
            Sign up free
          </Link>
        </div>
      </div>
    </div>
  );
}
