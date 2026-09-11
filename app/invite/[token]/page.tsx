import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { acceptInvitationAction } from "@/app/actions/team";
import { isInvitationValid } from "@/lib/team";

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}

export const metadata = {
  title: "Accept Team Invitation — Sorget",
  description: "Join your team on Sorget.",
};

export default async function AcceptInvitePage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const { error: queryError } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Retrieve invitation details using admin client (so unauthenticated or pending users can inspect workspace name)
  const adminClient = createAdminClient();
  const { data: invitation, error: invErr } = await adminClient
    .from("workspace_invitations")
    .select("*, workspaces(name, slug)")
    .eq("token", token)
    .single();

  if (invErr || !invitation) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--sorget-bg, #f1f5f9)", padding: "1.5rem" }}>
        <div style={{ maxWidth: "460px", width: "100%", padding: "2.5rem 2rem", textAlign: "center", background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <h1 style={{ fontSize: "1.5rem", color: "#dc2626", marginBottom: "0.75rem", fontWeight: 700 }}>Invalid Invitation</h1>
          <p style={{ color: "var(--sorget-grey, #64748b)", marginBottom: "2rem", fontSize: "0.95rem" }}>
            This invitation link is invalid or has been revoked.
          </p>
          <Link href="/login" className="btn btn-primary" style={{ padding: "0.6rem 1.5rem", textDecoration: "none" }}>
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  const isValid = isInvitationValid(invitation);
  const workspaceName = invitation.workspaces?.name || "Workspace";

  if (!isValid) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--sorget-bg, #f1f5f9)", padding: "1.5rem" }}>
        <div style={{ maxWidth: "460px", width: "100%", padding: "2.5rem 2rem", textAlign: "center", background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <h1 style={{ fontSize: "1.5rem", color: "#b45309", marginBottom: "0.75rem", fontWeight: 700 }}>Invitation Expired</h1>
          <p style={{ color: "var(--sorget-grey, #64748b)", marginBottom: "2rem", fontSize: "0.95rem" }}>
            This invitation to join <strong>{workspaceName}</strong> has expired or already been accepted.
          </p>
          <Link href="/login" className="btn btn-primary" style={{ padding: "0.6rem 1.5rem", textDecoration: "none" }}>
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Action handler to accept invitation
  async function handleAccept() {
    "use server";
    const res = await acceptInvitationAction(token);
    if (!res.success) {
      redirect(`/invite/${token}?error=${encodeURIComponent(res.error || "Failed to accept invitation")}`);
    }
    redirect(`/dashboard?workspace=${res.workspaceId}&success=${encodeURIComponent(`Joined ${workspaceName} successfully!`)}`);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--sorget-bg, #f1f5f9)", padding: "1.5rem" }}>
      <div style={{ maxWidth: "460px", width: "100%", padding: "2.5rem 2rem", textAlign: "center", background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <Image src="/logo.png" alt="Sorget Logo" width={48} height={48} style={{ borderRadius: "10px" }} />
        </div>
        <h1 style={{ fontSize: "1.625rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--sorget-dark, #3A313C)" }}>You&apos;re Invited!</h1>
        <p style={{ color: "var(--sorget-grey, #64748b)", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
          You have been invited to join <strong>{workspaceName}</strong> as a{" "}
          <span style={{ textTransform: "capitalize", color: "var(--sorget-pink, #BB0C68)", fontWeight: 600, background: "rgba(187, 12, 104, 0.08)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>{invitation.role}</span>.
        </p>

        {queryError && (
          <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
            {queryError}
          </div>
        )}

        {!user ? (
          <div>
            <p style={{ fontSize: "0.875rem", color: "var(--sorget-grey, #64748b)", marginBottom: "1.5rem" }}>
              Please log in or sign up to accept this invitation.
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <Link
                href={`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`}
                className="btn btn-primary"
                style={{ padding: "0.6rem 1.5rem", textDecoration: "none" }}
              >
                Sign In
              </Link>
              <Link
                href={`/signup?redirect=${encodeURIComponent(`/invite/${token}`)}`}
                className="btn btn-secondary"
                style={{ padding: "0.6rem 1.5rem", textDecoration: "none" }}
              >
                Create Account
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: "0.875rem", color: "var(--sorget-grey, #64748b)", marginBottom: "1.5rem" }}>
              Logged in as <strong>{user.email}</strong>
            </p>
            <form action={handleAccept}>
              <button type="submit" className="btn btn-primary" style={{ padding: "0.75rem 2.25rem", fontSize: "1rem", width: "100%" }}>
                Accept Invitation
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
