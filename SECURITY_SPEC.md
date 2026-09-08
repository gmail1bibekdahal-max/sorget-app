# Attributer — Security & Privacy Specification

## 1. Security Architecture & Controls

### 1.1 Row Level Security (RLS)
- Every table containing customer data is protected by Supabase PostgreSQL RLS.
- Policies verify `auth.uid()` against workspace membership.
- Server Actions enforce workspace permissions on every mutation.

### 1.2 Credential Protection
- `SUPABASE_SERVICE_ROLE_KEY` is strictly server-only (used solely for lead ingestion and webhooks).
- Never included in client bundles or `NEXT_PUBLIC_*` environment variables.
- Razorpay API secrets and Webhook secrets are strictly server-side.

### 1.3 Lead Ingestion Security & Spoofing Protection
- Ingestion endpoint `POST /api/leads` resolves `tracking_id -> website_id` server-side.
- Any client-supplied `project_id` or `website_id` in request payloads is ignored.
- CORS headers dynamically allow verified customer origins while supporting testing harnesses.