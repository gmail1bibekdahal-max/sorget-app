import Link from "next/link";
import { login } from "@/app/actions/auth";

interface PageProps {
  searchParams: Promise<{ error?: string; notice?: string }>;
}

export const metadata = {
  title: "Sign In — Attributer",
  description: "Sign in to your Attributer account.",
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = params.error;
  const notice = params.notice;

  return (
    <div className="page">
      <div className="card">
        {/* Logo */}
        <div className="logo">
          <div className="logo-icon">⚡</div>
          <span>Attributer</span>
        </div>

        <h1>Welcome back</h1>
        <p style={{ marginBottom: "2rem" }}>Sign in to your account.</p>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        {notice && (
          <div className="alert alert-success" role="status">
            {notice}
          </div>
        )}

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

          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label htmlFor="login-password">Password</label>
              <Link href="/forgot-password" style={{ fontSize: "0.8125rem", color: "var(--accent, #6366f1)" }}>
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
            Log In
          </button>
        </form>

        <div className="auth-footer">
          Don&apos;t have an account?{" "}
          <Link href="/signup" id="signup-link">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
