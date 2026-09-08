import Link from "next/link";
import { signup } from "@/app/actions/auth";

interface PageProps {
  searchParams: Promise<{ error?: string; success?: string }>;
}

export const metadata = {
  title: "Create Account — Attributer",
  description: "Create your Attributer account to start tracking lead attribution.",
};

export default async function SignupPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = params.error;
  const success = params.success === "1";

  return (
    <div className="page">
      <div className="card">
        {/* Logo */}
        <div className="logo">
          <div className="logo-icon">⚡</div>
          <span>Attributer</span>
        </div>

        <h1>Create your account</h1>
        <p style={{ marginBottom: "2rem" }}>
          Start tracking where your leads come from.
        </p>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" role="alert">
            Account created! Check your email to confirm your address, then{" "}
            <Link href="/login">sign in</Link>.
          </div>
        )}

        {!success && (
          <form action={signup} id="signup-form">
            <div className="form-group">
              <label htmlFor="signup-email">Email address</label>
              <input
                id="signup-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group" style={{ marginBottom: "1.5rem" }}>
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                name="password"
                type="password"
                placeholder="Minimum 6 characters"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <button id="signup-submit" type="submit" className="btn btn-primary">
              Create Account
            </button>
          </form>
        )}

        <div className="auth-footer">
          Already have an account?{" "}
          <Link href="/login" id="login-link">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
