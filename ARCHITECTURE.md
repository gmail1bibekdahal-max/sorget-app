# Attributer — System Architecture Document

## 1. System Overview

Attributer is a production-grade multi-tenant B2B marketing attribution SaaS platform. It solves the core problem: **"Know where every lead came from."**

The platform is cleanly decoupled into two distinct systems:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SYSTEM ARCHITECTURE                           │
├────────────────────────────────────┬────────────────────────────────────┤
│   SYSTEM A: Customer SaaS & API    │    SYSTEM B: Browser Tracking SDK  │
│   (Next.js App Router, Supabase)   │    (Standalone Vanilla JS Bundle)  │
├────────────────────────────────────┼────────────────────────────────────┤
│ • Marketing Website & Docs         │ • UTM & Referrer Detection         │
│ • Supabase Auth & Multi-Tenancy    │ • Google Ads Auto-Tagging          │
│ • Workspace & Team Management      │ • Channel Classification Engine    │
│ • Website & Tracking Key Manager   │ • First & Last Touch Persistence   │
│ • Lead Ingestion & Resolution API  │ • Form MutationObserver & Injector │
│ • Attribution Analytics & Reports  │ • Zero-Dependency, Lightweight     │
│ • Billing (Razorpay Subscriptions) │ • CDN-Served Versioned Asset       │
└────────────────────────────────────┴────────────────────────────────────┘
```

---

## 2. Monorepo Structure

```
attributer/
├── apps/
│   ├── web/                     # Main Next.js 15+ SaaS Application
│   │   ├── app/                 # App Router (Marketing, Auth, Dashboard, API)
│   │   │   ├── (auth)/          # Auth routes (login, signup, reset-password)
│   │   │   ├── (dashboard)/     # Authenticated workspaces & analytics
│   │   │   ├── (marketing)/     # Landing pages, pricing, features, docs
│   │   │   └── api/             # Lead ingestion, projects, webhooks, health
│   │   ├── components/          # Reusable React UI component library
│   │   ├── actions/             # Secure Next.js Server Actions
│   │   └── lib/                 # App-specific utilities & Supabase clients
│   └── sdk/                     # Standalone Tracking SDK build source
│       ├── src/                 # Core modular JS tracking files
│       └── dist/                # Bundled, minified distributables (/sdk/v1/)
├── packages/
│   ├── attribution-engine/      # Shared classification & normalization logic
│   ├── shared-types/            # TypeScript schemas & DTO interfaces
│   ├── validation/              # Input sanitization & regex validators
│   └── db/                      # Database clients, helpers & migrations
├── supabase/
│   └── migrations/              # Tracked SQL migrations with RLS policies
├── tests/                       # Automated test suites (Unit, Integration, E2E)
└── public/                      # Static assets & versioned SDK scripts
```

---

## 3. Key Architectural Guarantees

1. **Strict Multi-Tenancy**: All customer data is partitioned by `workspace_id`. Workspace isolation is enforced at the database layer via PostgreSQL Row Level Security (RLS) policies and verified server-side in all Server Actions.
2. **Canonical Project Identification**: Projects and websites are identified strictly by `tracking_id` (`attr_<7chars>`). Website domain URLs are never used for lead routing.
3. **No Service Key Exposure**: `SUPABASE_SERVICE_ROLE_KEY` is exclusively restricted to secure server endpoints (`/api/leads`, webhook handlers) and never bundled into client-side JS or `NEXT_PUBLIC_*` variables.
4. **Resilient Browser Tracking**: The tracking SDK fails gracefully, never blocks page rendering, throws no uncaught exceptions, and handles localStorage corruption automatically.