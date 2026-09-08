# Attributer — Integration Specification

## 1. Overview
Attributer provides an extensible integration layer for syncing captured lead attribution data with downstream CRMs, form builders, and automation webhooks.

---

## 2. Form Builder Integration Strategies

### 2.1 Hidden Field Injection (Native)
Works out of the box for standard HTML forms, Webflow Forms, WordPress (Contact Form 7, WPForms, Gravity Forms), and Shopify.
- Customer adds hidden fields named `channel`, `source`, `medium`, `campaign`, `gclid`, `tracking_id`.
- Attributer SDK automatically populates these fields on page load and submission.

---

## 3. CRM & Webhook Integrations

### 3.1 Outbound Webhooks
Customers can configure webhook endpoints in their workspace settings to receive real-time JSON payloads upon lead creation:
- **Event**: `lead.created`
- **Security**: Signed with HMAC-SHA256 signature in `X-Attributer-Signature` header.
- **Retry Mechanism**: Exponential backoff with up to 3 retry attempts.

### 3.2 Native CRM Connectors (HubSpot, Salesforce, Pipedrive)
- **OAuth 2.0 Flow**: Secure token exchange and server-side token refresh.
- **Field Mapping UI**: Visual mapping from Attributer fields to CRM Contact/Deal properties.