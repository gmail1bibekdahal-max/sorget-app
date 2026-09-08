import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { acceptInvitationAction } from "@/app/actions/team";
import { isInvitationValid } from "@/lib/team";

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}

export const metadata = {
  title: "Accept Workspace Invitation — Attributer",
  description: "Join your team on Attributer.",
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
      <div style={{ maxWidth: "500px", margin: "4rem auto", padding: "2rem", textAlign: "center", background: "#1e293b", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
        <h1 style={{ fontSize: "1.5rem", color: "#ef4444", marginBottom: "1rem" }}>Invalid Invitation</h1>
        <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>
          This invitation link is invalid or has been revoked.
        </p>
        <Link href="/login" className="btn btn-primary" style={{ padding: "0.5rem 1.25rem" }}>
          Go to Sign In
        </Link>
      </div>
    );
  }

  const isValid = isInvitationValid(invitation);
  const workspaceName = invitation.workspaces?.name || "Workspace";

  if (!isValid) {
    return (
      <div style={{ maxWidth: "500px", margin: "4rem auto", padding: "2rem", textAlign: "center", background: "#1e293b", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
        <h1 style={{ fontSize: "1.5rem", color: "#f59e0b", marginBottom: "1rem" }}>Invitation Expired</h1>
        <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>
          This invitation to join <strong>{workspaceName}</strong> has expired or already been accepted.
        </p>
        <Link href="/login" className="btn btn-primary" style={{ padding: "0.5rem 1.25rem" }}>
          Go to Sign In
        </Link>
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
    <div style={{ maxWidth: "500px", margin: "4rem auto", padding: "2rem", textAlign: "center", background: "#1e293b", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚡</div>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>You&apos;re Invited!</h1>
      <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
        You have been invited to join <strong>{workspaceName}</strong> as a{" "}
        <span style={{ textTransform: "capitalize", color: "#818cf8", fontWeight: 600 }}>{invitation.role}</span>.
      </p>

      {queryError && (
        <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
          {queryError}
        </div>
      )}

      {!user ? (
        <div>
          <p style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "1.5rem" }}>
            Please log in or sign up to accept this invitation.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <Link
              href={`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`}
              className="btn btn-primary"
              style={{ padding: "0.5rem 1.25rem" }}
            >
              Sign In
            </Link>
            <Link
              href={`/signup?redirect=${encodeURIComponent(`/invite/${token}`)}`}
              className="btn btn-secondary"
              style={{ padding: "0.5rem 1.25rem" }}
            >
              Create Account
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "1.5rem" }}>
            Logged in as <strong>{user.email}</strong>
          </p>
          <form action={handleAccept}>
            <button type="submit" className="btn btn-primary" style={{ padding: "0.6rem 2rem", fontSize: "1rem" }}>
              Accept Invitation
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
