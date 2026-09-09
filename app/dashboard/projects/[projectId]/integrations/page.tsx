import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buildHubSpotOAuthUrl, generateOAuthState } from "@/lib/crm";
import { createWebhook, deleteWebhook } from "@/app/actions/webhooks";
import { getOrCreateDefaultWorkspace } from "@/lib/workspaces";
import MainNavigation from "@/app/components/MainNavigation";
import styles from "../../../Page.module.css";

interface PageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ success?: string; error?: string; notice?: string }>;
}

export const metadata = {
  title: "Integrations & Webhooks — Sorget",
  description: "Connect Sorget to HubSpot CRM or outbound webhooks.",
};

export default async function IntegrationsPage({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  const { success, error: errorMsg, notice } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*, workspace_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) redirect("/dashboard");

  if (!project.workspace_id) {
    const ws = await getOrCreateDefaultWorkspace(supabase, user.id, user.email, user.user_metadata?.full_name);
    await supabase.from("projects").update({ workspace_id: ws.id }).eq("id", project.id);
    project.workspace_id = ws.id;
  }

  const { data: memberRows } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name, slug)")
    .eq("user_id", user.id);

  const userWorkspaces = (memberRows ?? [])
    .filter((r: any) => r.workspaces)
    .map((r: any) => ({ id: r.workspaces.id, name: r.workspaces.name, slug: r.workspaces.slug, role: r.role }));

  const { data: webhooks } = await supabase
    .from("webhooks")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  let hubspotConnection: { is_active: boolean; portal_id?: string | null; token_expires_at?: string | null; scopes?: string | null } | null = null;
  if (project.workspace_id) {
    const { data: crmConn } = await supabase
      .from("crm_connections")
      .select("is_active, portal_id, token_expires_at, scopes")
      .eq("workspace_id", project.workspace_id)
      .eq("provider", "hubspot")
      .single();
    hubspotConnection = crmConn ?? null;
  }

  const isHubSpotConnected = hubspotConnection?.is_active === true;
  const clientId = (process.env.HUBSPOT_CLIENT_ID || "").trim();
  const isPatToken = clientId.startsWith("pat-");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
  const redirectUri = `${siteUrl}/api/crm/hubspot/callback`;

  let hubspotOAuthUrl: string | null = null;
  if (clientId && clientId !== "your_actual_client_id" && project.workspace_id) {
    const { state } = generateOAuthState(project.workspace_id, project.id);
    hubspotOAuthUrl = buildHubSpotOAuthUrl(clientId, redirectUri, state);
  }

  return (
    <div className={styles.layout}>
      <MainNavigation userEmail={user.email} workspaces={userWorkspaces} activeWorkspaceId={project.workspace_id || undefined} activeProjectName={project.name} activeProjectHref={`/dashboard/projects/${project.id}`} />

      <main className={styles.main}>
        {success && <div className={styles.alertSuccess}><span>✓</span><span>{success}</span></div>}
        {errorMsg && <div className={styles.alertError}><span>⚠️</span><span>{errorMsg}</span></div>}
        {notice && <div className={styles.alertInfo}><span>ℹ</span><span>{notice}</span></div>}

        <Link href={`/dashboard/projects/${project.id}`} className={styles.backLink}>← Back to {project.name}</Link>

        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Integrations &amp; Webhooks</h1>
          <p className={styles.pageSubtitle}>Connect {project.name} with HubSpot CRM or receive real-time attribution payloads via webhooks.</p>
        </div>

        <div className={styles.cards}>
          {/* HubSpot CRM */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                <span style={{ fontSize: "1.5rem" }}>🟠</span>
                <div>
                  <h2 className={styles.cardTitle}>HubSpot CRM</h2>
                  <p className={styles.muted} style={{ marginTop: "2px" }}>
                    {isHubSpotConnected
                      ? `Connected${hubspotConnection?.portal_id ? ` · Portal ${hubspotConnection.portal_id}` : ""}`
                      : "Not Connected"}
                  </p>
                </div>
              </div>
              {isHubSpotConnected ? (
                <span className={styles.badgeDone}>✓ Active Sync</span>
              ) : (
                <span className={styles.badgePending}>Ready to Connect</span>
              )}
            </div>

            <p className={styles.cardSubtitle}>
              Automatically synchronizes captured channel, drilldown, and landing page fields to HubSpot Contact properties via OAuth.
            </p>

            {isPatToken && (
              <div className={styles.alertError}>
                <span>⚠️</span>
                <span><strong>Configuration Warning:</strong> <code>HUBSPOT_CLIENT_ID</code> starts with <code>pat-</code>. HubSpot OAuth requires a Public Developer App Client ID.</span>
              </div>
            )}

            {isHubSpotConnected && !hubspotConnection?.scopes?.includes("crm.schemas.contacts.write") && (
              <div className={styles.alertInfo}>
                <span>ℹ</span>
                <span><strong>Reconnection Recommended:</strong> Reconnect HubSpot to grant the <code>crm.schemas.contacts.write</code> scope.</span>
              </div>
            )}

            {!project.workspace_id ? (
              <div className={styles.alertError}>This website has no workspace assigned.</div>
            ) : !hubspotOAuthUrl ? (
              <div className={styles.alertInfo}>Set <code>HUBSPOT_CLIENT_ID</code> in <code>.env</code> to enable OAuth.</div>
            ) : isHubSpotConnected ? (
              <div className={styles.row}>
                <a href={hubspotOAuthUrl} className={styles.btnSecondary}>↻ Reconnect HubSpot</a>
                <form action="/api/crm/hubspot/disconnect" method="POST" style={{ display: "inline" }}>
                  <input type="hidden" name="workspace_id" value={project.workspace_id} />
                  <button type="submit" className={styles.btnDanger}>Disconnect</button>
                </form>
              </div>
            ) : (
              <a href={hubspotOAuthUrl} className={styles.btnPrimary}>Connect HubSpot →</a>
            )}
          </div>

          {/* Outbound Webhooks */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.25rem" }}>⚡</span>
                <h2 className={styles.cardTitle}>Outbound Webhooks</h2>
              </div>
            </div>
            <p className={styles.cardSubtitle}>
              Sorget sends signed HTTP POST payloads whenever a submission is captured on {project.name}.
            </p>

            {(!webhooks || webhooks.length === 0) ? (
              <div className={styles.subBoxDashed} style={{ marginBottom: "1rem" }}>
                <p className={styles.muted}>No webhooks configured yet for this website. Add an endpoint below.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                {webhooks.map((wh: any) => (
                  <div key={wh.id} className={styles.subBox} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontFamily: "monospace", fontSize: "calc(.25rem * 4)", color: "#3A313C", fontWeight: 600 }}>{wh.url}</div>
                      <div className={styles.muted} style={{ marginTop: "0.15rem" }}>
                        Secret: <code>{wh.secret.substring(0, 8)}••••</code> · Status: <span style={{ color: "#059669", fontWeight: 500 }}>{wh.status}</span>
                      </div>
                    </div>
                    <form action={deleteWebhook}>
                      <input type="hidden" name="webhook_id" value={wh.id} />
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="redirect_url" value={`/dashboard/projects/${project.id}/integrations`} />
                      <button type="submit" className={styles.btnDanger}>Remove</button>
                    </form>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.subBox}>
              <p className={styles.muted} style={{ marginBottom: "0.5rem", fontWeight: 600 }}>Add Webhook Endpoint</p>
              <form action={createWebhook} className={styles.row}>
                <input type="hidden" name="project_id" value={project.id} />
                <input type="hidden" name="redirect_url" value={`/dashboard/projects/${project.id}/integrations`} />
                <input name="url" type="url" placeholder="https://your-api.com/webhooks/attributer" required className={styles.input} style={{ flex: 1, minWidth: "240px" }} />
                <button type="submit" className={styles.btnPrimary}>Add Webhook</button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
