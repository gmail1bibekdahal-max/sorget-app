import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/app/actions/projects";
import CopyButton from "@/app/components/CopyButton";
import MainNavigation from "@/app/components/MainNavigation";
import { buildHubSpotOAuthUrl, generateOAuthState } from "@/lib/crm";
import FormFieldsGuide from "./FormFieldsGuide";
import styles from "./GettingStarted.module.css";

export const metadata = {
  title: "Getting Started — Sorget",
  description: "Set up Sorget marketing attribution tracking on your website.",
};

const HIDDEN_FIELDS = [
  { name: "channel", label: "Channel", example: "Paid Search, Organic Search, Paid Social, Direct, Referral" },
  { name: "channeldrilldown1", label: "Channel Drilldown 1", example: "google, facebook, linkedin, bing" },
  { name: "channeldrilldown2", label: "Channel Drilldown 2", example: "Campaign name, ad network, search engine" },
  { name: "channeldrilldown3", label: "Channel Drilldown 3", example: "Ad group, keyword term, ad creative content" },
  { name: "landingpage", label: "Landing Page", example: "/pricing, /request-demo, /get-started" },
  { name: "landingpagegroup", label: "Landing Page Group", example: "/features, /solutions, /blog" },
];

interface PageProps {
  searchParams: Promise<{ project?: string; workspace?: string; error?: string; success?: string }>;
}

export default async function GettingStartedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const errorMsg = params.error;
  const successMsg = params.success;
  const selectedProjectId = params.project;

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { data: memberRows } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name, slug)")
    .eq("user_id", user.id);

  const userWorkspaces = (memberRows ?? [])
    .filter((r: any) => r.workspaces)
    .map((r: any) => ({ id: r.workspaces.id, name: r.workspaces.name, slug: r.workspaces.slug, role: r.role }));

  const selectedWsId = params.workspace || userWorkspaces[0]?.id;

  let projectsQuery = supabase
    .from("projects")
    .select("id, name, website, tracking_id, workspace_id, created_at")
    .order("created_at", { ascending: false });

  if (selectedWsId) {
    projectsQuery = projectsQuery.eq("workspace_id", selectedWsId);
  } else {
    projectsQuery = projectsQuery.eq("user_id", user.id);
  }

  const { data: projects } = await projectsQuery;
  const projectList = projects ?? [];
  const activeProject = projectList.find((p) => p.id === selectedProjectId) || projectList[0] || null;

  let leadCount = 0;
  let isHubSpotConnected = false;
  let webhookCount = 0;

  if (activeProject) {
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("project_id", activeProject.id);
    leadCount = count ?? 0;

    const { data: integrations } = await supabase
      .from("integrations")
      .select("provider, is_active")
      .eq("project_id", activeProject.id)
      .eq("provider", "hubspot")
      .eq("is_active", true);
    isHubSpotConnected = Boolean(integrations && integrations.length > 0);

    const { count: hookCount } = await supabase
      .from("webhooks")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", activeProject.workspace_id);
    webhookCount = hookCount ?? 0;
  }

  const clientId = (process.env.HUBSPOT_CLIENT_ID || "").trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://app.sorget.site";
  const redirectUri = `${siteUrl}/api/crm/hubspot/callback`;
  let hubspotOAuthUrl: string | null = null;
  if (clientId && clientId !== "your_actual_client_id" && activeProject?.workspace_id) {
    const { state } = generateOAuthState(activeProject.workspace_id, activeProject.id);
    hubspotOAuthUrl = buildHubSpotOAuthUrl(clientId, redirectUri, state);
  }

  const step1Complete = Boolean(activeProject);
  const step3Complete = isHubSpotConnected || webhookCount > 0;
  const step4Complete = leadCount > 0;

  const scriptSrc = siteUrl ? `${siteUrl}/attributer.js` : "/attributer.js";
  const line1 = `<script type="text/javascript">`;
  const line2 = activeProject
    ? `  src="${scriptSrc}" data-tracking-id="${activeProject.tracking_id}"></script>`
    : `  src="${scriptSrc}" data-tracking-id="YOUR_TRACKING_ID"></script>`;
  const trackingSnippet = activeProject
    ? `<script type="text/javascript" src="${scriptSrc}" data-tracking-id="${activeProject.tracking_id}"></script>`
    : `<script type="text/javascript" src="${scriptSrc}" data-tracking-id="YOUR_TRACKING_ID"></script>`;

  return (
    <div className={styles.layout}>
      <MainNavigation
        userEmail={user.email}
        workspaces={userWorkspaces}
        activeWorkspaceId={activeProject?.workspace_id ?? selectedWsId}
      />

      <main className={styles.main}>
        {errorMsg && <div className={styles.alertError}><span>⚠️</span><span>{errorMsg}</span></div>}
        {successMsg && <div className={styles.alertSuccess}><span>✓</span><span>{successMsg}</span></div>}

        {/* Header */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Getting Started</h1>
          <p className={styles.pageSubtitle}>
            Install Sorget on your website and configure hidden form fields to capture marketing attribution.
          </p>
        </div>

        {/* Website Selector */}
        {projectList.length > 1 && (
          <div className={styles.websiteSelector}>
            <span className={styles.websiteSelectorLabel}>Configuring:</span>
            {projectList.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/getting-started?project=${p.id}`}
                className={`${styles.websiteChip} ${p.id === activeProject?.id ? styles.websiteChipActive : styles.websiteChipInactive}`}
              >
                {p.name}
              </Link>
            ))}
          </div>
        )}

        {/* Steps */}
        <div className={styles.steps}>

          {/* Step 1 */}
          <div className={styles.stepCard}>
            <div className={styles.stepHeader}>
              <h2 className={styles.stepTitle}>Install the tracking snippet</h2>
            </div>

            <p className={styles.stepDesc}>
              Copy and paste the Sorget script into the <code>&lt;head&gt;</code> of your website.{" "}
              <Link href="/dashboard/support">Learn how here.</Link>
            </p>

            <div className={styles.codeBox}>
              <pre className={styles.codeText}>{line1}{"\n"}{line2}</pre>
              <CopyButton text={trackingSnippet} className={styles.copyBtn} />
            </div>

            {!activeProject && (
              <div className={styles.registerBox}>
                <span className={styles.registerLabel}>Register your website to get your unique tracking ID</span>
                <form action={createProject} className={styles.registerForm}>
                  <input name="name" type="text" placeholder="Website Name" required className={styles.registerInput} />
                  <input name="website" type="text" placeholder="https://example.com" className={styles.registerInput} />
                  <button type="submit" className={styles.registerBtn}>Add Website</button>
                </form>
              </div>
            )}

          </div>

          {/* Step 2 */}
          <div className={styles.stepCard}>
            <div className={styles.stepHeader}>
              <h2 className={styles.stepTitle}>Add hidden fields to your forms</h2>
            </div>

            <p className={styles.stepDesc}>
              Add 6 hidden fields to your forms. Sorget will automatically populate them with attribution data when a visitor submits.
            </p>

            <FormFieldsGuide fields={HIDDEN_FIELDS} />
          </div>

          {/* Step 3 */}
          <div className={styles.stepCard}>
            <div className={styles.stepHeader}>
              <h2 className={styles.stepTitle}>Connect your CRM or webhook</h2>
            </div>

            <p className={styles.stepDesc}>
              Send attribution data automatically to your CRM or any endpoint with every form submission.
            </p>

            <div className={styles.integrationGrid}>
              <div className={styles.integrationCard}>
                <div className={styles.integrationCardTitle}>
                  <span style={{ fontSize: "20px" }}>🟠</span>
                  <strong>HubSpot CRM</strong>
                </div>
                <p className={styles.integrationCardDesc}>
                  Creates and updates contacts with channel, campaign, and keyword source data.
                </p>
                {isHubSpotConnected ? (
                  <span className={styles.integrationConnected}>✓ Connected &amp; Syncing</span>
                ) : hubspotOAuthUrl ? (
                  <a href={hubspotOAuthUrl} className={styles.integrationBtn}>Connect HubSpot</a>
                ) : (
                  <Link
                    href={activeProject ? `/dashboard/projects/${activeProject.id}/integrations` : "/dashboard/integrations"}
                    className={styles.integrationBtnSecondary}
                  >
                    Configure HubSpot
                  </Link>
                )}
              </div>

              <div className={styles.integrationCard}>
                <div className={styles.integrationCardTitle}>
                  <span style={{ fontSize: "20px" }}>⚡</span>
                  <strong>Outbound Webhooks</strong>
                </div>
                <p className={styles.integrationCardDesc}>
                  Deliver signed JSON payloads to Zapier, Make, or any custom API endpoint.
                </p>
                <Link
                  href={activeProject ? `/dashboard/projects/${activeProject.id}/integrations` : "/dashboard/integrations"}
                  className={styles.integrationBtnSecondary}
                >
                  {webhookCount > 0 ? `✓ ${webhookCount} Webhook(s) Active` : "Configure Webhooks"}
                </Link>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className={styles.stepCard}>
            <div className={styles.stepHeader}>
              <h2 className={styles.stepTitle}>Test your installation</h2>
            </div>

            <p className={styles.stepDesc}>
              Run a test to verify the tracking snippet is detected and your forms contain the correct hidden fields.
            </p>

            <div className={styles.stepActions}>
              {activeProject ? (
                <>
                  <Link href={`/dashboard/projects/${activeProject.id}/debugger`} className={styles.actionBtnPrimary}>
                    Run Installation Test
                  </Link>
                  <Link href={`/dashboard/projects/${activeProject.id}`} className={styles.actionBtnSecondary}>
                    View Leads Log
                  </Link>
                </>
              ) : (
                <span className={styles.pendingNote}>Add a website in Step 1 first to run installation tests.</span>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
