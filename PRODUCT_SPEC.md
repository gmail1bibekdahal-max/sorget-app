# Attributer — Product Specification

## 1. Product Mission & Value Proposition
Attributer is a marketing attribution platform that captures the true origin of every visitor and passes standardized attribution data directly into form submissions, CRMs, and analytics dashboards.

**Core Promise**: *"Know where every lead came from."*

---

## 2. Target Audience & Personas
- **B2B Marketing Leaders**: Need accurate channel reporting (Paid Search, Organic, Paid Social, Referrals) to allocate ad spend.
- **Demand Generation Managers**: Need drilldown data (Campaign, Ad Group, Keyword, Landing Page) on every inbound lead.
- **RevOps & CRM Administrators**: Need automated field population in Webflow, WordPress, Gravity Forms, HubSpot, and Salesforce without manual tag setup.

---

## 3. Product Functional Requirements Matrix

### 3.1 Tracking & Attribution Engine
- **Channels Supported**: Paid Search, Organic Search, Paid Social, Organic Social, Email, Display, Affiliate, Referral, Direct, Other.
- **Signal Parsers**:
  - UTMs: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
  - Google Ads: `gclid`, `gbraid`, `gad_campaignid`, `gad_source`
  - Referrer: Domain extraction, Search Engine matching, Social Network matching
  - Landing Context: `landingUrl`, `landingPage` (pathname), `landingPageGroup`, `submitPage`
- **Attribution Persistence**:
  - **First-Touch Attribution**: Captured on initial arrival, persisted in browser storage, strictly immutable across subsequent direct or social visits.
  - **Last-Touch Attribution**: Updated on every non-direct visit to track closing influence.

### 3.2 Lead Capture & Form Injection
- **DOM Detection**: Scans page on load and attaches `MutationObserver` for dynamically loaded forms (e.g. popups, slide-ins).
- **Field Mappings**: Injects attribution into matching hidden or visible inputs:
  - `channel`, `source`, `medium`, `campaign`, `content`, `term`
  - `gclid`, `gbraid`, `gad_campaignid`, `gad_source`
  - `landing_page`, `landing_url`, `submit_page`, `referrer`
  - `tracking_id` (the canonical project key)

### 3.3 Multi-Tenant Workspace & Administration
- **Workspaces**: Dedicated workspace per organization with members (`Owner`, `Admin`, `Member`, `Viewer`).
- **Websites**: Multiple domains managed within a single workspace.
- **Reporting**: Channel breakdown charts, source breakdown, lead timelines, and CSV export.
- **Billing**: Tiered plans (Starter, Growth, Scale) integrated via Razorpay subscriptions and automated webhooks.