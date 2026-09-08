# Attributer — Database Design Specification

## 1. Schema Architecture & Multi-Tenancy
All customer data resides in PostgreSQL on Supabase, isolated by `workspace_id`.
Row Level Security (RLS) policies guarantee cross-tenant isolation at the database layer.

---

## 2. Entity Relationship Model

```
┌──────────────┐         ┌────────────────────┐         ┌─────────────────┐
│  auth.users  │◄────────┤ workspace_members  ├────────►│   workspaces    │
└──────────────┘         └────────────────────┘         └────────┬────────┘
                                                                 │
                                                                 │ 1:N
                                                                 ▼
                                                        ┌─────────────────┐
                                                        │    websites     │
                                                        └────────┬────────┘
                                                                 │
                                                                 │ 1:N
                                                                 ▼
                                                        ┌─────────────────┐
                                                        │     leads       │
                                                        └─────────────────┘
```

---

## 3. Core Tables Specification

### 3.1 `workspaces`
Organizations owning websites, team members, subscriptions, and integrations.
- `id` (uuid, PK, default gen_random_uuid())
- `name` (text, not null)
- `slug` (text, unique, not null)
- `created_at` (timestamptz, not null, default now())
- `updated_at` (timestamptz, not null, default now())

### 3.2 `workspace_members`
Association between Supabase `auth.users` and `workspaces` with RBAC roles.
- `id` (uuid, PK, default gen_random_uuid())
- `workspace_id` (uuid, FK -> workspaces.id, on delete cascade)
- `user_id` (uuid, FK -> auth.users.id, on delete cascade)
- `role` (text, check role in ('owner', 'admin', 'member', 'viewer'), not null)
- `created_at` (timestamptz, not null, default now())
- UNIQUE(workspace_id, user_id)

### 3.3 `websites`
Web properties tracked under a workspace.
- `id` (uuid, PK, default gen_random_uuid())
- `workspace_id` (uuid, FK -> workspaces.id, on delete cascade)
- `name` (text, not null)
- `domain` (text)
- `tracking_id` (text, unique, not null) -- e.g. "attr_p01jg97"
- `status` (text, check status in ('active', 'paused', 'pending'), default 'active')
- `created_at` (timestamptz, not null, default now())
- `updated_at` (timestamptz, not null, default now())

### 3.4 `leads`
Attribution records captured by the tracking SDK.
- `id` (uuid, PK, default gen_random_uuid())
- `website_id` (uuid, FK -> websites.id, on delete cascade)
- `name` (text)
- `email` (text, not null)
- `channel` (text)
- `source` (text)
- `medium` (text)
- `campaign` (text)
- `content` (text)
- `term` (text)
- `gclid` (text)
- `gbraid` (text)
- `gad_campaignid` (text)
- `gad_source` (text)
- `referrer` (text)
- `landing_url` (text)
- `landing_page` (text)
- `submit_page` (text)
- `created_at` (timestamptz, not null, default now())

---

## 4. Row Level Security (RLS) Policies
- All queries authenticate via `auth.uid()`.
- Access helper function: `is_workspace_member(ws_id, required_role)`
- `leads` and `websites` allow `SELECT`, `UPDATE`, `DELETE` only to verified workspace members.
- `leads` `INSERT` is performed server-side via Service Role Client during lead ingestion, resolving `tracking_id -> website_id`.