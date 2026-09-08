import Link from "next/link";

export const metadata = {
  title: "Documentation & Implementation Guide — Attributer",
  description: "Comprehensive guides for installing Attributer on WordPress, Webflow, HTML, HubSpot, and custom form frameworks.",
};

export default function DocsPage() {
  const sections = [
    {
      id: "quick-start",
      title: "1. Quick Start (HTML Snippet)",
      content: `Add the Attributer tracking script before the </head> tag on every page of your website:

<script
  src="https://your-domain.com/sdk/v1/attributer.js"
  data-tracking-id="attr_your_tracking_id"
  async
></script>

Once installed, Attributer automatically listens for visits, parses UTM parameters and Google Ads click identifiers (GCLID, GBRAID), and writes the attribution data to form hidden fields.`,
    },
    {
      id: "hidden-fields",
      title: "2. Form Hidden Fields Reference",
      content: `Add these hidden inputs to your website forms. Attributer automatically discovers and populates them:

• channel              (e.g. Paid Search, Paid Social, Organic Search, Direct)
• source               (e.g. google, linkedin, newsletter)
• medium               (e.g. cpc, paid_social, email)
• campaign             (e.g. q1_growth, brand_2026)
• drilldown1           (e.g. google, linkedin)
• drilldown2           (e.g. brand_campaign_name)
• drilldown3           (e.g. ad_variant_headline)
• gclid                (Google Ads click ID)
• landing_page_group   (e.g. /features, /pricing)
• submit_page          (URL where the form was submitted)`,
    },
    {
      id: "crm-mapping",
      title: "3. CRM & Form Builder Compatibility",
      content: `Attributer natively supports standard field names across popular form builders and CRMs:

• HubSpot: Automatically fills fields like hs_lead_source and custom contact properties.
• Salesforce: Maps to LeadSource, First_Click_Source__c, and First_Click_Medium__c.
• WordPress / Gravity Forms / Contact Form 7: Maps wpcf7-channel, gform_channel, and standard form inputs.
• Webflow & Typeform: Supports data-attributer-field="channel" attribute selectors.`,
    },
    {
      id: "webhooks-api",
      title: "4. Outbound Webhooks & API",
      content: `Whenever a lead is created, Attributer dispatches an HTTP POST webhook with a timing-safe HMAC-SHA256 signature in the X-Attributer-Signature header.

Verify signatures using your webhook secret:
const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");`,
    },
  ];

  return (
    <div style={{ background: "#0a0f1d", color: "#f8fafc", minHeight: "100vh" }}>
      <nav style={{ padding: "1.25rem 2rem", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", color: "#fff", fontWeight: 700 }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "linear-gradient(135deg, #6366f1, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center" }}>⚡</div>
          <span>Attributer Docs</span>
        </Link>
        <Link href="/dashboard" style={{ color: "#818cf8", textDecoration: "none", fontSize: "0.875rem" }}>
          Go to Dashboard →
        </Link>
      </nav>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "3rem 1.5rem" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>Documentation &amp; Guides</h1>
        <p style={{ color: "#94a3b8", fontSize: "1.125rem", marginBottom: "3rem" }}>
          Everything you need to install, configure, and integrate Attributer with your marketing stack.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          {sections.map((section) => (
            <div
              key={section.id}
              id={section.id}
              style={{
                background: "#0f172a",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "2rem",
              }}
            >
              <h2 style={{ fontSize: "1.375rem", margin: "0 0 1rem", color: "#f1f5f9" }}>{section.title}</h2>
              <pre
                style={{
                  background: "#060913",
                  padding: "1.25rem",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  color: "#cbd5e1",
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                  fontFamily: "var(--font-mono, monospace)",
                  lineHeight: 1.6,
                }}
              >
                {section.content}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}