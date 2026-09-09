import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CopyButton from "@/app/components/CopyButton";
import MainNavigation from "@/app/components/MainNavigation";
import styles from "../Page.module.css";

export const metadata = {
  title: "Support & Documentation — Sorget",
  description: "Help, troubleshooting, and field references for installing Sorget.",
};

const HIDDEN_FIELDS = [
  { name: "channel", label: "Channel", desc: "High-level marketing channel (e.g. Paid Search, Organic Search, Paid Social, Direct, Referral)" },
  { name: "channeldrilldown1", label: "Channel Drilldown 1", desc: "Specific platform or network (e.g. google, facebook, linkedin, bing)" },
  { name: "channeldrilldown2", label: "Channel Drilldown 2", desc: "Campaign name or search engine name" },
  { name: "channeldrilldown3", label: "Channel Drilldown 3", desc: "Ad group, keyword search term, or creative variation" },
  { name: "landingpage", label: "Landing Page", desc: "Relative path where the visitor first arrived (e.g. /pricing, /request-demo)" },
  { name: "landingpagegroup", label: "Landing Page Group", desc: "Top-level directory grouping (e.g. /features, /solutions, /blog)" },
];

export default async function SupportPage() {
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

  return (
    <div className={styles.layout}>
      <MainNavigation userEmail={user.email} workspaces={userWorkspaces} />

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Support &amp; Documentation</h1>
          <p className={styles.pageSubtitle}>Guides, hidden form field references, and troubleshooting help for Sorget.</p>
        </div>

        <div className={styles.cards}>
          {/* How Sorget Works */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle} style={{ marginBottom: "0.75rem" }}>How Sorget Works</h2>
            <p className={styles.cardSubtitle}>
              Sorget collects and passes attribution data into your CRM and web forms so you can analyze marketing performance where your conversion data lives.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
              {[
                { step: "1. Visitor Lands", desc: "Script parses UTMs, GCLID, and referrers, persisting first-touch source data." },
                { step: "2. Populates Fields", desc: "When forms render, Sorget populates the 6 standard hidden fields automatically." },
                { step: "3. Form Submitted", desc: "Attribution travels alongside form responses to your backend or CRM." },
                { step: "4. Enriches CRM", desc: "HubSpot contacts or outbound webhooks receive clean attribution properties." },
              ].map(({ step, desc }) => (
                <div key={step} className={styles.subBox}>
                  <p style={{ fontWeight: 700, color: "#3A313C", fontSize: "calc(.25rem * 4)", marginBottom: "0.25rem" }}>{step}</p>
                  <p className={styles.muted}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hidden Fields Reference */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle} style={{ marginBottom: "0.75rem" }}>Hidden Form Fields Reference</h2>
            <p className={styles.cardSubtitle}>
              Add these 6 hidden fields to your forms using standard <code>&lt;input type=&quot;hidden&quot; name=&quot;...&quot;&gt;</code> tags or your form builder&apos;s hidden field generator.
            </p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: "25%" }}>Field Name</th>
                    <th style={{ width: "60%" }}>Description</th>
                    <th style={{ width: "15%", textAlign: "right" }}>Copy</th>
                  </tr>
                </thead>
                <tbody>
                  {HIDDEN_FIELDS.map((field) => (
                    <tr key={field.name}>
                      <td>
                        <code style={{ background: "#f3f4f6", color: "#3A313C", padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
                          {field.name}
                        </code>
                      </td>
                      <td className={styles.muted}>{field.desc}</td>
                      <td style={{ textAlign: "right" }}>
                        <CopyButton text={field.name} label="Copy" id={`copy-support-${field.name}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Testing & Debugging */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle} style={{ marginBottom: "0.75rem" }}>How to Test Your Installation</h2>
            <ol style={{ color: "#717680", fontSize: "calc(.25rem * 4)", lineHeight: 1.7, paddingLeft: "1.25rem", margin: 0, fontWeight: 500 }}>
              <li>Open a private / incognito browser window.</li>
              <li>Visit your website with test UTM parameters appended:
                <div className={styles.codeDark} style={{ margin: "0.35rem 0" }}>
                  <code style={{ color: "#38bdf8" }}>
                    https://yourwebsite.com/?utm_source=google&amp;utm_medium=cpc&amp;utm_campaign=test_campaign&amp;gclid=test_gclid_123
                  </code>
                </div>
              </li>
              <li>Inspect your form using browser Developer Tools to confirm the hidden inputs are populated.</li>
              <li>Submit the form with test details.</li>
              <li>Check your <strong>Websites</strong> dashboard log to verify the recorded submission.</li>
            </ol>
          </div>

          {/* Contact Support */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle} style={{ marginBottom: "0.35rem" }}>Need Help?</h2>
            <p className={styles.cardSubtitle}>Have questions about your CRM mapping, custom forms, or tracking setup?</p>
            <a href="mailto:support@sorget.com" className={styles.btnSecondary}>Email Support (support@sorget.com)</a>
          </div>
        </div>
      </main>
    </div>
  );
}
