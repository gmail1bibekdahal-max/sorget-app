# Attributer — Tracking SDK Specification

## 1. SDK Architecture & Principles
The Attributer Tracking SDK (`attributer.js`) is a self-contained, zero-dependency browser script loaded asynchronously on customer websites.

### Core Principles:
- **Zero Framework Dependency**: Runs independently of React, Vue, Next.js, or any frontend framework.
- **Fail-Safe Operation**: Wrapped in top-level try/catch guards. Never throws uncaught exceptions or interrupts host page execution.
- **Asynchronous Execution**: Does not block DOMContentLoaded or paint lifecycles.
- **Single Source of Truth**: Reads `data-tracking-id` directly from its own `<script>` tag.

---

## 2. Parameter Detection & Channel Classification

### 2.1 UTM & Signal Extraction
1. `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
2. Google Ads click identifiers: `gclid`, `gbraid`, `gad_campaignid`, `gad_source`
3. Referrer URL and domain analysis (`document.referrer`)
4. Landing page URL, pathname, and landing group

### 2.2 Channel Classification Hierarchy
1. **Paid Search**: Contains Google Ads param (`gclid`, `gbraid`, `gad_campaignid`, `gad_source`) OR medium in `['cpc', 'ppc', 'paidsearch', 'paid_search']`
2. **Paid Social**: Medium in `['paid_social', 'paidsocial', 'social_paid', 'paid-social']`
3. **Email**: Medium in `['email', 'e-mail', 'email_marketing']`
4. **Display**: Medium in `['display', 'banner', 'cpm']`
5. **Affiliate**: Medium in `['affiliate', 'aff']`
6. **Organic Search**: Source in known search engines (`google`, `bing`, `yahoo`, `duckduckgo`, etc.) OR referrer is a known search engine without paid parameters
7. **Organic Social**: Source in known social platforms (`facebook`, `linkedin`, `instagram`, `twitter`, `tiktok`, `youtube`, etc.) OR referrer is a known social domain without paid parameters
8. **Referral**: External referrer with non-matching domain
9. **Direct**: No source, medium, or external referrer

---

## 3. Storage Persistence Model
- **Storage Mechanism**: Browser `localStorage` (fallback to cookie if blocked).
- **First-Touch Key**: `attributer_first_touch` (immutable once set; expires after 90 days).
- **Last-Touch Key**: `attributer_last_touch` (updated on new non-direct sessions).
- **Data Integrity**: JSON schema validation upon read; automatic cleanup and recovery if corrupted.

---

## 4. Form Auto-Population & MutationObserver
1. On `DOMContentLoaded` (or immediately if already loaded), the SDK searches for all `<form>` elements.
2. For each form, it looks for inputs matching attribution keys: `channel`, `source`, `medium`, `campaign`, `content`, `term`, `gclid`, `gbraid`, `gad_campaignid`, `gad_source`, `landing_page`, `landing_url`, `referrer`, `tracking_id`.
3. Populates only empty inputs (preserves pre-filled values).
4. Attaches a `MutationObserver` to `document.body` to auto-populate any dynamically injected forms (e.g. modals, popups, Typeform/HubSpot embeds).