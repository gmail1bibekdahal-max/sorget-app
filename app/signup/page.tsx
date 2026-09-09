import Link from "next/link";
import Image from "next/image";
import { signup } from "@/app/actions/auth";
import GoogleSignInButton from "@/app/components/GoogleSignInButton";

interface PageProps {
  searchParams: Promise<{ error?: string; success?: string }>;
}

export const metadata = {
  title: "Create Account — Sorget",
  description: "Create your Sorget account to start tracking lead attribution.",
};

export default async function SignupPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = params.error;
  const success = params.success === "1";

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

        <h1>Create your account</h1>
        <p style={{ marginBottom: "1.5rem", color: "var(--text-muted)" }}>
          Start tracking where your leads and revenue actually come from.
        </p>

        {error && (
          <div className="alert alert-error" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success" role="alert">
            <span>✓</span>
            <span>
              Account created! Check your email to confirm your address, then{" "}
              <Link href="/login" style={{ color: "inherit", fontWeight: 700, textDecoration: "underline" }}>
                sign in
              </Link>.
            </span>
          </div>
        )}

        {!success && (
          <>
            {/* Continue with Google */}
            <GoogleSignInButton text="Sign up with Google" />

            <div className="auth-divider">
              <span>or sign up with email</span>
            </div>

            <form action={signup} id="signup-form">
            <div className="form-group">
              <label htmlFor="signup-name">Full Name (optional)</label>
              <input
                id="signup-name"
                name="name"
                type="text"
                placeholder="Jane Doe"
                autoComplete="name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-email">Work Email</label>
              <input
                id="signup-email"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group" style={{ marginBottom: "1.75rem" }}>
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
          </>
        )}

        <div className="auth-footer">
          Already have an account?{" "}
          <Link href="/login" id="login-link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
