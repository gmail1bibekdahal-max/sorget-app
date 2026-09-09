import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Documentation & Implementation Guide — Sorget",
  description: "Comprehensive guides for installing Sorget on WordPress, Webflow, HTML, HubSpot, and custom form frameworks.",
};

export default function DocsPage() {
  const sections = [
    {
      id: "quick-start",
      title: "1. Quick Start (HTML Snippet)",
      content: `Add the Sorget tracking script before the </head> tag on every page of your website:

<script
  src="https://app.sorget.site/attributer.js"
  data-tracking-id="attr_your_tracking_id"
  async
></script>

Once installed, Sorget automatically listens for visits, parses UTM parameters and Google Ads click identifiers (GCLID, GBRAID), and writes the attribution data to form hidden fields.`,
    },
    {
      id: "hidden-fields",
      title: "2. Form Hidden Fields Reference",
      content: `Add these hidden inputs to your website forms. Sorget automatically discovers and populates them:

• channel              (e.g. Paid Search, Paid Social, Organic Search, Direct)
• channeldrilldown1    (e.g. google, linkedin, bing)
• channeldrilldown2    (e.g. campaign_name, search_network)
• channeldrilldown3    (e.g. ad_group, keyword_term, creative_id)
• landingpage          (e.g. /pricing, /request-demo)
• landingpagegroup     (e.g. /features, /solutions, /blog)`,
    },
    {
      id: "crm-mapping",
      title: "3. CRM & Form Builder Compatibility",
      content: `Sorget natively supports standard field names across popular form builders and CRMs:

• HubSpot: Automatically fills channel, drilldown, and landing page contact properties via OAuth sync.
• Webflow & WordPress: Automatically populates hidden inputs named channel, channeldrilldown1, etc.
• Gravity Forms & Contact Form 7: Supports standard hidden input name matching.
• Custom Forms & HTML: Works out of the box with any form with corresponding input names.`,
    },
    {
      id: "webhooks-api",
      title: "4. Outbound Webhooks & API",
      content: `Whenever a lead is created, Sorget dispatches an HTTP POST webhook with a timing-safe HMAC-SHA256 signature in the X-Sorget-Signature header.

Verify signatures using your webhook secret:
const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");`,
    },
  ];

  return (
    <div style={{ background: "var(--sorget-bg, #f1f5f9)", color: "var(--sorget-dark, #3A313C)", minHeight: "100vh" }}>
      <nav style={{ background: "#ffffff", padding: "1.25rem 2rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none", color: "var(--sorget-dark, #3A313C)", fontWeight: 700, fontSize: "1.125rem" }}>
          <Image src="/logo.png" alt="Sorget Logo" width={28} height={28} style={{ borderRadius: "6px" }} />
          <span>Sorget Docs</span>
        </Link>
        <Link href="/dashboard" style={{ color: "var(--sorget-pink, #BB0C68)", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}>
          Go to Dashboard →
        </Link>
      </nav>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "3rem 1.5rem" }}>
        <h1 style={{ fontSize: "2.25rem", fontWeight: 800, marginBottom: "0.5rem", color: "var(--sorget-dark, #3A313C)" }}>Documentation &amp; Guides</h1>
        <p style={{ color: "var(--sorget-grey, #64748b)", fontSize: "1.05rem", marginBottom: "2.5rem" }}>
          Everything you need to install, configure, and integrate Sorget with your marketing stack.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {sections.map((section) => (
            <div
              key={section.id}
              id={section.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "2rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <h2 style={{ fontSize: "1.25rem", margin: "0 0 1rem", color: "var(--sorget-dark, #3A313C)", fontWeight: 700 }}>{section.title}</h2>
              <pre
                style={{
                  background: "#1e293b",
                  padding: "1.25rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  color: "#38bdf8",
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