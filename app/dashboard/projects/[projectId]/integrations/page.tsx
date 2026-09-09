import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buildHubSpotOAuthUrl, generateOAuthState } from "@/lib/crm";
import { createWebhook, deleteWebhook } from "@/app/actions/webhooks";
import { getOrCreateDefaultWorkspace } from "@/lib/workspaces";
import MainNavigation from "@/app/components/MainNavigation";

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
  if (!user) {
    redirect("/login");
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*, workspace_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    redirect("/dashboard");
  }

  // Auto-heal workspace if project is missing workspace_id
  if (!project.workspace_id) {
    const ws = await getOrCreateDefaultWorkspace(
      supabase,
      user.id,
      user.email,
      user.user_metadata?.full_name
    );
    await supabase
      .from("projects")
      .update({ workspace_id: ws.id })
      .eq("id", project.id);
    project.workspace_id = ws.id;
  }

  // Fetch workspaces for navigation
  const { data: memberRows } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name, slug)")
    .eq("user_id", user.id);

  const userWorkspaces = (memberRows ?? [])
    .filter((r: any) => r.workspaces)
    .map((r: any) => ({
      id: r.workspaces.id,
      name: r.workspaces.name,
      slug: r.workspaces.slug,
      role: r.role,
    }));

  // Fetch webhooks for this project
  const { data: webhooks } = await supabase
    .from("webhooks")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  // Fetch CRM connection status
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

  // Build HubSpot OAuth URL
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
    <div className="dashboard-layout" style={{ minHeight: "100vh" }}>
      <MainNavigation
        userEmail={user.email}
        workspaces={userWorkspaces}
        activeWorkspaceId={project.workspace_id || undefined}
      />

      <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <Link href={`/dashboard/projects/${project.id}`} style={{ color: "var(--sorget-pink, #BB0C68)", fontSize: "0.875rem", textDecoration: "none", fontWeight: 500 }}>
            ← Back to {project.name}
          </Link>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, color: "var(--sorget-dark, #3A313C)" }}>
            Integrations &amp; Webhooks
          </h1>
          <p style={{ color: "var(--sorget-grey, #64748b)", margin: "0.25rem 0 0 0", fontSize: "0.95rem" }}>
            Connect {project.name} with HubSpot or receive real-time attribution payloads via webhooks.
          </p>
        </div>

        {/* Flash messages */}
        {success && (
          <div className="alert alert-success" style={{ marginBottom: "1.5rem" }}>
            ✓ {success}
          </div>
        )}
        {errorMsg && (
          <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
            ✗ {errorMsg}
          </div>
        )}
        {notice && (
          <div className="alert alert-info" style={{ marginBottom: "1.5rem" }}>
            ℹ {notice}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* CRM Integrations Section */}
          <div
            className="card"
            style={{
              maxWidth: "100%",
              background: "#ffffff",
              border: `1px solid ${isHubSpotConnected ? "#a7f3d0" : "#e2e8f0"}`,
              borderRadius: "14px",
              padding: "1.75rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "2rem" }}>🟠</span>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: "1.25rem", color: "var(--sorget-dark, #3A313C)" }}>HubSpot CRM</h2>
                <span style={{
                  fontSize: "0.8rem",
                  color: isHubSpotConnected ? "#059669" : "#64748b",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  marginTop: "0.2rem",
                }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isHubSpotConnected ? "#10b981" : "#94a3b8", display: "inline-block" }} />
                  {isHubSpotConnected ? `Connected${hubspotConnection?.portal_id ? ` · Portal ${hubspotConnection.portal_id}` : ""}` : "Not Connected"}
                </span>
              </div>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--sorget-grey, #64748b)", margin: "0 0 1.25rem 0", lineHeight: 1.5 }}>
              Automatically syncs captured channel, drilldown, and landing page fields to HubSpot Contact properties via OAuth.
            </p>

            {isPatToken && (
              <div style={{ fontSize: "0.825rem", color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "0.85rem 1rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
                ⚠ <strong>Configuration Warning:</strong> <code>HUBSPOT_CLIENT_ID</code> in <code>.env</code> starts with <code>pat-</code>, which is a single-portal <em>Private App Token</em>. HubSpot OAuth requires a <em>Public Developer App Client ID</em> created at <a href="https://developers.hubspot.com/" target="_blank" rel="noopener noreferrer" style={{ color: "#b45309", textDecoration: "underline", fontWeight: 600 }}>developers.hubspot.com</a>.
              </div>
            )}

            {isHubSpotConnected && !hubspotConnection?.scopes?.includes("crm.schemas.contacts.write") && (
              <div style={{ fontSize: "0.85rem", color: "#0369a1", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "0.85rem 1rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
                ℹ <strong>Reconnection Recommended:</strong> Sorget now supports automatic HubSpot attribution property provisioning. Please click <strong>↻ Reconnect HubSpot</strong> below to grant the <code>crm.schemas.contacts.write</code> scope.
              </div>
            )}

            {!project.workspace_id ? (
              <div style={{ fontSize: "0.8rem", color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", padding: "0.75rem 1rem" }}>
                ⚠ This project has no workspace assigned. A workspace is required for CRM integrations.
              </div>
            ) : !hubspotOAuthUrl ? (
              <div style={{ fontSize: "0.8rem", color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", padding: "0.75rem 1rem" }}>
                ⚠ <code>HUBSPOT_CLIENT_ID</code> is not configured. Set it in <code>.env</code> to enable OAuth.
              </div>
            ) : isHubSpotConnected ? (
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <a
                  href={hubspotOAuthUrl}
                  style={{
                    display: "inline-block",
                    padding: "0.5rem 1rem",
                    borderRadius: "6px",
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    color: "#059669",
                    fontSize: "0.875rem",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  ↻ Reconnect HubSpot
                </a>
                <form action="/api/crm/hubspot/disconnect" method="POST" style={{ display: "inline" }}>
                  <input type="hidden" name="workspace_id" value={project.workspace_id} />
                  <button
                    type="submit"
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "6px",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      color: "#dc2626",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    Disconnect
                  </button>
                </form>
              </div>
            ) : (
              <a
                href={hubspotOAuthUrl}
                className="btn btn-primary"
                style={{ textDecoration: "none", display: "inline-block" }}
              >
                Connect HubSpot →
              </a>
            )}
          </div>

          {/* Outbound Webhooks Section */}
          <div className="card" style={{ maxWidth: "100%", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "1.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span style={{ fontSize: "1.5rem" }}>⚡</span>
              <h2 style={{ fontSize: "1.25rem", margin: 0, color: "var(--sorget-dark, #3A313C)" }}>Outbound Webhooks</h2>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--sorget-grey, #64748b)", margin: "0.25rem 0 1.25rem 0", lineHeight: 1.5 }}>
              Sorget sends signed HTTP POST payloads whenever a lead is captured on {project.name}.
            </p>

            {(!webhooks || webhooks.length === 0) ? (
              <div style={{ background: "#f8fafc", padding: "1.5rem", borderRadius: "8px", border: "1px dashed #cbd5e1", textAlign: "center", marginBottom: "1.5rem" }}>
                <p style={{ color: "var(--sorget-grey, #64748b)", margin: 0, fontSize: "0.875rem" }}>
                  No webhooks configured yet for this website. Add an endpoint below.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                {webhooks.map((wh: any) => (
                  <div key={wh.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "0.85rem 1rem", borderRadius: "8px" }}>
                    <div>
                      <div style={{ fontFamily: "monospace", fontSize: "0.875rem", color: "var(--sorget-pink, #BB0C68)", fontWeight: 600 }}>{wh.url}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--sorget-grey, #64748b)", marginTop: "0.2rem" }}>
                        Secret: <code>{wh.secret.substring(0, 8)}••••••••</code> · Status: <span style={{ color: "#059669", fontWeight: 600 }}>{wh.status}</span>
                      </div>
                    </div>
                    <form action={deleteWebhook}>
                      <input type="hidden" name="webhook_id" value={wh.id} />
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="redirect_url" value={`/dashboard/projects/${project.id}/integrations`} />
                      <button
                        type="submit"
                        style={{
                          background: "none",
                          border: "none",
                          color: "#dc2626",
                          fontSize: "0.8125rem",
                          cursor: "pointer",
                          fontWeight: 500,
                        }}
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}

            {/* Add Webhook Form */}
            <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: "0.95rem", margin: "0 0 0.75rem 0", color: "var(--sorget-dark, #3A313C)", fontWeight: 600 }}>
                + Add Webhook Endpoint
              </h3>
              <form
                action={createWebhook}
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <input type="hidden" name="project_id" value={project.id} />
                <input type="hidden" name="redirect_url" value={`/dashboard/projects/${project.id}/integrations`} />
                <input
                  name="url"
                  type="url"
                  placeholder="https://your-api.com/webhooks/attributer"
                  required
                  style={{
                    flex: 1,
                    minWidth: "260px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    padding: "0.5rem 0.75rem",
                    color: "var(--sorget-dark, #3A313C)",
                    fontSize: "0.875rem",
                  }}
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  Add Webhook
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}