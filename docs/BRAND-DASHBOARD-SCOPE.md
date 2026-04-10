# Go Virall — Brand Dashboard Scope

> Complete specification for the **Brand-side** of the Go Virall platform.
> Brands sign up, build a company profile, discover creators, manage campaigns, negotiate deals, and track ROI — all from a dedicated dashboard at `/brand/*`.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Account & Onboarding](#2-account--onboarding)
3. [Brand Navigation](#3-brand-navigation)
4. [Overview Page](#4-overview-page)
5. [Discover Creators](#5-discover-creators)
6. [Creator Matches](#6-creator-matches)
7. [Messages](#7-messages)
8. [Campaigns](#8-campaigns)
9. [Proposals](#9-proposals)
10. [Deals Pipeline](#10-deals-pipeline)
11. [Payments](#11-payments)
12. [Analytics](#12-analytics)
13. [Settings](#13-settings)
14. [Data Models & DB Tables](#14-data-models--db-tables)
15. [Implementation Status](#15-implementation-status)

---

## 1. Overview

The **Brand Dashboard** is a parallel workspace to the Creator Dashboard. While creators analyze their social performance, brands use this side to:

- **Discover** creators that fit their niche and audience
- **Propose** collaborations with detailed deliverables and budgets
- **Negotiate** through a messaging / deal-room system
- **Manage** active campaigns with multiple creators
- **Track** performance, ROI, and payments

The brand side lives entirely under `/brand/*` with its own layout, navigation, and shell (`BrandShell` + `BrandNav`).

---

## 2. Account & Onboarding

### Account Type

Users select `account_type = "brand"` during signup (or switch later). The brand layout enforces this — if `account_type !== "brand"`, the user is redirected to `/dashboard`.

### Onboarding Flow

1. User signs up and selects "Brand" account type
2. Redirected to `/brand` (Overview page)
3. Overview shows onboarding tips:
   - "Complete your brand profile"
   - "Discover creators that match your brand"
   - "Send your first proposal"
4. Settings page (`/brand/settings`) is where the company profile is completed

### Profile Fields

| Field | DB Column | Required |
|-------|-----------|----------|
| Company Name | `company_name` | Yes |
| Website | `company_website` | No |
| Industry | `industry` | Recommended |
| Company Size | `company_size` | No |
| Brand Description | `brand_description` | Recommended |
| Contact Email | `contact_email` | Yes |
| Contact Phone | `contact_phone` | No |
| Logo | `brand_logo_url` | Recommended |

All fields are stored in the `profiles` table (shared with creators, differentiated by `account_type`).

---

## 3. Brand Navigation

Two-row fixed navbar (`BrandNav.tsx`):

**Row 1** — Top bar (56px):
- Logo: "Go Virall" with "for Brands" badge
- Search input (placeholder, read-only for now)
- Theme toggle (dark/light)
- Notification bell (links to Messages, shows unread count badge)
- Avatar dropdown:
  - Company Profile → `/brand/settings`
  - Settings → `/brand/settings`
  - Billing → `/brand/payments`
  - Switch to Creator → `/dashboard`
  - Sign Out

**Row 2** — Navigation tabs (44px, horizontally scrollable, centered):

| # | Label | Route | Icon |
|---|-------|-------|------|
| 1 | Overview | `/brand` | Home |
| 2 | Discover | `/brand/discover` | Search |
| 3 | Matches | `/brand/matches` | Sparkles |
| 4 | Messages | `/brand/messages` | MessageSquare |
| 5 | Campaigns | `/brand/campaigns` | Megaphone |
| 6 | Proposals | `/brand/proposals` | FileText |
| 7 | Deals | `/brand/deals` | Handshake |
| 8 | Payments | `/brand/payments` | CreditCard |
| 9 | Analytics | `/brand/analytics` | BarChart3 |
| 10 | Settings | `/brand/settings` | Settings |

Active tab shows red underline indicator and bold red text.

---

## 4. Overview Page

**Route:** `/brand`
**Files:** `src/app/brand/page.tsx`, `src/app/brand/overview-client.tsx`

### Sections

1. **Welcome Header** — "Welcome back, {companyName}" with subtitle
2. **Stats Cards** (4-column grid):
   - Active Campaigns (purple)
   - Pending Proposals (red)
   - Active Deals (green)
   - Total Spent (amber)
3. **Quick Actions** (left column):
   - Find Creators → `/brand/discover`
   - Create Proposal → `/brand/proposals`
   - View Messages → `/brand/messages`
4. **Getting Started** (right column) — Onboarding tips and activity feed

### Data Required
- `campaigns` count where `status = 'active'` and `brand_id = user.id`
- `proposals` count where `status = 'pending'` and `brand_id = user.id`
- `deals` count where `status IN ('active', 'in_progress')` and `brand_id = user.id`
- Sum of `payments` where `brand_id = user.id`

---

## 5. Discover Creators

**Route:** `/brand/discover`
**Files:** `src/app/brand/discover/page.tsx`, `src/app/brand/discover/DiscoverClient.tsx`

### Layout
- **Left sidebar** (280px, sticky): Filter panel
- **Main content**: Creator cards grid

### Filters (CreatorSearch Component)

| Filter | Type | Notes |
|--------|------|-------|
| Search query | Text | Searches name, bio, niche |
| Niches | Multi-select checkboxes | Lifestyle, Tech, Fashion, etc. |
| Platforms | Multi-select | Instagram, TikTok, YouTube, Twitter, LinkedIn |
| Content types | Multi-select | Photos, Reels/Shorts, Long-form, Livestream, etc. |
| Followers min/max | Range slider | 1K → 10M+ |
| Engagement rate min/max | Range slider | 0% → 20%+ |
| AQS (Audience Quality Score) min | Slider | 0 → 100 |
| Location | Text input | Country/city |
| Budget min/max | Range slider | Estimated rate range |

### Results
- Sortable: Relevance, Most Followers, Highest Engagement, Best AQS
- 20 creators per page with pagination
- Each creator card shows: avatar, name, niches, follower count, engagement rate, AQS badge, platform icons
- "View Profile" opens slide-over with full details
- "Send Proposal" navigates to `/brand/proposals?creator={id}`

### Data Source
- Primary: `creator_marketplace_profiles` table (joined with `profiles`)
- Fallback: `profiles` table where `account_type = 'creator'` (if marketplace table is empty)

---

## 6. Creator Matches

**Route:** `/brand/matches`
**Files:** `src/app/brand/matches/page.tsx`

AI-powered creator recommendations based on the brand's:
- Industry and niche
- Company size and budget
- Past campaign performance
- Target audience demographics

Uses `getMatches(user.id, "brand")` to fetch matches from the `matches` table.

Each match card shows compatibility score, creator profile summary, and quick actions (View Profile, Send Proposal, Start Conversation).

---

## 7. Messages

**Route:** `/brand/messages`
**Files:** `src/app/brand/messages/page.tsx`, `src/app/brand/messages/BrandMessagesClient.tsx`

### Layout
- **Left sidebar** (288px): Thread list with search, "+ New" button
- **Header card**: Thread toggle, conversation count
- **Main area**: Active conversation or empty state

### Features
- Real-time messaging via Supabase subscriptions
- Thread-based conversations
- "New Conversation" dialog: search users → create/open thread
- Optimistic message sending
- Mark-as-read on thread select
- URL sync: `?thread={id}` for deep-linking

### Data
- `message_threads` table (participant_1, participant_2, unread counts)
- `direct_messages` table (sender_id, content, message_type, metadata)
- Uses shared messaging infrastructure with creator dashboard

---

## 8. Campaigns

**Route:** `/brand/campaigns`
**Files:** `src/app/brand/campaigns/page.tsx`

### Campaign Lifecycle

```
Draft → Active → Paused (optional) → Completed
```

### Campaign Object

| Field | Type | Description |
|-------|------|-------------|
| name | string | Campaign title |
| description | string | Campaign brief |
| status | enum | draft, active, paused, completed |
| budget | number | Total budget in USD |
| startDate | date | Campaign start |
| endDate | date | Campaign end |
| creators | number | # of creators involved |
| roi | number | Calculated ROI multiplier |

### UI
- Header with "Create Campaign" button
- Status filter tabs: All, Draft, Active, Paused, Completed
- Card grid showing campaign details, date range, budget, creator count, ROI
- Empty state prompts first campaign creation

### Planned Features
- Campaign brief builder (deliverables, timeline, creative direction)
- Multi-creator campaign management
- Content approval workflow
- Performance tracking per campaign
- Budget tracking and spend alerts

---

## 9. Proposals

**Route:** `/brand/proposals`
**Files:** `src/app/brand/proposals/page.tsx`

### Proposal Lifecycle

```
Draft → Pending → Negotiating ↔ Accepted/Declined
```

### Proposal Object

| Field | Type | Description |
|-------|------|-------------|
| title | string | Proposal title |
| creator_id | uuid | Target creator |
| status | enum | draft, pending, negotiating, accepted, declined |
| amount | number | Proposed payment |
| deliverables | number | Count of deliverables |
| message | text | Proposal description |
| terms | json | Detailed terms and conditions |

### UI
- Two tabs: "Sent" and "Received"
- Each proposal card: creator avatar, title, status badge, amount, deliverables, date
- "New Proposal" button in header
- Empty states for each tab

### Planned Features
- Proposal builder (step-by-step)
- Deliverable specification (type, platform, quantity, deadline)
- Counter-offer flow (negotiation)
- Proposal templates
- Link proposals to campaigns
- Auto-create deal on acceptance

---

## 10. Deals Pipeline

**Route:** `/brand/deals`
**Files:** `src/app/brand/deals/page.tsx`

### 7-Stage Deal Pipeline

| Stage | Icon | Color | Description |
|-------|------|-------|-------------|
| 1. Proposal Accepted | Check | Green | Creator accepted the proposal |
| 2. Contract Signed | FileText | Purple | Legal agreement executed |
| 3. Content Creation | Edit3 | Amber | Creator producing content |
| 4. Under Review | Eye | Blue | Brand reviewing deliverables |
| 5. Published | Globe | Green | Content is live |
| 6. Payment Pending | DollarSign | Amber | Awaiting payment processing |
| 7. Completed | CheckCircle | Purple | Deal fully complete |

### UI
- Stage filter buttons (horizontally scrollable)
- Deal cards showing: creator info, stage badge, deal value, start date, campaign link, deliverables progress bar
- Empty state links to Discover

### Planned Features
- Deliverable submission and approval workflow
- Content preview before publishing
- Milestone-based payments
- Deal room (integrated messaging per deal)
- Contract generation
- Dispute resolution

---

## 11. Payments

**Route:** `/brand/payments`
**Files:** `src/app/brand/payments/page.tsx`

### Summary Metrics
- Total Paid (green)
- Pending Payments (amber)
- This Month spend (purple)

### Payment Status Types
- Completed (green)
- Pending (amber)
- Processing (purple)
- Failed (red)

### UI
- Summary cards row
- Status filter tabs
- Payment table: Date, Creator, Amount, Status, Deal
- "Export CSV" button
- Empty state explaining payments come from active deals

### Planned Features
- Stripe Connect integration (pay creators directly)
- Invoice generation
- Payment scheduling
- Escrow system
- Tax document management (1099s)
- Multi-currency support

---

## 12. Analytics

**Route:** `/brand/analytics`
**Files:** `src/app/brand/analytics/page.tsx`

### Overview Metrics
- Campaign Reach (total impressions across all campaigns)
- Total Engagement (likes, comments, shares)
- Creator ROI (return on investment multiplier)
- Cost per Engagement (spend / total engagements)

### Chart Sections (Planned)
1. **Campaign Performance** — Time series of reach and engagement
2. **Creator ROI Comparison** — Bar chart comparing ROI across creators
3. **Engagement Breakdown** — Pie chart of engagement types
4. **Spend Analysis** — Budget vs actual spend over time

### Planned Features
- Real-time campaign tracking
- Creator performance benchmarking
- Audience demographics overlay
- Content performance heatmap
- Exportable reports (PDF/CSV)
- Custom date range filtering

---

## 13. Settings

**Route:** `/brand/settings`
**Files:** `src/app/brand/settings/page.tsx`

### Sections

1. **Company Profile**
   - Logo upload (Supabase Storage, `avatars` bucket, `brand-logos/` path)
   - Company name, website, industry, company size
   - Contact email and phone
   - Brand description
   - Save button with success feedback

2. **Billing**
   - Link to `/brand/payments`
   - Subscription management (future: Stripe integration)

3. **Team Management**
   - Invite team members by email
   - Team member list with roles
   - Remove / change role actions
   - Empty state when no team members

### Server Actions
- `updateBrandProfile(data)` — Updates profile fields
- `uploadBrandLogo(formData)` — Uploads to Supabase Storage, saves public URL

---

## 14. Data Models & DB Tables

### Existing Tables (Shared)

| Table | Used By | Purpose |
|-------|---------|---------|
| `profiles` | Both | User profiles (brand fields: `company_name`, `company_website`, `industry`, `company_size`, `brand_description`, `brand_logo_url`, `contact_email`, `contact_phone`) |
| `creator_marketplace_profiles` | Discover | Creator listings for brand discovery |
| `matches` | Matches | AI-generated brand-creator matches |
| `message_threads` | Messages | Conversation threads between users |
| `direct_messages` | Messages | Individual messages within threads |

### Tables Needed (Not Yet Created)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `campaigns` | Campaign management | `id`, `brand_id`, `name`, `description`, `status`, `budget`, `start_date`, `end_date`, `created_at` |
| `campaign_creators` | Creator-campaign association | `campaign_id`, `creator_id`, `status`, `agreed_rate` |
| `proposals` | Collaboration proposals | `id`, `brand_id`, `creator_id`, `campaign_id`, `title`, `description`, `amount`, `status`, `deliverables`, `terms`, `created_at` |
| `deals` | Active deals/contracts | `id`, `proposal_id`, `brand_id`, `creator_id`, `campaign_id`, `stage`, `value`, `start_date`, `deliverables_json`, `created_at` |
| `deal_deliverables` | Individual deliverables within a deal | `id`, `deal_id`, `type`, `platform`, `description`, `status`, `due_date`, `submitted_at`, `approved_at` |
| `brand_payments` | Payment records | `id`, `deal_id`, `brand_id`, `creator_id`, `amount`, `status`, `payment_method`, `stripe_payment_id`, `created_at` |
| `brand_team_members` | Team invites and members | `id`, `brand_id`, `email`, `role`, `status`, `invited_at`, `accepted_at` |
| `brand_team_invites` | Pending invitations | `id`, `brand_id`, `email`, `role`, `token`, `expires_at`, `created_at` |

---

## 15. Implementation Status

### Fully Functional
- [x] Brand layout with auth guard and account-type check
- [x] Brand navigation (BrandNav) — 10 tabs, centered, responsive
- [x] Overview page — stats cards, quick actions, getting started tips
- [x] Discover — full search, filters, pagination, creator cards, slide-over profile
- [x] Matches — AI-powered recommendations via `getMatches()`
- [x] Messages — real-time messaging, new conversation dialog, thread management
- [x] Settings — company profile form, logo upload, team invite UI
- [x] Theme toggle (dark/light mode)
- [x] Avatar dropdown with navigation

### UI Complete, Backend Placeholder
- [ ] Campaigns — UI built, needs DB table + server actions
- [ ] Proposals — UI built, needs DB table + server actions
- [ ] Deals — UI built with 7-stage pipeline, needs DB table + server actions
- [ ] Payments — UI built with table and filters, needs Stripe Connect + DB
- [ ] Analytics — UI built with chart placeholders, needs data pipeline
- [ ] Team invites — UI built, needs `brand_team_invites` table + email sending

### Not Started
- [ ] Campaign brief builder
- [ ] Deliverable approval workflow
- [ ] Contract generation
- [ ] Escrow / milestone payments
- [ ] Stripe Connect onboarding for creators
- [ ] Real-time analytics pipeline
- [ ] Export reports (PDF/CSV)
- [ ] Notification system (email + in-app)
- [ ] Brand verification badge system

---

## Appendix: Route Map

```
/brand                     → Overview (dashboard home)
/brand/discover            → Creator search & discovery
/brand/matches             → AI-powered creator matches
/brand/messages            → Messaging (threads, real-time)
/brand/campaigns           → Campaign management
/brand/proposals           → Sent/received proposals
/brand/deals               → Deal pipeline tracking
/brand/payments            → Payment history & billing
/brand/analytics           → Campaign analytics & ROI
/brand/settings            → Company profile, billing, team
```
