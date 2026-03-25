# Go Virall — Admin Dashboard Scope

> Complete scope for building the admin dashboard, ported from the RankPulse AI (Optic Rank) admin system and adapted for a social media influencer platform.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Migration](#2-database-migration)
3. [Auth & Guards](#3-auth--guards)
4. [DAL (Data Access Layer)](#4-dal-data-access-layer)
5. [Server Actions](#5-server-actions)
6. [Layout & Navigation](#6-layout--navigation)
7. [Pages — Full Spec (20 pages)](#7-pages--full-spec)
8. [Shared UI Patterns](#8-shared-ui-patterns)
9. [File Structure](#9-file-structure)
10. [Build Order](#10-build-order)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  src/app/admin/layout.tsx    (server — requireAdmin)    │
│  ┌───────────┐  ┌─────────────────────────────────────┐ │
│  │ admin-nav │  │  page.tsx (server — data fetching)   │ │
│  │  (client) │  │  └→ *-client.tsx (client — UI/state) │ │
│  └───────────┘  └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
         │                        │
         ▼                        ▼
   src/lib/dal/admin.ts    src/lib/actions/admin.ts
   (read queries)          (mutations — "use server")
         │                        │
         ▼                        ▼
   createAdminClient()     createAdminClient()
   (bypasses RLS)          (bypasses RLS)
```

**Pattern for every page:**
1. `page.tsx` — Server component. Calls `requireAdmin()`, fetches data from DAL, passes as props to client component.
2. `*-client.tsx` — Client component (`"use client"`). Receives data as props, renders UI, calls server actions for mutations.
3. `loading.tsx` — Optional skeleton loader per page.

**Tech stack (already in project):**
- Next.js 16 App Router, TypeScript, Tailwind CSS v4
- Supabase (Postgres + Auth), `createAdminClient()` already exists at `src/lib/supabase/admin.ts`
- Editorial design system (Playfair Display, IBM Plex Sans/Mono, cream/dark theme)
- Stripe for billing

---

## 2. Database Migration

Create `supabase/migrations/006_admin_tables.sql` with the following new tables. All existing tables (`organizations`, `profiles`, `social_profiles`, `social_metrics`, `social_analyses`, `social_competitors`, `social_goals`, `deals`, `deal_deliverables`, `campaigns`, `notifications`, `user_preferences`, `platform_api_configs`, `api_call_log`) remain unchanged.

### New Tables

```sql
-- ============================================================
-- Migration 006: Admin Dashboard Tables
-- ============================================================

-- 1. audit_log — tracks admin & user actions
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  action TEXT NOT NULL,          -- e.g. 'profile.created', 'deal.completed', 'plan.upgraded'
  resource_type TEXT,            -- e.g. 'social_profile', 'deal', 'organization'
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC);

-- 2. billing_events — Stripe webhook events log
CREATE TABLE billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,      -- e.g. 'invoice.paid', 'subscription.created'
  stripe_event_id TEXT,
  amount_cents INT DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_billing_events_org ON billing_events(organization_id, created_at DESC);
CREATE INDEX idx_billing_events_created ON billing_events(created_at DESC);

-- 3. contact_submissions — from marketing site contact form
CREATE TABLE contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_contacts_status ON contact_submissions(status, created_at DESC);

-- 4. site_content — CMS blocks for marketing pages
CREATE TABLE site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page TEXT NOT NULL,            -- e.g. 'home', 'pricing', 'about'
  section TEXT NOT NULL,         -- e.g. 'hero', 'features', 'faq'
  content JSONB NOT NULL DEFAULT '{}',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_site_content_page ON site_content(page, sort_order);

-- 5. posts — blog articles, guides, tutorials
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT DEFAULT 'blog' CHECK (type IN ('blog', 'guide', 'tutorial')),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  author_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  tags TEXT[] DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_status ON posts(status, published_at DESC);

-- 6. changelog_entries
CREATE TABLE changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT DEFAULT 'improvement' CHECK (type IN ('feature', 'improvement', 'fix', 'breaking')),
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. roadmap_items
CREATE TABLE roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  category TEXT,
  votes INT DEFAULT 0,
  target_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. job_listings — careers page
CREATE TABLE job_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT,
  location TEXT,
  type TEXT DEFAULT 'full-time',
  description TEXT NOT NULL,
  requirements TEXT,
  salary_range TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. email_templates — transactional email templates
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,     -- e.g. 'welcome', 'trial_ending', 'deal_completed'
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}', -- e.g. '{user_name, org_name}'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. social_posts — platform social media posts (Go Virall's own social accounts)
CREATE TABLE social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. ai_interactions — full AI call log for knowledge base
CREATE TABLE ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  feature TEXT NOT NULL,         -- e.g. 'content_generator', 'growth', 'recommendations'
  sub_type TEXT,
  prompt_text TEXT NOT NULL,
  response_text TEXT,
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  provider TEXT NOT NULL,
  model TEXT,
  response_time_ms INT,
  is_success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ai_interactions_feature ON ai_interactions(feature, created_at DESC);
CREATE INDEX idx_ai_interactions_created ON ai_interactions(created_at DESC);

-- 12. platform_insights — AI-generated data intelligence
CREATE TABLE platform_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'health_score', 'anomaly', 'trend', 'recommendation', 'prediction', 'summary'
  )),
  category TEXT NOT NULL CHECK (category IN (
    'revenue', 'engagement', 'growth', 'churn',
    'feature_adoption', 'system', 'ai_usage', 'overall'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('critical', 'warning', 'info', 'positive')),
  confidence DECIMAL(3,2) DEFAULT 0.80,
  data_snapshot JSONB DEFAULT '{}',
  recommendations JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  is_dismissed BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX idx_platform_insights_active ON platform_insights(is_active, generated_at DESC);

-- RLS — all new tables: service role full access
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE changelog_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_insights ENABLE ROW LEVEL SECURITY;

-- Service role policies (admin operations bypass RLS via admin client)
CREATE POLICY "Service role full access" ON audit_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON billing_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON contact_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON site_content FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON changelog_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON roadmap_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON job_listings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON email_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON social_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON ai_interactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON platform_insights FOR ALL USING (true) WITH CHECK (true);

-- Public read policies for marketing content
CREATE POLICY "Public can read published posts" ON posts FOR SELECT USING (status = 'published');
CREATE POLICY "Public can read published changelog" ON changelog_entries FOR SELECT USING (is_published = true);
CREATE POLICY "Public can read roadmap" ON roadmap_items FOR SELECT USING (true);
CREATE POLICY "Public can read active jobs" ON job_listings FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read active site content" ON site_content FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can submit contact" ON contact_submissions FOR INSERT WITH CHECK (true);
```

---

## 3. Auth & Guards

### `requireAdmin()` function

**File:** `src/lib/dal/admin.ts` (new file)

```typescript
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "superadmin"].includes(profile.system_role)) return null;
  return user.id;
}
```

The `system_role` column already exists in the `profiles` table. Valid values: `'user'`, `'admin'`, `'superadmin'`.

To make yourself admin, run in Supabase SQL Editor:
```sql
UPDATE profiles SET system_role = 'superadmin' WHERE id = 'YOUR_USER_UUID';
```

---

## 4. DAL (Data Access Layer)

**File:** `src/lib/dal/admin.ts`

All functions use `createAdminClient()` to bypass RLS. Every function returns typed data. All queries should destructure `{ data, error }` and handle errors gracefully (return empty defaults on failure).

### 4.1 — Overview & Stats

| Function | Returns | Query |
|---|---|---|
| `getAdminStats()` | `{ totalUsers, totalOrgs, totalProfiles, totalAnalyses, pendingDeals }` | Count from `profiles`, `organizations`, `social_profiles`, `social_analyses`, `deals` where status='inquiry' or 'negotiation' |
| `getRecentSignups(limit=10)` | `Array<Profile & { org_name, email }>` | Join `profiles` → `organizations`, enrich with `auth.admin.listUsers()` for email. Order by `created_at DESC` |
| `getRecentAuditLog(limit=20)` | `Array<AuditLog>` | Select from `audit_log` order by `created_at DESC` |

### 4.2 — Users

| Function | Returns | Query |
|---|---|---|
| `getAllUsers(opts?)` | `Array<UserRow>` | Select `profiles.*`, join `organizations.name`, enrich with auth email/provider via `supabase.auth.admin.listUsers()`. Support `search` (name/email), `limit`, `offset` |

`UserRow` = `{ id, full_name, email, avatar_url, role, system_role, org_name, org_plan, provider, created_at }`

### 4.3 — Organizations

| Function | Returns | Query |
|---|---|---|
| `getAllOrgs(opts?)` | `Array<OrgRow>` | Select `organizations.*`, compute `memberCount` (count profiles), `profileCount` (count social_profiles), `dealCount` (count deals). Support `search`, `limit`, `offset` |

### 4.4 — Billing & Revenue

| Function | Returns | Query |
|---|---|---|
| `getBillingOverview()` | `{ totalOrgs, paidOrgs, freeOrgs, planDistribution, recentEvents }` | Count orgs by plan, get last 20 billing_events |
| `getRevenueAnalytics()` | `{ mrr, arr, arpu, churnRate, trialConversion }` | Calculate from orgs + pricing_plans join. MRR = sum of active paid org plan prices. Churn = canceled / (canceled + active). |
| `getSubscriptionDetails()` | `Array<SubRow>` | For each paid org, fetch Stripe subscription via `stripe.subscriptions.retrieve()`. Batch 5 at a time. Fallback to plan price if Stripe call fails. |

### 4.5 — Notifications (Admin Feed)

| Function | Returns | Query |
|---|---|---|
| `getAdminNotifications(limit=50)` | `Array<AdminNotification>` | Union of: recent signups (from profiles), billing events, audit log entries, contact submissions. Each type gets a `type` tag ('signup', 'billing', 'audit', 'contact'). Sorted by date DESC. |

### 4.6 — Subscriptions (Pricing Plans)

| Function | Returns | Query |
|---|---|---|
| `getAllPricingPlans()` | `Array<PricingPlan>` | Select all from `pricing_plans` |

### 4.7 — Content (Site CMS)

| Function | Returns | Query |
|---|---|---|
| `getAllSiteContent()` | `Array<SiteContent>` | Select all from `site_content` order by page, sort_order |

### 4.8 — Search & AI (Go Virall-specific: Analysis Overview)

| Function | Returns | Query |
|---|---|---|
| `getAnalysisOverview()` | `{ totalAnalyses, byType, recentAnalyses, avgTokens, totalCost }` | Aggregate from `social_analyses`. Group by `analysis_type` for counts. |

### 4.9 — API Management

| Function | Returns | Query |
|---|---|---|
| `getAPIConfigs()` | `Array<PlatformApiConfig>` | Select all from `platform_api_configs` |
| `getAPIUsageStats(days=30)` | `{ totalCalls, totalCost, successRate, byProvider, dailyAggregates }` | Aggregate from `api_call_log` within date range. Group by provider for breakdown. Group by date for daily chart. |
| `getAPICallLog(limit=50)` | `Array<APICallLog>` | Select from `api_call_log` order by `created_at DESC` |

### 4.10 — System Health

| Function | Returns | Query |
|---|---|---|
| `getSystemHealth()` | `{ dbSize, activeConnections, oldestUnprocessedAnalysis, failedAPICalls24h, errorRate }` | Failed API calls from `api_call_log` in last 24h. Error rate = failed/total. Oldest stale analysis from `social_analyses`. |

### 4.11 — Analytics (Investor Metrics)

| Function | Returns | Query |
|---|---|---|
| `getInvestorMetrics()` | `{ mrr, arr, arpu, ltv, totalOrgs, paidOrgs, freeOrgs, trialingOrgs, canceledOrgs, churnRate, trialConversion, freeToPaid, growthMoM }` | Compute from `organizations` + `pricing_plans`. Exclude superadmin orgs. |
| `getGrowthTimeSeries()` | `Array<{ month, users, orgs, profiles, analyses }>` | Group `profiles`, `organizations`, `social_profiles`, `social_analyses` by `DATE_TRUNC('month', created_at)` for last 12 months. Include cumulative totals. |
| `getUsageAnalytics()` | `{ totalProfiles, totalAnalyses, totalCompetitors, totalDeals, totalCampaigns }` | Count from each table |

### 4.12 — Data Intelligence

| Function | Returns | Query |
|---|---|---|
| `getActiveInsights()` | `Array<PlatformInsight>` | Select from `platform_insights` where `is_active=true`, `is_dismissed=false`, and not expired. Order by `generated_at DESC` |
| `dismissInsight(id)` | `void` | Update `is_dismissed = true` |

### 4.13 — AI Intelligence

| Function | Returns | Query |
|---|---|---|
| `getAIInteractions(opts?)` | `{ data: Array<AIInteraction>, count }` | Select from `ai_interactions`. Support filters: `feature`, `provider`, `search` (in prompt_text). Paginated. |
| `getAIUsageByFeature(days=30)` | `Record<string, { calls, tokens, cost, avg_response_ms, success_rate }>` | Aggregate `ai_interactions` by feature within date range |
| `getAIProviderPerformance(days=30)` | `Record<string, { calls, cost, avg_response_ms, success_rate, errors }>` | Aggregate by provider |
| `getAICostTrend(days=30)` | `Array<{ date, cost, calls }>` | Group by date |

### 4.14 — Content Management (Blog, Changelog, Roadmap, Careers)

| Function | Returns | Query |
|---|---|---|
| `getAllPosts(type?, limit?, offset?)` | `Array<Post>` | Select from `posts`, optional type filter, order by `created_at DESC` |
| `getAllChangelog()` | `Array<ChangelogEntry>` | Select all from `changelog_entries` order by `created_at DESC` |
| `getAllRoadmap()` | `Array<RoadmapItem>` | Select all from `roadmap_items` order by `created_at DESC` |
| `getAllJobs()` | `Array<JobListing>` | Select all from `job_listings` order by `created_at DESC` |

### 4.15 — Email Templates

| Function | Returns | Query |
|---|---|---|
| `getAllEmailTemplates()` | `Array<EmailTemplate>` | Select all from `email_templates` |

### 4.16 — Social Posts (Go Virall's own social)

| Function | Returns | Query |
|---|---|---|
| `getAllSocialPosts()` | `Array<SocialPost>` | Select all from `social_posts` order by `created_at DESC` |

### 4.17 — Contacts

| Function | Returns | Query |
|---|---|---|
| `getUnreadContactCount()` | `number` | Count from `contact_submissions` where `status = 'new'` |
| `getAllContacts(limit?, offset?)` | `Array<ContactSubmission>` | Select all from `contact_submissions` order by `created_at DESC` |

---

## 5. Server Actions

**File:** `src/lib/actions/admin.ts` (new file, `"use server"`)

Every action must call `requireAdmin()` first. Every action must call `revalidatePath("/admin/...")` after mutations.

### 5.1 — User & Org Management

| Action | Params | Effect |
|---|---|---|
| `getUserDetails(userId)` | userId: string | Fetch profile + org + social profiles + analyses + recent activity |
| `getOrgDetails(orgId)` | orgId: string | Fetch org + members + social profiles + deals + campaigns |
| `deleteOrganization(orgId)` | orgId: string | Delete org (cascades members, profiles, deals). Revalidate. |
| `updateUserRole(userId, role)` | userId, system_role | Update profiles.system_role. Revalidate. |

### 5.2 — Content CRUD (Blog, Changelog, Roadmap, Careers, Email Templates, Social Posts, Site Content)

For each content type, provide **create**, **update**, **delete** actions:

| Action Pattern | Example |
|---|---|
| `createPost(data)` | Insert into `posts`. Set slug from title. Revalidate `/admin/blog`. |
| `updatePost(id, data)` | Update `posts` by id. Revalidate. |
| `deletePost(id)` | Delete from `posts`. Revalidate. |
| `createChangelogEntry(data)` | Insert into `changelog_entries`. Revalidate. |
| `updateChangelogEntry(id, data)` | Update by id. Revalidate. |
| `deleteChangelogEntry(id)` | Delete. Revalidate. |
| `createRoadmapItem(data)` | Insert into `roadmap_items`. Revalidate. |
| `updateRoadmapItem(id, data)` | Update by id. Revalidate. |
| `deleteRoadmapItem(id)` | Delete. Revalidate. |
| `createJob(data)` | Insert into `job_listings`. Revalidate. |
| `updateJob(id, data)` | Update by id. Revalidate. |
| `deleteJob(id)` | Delete. Revalidate. |
| `createEmailTemplate(data)` | Insert into `email_templates`. Revalidate. |
| `updateEmailTemplate(id, data)` | Update by id. Revalidate. |
| `deleteEmailTemplate(id)` | Delete. Revalidate. |
| `createSocialPost(data)` | Insert into `social_posts`. Revalidate. |
| `updateSocialPost(id, data)` | Update by id. Revalidate. |
| `deleteSocialPost(id)` | Delete. Revalidate. |
| `updateSiteContent(id, data)` | Update `site_content` by id. Revalidate. |

### 5.3 — Contact Management

| Action | Effect |
|---|---|
| `updateContactStatus(id, status)` | Update `contact_submissions.status`. Revalidate. |

### 5.4 — Billing Actions

| Action | Effect |
|---|---|
| `updateOrgPlan(orgId, plan)` | Update `organizations.plan` + `max_social_profiles` from pricing_plans. Revalidate. |

### 5.5 — Data Intelligence

**File:** `src/lib/actions/admin-intelligence.ts`

| Action | Effect |
|---|---|
| `generatePlatformInsights()` | Collect all platform data (stats, investor metrics, API usage, AI usage). Send to AI with structured prompt. Parse JSON response (handle both arrays and object-wrapped arrays). Validate enum values. Deactivate old insights. Insert new ones with 7-day expiry. Check all DB errors. Revalidate. |
| `dismissInsightAction(id)` | Update `is_dismissed = true`. Revalidate. |

**AI Prompt context for Go Virall** (replace SEO references):
- Platform name: "Go Virall"
- Domain: Social media influencer management
- Key metrics: Total creators, social profiles tracked, analyses run, deals managed, campaigns active
- Revenue: From subscription plans (Free/Starter/Pro/Business)

---

## 6. Layout & Navigation

### `src/app/admin/layout.tsx` (Server Component)

```
┌────────────────────────────────────────────────────┐
│  HEADER BAR                                         │
│  Go Virall [ADMIN]       User Dashboard  |  Sign Out  │
├──────────┬─────────────────────────────────────────┤
│ SIDEBAR  │  PAGE CONTENT                            │
│ 260px    │                                          │
│          │  {children}                              │
│ Nav      │                                          │
│ Items    │                                          │
│          │                                          │
│          │                                          │
│ ──────── │                                          │
│ ← Back   │                                          │
│ [theme]  │                                          │
└──────────┴─────────────────────────────────────────┘
```

- Call `requireAdmin()` in layout — redirect to `/login` if not admin
- Fetch `getUnreadContactCount()` for notification badge
- Sidebar: sticky, 260px, scrollable nav
- Header: "ADMINISTRATION" label with shield icon, links to user dashboard and sign out
- Footer: "← Back to Dashboard" link + theme toggle
- Editorial design: cream background, serif headers, mono data

### `src/app/admin/admin-nav.tsx` (Client Component)

**Navigation items (20):**

| # | Label | Icon (lucide) | Route |
|---|---|---|---|
| 1 | Overview | `BarChart3` | `/admin` |
| 2 | Users | `Users` | `/admin/users` |
| 3 | Organizations | `Building2` | `/admin/orgs` |
| 4 | Billing | `CreditCard` | `/admin/billing` |
| 5 | Notifications | `Bell` | `/admin/notifications` |
| 6 | Subscriptions | `Tag` | `/admin/subscriptions` |
| 7 | Content | `FileText` | `/admin/content` |
| 8 | Search & AI | `Search` | `/admin/search-ai` |
| 9 | API Management | `Key` | `/admin/api` |
| 10 | System Health | `Activity` | `/admin/health` |
| 11 | Analytics | `BarChart3` | `/admin/analytics` |
| 12 | Data Intelligence | `Brain` | `/admin/data-intelligence` |
| 13 | AI Intelligence | `Sparkles` | `/admin/ai-intelligence` |
| 14 | Blog | `BookOpen` | `/admin/blog` |
| 15 | Social Posts | `Share2` | `/admin/social-posts` |
| 16 | Changelog | `History` | `/admin/changelog` |
| 17 | Roadmap | `Map` | `/admin/roadmap` |
| 18 | Careers | `Briefcase` | `/admin/careers` |
| 19 | Email Templates | `MailOpen` | `/admin/email-templates` |
| 20 | Contacts | `Mail` | `/admin/contacts` |

- Active item: left red border (`border-editorial-red`), bold text
- Notifications item: show unread count badge (red dot with number)
- Use `usePathname()` to determine active item

---

## 7. Pages — Full Spec

### PAGE 1: Overview (`/admin`)

**Data sources:** `getAdminStats()`, `getRecentSignups(5)`, `getRecentAuditLog(10)`, `getAPIUsageStats()`, `getBillingOverview()`, `getInvestorMetrics()`, `getUsageAnalytics()`

**Layout:**
```
┌──────────────────────────────────────────────────┐
│ OVERVIEW                                          │
├──────────┬──────────┬──────────┬────────────────┤
│ Users    │ Orgs     │ Profiles │ Pending Deals   │
│ [count]  │ [count]  │ [count]  │ [count]         │
├──────────┴──────────┴──────────┴────────────────┤
│ KEY METRICS STRIP (8 cards in a row)             │
│ MRR | Active Users | Churn | API Cost |          │
│ Avg Response | AI Calls | AI Cost | Analyses     │
├─────────────────────┬────────────────────────────┤
│ RECENT SIGNUPS      │ RECENT ACTIVITY             │
│ (table: 5 rows)     │ (audit log: 10 rows)        │
│ Name, Email, Org,   │ Action, User, Resource,      │
│ Plan, Date          │ Date                         │
├─────────────────────┴────────────────────────────┤
│ QUICK ACTIONS                                     │
│ [Generate Insights] [View Analytics] [Manage API] │
└──────────────────────────────────────────────────┘
```

---

### PAGE 2: Users (`/admin/users`)

**Data:** `getAllUsers()`

**Features:**
- Search bar (filters by name or email)
- Table columns: Avatar, Name, Email, Org, Plan, Role, System Role, Provider, Joined
- Click row → expandable detail OR modal with: social profiles, recent analyses, org info
- Pagination (25 per page)

---

### PAGE 3: Organizations (`/admin/orgs`)

**Data:** `getAllOrgs()`

**Features:**
- Search bar
- Table columns: Name, Slug, Plan, Status, Members, Social Profiles, Deals, Created
- Click row → expandable detail with: members list, social profiles, active deals, campaigns
- Actions: Change Plan, Delete Org (with confirmation)

---

### PAGE 4: Billing (`/admin/billing`)

**Data:** `getBillingOverview()`, `getRevenueAnalytics()`, `getSubscriptionDetails()`

**Features:**
- Revenue hero cards: MRR, ARR, ARPU, LTV
- Plan distribution breakdown (free/starter/pro/business counts)
- Recent billing events table (invoice.paid, subscription changes)
- Active subscriptions table with Stripe details (status, next billing, amount)

---

### PAGE 5: Notifications (`/admin/notifications`)

**Data:** `getAdminNotifications(50)`

**Features:**
- Unified feed mixing: signups, billing events, audit log, contact submissions
- Each type has distinct icon and color:
  - Signup: green user icon
  - Billing: gold credit card icon
  - Audit: blue activity icon
  - Contact: red mail icon
- Filterable by type
- Real-time feel (show relative timestamps)

---

### PAGE 6: Subscriptions (`/admin/subscriptions`)

**Data:** `getAllPricingPlans()`

**Features:**
- Grid of plan cards: Free, Starter, Pro, Business
- Each card shows: name, price, max profiles, features JSON
- Edit plan limits (update `pricing_plans` row)
- Toggle plan active/inactive

---

### PAGE 7: Content (`/admin/content`)

**Data:** `getAllSiteContent()`

**Features:**
- Table: Page, Section, Content preview, Sort Order, Active toggle
- Edit content inline or in modal (JSON editor for content field)
- Toggle is_active
- Add new content block

---

### PAGE 8: Search & AI (`/admin/search-ai`)

**Data:** `getAnalysisOverview()`, `getAIUsageByFeature(30)`

**Go Virall-specific version** of RankPulse's Search & AI page. Shows:
- Total analyses run (all types)
- Breakdown by analysis type (growth, hashtags, content_strategy, etc.)
- Most popular analysis types chart
- AI cost per analysis type
- Average tokens per analysis
- Recent analyses table (last 20)

---

### PAGE 9: API Management (`/admin/api`)

**Data:** `getAPIConfigs()`, `getAPIUsageStats()`, `getAPICallLog(20)`

**Features:**
- API provider cards: DeepSeek, OpenAI, Anthropic, Gemini + social scrapers (Instagram, TikTok, YouTube, Twitter)
- Each card: status (active/inactive), total calls, total cost, success rate
- Daily usage chart (calls per day, cost per day)
- Recent API calls table: provider, endpoint, status, response time, cost, timestamp
- Toggle provider active/inactive

---

### PAGE 10: System Health (`/admin/health`)

**Data:** `getSystemHealth()`

**Features:**
- Health score indicator (green/yellow/red)
- Metric cards: Failed API calls (24h), Error rate, Avg response time
- Failed calls table (recent errors with error messages)
- Platform status checks (Supabase, Stripe, AI providers)

---

### PAGE 11: Analytics (`/admin/analytics`)

**Data:** `getInvestorMetrics()`, `getGrowthTimeSeries()`, `getUsageAnalytics()`, `getAPIUsageStats()`, `getBillingOverview()`

**Features:**
- Investor-grade metrics strip: MRR, ARR, ARPU, LTV, Churn, Trial Conversion
- Growth chart: Users, Orgs, Social Profiles over time (Recharts line chart)
- Revenue chart: MRR trend over time
- Usage breakdown: profiles by platform, analyses by type, deals by status
- Org breakdown: plan distribution pie chart

---

### PAGE 12: Data Intelligence (`/admin/data-intelligence`)

**Data:** `getActiveInsights()`, `getAdminStats()`, `getInvestorMetrics()`, `getAPIUsageStats()`, `getAIUsageByFeature(30)`

**Features:**
- "Generate Analysis" button → calls `generatePlatformInsights()`
- Platform Health Score hero (0-100, color-coded)
- Key Metrics strip (8 cards)
- Insights feed grouped by category (revenue, engagement, growth, churn, feature_adoption, system, ai_usage)
- Each insight: severity icon, title, description, confidence %, recommendations with impact/effort tags
- Dismiss button per insight
- Status message banner (success/error after generation)
- Error handling: show actual DB error messages (not silent failures)

---

### PAGE 13: AI Intelligence (`/admin/ai-intelligence`)

**Data:** `getAIInteractions()`, `getAIUsageByFeature(30)`, `getAIProviderPerformance(30)`, `getAICostTrend(30)`

**Features — 4 tabs:**

**Tab 1: Knowledge Base**
- Searchable table of all AI interactions
- Columns: Feature, Sub-type, Provider, Tokens, Cost, Response Time, Success, Date
- Expandable rows showing full prompt + response text
- Filter by feature, provider

**Tab 2: Usage Analytics**
- Bar chart: calls by feature
- Table: feature, calls, tokens, cost, avg response time, success rate

**Tab 3: Provider Performance**
- Card per provider: calls, cost, avg response time, success rate, error count
- Comparison chart

**Tab 4: Cost Optimization**
- Daily cost trend line chart
- Cost by feature breakdown
- Recommendations for cost reduction

---

### PAGE 14: Blog (`/admin/blog`)

**Data:** `getAllPosts('blog')`

**Features:**
- Table: Title, Status (draft/published), Tags, Author, Published Date, Created Date
- Create new post (form: title, slug, excerpt, content, cover_image, tags, status)
- Edit post inline or in full editor
- Delete post (with confirmation)
- Quick toggle: draft ↔ published
- Content editor: Markdown or rich text textarea

---

### PAGE 15: Social Posts (`/admin/social-posts`)

**Data:** `getAllSocialPosts()`

**Features:**
- Table: Platform, Content preview, Status, Scheduled, Published, Created
- Create post: platform select, content textarea, media URL, schedule date
- Edit/Delete
- Status badges: draft (gray), scheduled (gold), published (green)

---

### PAGE 16: Changelog (`/admin/changelog`)

**Data:** `getAllChangelog()`

**Features:**
- Table: Title, Type (feature/improvement/fix/breaking), Published, Date
- Create entry: title, description, type select, published toggle
- Edit/Delete
- Type badges with colors: feature (green), improvement (blue), fix (gold), breaking (red)

---

### PAGE 17: Roadmap (`/admin/roadmap`)

**Data:** `getAllRoadmap()`

**Features:**
- Kanban-style or table view
- Columns: Title, Status (planned/in_progress/completed/cancelled), Category, Votes, Target Date
- Create item: title, description, status, category, target date
- Edit/Delete
- Drag-and-drop status change (optional enhancement)

---

### PAGE 18: Careers (`/admin/careers`)

**Data:** `getAllJobs()`

**Features:**
- Table: Title, Department, Location, Type, Active, Created
- Create job: title, department, location, type, description, requirements, salary range
- Edit/Delete
- Toggle active/inactive

---

### PAGE 19: Email Templates (`/admin/email-templates`)

**Data:** `getAllEmailTemplates()`

**Features:**
- Table: Name, Subject, Variables, Active, Updated
- Create template: name (unique key), subject, body HTML, variables list
- Edit with HTML preview
- Toggle active/inactive
- Preview button showing rendered template

---

### PAGE 20: Contacts (`/admin/contacts`)

**Data:** `getAllContacts()`, `getUnreadContactCount()`

**Features:**
- Badge on nav showing unread count
- Table: Name, Email, Subject, Status, Date
- Status badges: new (red), read (gray), replied (green), archived (muted)
- Click to expand full message
- Status dropdown to change: new → read → replied → archived
- Quick "Mark as Read" button

---

## 8. Shared UI Patterns

### Editorial Design Tokens (from existing `globals.css`)
- Background: `bg-surface-cream` (light) / `bg-surface-dark` (dark)
- Text: `text-ink` (primary), `text-ink-secondary`, `text-ink-muted`
- Borders: `border-rule`
- Accents: `text-editorial-red`, `text-editorial-green`, `text-editorial-gold`
- Cards: `bg-surface-card`, `border border-rule`
- Fonts: `font-serif` (Playfair Display), `font-sans` (IBM Plex Sans), `font-mono` (IBM Plex Mono)

### Shared Components Across Admin Pages
- **Stat Card**: `border border-rule bg-surface-card p-2 text-center` — mono value, uppercase muted label
- **Data Table**: No rounded corners. Border-rule dividers. Mono for numbers. Uppercase muted headers at `text-[9px]`.
- **Status Badge**: Inline `px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider` — color per status
- **Empty State**: Centered icon + serif heading + description + CTA button
- **Search Input**: Full-width, `border-rule bg-transparent`, placeholder text
- **Severity Colors**: critical=red, warning=gold, info=muted, positive=green
- **Action Buttons**: `Button` component with `variant="primary"` (red bg) or `variant="ghost"`

### NO rounded corners
- Do NOT use `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`
- Only `rounded-full` on avatars and dot indicators
- Everything else is sharp rectangles (the editorial design mandate)

---

## 9. File Structure

```
src/app/admin/
├── layout.tsx                              # Server: requireAdmin, sidebar shell
├── admin-nav.tsx                           # Client: navigation sidebar
├── error.tsx                               # Error boundary
├── page.tsx                                # Overview (server)
├── overview-client.tsx                     # Overview (client)
├── users/
│   ├── page.tsx
│   └── users-client.tsx
├── orgs/
│   ├── page.tsx
│   └── orgs-client.tsx
├── billing/
│   ├── page.tsx
│   └── billing-client.tsx
├── notifications/
│   ├── page.tsx
│   └── notifications-client.tsx
├── subscriptions/
│   ├── page.tsx
│   └── subscriptions-client.tsx
├── content/
│   ├── page.tsx
│   └── content-client.tsx
├── search-ai/
│   ├── page.tsx
│   └── search-ai-client.tsx
├── api/
│   ├── page.tsx
│   └── api-client.tsx
├── health/
│   ├── page.tsx
│   └── health-client.tsx
├── analytics/
│   ├── page.tsx
│   └── analytics-client.tsx
├── data-intelligence/
│   ├── page.tsx
│   └── data-intelligence-client.tsx
├── ai-intelligence/
│   ├── page.tsx
│   └── ai-intelligence-client.tsx
├── blog/
│   ├── page.tsx
│   └── blog-client.tsx
├── social-posts/
│   ├── page.tsx
│   └── social-posts-client.tsx
├── changelog/
│   ├── page.tsx
│   └── changelog-client.tsx
├── roadmap/
│   ├── page.tsx
│   └── roadmap-client.tsx
├── careers/
│   ├── page.tsx
│   └── careers-client.tsx
├── email-templates/
│   ├── page.tsx
│   └── email-templates-client.tsx
└── contacts/
    ├── page.tsx
    └── contacts-client.tsx

src/lib/
├── dal/
│   └── admin.ts                            # ALL admin read queries (35+ functions)
├── actions/
│   ├── admin.ts                            # Admin mutations (CRUD, user mgmt)
│   └── admin-intelligence.ts               # Data Intelligence AI generation
```

---

## 10. Build Order

Build in this order to ensure dependencies are satisfied:

| Phase | What | Why |
|---|---|---|
| **1** | Database migration (`006_admin_tables.sql`) | Tables must exist before queries |
| **2** | `src/lib/dal/admin.ts` — all DAL functions | Data layer needed by all pages |
| **3** | `src/lib/actions/admin.ts` — all server actions | Mutations needed by client components |
| **4** | `src/lib/actions/admin-intelligence.ts` — AI insights | Data Intelligence needs its own action file |
| **5** | `admin-nav.tsx` + `layout.tsx` | Shell must exist before any page renders |
| **6** | Overview page (`/admin`) | Landing page, validates DAL works |
| **7** | Users + Organizations pages | Core user/org management |
| **8** | Billing + Subscriptions + Analytics | Revenue & metrics |
| **9** | Notifications | Activity feed |
| **10** | API Management + System Health | Operations monitoring |
| **11** | Data Intelligence + AI Intelligence | AI-powered insights |
| **12** | Blog + Changelog + Roadmap + Careers | Content management |
| **13** | Social Posts + Email Templates + Contacts | Remaining pages |
| **14** | Content (Site CMS) | CMS for marketing pages |
| **15** | Error boundary + loading states | Polish |

---

## Key Differences from RankPulse (SEO) → Go Virall (Social)

| RankPulse Concept | Go Virall Equivalent |
|---|---|
| Projects | Social Profiles |
| Keywords Tracked | Analyses Run |
| Backlinks | Competitors Tracked |
| Site Audits | SMO Scores |
| SERP Rankings | Follower Growth |
| Search & AI page | Search & AI → Analysis overview (by type: growth, hashtags, content_strategy, etc.) |
| Job Queue (crawl jobs) | No job queue — analyses are synchronous AI calls. System Health focuses on API health instead. |
| Usage: keywords, backlinks, audits | Usage: social profiles, analyses, competitors, deals, campaigns |

---

## Existing Infrastructure (Already in Go Virall)

These already exist and should be **reused, not recreated**:

- `src/lib/supabase/admin.ts` — `createAdminClient()` (service role, bypasses RLS)
- `src/lib/supabase/server.ts` — `createClient()` (SSR with cookies)
- `src/lib/stripe.ts` — Stripe client initialization
- `src/lib/ai/provider.ts` — Multi-provider AI with fallback chain
- `src/lib/plan-limits.ts` — Plan feature limits
- `src/types/index.ts` — All TypeScript types
- `src/app/globals.css` — Editorial design tokens (cream, ink, red, gold, green)
- `profiles.system_role` column — Already in DB schema
- `api_call_log` table — Already exists, used for API tracking
- `platform_api_configs` table — Already exists with AI provider configs
