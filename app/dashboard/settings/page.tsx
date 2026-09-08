import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateWorkspace, deleteWorkspace } from "@/app/actions/workspaces";
import { inviteTeamMember, removeMember, revokeInvitation } from "@/app/actions/team";
import { PLANS } from "@/lib/billing";
import MainNavigation from "@/app/components/MainNavigation";

export const metadata = {
  title: "Settings — Sorget",
  description: "Manage your workspace settings, team members, and subscription.",
};

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    workspace?: string;
    success?: string;
    error?: string;
    notice?: string;
  }>;
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab = params.tab || "workspace";
  const selectedWsId = params.workspace;
  const successMsg = params.success;
  const errorMsg = params.error;
  const noticeMsg = params.notice;

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Fetch workspaces for this user
  const { data: memberRows } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name, slug, created_at)")
    .eq("user_id", user.id);

  const userWorkspaces = (memberRows ?? [])
    .filter((r: any) => r.workspaces)
    .map((r: any) => ({
      id: r.workspaces.id,
      name: r.workspaces.name,
      slug: r.workspaces.slug,
      role: r.role,
    }));

  const activeWs =
    userWorkspaces.find((w) => w.id === selectedWsId) ||
    userWorkspaces[0] || {
      id: "default",
      name: "Personal Workspace",
      slug: "personal",
      role: "owner",
    };

  // Fetch members of active workspace
  const { data: currentMembers } = await supabase
    .from("workspace_members")
    .select("id, user_id, role, created_at")
    .eq("workspace_id", activeWs.id);

  // Fetch pending invitations
  const { data: pendingInvitations } = await supabase
    .from("workspace_invitations")
    .select("id, email, role, status, token, expires_at, created_at")
    .eq("workspace_id", activeWs.id)
    .eq("status", "pending");

  // Fetch subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("workspace_id", activeWs.id)
    .single();

  const currentPlanKey = subscription?.plan_id || "starter";
  const currentPlan = (PLANS as any)[currentPlanKey] || PLANS.starter;

  const tabs = [
    { key: "workspace", label: "Workspace" },
    { key: "team", label: "Team Members" },
    { key: "billing", label: "Subscription" },
  ];

  return (
    <div className="dashboard-layout" style={{ minHeight: "100vh" }}>
      <MainNavigation
        userEmail={user.email}
        workspaces={userWorkspaces}
        activeWorkspaceId={activeWs.id}
      />

      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {/* Alerts */}
        {successMsg && (
          <div className="alert alert-success" style={{ marginBottom: "1.5rem" }}>
            ✓ {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
            ✗ {errorMsg}
          </div>
        )}
        {noticeMsg && (
          <div className="alert alert-info" style={{ marginBottom: "1.5rem" }}>
            ℹ {noticeMsg}
          </div>
        )}

        {/* Page Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>
            Settings
          </h1>
          <p style={{ color: "var(--text-secondary, #94a3b8)", margin: 0, fontSize: "0.95rem" }}>
            Manage your workspace details, team access, and subscription plan.
          </p>
        </div>

        {/* Settings Navigation Tabs */}
        <div className="tabs" style={{ marginBottom: "2rem" }}>
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/dashboard/settings?tab=${t.key}${activeWs.id ? `&workspace=${activeWs.id}` : ""}`}
              className={`tab-btn ${activeTab === t.key ? "tab-btn-active" : ""}`}
              id={`settings-tab-${t.key}`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* TAB 1: WORKSPACE */}
        {activeTab === "workspace" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <div
              className="card"
              style={{
                maxWidth: "100%",
                padding: "1.75rem",
                background: "var(--color-card, #1a1a26)",
                border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
                borderRadius: "14px",
              }}
            >
              <h2 style={{ fontSize: "1.2rem", margin: "0 0 1.25rem 0", color: "#ffffff" }}>
                Workspace Details
              </h2>
              <form action={updateWorkspace} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <input type="hidden" name="workspaceId" value={activeWs.id} />
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="ws-name">Workspace Name</label>
                  <input
                    id="ws-name"
                    name="name"
                    type="text"
                    defaultValue={activeWs.name}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="ws-slug">Workspace Identifier (Slug)</label>
                  <input
                    id="ws-slug"
                    type="text"
                    defaultValue={activeWs.slug}
                    disabled
                    style={{ opacity: 0.6, cursor: "not-allowed" }}
                  />
                </div>
                <div>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>

            {/* Danger Zone */}
            {activeWs.role === "owner" && activeWs.id !== "default" && (
              <div
                className="card"
                style={{
                  maxWidth: "100%",
                  padding: "1.75rem",
                  background: "rgba(239, 68, 68, 0.04)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: "14px",
                }}
              >
                <h3 style={{ fontSize: "1.1rem", color: "#f87171", margin: "0 0 0.5rem 0" }}>
                  Delete Workspace
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                  Permanently delete this workspace and remove all associated website connections and team members.
                </p>
                <form action={deleteWorkspace}>
                  <input type="hidden" name="workspaceId" value={activeWs.id} />
                  <button
                    type="submit"
                    className="btn btn-danger btn-sm"
                  >
                    Delete Workspace
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TEAM MEMBERS */}
        {activeTab === "team" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {/* Invite Form */}
            <div
              className="card"
              style={{
                maxWidth: "100%",
                padding: "1.75rem",
                background: "var(--color-card, #1a1a26)",
                border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
                borderRadius: "14px",
              }}
            >
              <h2 style={{ fontSize: "1.2rem", margin: "0 0 1rem 0", color: "#ffffff" }}>
                Invite Team Member
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                Give colleagues access to install tracking scripts, view submission verification logs, and manage integrations.
              </p>
              <form
                action={inviteTeamMember}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 140px auto",
                  gap: "1rem",
                  alignItems: "end",
                }}
              >
                <input type="hidden" name="workspace_id" value={activeWs.id} />
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="invite-email" style={{ fontSize: "0.8125rem" }}>Email Address</label>
                  <input
                    id="invite-email"
                    name="email"
                    type="email"
                    placeholder="colleague@company.com"
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="invite-role" style={{ fontSize: "0.8125rem" }}>Role</label>
                  <select
                    id="invite-role"
                    name="role"
                    defaultValue="member"
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "6px",
                      padding: "0.55rem 0.75rem",
                      color: "#ffffff",
                      fontSize: "0.875rem",
                      width: "100%",
                    }}
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ height: "42px" }}>
                  Send Invite
                </button>
              </form>
            </div>

            {/* Current Members */}
            <div
              className="card"
              style={{
                maxWidth: "100%",
                padding: "1.75rem",
                background: "var(--color-card, #1a1a26)",
                border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
                borderRadius: "14px",
              }}
            >
              <h2 style={{ fontSize: "1.2rem", margin: "0 0 1rem 0", color: "#ffffff" }}>
                Active Members ({currentMembers?.length ?? 1})
              </h2>
              <div className="table-container" style={{ margin: 0 }}>
                <table className="leads-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(currentMembers ?? []).map((m: any) => {
                      const isSelf = m.user_id === user.id;
                      return (
                        <tr key={m.id}>
                          <td>
                            <div style={{ fontWeight: 500, color: "#ffffff" }}>
                              {isSelf ? `${user.email} (You)` : `User ${m.user_id.slice(0, 8)}…`}
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                textTransform: "capitalize",
                                padding: "0.2rem 0.5rem",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                background: m.role === "owner" ? "rgba(108, 99, 255, 0.15)" : "rgba(255, 255, 255, 0.05)",
                                color: m.role === "owner" ? "#9d96ff" : "var(--text-secondary)",
                              }}
                            >
                              {m.role}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {!isSelf && activeWs.role === "owner" && (
                              <form action={removeMember} style={{ display: "inline" }}>
                                <input type="hidden" name="workspace_id" value={activeWs.id} />
                                <input type="hidden" name="member_id" value={m.id} />
                                <button
                                  type="submit"
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#f87171",
                                    fontSize: "0.8125rem",
                                    cursor: "pointer",
                                  }}
                                >
                                  Remove
                                </button>
                              </form>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pending Invitations */}
              {pendingInvitations && pendingInvitations.length > 0 && (
                <div style={{ marginTop: "2rem" }}>
                  <h3 style={{ fontSize: "1rem", margin: "0 0 0.75rem 0", color: "#f59e0b" }}>
                    Pending Invitations ({pendingInvitations.length})
                  </h3>
                  <div className="table-container" style={{ margin: 0 }}>
                    <table className="leads-table">
                      <thead>
                        <tr>
                          <th>Invited Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th style={{ textAlign: "right" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingInvitations.map((inv: any) => (
                          <tr key={inv.id}>
                            <td style={{ color: "#ffffff" }}>{inv.email}</td>
                            <td style={{ textTransform: "capitalize" }}>{inv.role}</td>
                            <td>
                              <span style={{ color: "#f59e0b", fontSize: "0.8125rem" }}>
                                Pending acceptance
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <form action={revokeInvitation} style={{ display: "inline" }}>
                                <input type="hidden" name="invitation_id" value={inv.id} />
                                <input type="hidden" name="workspace_id" value={activeWs.id} />
                                <button
                                  type="submit"
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#f87171",
                                    fontSize: "0.8125rem",
                                    cursor: "pointer",
                                  }}
                                >
                                  Revoke
                                </button>
                              </form>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SUBSCRIPTION & BILLING */}
        {activeTab === "billing" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <div
              className="card"
              style={{
                maxWidth: "100%",
                padding: "1.75rem",
                background: "var(--color-card, #1a1a26)",
                border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
                borderRadius: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#6c63ff", fontWeight: 700 }}>
                    CURRENT SUBSCRIPTION
                  </span>
                  <h2 style={{ fontSize: "1.5rem", margin: "0.25rem 0", color: "#ffffff" }}>
                    {currentPlan.name} Plan
                  </h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
                    ${currentPlan.priceMonthlyUsd} / month · Status: <span style={{ color: "#3ecf8e", textTransform: "capitalize" }}>{subscription?.status || "Active"}</span>
                  </p>
                </div>
                <span
                  style={{
                    padding: "0.3rem 0.75rem",
                    borderRadius: "999px",
                    background: "rgba(62, 207, 142, 0.15)",
                    color: "#3ecf8e",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                  }}
                >
                  ✓ Active
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "1rem",
                  marginTop: "1.5rem",
                  paddingTop: "1.5rem",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Websites Allowed
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff", marginTop: "0.25rem" }}>
                    {currentPlan.websiteLimit === Infinity ? "Unlimited" : currentPlan.websiteLimit}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Monthly Leads Included
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff", marginTop: "0.25rem" }}>
                    {currentPlan.leadsMonthlyLimit.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    CRM Integrations
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: currentPlan.crmIntegrations ? "#3ecf8e" : "#94a3b8", marginTop: "0.25rem" }}>
                    {currentPlan.crmIntegrations ? "Enabled" : "Upgrade Required"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
