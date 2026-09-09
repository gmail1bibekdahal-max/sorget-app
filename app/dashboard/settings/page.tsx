import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateWorkspace, deleteWorkspace } from "@/app/actions/workspaces";
import { inviteTeamMember, removeMember, revokeInvitation } from "@/app/actions/team";
import { PLANS } from "@/lib/billing";
import MainNavigation from "@/app/components/MainNavigation";
import styles from "../Page.module.css";

export const metadata = {
  title: "Settings — Sorget",
  description: "Manage your workspace settings, team members, and subscription.",
};

interface PageProps {
  searchParams: Promise<{ tab?: string; workspace?: string; success?: string; error?: string; notice?: string }>;
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab = params.tab || "workspace";
  const selectedWsId = params.workspace;
  const successMsg = params.success;
  const errorMsg = params.error;
  const noticeMsg = params.notice;

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { data: memberRows } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name, slug, created_at)")
    .eq("user_id", user.id);

  const userWorkspaces = (memberRows ?? [])
    .filter((r: any) => r.workspaces)
    .map((r: any) => ({ id: r.workspaces.id, name: r.workspaces.name, slug: r.workspaces.slug, role: r.role }));

  const activeWs =
    userWorkspaces.find((w) => w.id === selectedWsId) ||
    userWorkspaces[0] || { id: "default", name: "Personal Workspace", slug: "personal", role: "owner" };

  const { data: currentMembers } = await supabase
    .from("workspace_members")
    .select("id, user_id, role, created_at")
    .eq("workspace_id", activeWs.id);

  const { data: pendingInvitations } = await supabase
    .from("workspace_invitations")
    .select("id, email, role, status, token, expires_at, created_at")
    .eq("workspace_id", activeWs.id)
    .eq("status", "pending");

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
    <div className={styles.layout}>
      <MainNavigation userEmail={user.email} workspaces={userWorkspaces} activeWorkspaceId={activeWs.id} />

      <main className={styles.main}>
        {successMsg && <div className={styles.alertSuccess}><span>✓</span><span>{successMsg}</span></div>}
        {errorMsg && <div className={styles.alertError}><span>⚠️</span><span>{errorMsg}</span></div>}
        {noticeMsg && <div className={styles.alertInfo}><span>ℹ</span><span>{noticeMsg}</span></div>}

        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Settings</h1>
          <p className={styles.pageSubtitle}>Manage your workspace configuration, team access, and subscription plan.</p>
        </div>

        <div className={styles.tabs}>
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/dashboard/settings?tab=${t.key}${activeWs.id ? `&workspace=${activeWs.id}` : ""}`}
              className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ""}`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* TAB 1: WORKSPACE */}
        {activeTab === "workspace" && (
          <div className={styles.cards}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle} style={{ marginBottom: "1.25rem" }}>Workspace Details</h2>
              <form action={updateWorkspace} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "480px" }}>
                <input type="hidden" name="workspaceId" value={activeWs.id} />
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel} htmlFor="ws-name">Workspace Name</label>
                  <input id="ws-name" name="name" type="text" defaultValue={activeWs.name} required className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel} htmlFor="ws-slug">Workspace Identifier</label>
                  <input id="ws-slug" type="text" defaultValue={activeWs.slug} disabled className={styles.input} style={{ background: "#f3f4f6", cursor: "not-allowed" }} />
                </div>
                <button type="submit" className={styles.btnPrimary} style={{ alignSelf: "flex-start" }}>Save Changes</button>
              </form>
            </div>

            {activeWs.role === "owner" && activeWs.id !== "default" && (
              <div className={styles.dangerZone}>
                <h3 className={styles.dangerTitle}>Delete Workspace</h3>
                <p className={styles.dangerText}>Permanently delete this workspace and remove all associated website connections and team members.</p>
                <form action={deleteWorkspace}>
                  <input type="hidden" name="workspaceId" value={activeWs.id} />
                  <button type="submit" className={styles.btnDanger}>Delete Workspace</button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TEAM MEMBERS */}
        {activeTab === "team" && (
          <div className={styles.cards}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle} style={{ marginBottom: "0.35rem" }}>Invite Team Member</h2>
              <p className={styles.cardSubtitle}>Colleagues receive access to manage website tracking and review attribution logs.</p>
              <form action={inviteTeamMember} className={styles.row} style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
                <input type="hidden" name="workspace_id" value={activeWs.id} />
                <div className={styles.formGroup} style={{ flex: "1 1 220px", marginBottom: 0 }}>
                  <label className={styles.inputLabel} htmlFor="invite-email">Email Address</label>
                  <input id="invite-email" name="email" type="email" placeholder="colleague@company.com" required className={styles.input} />
                </div>
                <div className={styles.formGroup} style={{ width: "140px", marginBottom: 0 }}>
                  <label className={styles.inputLabel} htmlFor="invite-role">Role</label>
                  <select id="invite-role" name="role" defaultValue="member" className={styles.input}>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <button type="submit" className={styles.btnPrimary}>Send Invite</button>
              </form>
            </div>

            <div className={styles.card}>
              <h2 className={styles.cardTitle} style={{ marginBottom: "1rem" }}>Active Members ({currentMembers?.length ?? 1})</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: "60%" }}>User</th>
                      <th style={{ width: "25%" }}>Role</th>
                      <th style={{ width: "15%", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(currentMembers ?? []).map((m: any) => {
                      const isSelf = m.user_id === user.id;
                      return (
                        <tr key={m.id}>
                          <td style={{ fontWeight: 500, color: "#3A313C" }}>{isSelf ? `${user.email} (You)` : `User ${m.user_id.slice(0, 8)}…`}</td>
                          <td><span className={styles.badgeOther} style={{ textTransform: "capitalize" }}>{m.role}</span></td>
                          <td style={{ textAlign: "right" }}>
                            {!isSelf && activeWs.role === "owner" && (
                              <form action={removeMember} style={{ display: "inline" }}>
                                <input type="hidden" name="workspace_id" value={activeWs.id} />
                                <input type="hidden" name="member_id" value={m.id} />
                                <button type="submit" className={styles.btnDanger}>Remove</button>
                              </form>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {pendingInvitations && pendingInvitations.length > 0 && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle} style={{ marginBottom: "1rem", color: "#92400e" }}>Pending Invitations ({pendingInvitations.length})</h2>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
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
                          <td style={{ fontWeight: 500 }}>{inv.email}</td>
                          <td style={{ textTransform: "capitalize" }}>{inv.role}</td>
                          <td><span className="badge badge-referral">Pending</span></td>
                          <td style={{ textAlign: "right" }}>
                            <form action={revokeInvitation} style={{ display: "inline" }}>
                              <input type="hidden" name="invitation_id" value={inv.id} />
                              <input type="hidden" name="workspace_id" value={activeWs.id} />
                              <button type="submit" className={styles.btnDanger}>Revoke</button>
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
        )}

        {/* TAB 3: SUBSCRIPTION */}
        {activeTab === "billing" && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.muted} style={{ fontSize: "calc(.25rem * 3)", textTransform: "uppercase", color: "#BB0C68", fontWeight: 600, letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Current Plan</p>
                <h2 className={styles.cardTitle}>{currentPlan.name}</h2>
                <p className={styles.muted} style={{ marginTop: "0.25rem" }}>
                  ${currentPlan.priceMonthlyUsd} / month · Status: <span style={{ color: "#059669", fontWeight: 600 }}>{subscription?.status || "Active"}</span>
                </p>
              </div>
              <span className={styles.badgeDone}>Active</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", paddingTop: "1.25rem", borderTop: "1px solid #e9eaeb" }}>
              <div>
                <p className={styles.muted} style={{ marginBottom: "0.2rem" }}>Websites Limit</p>
                <p style={{ fontSize: "calc(.25rem * 5)", fontWeight: 700, color: "#3A313C" }}>
                  {currentPlan.websiteLimit === Infinity ? "Unlimited" : currentPlan.websiteLimit}
                </p>
              </div>
              <div>
                <p className={styles.muted} style={{ marginBottom: "0.2rem" }}>Monthly Leads Limit</p>
                <p style={{ fontSize: "calc(.25rem * 5)", fontWeight: 700, color: "#3A313C" }}>{currentPlan.leadsMonthlyLimit.toLocaleString()}</p>
              </div>
              <div>
                <p className={styles.muted} style={{ marginBottom: "0.2rem" }}>CRM Integrations</p>
                <p style={{ fontSize: "calc(.25rem * 5)", fontWeight: 700, color: "#3A313C" }}>{currentPlan.crmIntegrations ? "Enabled" : "Upgrade Required"}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
