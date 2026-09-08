import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buildHubSpotOAuthUrl, generateOAuthState } from "@/lib/crm";
import { createWebhook, deleteWebhook } from "@/app/actions/webhooks";
import CopyButton from "@/app/components/CopyButton";
import MainNavigation from "@/app/components/MainNavigation";

export const metadata = {
  title: "Integrations — Sorget",
  description: "Connect Sorget to HubSpot or configure outbound webhooks to pass attribution data.",
};

interface PageProps {
  searchParams: Promise<{
    project?: string;
    workspace?: string;
    success?: string;
    error?: string;
    notice?: string;
  }>;
}

export default async function GlobalIntegrationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { project: selectedProjectId, success, error: errorMsg, notice } = params;

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Fetch workspaces
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

  // Fetch projects (websites)
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, website, tracking_id, workspace_id, created_at")
    .order("created_at", { ascending: false });

  const projectList = projects ?? [];
  const activeProject =
    projectList.find((p) => p.id === selectedProjectId) ||
    projectList[0] ||
    null;

  // Fetch webhooks for active project
  const { data: webhooks } = activeProject
    ? await supabase
        .from("webhooks")
        .select("*")
        .eq("project_id", activeProject.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Fetch CRM connection status
  let hubspotConnection: { is_active: boolean; portal_id?: string | null; token_expires_at?: string | null; scopes?: string | null } | null = null;
  if (activeProject?.workspace_id) {
    const { data: crmConn } = await supabase
      .from("crm_connections")
      .select("is_active, portal_id, token_expires_at, scopes")
      .eq("workspace_id", activeProject.workspace_id)
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
  if (clientId && clientId !== "your_actual_client_id" && activeProject?.workspace_id) {
    const { state } = generateOAuthState(activeProject.workspace_id, activeProject.id);
    hubspotOAuthUrl = buildHubSpotOAuthUrl(clientId, redirectUri, state);
  }

  return (
    <div className="dashboard-layout" style={{ minHeight: "100vh" }}>
      <MainNavigation
        userEmail={user.email}
        workspaces={userWorkspaces}
        activeWorkspaceId={activeProject?.workspace_id || undefined}
      />

      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {/* Banners */}
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

        {/* Page Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>
            Integrations
          </h1>
          <p style={{ color: "var(--text-secondary, #94a3b8)", margin: 0, fontSize: "0.95rem" }}>
            Sorget captures attribution on your site and passes it directly to your CRM and marketing tools.
          </p>
        </div>

        {/* Website Selector */}
        {projectList.length > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "2rem",
            }}
          >
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Viewing integrations for:
            </span>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {projectList.map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/integrations?project=${p.id}`}
                  style={{
                    padding: "0.25rem 0.65rem",
                    borderRadius: "6px",
                    fontSize: "0.8125rem",
                    textDecoration: "none",
                    fontWeight: p.id === activeProject?.id ? 600 : 400,
                    background:
                      p.id === activeProject?.id
                        ? "rgba(108, 99, 255, 0.25)"
                        : "rgba(255, 255, 255, 0.05)",
                    color:
                      p.id === activeProject?.id
                        ? "#ffffff"
                        : "var(--text-secondary)",
                    border:
                      p.id === activeProject?.id
                        ? "1px solid rgba(108, 99, 255, 0.5)"
                        : "1px solid transparent",
                  }}
                >
                  {p.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* SECTION 1: HubSpot CRM */}
          <div
            className="card"
            style={{
              maxWidth: "100%",
              padding: "1.75rem",
              background: "var(--color-card, #1a1a26)",
              border: `1px solid ${isHubSpotConnected ? "rgba(62, 207, 142, 0.3)" : "var(--color-border, rgba(255,255,255,0.08))"}`,
              borderRadius: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "2rem" }}>🟠</span>
                <div>
                  <h2 style={{ fontSize: "1.25rem", margin: 0, color: "#ffffff" }}>
                    HubSpot CRM
                  </h2>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: isHubSpotConnected ? "#3ecf8e" : "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      marginTop: "0.2rem",
                    }}
                  >
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: isHubSpotConnected ? "#3ecf8e" : "#64748b",
                        display: "inline-block",
                      }}
                    />
                    {isHubSpotConnected
                      ? `Connected${hubspotConnection?.portal_id ? ` · Portal ${hubspotConnection.portal_id}` : ""}`
                      : "Not Connected"}
                  </span>
                </div>
              </div>

              {isHubSpotConnected ? (
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    padding: "0.3rem 0.75rem",
                    borderRadius: "999px",
                    background: "rgba(62, 207, 142, 0.15)",
                    color: "#3ecf8e",
                  }}
                >
                  ✓ Active Sync
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    padding: "0.3rem 0.75rem",
                    borderRadius: "999px",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "var(--text-muted)",
                  }}
                >
                  Ready to Connect
                </span>
              )}
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Automatically syncs form submission attribution into HubSpot Contact properties (<code>channel</code>, <code>channeldrilldown1</code>, <code>channeldrilldown2</code>, <code>channeldrilldown3</code>, <code>landingpage</code>, <code>landingpagegroup</code>).
            </p>

            {isPatToken && (
              <div style={{ fontSize: "0.825rem", color: "#f59e0b", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "8px", padding: "0.85rem 1rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
                ⚠ <strong>Configuration Warning:</strong> <code>HUBSPOT_CLIENT_ID</code> in <code>.env</code> starts with <code>pat-</code>, which is a single-portal <em>Private App Token</em>. HubSpot OAuth requires a <em>Public App Client ID</em> created via the HubSpot CLI (<code>hs project create</code>).
              </div>
            )}

            {isHubSpotConnected && !hubspotConnection?.scopes?.includes("crm.schemas.contacts.write") && (
              <div style={{ fontSize: "0.85rem", color: "#38bdf8", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: "8px", padding: "0.85rem 1rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
                ℹ <strong>Reconnection Recommended:</strong> Sorget now supports automatic HubSpot attribution property provisioning. Please click <strong>↻ Reconnect HubSpot</strong> below to grant the <code>crm.schemas.contacts.write</code> scope.
              </div>
            )}

            {!activeProject?.workspace_id ? (
              <div style={{ fontSize: "0.8rem", color: "#f59e0b", background: "rgba(245,158,11,0.1)", borderRadius: "6px", padding: "0.75rem 1rem" }}>
                ⚠ This website is not assigned to a workspace. A workspace is required to connect HubSpot.
              </div>
            ) : !hubspotOAuthUrl ? (
              <div style={{ fontSize: "0.8rem", color: "#f59e0b", background: "rgba(245,158,11,0.1)", borderRadius: "6px", padding: "0.75rem 1rem" }}>
                ⚠ <code>HUBSPOT_CLIENT_ID</code> is not configured. Set it in your <code>.env</code> file to enable one-click OAuth connection.
              </div>
            ) : isHubSpotConnected ? (
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <a
                  href={hubspotOAuthUrl}
                  style={{
                    display: "inline-block",
                    padding: "0.5rem 1rem",
                    borderRadius: "6px",
                    background: "rgba(62, 207, 142, 0.12)",
                    border: "1px solid rgba(62, 207, 142, 0.3)",
                    color: "#3ecf8e",
                    fontSize: "0.875rem",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  ↻ Reconnect HubSpot
                </a>
                <form action="/api/crm/hubspot/disconnect" method="POST" style={{ display: "inline" }}>
                  <input type="hidden" name="workspace_id" value={activeProject.workspace_id} />
                  <button
                    type="submit"
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "6px",
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      color: "#f87171",
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
              <div>
                <a
                  href={hubspotOAuthUrl}
                  className="btn btn-primary"
                  style={{ textDecoration: "none", display: "inline-block" }}
                >
                  Connect HubSpot →
                </a>
              </div>
            )}
          </div>

          {/* SECTION 2: Outbound Webhooks */}
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
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "1.5rem" }}>⚡</span>
                <h2 style={{ fontSize: "1.25rem", margin: 0, color: "#ffffff" }}>
                  Outbound Webhooks
                </h2>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: "0.25rem 0 0 0", lineHeight: 1.5 }}>
                Receive real-time HTTP POST notifications on every lead captured, signed with HMAC-SHA256. Perfect for Zapier, Make, or internal backends.
              </p>
            </div>

            {/* Configured Webhooks List */}
            {(!webhooks || webhooks.length === 0) ? (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px dashed rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "1.5rem",
                  textAlign: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.875rem" }}>
                  No webhooks configured for {activeProject?.name || "this website"}. Add an endpoint below to start receiving real-time payloads.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                {webhooks.map((wh: any) => (
                  <div
                    key={wh.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      padding: "0.85rem 1rem",
                      borderRadius: "8px",
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: "monospace", fontSize: "0.875rem", color: "#3ecfcf" }}>
                        {wh.url}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                        Secret: <code>{wh.secret.substring(0, 10)}••••••••</code> · Status: <span style={{ color: "#3ecf8e" }}>{wh.status}</span>
                      </div>
                    </div>
                    <form action={deleteWebhook}>
                      <input type="hidden" name="webhook_id" value={wh.id} />
                      <input type="hidden" name="project_id" value={activeProject?.id || ""} />
                      <input type="hidden" name="redirect_url" value="/dashboard/integrations" />
                      <button
                        type="submit"
                        style={{
                          background: "none",
                          border: "none",
                          color: "#f87171",
                          fontSize: "0.8125rem",
                          cursor: "pointer",
                          padding: "0.25rem 0.5rem",
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
            {activeProject ? (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "8px",
                  padding: "1.25rem",
                }}
              >
                <h3 style={{ fontSize: "0.95rem", margin: "0 0 0.75rem 0", color: "#ffffff" }}>
                  + Add New Webhook Endpoint
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
                  <input type="hidden" name="project_id" value={activeProject.id} />
                  <input type="hidden" name="redirect_url" value="/dashboard/integrations" />
                  <input
                    name="url"
                    type="url"
                    placeholder="https://api.example.com/webhooks/sorget"
                    required
                    style={{
                      flex: 1,
                      minWidth: "260px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "6px",
                      padding: "0.5rem 0.75rem",
                      color: "#ffffff",
                      fontSize: "0.875rem",
                    }}
                  />
                  <button type="submit" className="btn btn-primary btn-sm">
                    Add Webhook
                  </button>
                </form>
              </div>
            ) : null}
          </div>

        </div>
      </main>
    </div>
  );
}
