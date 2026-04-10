# Go Virall v4 — Platform Expansion Plan

> **Goal**: Transform Go Virall from a creator analytics tool into a **two-sided marketplace** (Creators + Brands) with AI-powered intelligence, in-platform messaging, deal management, and payments — beating every competitor at a fraction of the price.

---

## Architecture Overview

```
                    ┌─────────────────────────────────┐
                    │         Go Virall Platform       │
                    ├────────────────┬────────────────┤
                    │  Creator Side  │   Brand Side   │
                    │  /dashboard    │   /brand       │
                    ├────────────────┼────────────────┤
                    │ Analytics      │ Discovery      │
                    │ AI Studio      │ Campaign Mgmt  │
                    │ Content Opt.   │ Outreach       │
                    │ Media Kit      │ Proposals      │
                    │ Deal CRM       │ Deal Mgmt      │
                    │ Revenue Track  │ Payments       │
                    │ SMO Score      │ Reporting      │
                    │ Goals          │ Brand Match AI │
                    ├────────────────┴────────────────┤
                    │      Shared Infrastructure       │
                    │  Messaging · Notifications ·     │
                    │  Stripe Connect · AI Engine ·    │
                    │  Real-time (Supabase Realtime)   │
                    └─────────────────────────────────┘
```

### New Role System

```
profiles.account_type: "creator" | "brand"

Creator Flow: Signup → Select "I'm a Creator" → /dashboard
Brand Flow:   Signup → Select "I'm a Brand"   → /brand
Admin:        /admin (unchanged, system_role check)
```

---

## Phase 1: Foundation & Messaging System

**Priority: CRITICAL — everything else depends on this**

### 1.1 Account Type System

**Files to create/modify:**
- `src/app/welcome/page.tsx` — Add account type selection (Creator vs Brand)
- `src/lib/actions/auth.ts` — Update signup to set account_type
- `src/middleware.ts` (proxy.ts) — Route based on account_type

**Database changes:**
```sql
-- Add account_type to profiles
ALTER TABLE profiles ADD COLUMN account_type TEXT DEFAULT 'creator' CHECK (account_type IN ('creator', 'brand'));

-- Brand-specific profile fields
ALTER TABLE profiles ADD COLUMN company_name TEXT;
ALTER TABLE profiles ADD COLUMN company_website TEXT;
ALTER TABLE profiles ADD COLUMN company_size TEXT; -- startup, small, medium, large, enterprise
ALTER TABLE profiles ADD COLUMN industry TEXT;
ALTER TABLE profiles ADD COLUMN brand_logo_url TEXT;
ALTER TABLE profiles ADD COLUMN brand_description TEXT;
```

### 1.2 In-Platform Messaging System

**New database tables:**
```sql
-- Direct message threads between any two users
CREATE TABLE direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  receiver_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'proposal', 'file', 'system')),
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message threads (conversations between two parties)
CREATE TABLE message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 UUID NOT NULL REFERENCES profiles(id),
  participant_2 UUID NOT NULL REFERENCES profiles(id),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  unread_count_1 INT DEFAULT 0, -- unread for participant_1
  unread_count_2 INT DEFAULT 0, -- unread for participant_2
  is_archived_1 BOOLEAN DEFAULT FALSE,
  is_archived_2 BOOLEAN DEFAULT FALSE,
  deal_id UUID REFERENCES deals(id), -- optional linked deal
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_1, participant_2)
);

-- File attachments in messages
CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES direct_messages(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT, -- image, pdf, video, document
  file_size INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Files to create:**
- `src/app/dashboard/messages/page.tsx` — Creator messages page
- `src/app/brand/messages/page.tsx` — Brand messages page
- `src/components/messaging/MessageThread.tsx` — Thread view with real-time updates
- `src/components/messaging/MessageList.tsx` — List of all conversations
- `src/components/messaging/MessageInput.tsx` — Rich text input with file upload
- `src/components/messaging/MessageBubble.tsx` — Individual message display
- `src/lib/actions/messages.ts` — Server actions (sendMessage, markRead, getThreads, etc.)
- `src/lib/dal/messages.ts` — Data access layer

**Real-time:** Use Supabase Realtime subscriptions on `direct_messages` table for instant message delivery.

### 1.3 Brand Dashboard Shell

**Files to create:**
- `src/app/brand/layout.tsx` — Brand dashboard layout
- `src/app/brand/page.tsx` — Brand overview/home
- `src/components/brand/BrandNav.tsx` — Brand sidebar navigation
- `src/components/brand/BrandShell.tsx` — Brand dashboard wrapper

**Brand Navigation:**
1. Overview (dashboard home)
2. Discover Creators
3. Messages
4. Campaigns
5. Proposals & Deals
6. Payments
7. Analytics
8. Settings

---

## Phase 2: Proposals, Deals & Payments (Tier 1)

### 2.1 Proposal System

**Database tables:**
```sql
-- Proposals from brands to creators (or vice versa)
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id),
  receiver_id UUID NOT NULL REFERENCES profiles(id),
  deal_id UUID REFERENCES deals(id), -- linked after acceptance
  thread_id UUID REFERENCES message_threads(id),

  -- Proposal details
  title TEXT NOT NULL,
  description TEXT,
  proposal_type TEXT DEFAULT 'brand_to_creator' CHECK (proposal_type IN ('brand_to_creator', 'creator_to_brand')),

  -- Deliverables
  deliverables JSONB NOT NULL DEFAULT '[]',
  -- Example: [{"platform": "instagram", "type": "reel", "quantity": 2, "deadline": "2026-05-01"}]

  -- Compensation
  total_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  payment_type TEXT DEFAULT 'fixed' CHECK (payment_type IN ('fixed', 'per_deliverable', 'revenue_share', 'product_only')),

  -- Timeline
  start_date DATE,
  end_date DATE,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'negotiating', 'accepted', 'declined', 'expired', 'cancelled')),

  -- Negotiation
  counter_offer JSONB, -- stores counter-proposal details
  revision_count INT DEFAULT 0,

  -- Metadata
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Proposal activity log
CREATE TABLE proposal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id),
  actor_id UUID NOT NULL REFERENCES profiles(id),
  event_type TEXT NOT NULL, -- 'created', 'sent', 'viewed', 'countered', 'accepted', 'declined', 'expired'
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Files to create:**
- `src/components/proposals/ProposalBuilder.tsx` — Rich proposal creation form
- `src/components/proposals/ProposalView.tsx` — View/respond to proposal
- `src/components/proposals/ProposalCard.tsx` — Summary card in lists
- `src/components/proposals/NegotiationThread.tsx` — Counter-offer flow
- `src/app/brand/proposals/page.tsx` — Brand proposals list
- `src/app/dashboard/proposals/page.tsx` — Creator proposals list
- `src/lib/actions/proposals.ts` — Server actions

### 2.2 Deal/Sponsorship CRM (for Creators)

**Enhance existing `deals` table:**
```sql
-- Add pipeline tracking fields
ALTER TABLE deals ADD COLUMN pipeline_stage TEXT DEFAULT 'lead'
  CHECK (pipeline_stage IN ('lead', 'outreach', 'negotiating', 'contracted', 'in_progress', 'delivered', 'invoiced', 'paid', 'completed'));
ALTER TABLE deals ADD COLUMN proposal_id UUID REFERENCES proposals(id);
ALTER TABLE deals ADD COLUMN thread_id UUID REFERENCES message_threads(id);
ALTER TABLE deals ADD COLUMN brand_profile_id UUID REFERENCES profiles(id);
ALTER TABLE deals ADD COLUMN total_value DECIMAL(10,2);
ALTER TABLE deals ADD COLUMN paid_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE deals ADD COLUMN contract_url TEXT;
ALTER TABLE deals ADD COLUMN is_from_platform BOOLEAN DEFAULT FALSE; -- was it created via Go Virall proposal?
```

**Files to create:**
- `src/app/dashboard/deals/page.tsx` — Deal pipeline (Kanban board)
- `src/components/deals/DealPipeline.tsx` — Kanban-style board view
- `src/components/deals/DealCard.tsx` — Deal summary card
- `src/components/deals/DealDetail.tsx` — Full deal view with deliverables, timeline, payments
- `src/lib/actions/deals.ts` — Enhanced deal actions

### 2.3 Stripe Connect Payments (Brand → Creator)

**Database tables:**
```sql
-- Stripe Connect accounts for creators
ALTER TABLE profiles ADD COLUMN stripe_connect_id TEXT;
ALTER TABLE profiles ADD COLUMN stripe_connect_onboarded BOOLEAN DEFAULT FALSE;

-- Payment records
CREATE TABLE platform_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  proposal_id UUID REFERENCES proposals(id),
  payer_id UUID NOT NULL REFERENCES profiles(id), -- brand
  payee_id UUID NOT NULL REFERENCES profiles(id), -- creator
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  platform_fee DECIMAL(10,2) DEFAULT 0, -- Go Virall's cut
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Files to create:**
- `src/lib/stripe-connect.ts` — Stripe Connect setup (onboarding, transfers)
- `src/app/api/webhooks/stripe-connect/route.ts` — Connect webhook handler
- `src/components/payments/PaymentButton.tsx` — "Pay Creator" button on deals
- `src/components/payments/PayoutSetup.tsx` — Creator Stripe Connect onboarding
- `src/app/dashboard/settings/PayoutsTab.tsx` — Creator payout settings
- `src/lib/actions/payments.ts` — Payment server actions

**Revenue model:** Go Virall takes a platform fee (e.g., 5%) on each transaction via Stripe Connect application fees.

---

## Phase 3: AI-Powered Intelligence (Tier 1)

### 3.1 Audience Quality Score (AQS)

**Database tables:**
```sql
CREATE TABLE audience_quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_profile_id UUID NOT NULL REFERENCES social_profiles(id),
  overall_score INT NOT NULL, -- 0-100
  engagement_quality INT, -- 0-100
  follower_authenticity INT, -- 0-100
  growth_health INT, -- 0-100
  content_consistency INT, -- 0-100
  audience_demographics JSONB, -- age, gender, location breakdown
  risk_flags JSONB DEFAULT '[]', -- suspicious patterns detected
  breakdown JSONB DEFAULT '{}', -- detailed scoring breakdown
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- recalculate after this
);
```

**Files to create:**
- `src/lib/ai/audience-quality.ts` — AI scoring engine
- `src/components/dashboard/AudienceQualityScore.tsx` — Score display widget (circular gauge)
- `src/app/dashboard/smo-score/page.tsx` — Enhanced with AQS integration
- Update Media Kit to show AQS badge

**AI Logic:**
- Analyze follower growth patterns (organic vs spikes)
- Engagement rate vs industry benchmarks
- Comment quality analysis (AI checks for bot patterns)
- Follower-to-engagement ratio
- Content consistency scoring
- Generate letter grade (A+ to D-) like Social Blade but smarter

### 3.2 AI Content Optimizer

**Database tables:**
```sql
CREATE TABLE content_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_profile_id UUID NOT NULL REFERENCES social_profiles(id),
  user_id UUID NOT NULL REFERENCES profiles(id),

  -- Input
  draft_content TEXT NOT NULL,
  target_platform TEXT NOT NULL,
  content_type TEXT, -- post, reel, story, video, thread

  -- AI Analysis
  predicted_engagement DECIMAL(5,2), -- predicted engagement rate
  optimized_content TEXT, -- AI-improved version
  suggestions JSONB DEFAULT '[]', -- list of improvement suggestions
  hashtag_recommendations JSONB DEFAULT '[]',
  best_posting_time TIMESTAMPTZ,
  tone_analysis JSONB, -- professional, casual, humorous, etc.
  competitor_comparison JSONB, -- how similar content performed for competitors

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Files to create:**
- `src/lib/ai/content-optimizer.ts` — AI optimization engine
- `src/components/dashboard/ContentOptimizer.tsx` — Pre-publish analysis UI
- `src/app/dashboard/ai-studio/page.tsx` — Enhanced with optimizer tab

**Features:**
- Paste draft content → get predicted engagement score
- AI suggests caption improvements, hashtag optimization
- Best posting time based on audience activity patterns
- Tone/sentiment analysis
- Competitor benchmarking ("similar posts in your niche got X engagement")

### 3.3 Smart Competitor Tracker (Enhanced)

**Database tables:**
```sql
CREATE TABLE competitor_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_profile_id UUID NOT NULL REFERENCES social_profiles(id),
  competitor_id UUID NOT NULL REFERENCES social_competitors(id),

  -- Weekly AI analysis
  insight_type TEXT NOT NULL, -- 'weekly_summary', 'trend_alert', 'strategy_change', 'viral_content'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  actionable_tips JSONB DEFAULT '[]', -- AI-generated action items
  data_snapshot JSONB DEFAULT '{}', -- metrics at time of insight

  priority TEXT DEFAULT 'info' CHECK (priority IN ('critical', 'high', 'medium', 'info')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Files to create:**
- `src/lib/ai/competitor-intelligence.ts` — Weekly AI analysis engine
- `src/components/dashboard/CompetitorInsights.tsx` — Insight cards with action items
- Enhance `src/app/dashboard/competitors/page.tsx`

---

## Phase 4: Brand Discovery & Marketplace (Tier 2)

### 4.1 Creator Discovery (for Brands)

**Database tables:**
```sql
-- Creator marketplace profiles (public-facing for brands)
CREATE TABLE creator_marketplace_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,

  -- Visibility
  is_listed BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,

  -- Searchable fields
  categories JSONB DEFAULT '[]', -- fitness, beauty, tech, food, travel, etc.
  content_types JSONB DEFAULT '[]', -- reels, long-form, stories, reviews, tutorials
  languages JSONB DEFAULT '["en"]',

  -- Rates
  rate_card JSONB DEFAULT '{}', -- {"instagram_post": 500, "tiktok_video": 300, "youtube_video": 1000}
  minimum_budget DECIMAL(10,2),

  -- Stats (cached from social_metrics)
  total_followers INT DEFAULT 0,
  avg_engagement_rate DECIMAL(5,2) DEFAULT 0,
  audience_quality_score INT, -- from AQS system
  platforms_active JSONB DEFAULT '[]',

  -- Profile
  highlight_reel JSONB DEFAULT '[]', -- top content pieces
  past_brands JSONB DEFAULT '[]', -- brands worked with

  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Files to create:**
- `src/app/brand/discover/page.tsx` — Creator discovery with filters
- `src/components/brand/CreatorSearch.tsx` — Search + filter UI
- `src/components/brand/CreatorCard.tsx` — Creator preview card
- `src/components/brand/CreatorProfile.tsx` — Full creator profile view (public-facing)
- `src/lib/actions/marketplace.ts` — Discovery actions
- `src/lib/dal/marketplace.ts` — Search queries

**Search Filters:**
- Niche/category
- Platform (Instagram, TikTok, YouTube, etc.)
- Follower range
- Engagement rate range
- Location/language
- AQS score minimum
- Budget range
- Content type
- Past brand collaborations

### 4.2 Revenue Dashboard (for Creators)

**Files to create:**
- `src/app/dashboard/revenue/page.tsx` — Enhanced revenue tracking
- `src/components/dashboard/RevenueDashboard.tsx` — Revenue overview

**Features:**
- Track earnings by source (platform payments, external deals, AdSense, affiliates)
- Monthly/yearly revenue charts
- Deal-by-deal breakdown
- Payment status tracking (pending, paid, overdue)
- Revenue forecasting based on pipeline
- Export to CSV/PDF for tax purposes

### 4.3 AI Email Reports (Weekly/Monthly)

**Files to create:**
- `src/lib/email/weekly-report.ts` — Generate weekly report email
- `src/lib/email/monthly-report.ts` — Generate monthly report email
- `src/app/api/cron/weekly-report/route.ts` — Cron endpoint
- `src/app/api/cron/monthly-report/route.ts` — Cron endpoint

**Report includes:**
- Follower growth summary across all profiles
- Top performing content
- Engagement trends
- AQS changes
- Competitor movements
- 3 AI-generated content ideas for next week
- Deal/revenue summary (if applicable)

### 4.4 Hashtag & Trend Intelligence

**Database tables:**
```sql
CREATE TABLE trending_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  niche TEXT NOT NULL,
  topic TEXT NOT NULL,
  hashtags JSONB DEFAULT '[]',
  trend_score DECIMAL(5,2), -- how trending (0-100)
  volume INT, -- estimated post volume
  growth_rate DECIMAL(5,2), -- growth percentage
  ai_analysis TEXT, -- why it's trending, how to leverage
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Files to create:**
- `src/lib/ai/trend-intelligence.ts` — Trend detection engine
- `src/components/dashboard/TrendingTopics.tsx` — Trending display widget
- `src/app/dashboard/hashtags/page.tsx` — Enhanced hashtag intelligence

---

## Phase 5: Advanced Features (Tier 3)

### 5.1 Influencer Marketplace (Public)

**Files to create:**
- `src/app/marketplace/page.tsx` — Public marketplace (browsable without login)
- `src/app/marketplace/[username]/page.tsx` — Public creator profile
- `src/components/marketplace/MarketplaceSearch.tsx`
- `src/components/marketplace/FeaturedCreators.tsx`

**Features:**
- Public-facing creator directory
- SEO-optimized creator profiles
- "Contact for Collaboration" → signup flow for brands
- Featured/promoted creator slots (premium feature)
- Category browsing (Fitness, Beauty, Tech, Food, Travel, Gaming, etc.)

### 5.2 Brand Match AI

**Files to create:**
- `src/lib/ai/brand-matching.ts` — AI matching engine
- `src/components/brand/BrandMatchSuggestions.tsx` — AI match cards
- `src/components/dashboard/BrandOpportunities.tsx` — Creator-side opportunities

**Features:**
- AI analyzes creator's niche, audience, content style
- Matches with brands looking for that profile
- Push notifications: "Nike is looking for fitness creators matching your profile"
- Match score (0-100) with reasoning
- One-click "Express Interest" → creates proposal draft

### 5.3 Cross-Platform Publishing (Future)

**Files to create:**
- `src/app/dashboard/publish/page.tsx` — Content scheduler
- `src/components/dashboard/ContentCalendar.tsx` — Visual calendar
- `src/components/dashboard/PostComposer.tsx` — Multi-platform composer
- `src/lib/social/publishers/` — Platform-specific publishing APIs

**Features:**
- Schedule posts to Instagram, TikTok, YouTube, Twitter, LinkedIn
- Visual content calendar
- Draft → Review → Schedule → Published workflow
- AI-suggested posting times
- Cross-post adaptation (auto-resize, caption length adjustment)

> **Note:** This requires official API access from each platform (Instagram Graph API, TikTok API, YouTube API, etc.) and may require app review. Plan for this but implement when API partnerships are secured.

---

## Phase 6: Enhanced Media Kit & Marketplace Profiles

### 6.1 Auto-Generated Media Kit

**Enhance existing `src/components/dashboard/settings/MediaKitTab.tsx`:**

- Auto-populate with live stats from `social_metrics`
- Pull AQS score and display as badge
- Show top 6 performing posts (auto-selected)
- Audience demographics breakdown (age, gender, location)
- Engagement rate with industry benchmark comparison
- Past brand collaborations (from `deals` table)
- Rate card (from `creator_marketplace_profiles`)
- One-click PDF export
- Public shareable link with custom slug (existing)

---

## Database Migration Summary

### New Tables (13)
1. `direct_messages` — Real-time messaging
2. `message_threads` — Conversation threads
3. `message_attachments` — File attachments
4. `proposals` — Brand-creator proposals
5. `proposal_events` — Proposal activity log
6. `platform_payments` — Stripe Connect payments
7. `audience_quality_scores` — AQS calculations
8. `content_optimizations` — AI content analysis
9. `competitor_insights` — Weekly AI competitor reports
10. `creator_marketplace_profiles` — Public creator profiles
11. `trending_topics` — Hashtag/trend intelligence
12. `brand_creator_matches` — AI match results
13. `scheduled_posts` — Cross-platform publishing queue

### Altered Tables (3)
1. `profiles` — Add account_type, company fields, stripe_connect_id
2. `deals` — Add pipeline_stage, proposal_id, thread_id, brand_profile_id, total_value
3. `organizations` — Add stripe_connect fields

---

## New File Structure

```
src/
├── app/
│   ├── brand/                          # NEW — Brand Dashboard
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Brand overview
│   │   ├── discover/page.tsx           # Creator discovery
│   │   ├── messages/page.tsx           # Brand messages
│   │   ├── campaigns/page.tsx          # Campaign management
│   │   ├── proposals/page.tsx          # Proposals sent/received
│   │   ├── deals/page.tsx              # Active deals
│   │   ├── payments/page.tsx           # Payment history
│   │   ├── analytics/page.tsx          # Brand analytics
│   │   └── settings/page.tsx           # Brand settings
│   ├── marketplace/                    # NEW — Public Marketplace
│   │   ├── page.tsx                    # Browse creators
│   │   └── [username]/page.tsx         # Creator public profile
│   ├── dashboard/
│   │   ├── deals/page.tsx              # NEW — Deal pipeline
│   │   ├── proposals/page.tsx          # NEW — Creator proposals
│   │   ├── publish/page.tsx            # NEW — Content scheduler
│   │   └── revenue/page.tsx            # ENHANCED — Revenue dashboard
│   └── api/
│       ├── webhooks/stripe-connect/route.ts  # NEW
│       └── cron/
│           ├── weekly-report/route.ts        # NEW
│           ├── monthly-report/route.ts       # NEW
│           └── trend-scan/route.ts           # NEW
├── components/
│   ├── messaging/                      # NEW — Messaging System
│   │   ├── MessageThread.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageInput.tsx
│   │   └── MessageBubble.tsx
│   ├── proposals/                      # NEW — Proposals
│   │   ├── ProposalBuilder.tsx
│   │   ├── ProposalView.tsx
│   │   ├── ProposalCard.tsx
│   │   └── NegotiationThread.tsx
│   ├── deals/                          # NEW — Deal Pipeline
│   │   ├── DealPipeline.tsx
│   │   ├── DealCard.tsx
│   │   └── DealDetail.tsx
│   ├── brand/                          # NEW — Brand Components
│   │   ├── BrandNav.tsx
│   │   ├── BrandShell.tsx
│   │   ├── CreatorSearch.tsx
│   │   ├── CreatorCard.tsx
│   │   ├── CreatorProfile.tsx
│   │   └── BrandMatchSuggestions.tsx
│   ├── marketplace/                    # NEW — Marketplace
│   │   ├── MarketplaceSearch.tsx
│   │   └── FeaturedCreators.tsx
│   ├── payments/                       # NEW — Payments
│   │   ├── PaymentButton.tsx
│   │   └── PayoutSetup.tsx
│   └── dashboard/
│       ├── AudienceQualityScore.tsx     # NEW
│       ├── ContentOptimizer.tsx         # NEW
│       ├── CompetitorInsights.tsx       # NEW
│       ├── TrendingTopics.tsx           # NEW
│       ├── RevenueDashboard.tsx         # NEW
│       ├── BrandOpportunities.tsx       # NEW
│       ├── ContentCalendar.tsx          # NEW (Phase 5)
│       └── PostComposer.tsx            # NEW (Phase 5)
├── lib/
│   ├── actions/
│   │   ├── messages.ts                 # NEW
│   │   ├── proposals.ts               # NEW
│   │   ├── payments.ts                # NEW
│   │   ├── marketplace.ts            # NEW
│   │   └── deals.ts                   # ENHANCED
│   ├── dal/
│   │   ├── messages.ts                # NEW
│   │   └── marketplace.ts            # NEW
│   ├── ai/
│   │   ├── audience-quality.ts        # NEW — AQS engine
│   │   ├── content-optimizer.ts       # NEW — Content optimization
│   │   ├── competitor-intelligence.ts # NEW — Weekly insights
│   │   ├── trend-intelligence.ts      # NEW — Hashtag trends
│   │   └── brand-matching.ts          # NEW — Brand Match AI
│   ├── email/
│   │   ├── weekly-report.ts           # NEW
│   │   └── monthly-report.ts          # NEW
│   └── stripe-connect.ts              # NEW — Stripe Connect
```

---

## Implementation Order

| # | Phase | Scope | Est. Complexity |
|---|-------|-------|----------------|
| 1 | Account Type + Brand Dashboard Shell | Routing, layout, nav | Medium |
| 2 | Messaging System | Real-time DMs, threads, file upload | High |
| 3 | Proposal System | Create, send, negotiate, accept proposals | High |
| 4 | Deal CRM Pipeline | Kanban board, deal tracking | Medium |
| 5 | Stripe Connect Payments | Brand → Creator payments, platform fee | High |
| 6 | Audience Quality Score | AI scoring engine, display widget | Medium |
| 7 | AI Content Optimizer | Pre-publish analysis, suggestions | Medium |
| 8 | Smart Competitor Tracker | Weekly AI insights, action items | Medium |
| 9 | Creator Discovery (Brands) | Search, filters, creator cards | Medium |
| 10 | Revenue Dashboard | Earnings tracking, charts, export | Medium |
| 11 | Auto Media Kit | Live stats, PDF export, AQS badge | Medium |
| 12 | AI Email Reports | Weekly/monthly cron reports via Resend | Medium |
| 13 | Hashtag & Trend Intelligence | Trend detection, AI suggestions | Medium |
| 14 | Public Marketplace | SEO pages, public profiles | Medium |
| 15 | Brand Match AI | AI matching, notifications | Medium |
| 16 | Cross-Platform Publishing | Content calendar, multi-platform posting | High |

---

## Plan Limits Update

```typescript
// Updated plan-limits.ts
export const PLAN_LIMITS = {
  free: {
    max_social_profiles: 2,
    ai_insights_per_month: 10,
    max_deals: 2,
    max_proposals_per_month: 3,
    max_messages_per_day: 10,
    content_optimizations_per_month: 3,
    ai_content_per_month: 5,
    max_conversations: 3,
    chat_messages_per_day: 5,
    analytics_days: 7,
    marketplace_listed: false,
    brand_discovery_results: 10,
    competitor_insights: false,
    email_reports: false,
    trending_topics: false,
    cross_platform_publishing: false,
  },
  pro: {
    max_social_profiles: 3,
    ai_insights_per_month: -1,
    max_deals: 10,
    max_proposals_per_month: 20,
    max_messages_per_day: -1,
    content_optimizations_per_month: 30,
    ai_content_per_month: 50,
    max_conversations: -1,
    chat_messages_per_day: -1,
    analytics_days: 30,
    marketplace_listed: true,
    brand_discovery_results: 50,
    competitor_insights: true,
    email_reports: true,
    trending_topics: true,
    cross_platform_publishing: false,
  },
  business: {
    max_social_profiles: 10,
    ai_insights_per_month: -1,
    max_deals: -1,
    max_proposals_per_month: -1,
    max_messages_per_day: -1,
    content_optimizations_per_month: -1,
    ai_content_per_month: -1,
    max_conversations: -1,
    chat_messages_per_day: -1,
    analytics_days: 90,
    marketplace_listed: true,
    brand_discovery_results: -1,
    competitor_insights: true,
    email_reports: true,
    trending_topics: true,
    cross_platform_publishing: true,
  },
  enterprise: {
    // everything unlimited
    max_social_profiles: -1,
    ai_insights_per_month: -1,
    max_deals: -1,
    max_proposals_per_month: -1,
    max_messages_per_day: -1,
    content_optimizations_per_month: -1,
    ai_content_per_month: -1,
    max_conversations: -1,
    chat_messages_per_day: -1,
    analytics_days: -1,
    marketplace_listed: true,
    brand_discovery_results: -1,
    competitor_insights: true,
    email_reports: true,
    trending_topics: true,
    cross_platform_publishing: true,
  },
};
```

---

## Revenue Streams

| Source | Model | Est. Per Transaction |
|--------|-------|---------------------|
| Creator Subscriptions | Monthly SaaS | $29 / $79 / $199 |
| Brand Subscriptions | Monthly SaaS (separate pricing) | $49 / $149 / $499 |
| Platform Payment Fees | % of brand→creator payments | 5% per transaction |
| Featured Marketplace | Promoted creator listings | $29/mo add-on |
| Brand Match Premium | Priority matching + notifications | Included in Business+ |

---

## Tech Stack Additions

| Need | Solution | Why |
|------|----------|-----|
| Real-time messaging | Supabase Realtime | Already using Supabase, zero setup |
| File uploads | Supabase Storage | Already using Supabase |
| Brand payments to creators | Stripe Connect | Already using Stripe |
| Scheduled reports | Vercel Cron | Already on Vercel |
| PDF export (Media Kit) | @react-pdf/renderer or html2canvas | Client-side generation |
| Kanban board | @hello-pangea/dnd | Lightweight drag-and-drop |

---

*This plan transforms Go Virall from a $29/mo analytics tool into a full **creator economy platform** competing with $2,000+/mo enterprise solutions — at 1/50th the price.*
