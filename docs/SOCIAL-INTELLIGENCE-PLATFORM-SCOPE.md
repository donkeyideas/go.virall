# Social Intelligence Platform — Complete Product Scope (V2)

> A standalone influencer analytics, revenue management, and social media optimization platform.
> Editorial/newspaper UI design system. Same architectural mindset as OpticRank — **but with its own separate Supabase project, database, and infrastructure.**

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Data Pipeline: How Pages Are Produced](#data-pipeline)
3. [Page-by-Page Detailed Scope (V2 — 14 Tabs)](#page-scope)
4. [Settings & Payments](#settings)
5. [Messaging / Deal Room System](#messaging)
6. [API Integrations](#apis)
7. [User Flows](#user-flows)
8. [AI Engine Details](#ai-engine)
9. [Database Schema (High-Level)](#database)
10. [My Analysis & Recommendations](#analysis)

---

## 1. Architecture Overview <a id="architecture-overview"></a>

### Relationship to OpticRank

Social Intelligence is built with the **same architectural mindset as OpticRank** (Next.js 15, Supabase, Vercel, editorial UI, Stripe, AI engine pattern) but is a **completely separate product** with:

- **Its own Supabase project** — separate Postgres database, separate Auth instance, separate Storage buckets, separate Edge Functions, separate Realtime channels
- **Its own Vercel deployment** — separate domain, separate environment variables
- **Its own Stripe account** — separate subscription plans, separate Connect accounts for creator payments
- **Shared design system** — same editorial/newspaper UI, same typography (Playfair Display, IBM Plex Sans, IBM Plex Mono), same color palette, same component patterns

This means a user on OpticRank and a user on Social Intelligence are **different accounts in different databases.** Future integration (single sign-on, cross-product dashboard) can be added later, but at launch they are independent.

```
┌─────────────────────────────────────────────────────────────┐
│  SOCIAL INTELLIGENCE — Standalone Product                    │
│  (Same mindset as OpticRank, separate infrastructure)        │
├─────────────────────────────────────────────────────────────┤
│                     FRONTEND                                 │
│  Next.js 15 (App Router) + Tailwind + Editorial UI           │
│  Routes: (marketing), (auth), (dashboard), (admin)           │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│           SUPABASE (Own Project — Separate from OpticRank)    │
│  Postgres DB │ Auth │ Realtime │ Storage │ Edge Functions     │
└──┬─────────┬──────────┬──────────┬─────────┬───────────────┘
   │         │          │          │         │
   ▼         ▼          ▼          ▼         ▼
┌──────┐ ┌──────┐ ┌────────┐ ┌────────┐ ┌──────────┐
│Social│ │  AI  │ │Payments│ │Storage │ │Realtime  │
│APIs  │ │Engine│ │(Stripe)│ │(Media  │ │(Messages │
│      │ │      │ │        │ │Kit PDFs│ │& Notifs) │
└──────┘ └──────┘ └────────┘ └────────┘ └──────────┘
```

### Data Flow
1. **User connects social accounts** → OAuth tokens stored encrypted in Supabase
2. **Background sync job** (Supabase Edge Function on cron) → Pulls data from social APIs every 4-6 hours
3. **Raw data stored** in `social_metrics` table (time-series)
4. **AI analysis triggered** after each sync → Generates insights, scores, recommendations
5. **Dashboard renders** pre-computed data (fast) + on-demand AI calls for deep analysis

---

## 2. Data Pipeline: How Pages Are Produced <a id="data-pipeline"></a>

### Answer to Questions 5-11: Automatic vs. Manual?

**It's BOTH — automated background sync + user-triggered deep analysis.**

| Action | Trigger | How It Works |
|--------|---------|-------------|
| Data collection (followers, posts, engagement) | **Automatic** — cron every 4-6 hrs | Supabase Edge Function calls Instagram Graph API, TikTok API, YouTube Data API |
| Basic metrics (growth %, engagement rate) | **Automatic** — computed on data ingest | SQL aggregations on `social_metrics` table |
| AI insights & recommendations | **Semi-automatic** — runs after each sync | AI (DeepSeek/Claude) processes new data, generates insights stored in `ai_analyses` table |
| Deep analysis (AI Insights tab) | **User-triggered** — "Generate New Analysis" button | Sends full profile context to AI, returns long-form strategic analysis |
| Content generation | **User-triggered** — user fills options, clicks Generate | AI call with user's niche, tone, topic preferences |
| Hashtag research | **Automatic base set** + **user-triggered refresh** | Base hashtags generated on profile connect; "Refresh Hashtags" button for manual update |
| Earnings estimates | **Automatic** — calculated from follower count + engagement + niche benchmarks | Formula-based with AI adjustment. User can override with actual deal amounts |
| Brand deal tracking | **Manual entry** — user adds deals + **AI-suggested opportunities** | User creates deals manually; AI scans marketplace for matching opportunities |
| Campaign tracking | **Hybrid** — user creates campaigns, metrics auto-pulled | User defines campaign (dates, brand, posts), system auto-tracks metrics for those posts |
| Network / Collaborations | **AI-generated** — recommendation engine | Matches influencers by niche, audience overlap, complementary content |
| SMO Score | **Automatic** — recalculated on each data sync | Algorithm scores 6 factors based on profile data + posting patterns |

### AI Engine (Question 5: DeepSeek API?)

The system should use **multiple AI providers** with fallback:

1. **Primary: DeepSeek API** (cost-effective for bulk analysis)
   - Growth recommendations, content strategy, hashtag research
   - SMO Score factor explanations
   - Campaign optimization suggestions

2. **Secondary: Claude API** (complex strategic analysis)
   - Deep AI Insights tab (long-form analysis)
   - Brand deal rate calculations (needs nuanced understanding)
   - Competitor strategy analysis

3. **Fallback: OpenAI GPT-4o** (if primary/secondary are down)

**AI is NOT called on every page load.** Insights are pre-computed and cached:
- After each data sync → background AI job generates fresh insights
- Stored in `ai_analyses` table with `generated_at` timestamp
- Dashboard reads from cache; user can manually trigger "Refresh Analysis"

---

## 3. Page-by-Page Detailed Scope (V2 — 14 Tabs) <a id="page-scope"></a>

### V2 Tab Order (by importance)
1. Overview — 2. Messages — 3. Revenue — 4. Campaigns — 5. Growth — 6. Content — 7. Audience — 8. SMO Score — 9. AI Studio — 10. Hashtags — 11. Competitors — 12. Network — 13. Goals — 14. Settings

### V2 Merges
- **Earnings + Brand Deals → Revenue** (single tab with earnings forecast + deal pipeline + rate calculator + media kit)
- **AI Insights + Generate → AI Studio** (single tab with 3 sub-tabs: Content Generator, Strategic Analysis, 30-Day Plan)

---

### 3.1 Overview (Dashboard Home)

**User Input:** None — fully automatic
**System Does:**
- Aggregates all connected profiles into headline stats
- AI generates "Social Intelligence Brief" (left column editorial stories)
- Pulls latest heatmap data from activity tracking
- Shows top performing content from last 30 days
- Computes Social Health score, SMO Score, competitor rankings
- Shows upcoming deadlines from brand deals/campaigns
- Shows recent activity feed from across all modules

**Data Sources:** All social APIs + internal deal/campaign tables + AI cache

---

### 3.2 Growth

**User Input:** None for viewing. Optional: set growth goals, select time range
**System Does:**
- Calculates growth rate, trajectory, and projections
- AI generates 6 prioritized growth tips based on current data
- Each tip has: priority (high/medium/low), category, impact estimate, and actionable steps
- Tips refresh automatically after each data sync
- User can mark tips as "completed" or "dismissed"

**AI Prompt Pattern:**
```
Given this profile data: {followers, engagement_rate, growth_rate, niche, content_mix, posting_frequency}
Generate 6 specific, actionable growth recommendations.
Prioritize by expected impact. Include estimated follower gain for each.
```

**Data Sources:** Instagram Graph API (`/me/insights`), TikTok (`/user/info`), YouTube Data API (`/channels`)

---

### 3.3 Content Strategy

**User Input:** None for viewing. Optional: set posting frequency goals
**System Does:**
- Analyzes posting frequency, content type distribution, scheduling patterns
- AI generates optimal posting schedule based on audience activity data
- Shows content mix breakdown (Reels vs Carousels vs Stories vs Posts)
- Weekly calendar view with recommended posting slots
- "Pro Tips" section with AI-generated content strategy advice

**AI Prompt Pattern:**
```
Analyze this content performance data: {post_types, engagement_by_type, posting_times, audience_active_hours}
Generate an optimal content strategy including: frequency, content mix, best posting times, pro tips.
```

**Data Sources:** Instagram Graph API (`/me/media`), TikTok (`/video/list`), YouTube Data API (`/search`)

---

### 3.4 Hashtags

**User Input:** Niche/topic is auto-detected. User can manually add seed keywords.
**System Does:**
- AI researches trending hashtags in user's niche
- Categorizes: Branded, Niche, Community, Trending, Reach
- Shows volume/competition/relevance scores for each hashtag
- "Copy All" button for each category
- Auto-refreshes weekly; user can manually trigger refresh
- Tracks which hashtags the user actually used and their performance

**AI Prompt Pattern:**
```
For a {niche} influencer with {followers} followers on {platform}:
Generate 30 optimized hashtags in categories: branded, niche, community, trending, reach.
Include estimated reach and competition level for each.
```

**Data Sources:** Social API post data (extract used hashtags) + AI generation + optional RapidAPI hashtag analytics

---

### 3.5 Competitors

**User Input:** User adds competitor handles (or AI suggests them based on niche)
**System Does:**
- Pulls public data for competitor profiles (followers, engagement, posting frequency)
- Side-by-side comparison cards
- Delta indicators (you vs. them)
- AI identifies competitor strengths/weaknesses
- Tracks competitor growth over time

**Data Sources:** Public profile data via social APIs (limited for non-connected accounts). May need scraping service for some data.

---

### 3.6 AI Studio (Merged: AI Insights + Content Generator)

**Three sub-tabs within one page.**

#### Sub-tab: Content Generator (default view)
**User Input:** Content type, topic, tone, count
**System Does:**
- AI generates post ideas with hooks, hashtags, CTAs
- Content types: Post Ideas, Captions, Calendar, Scripts, Carousels, Bio
- Each result includes: Hook, Body, Hashtag Set, CTA, Best Posting Time
- User can save favorites, edit, and schedule

**AI Model:** DeepSeek (primary), Claude (fallback)

#### Sub-tab: Strategic Analysis
**User Input:** Click "Regenerate" for fresh analysis. Select analysis type.
**System Does:**
- Generates long-form strategic analysis (markdown-rendered)
- Covers: Profile Positioning, Growth Trajectory, Content Performance, Monetization Opportunity, Key Risks
- Analysis types: Growth Strategy, Content Strategy, Monetization, Audience Building
- Previous analyses saved and browsable

**AI Model:** Claude API (for highest quality long-form analysis)

**AI Prompt Pattern:**
```
You are a social media strategist. Analyze this influencer profile comprehensively:
{full_profile_data, recent_metrics, content_performance, audience_demographics}
Provide: Profile Positioning, Growth Trajectory, Content Performance, Monetization Opportunity, Key Risks.
```

#### Sub-tab: 30-Day Plan
**User Input:** Click "Regenerate Plan" for fresh plan
**System Does:**
- AI generates a week-by-week action plan (4 weeks)
- Each week has specific, actionable tasks with content types and engagement targets
- Plan adapts to user's niche, current metrics, and stated goals

**AI Model:** Claude or DeepSeek

---

### 3.7 Revenue (Merged: Earnings + Brand Deals)

**All earnings forecasting, deal management, rate calculation, and media kit in one tab.**

#### Revenue Summary
**User Input:** None for viewing. Optional: enter actual deal amounts to improve accuracy
**System Does:**
- Top-line stats: Est. Monthly, Active Deals count, YTD Revenue, Pending deals
- Three scenario estimates: Conservative, Realistic, Optimistic
- Revenue breakdown by source (Sponsorships, Affiliate, Digital Products, Ad Revenue, Merch)
- Monetization factor scores (Audience Size, Engagement Quality, Content Consistency, Niche Demand, Brand Safety)

**Formula Example:**
```
Base Rate = followers × 0.01 (1 cent per follower)
Engagement Multiplier = engagement_rate / avg_engagement_rate_for_niche
Niche Multiplier = lookup_table[niche] (e.g., Fashion = 1.3, Tech = 1.1)
Estimated Earnings = Base Rate × Engagement Multiplier × Niche Multiplier
```

#### Recommended Rates & Rate Calculator
- AI-suggested rates per content type (Post, Story, Reel, TikTok Video, YouTube Integration, YouTube Dedicated)
- "Above/Below Market Average" badge
- Based on followers + engagement + niche benchmarks

#### Deal Pipeline
**User Input:** User creates deals (brand name, platform, type, rate, dates)
**System Does:**
- Deal pipeline with status tracking (Negotiating → Pending → In Progress → Content Approved → Completed)
- Active deals table with brand, platform, deliverables, rate, status, deadline
- Completed deals history with ratings

#### Media Kit (within Revenue tab)
- **Auto-generated** from profile data: photo, bio, follower count, engagement rate, audience demographics, past collaborations, rates, content samples
- **"Download PDF"** and **"Share Link"** buttons
- Public URL for brands to view
- Full editor in Settings → Media Kit sub-tab

#### How to Reach Optimistic Scenario
- Numbered action items (increase posting, launch digital product, negotiate long-term partnerships, expand platforms, join affiliate programs)

**Data Sources:** Internal calculations + AI adjustments + user-provided amounts + Puppeteer (PDF)

---

### 3.8 Goals

**User Input:** User sets goals (objective, target followers, timeline, niche, monetization goals)
**System Does:**
- Tracks progress toward goals with visual progress bars
- Calculates pace analysis (on track / behind / ahead)
- AI generates personalized action items based on goal gap
- Milestone notifications when goals are hit

---

### ~~3.9 Generate~~ — Merged into AI Studio (see 3.6)

### ~~3.10 Brand Deals~~ — Merged into Revenue (see 3.7)

---

### 3.11 Audience

**User Input:** None — fully automatic
**System Does:**
- Audience quality score (0-100) with factor breakdown
- Demographics: age, gender, location (from social API insights)
- Interest/affinity tags (AI-inferred from engagement patterns)
- Follower activity heatmap (interactive)
- Growth quality analysis (organic vs. paid, unfollow rate)

**Data Sources:** Instagram Insights API (`/me/insights` with demographics), TikTok Analytics, YouTube Analytics

---

### 3.12 Campaigns

**User Input:** User creates campaigns (name, client, platform, dates, content deliverables)
**System Does:**
- Tracks campaign metrics: reach, engagement, link clicks, conversions
- Progress bar (% complete based on deliverables posted vs. total)
- Content performance matrix (post type vs. platform engagement)
- Campaign calendar view
- **AI Recommendations (Question 10):** After each campaign metric update, AI analyzes performance and suggests:
  - "Your Reels are underperforming vs. campaign avg — try posting at 6pm instead of 9am"
  - "Carousel posts in this campaign have 2x the save rate — shift 2 deliverables to carousels"
  - "Campaign is trending 15% below reach target — boost with 3 additional Stories this week"

---

### 3.13 Network

**User Input:** None for viewing. User can "Connect" with suggested collaborators.
**How It's Produced (Question 11):**
- **Influence Score:** Calculated from 5 factors (Content Quality, Audience Trust, Brand Safety, Consistency, Growth Velocity) — each derived from social API metrics
- **Collaboration Opportunities:** These come from a **brand marketplace** — brands post briefs on the platform, system matches creators based on niche, follower count, engagement rate. The match % is cosine similarity between brand requirements and creator profile.
- **Suggested Collaborators:** AI recommendation engine based on:
  - Audience overlap analysis (shared followers between two creators)
  - Complementary niche detection
  - Similar engagement patterns
  - Content style similarity
- **Industry Benchmarks:** Calculated from anonymized aggregate data across all platform users in the same niche + follower tier

---

### 3.14 SMO Score

**User Input:** None — fully automatic
**System Does:**
- Calculates SMO Score (0-100) from 6 weighted factors
- Factor detail cards with findings and recommendations
- Profile optimization checklist
- Competitor SMO comparison
- 30-day improvement plan
- Re-scores automatically on each data sync

---

## 4. Settings & Payments <a id="settings"></a>

### Settings Page Structure (Question 12)

**Tab: Account**
- Profile info (name, email, avatar)
- Change password
- Two-factor authentication
- Delete account

**Tab: Connected Accounts**
- List of connected social profiles with status (Active / Expired / Error)
- "Connect New Account" button (OAuth flow for Instagram, TikTok, YouTube, Twitter/X)
- "Disconnect" option per account
- Data sync status and last sync time
- Manual "Sync Now" button

**Tab: Subscription & Billing**
- Current plan (Free / Pro / Business / Enterprise)
- Plan comparison table
- Upgrade/downgrade buttons
- Stripe-powered payment form (card on file)
- Billing history (invoices downloadable)
- Cancel subscription

**Plan Tiers:**
| Feature | Free | Pro ($29/mo) | Business ($79/mo) | Enterprise ($199/mo) |
|---------|------|-------------|-------------------|---------------------|
| Connected Profiles | 1 | 3 | 10 | Unlimited |
| Data Sync Frequency | 24hr | 6hr | 2hr | Real-time |
| AI Insights | 3/mo | Unlimited | Unlimited | Unlimited + Priority |
| Brand Deal Tracking | 2 active | 10 active | Unlimited | Unlimited |
| Content Generation | 5/mo | 50/mo | Unlimited | Unlimited |
| Media Kit | Basic | Full + PDF | Full + PDF + Custom Domain | White-label |
| Messaging | No | 10 conversations | Unlimited | Unlimited + Team |
| Campaign Tracking | 1 active | 5 active | Unlimited | Unlimited |
| Competitor Tracking | 2 | 5 | 15 | Unlimited |
| API Access | No | No | Basic | Full |

**Tab: Notifications**
- Email notifications (daily digest, deal updates, milestone alerts)
- Push notifications (if mobile app)
- In-app notification preferences
- Weekly report email toggle

**Tab: Media Kit**
- Media kit editor (drag-and-drop sections)
- Upload portfolio images
- Custom branding (colors, logo)
- Public URL settings (custom slug)
- Analytics (who viewed your media kit, when)

**Tab: Team (Business+ plans)**
- Invite team members (manager, assistant)
- Role permissions (view only, edit, admin)
- Activity log

---

## 5. Messaging / Deal Room System <a id="messaging"></a>

### Concept (Question 13): YES — This is a killer feature.

A built-in messaging system where creators and brands communicate, negotiate, and manage deals entirely within the platform. This is a **major differentiator** vs. email-based workflows.

### How It Works:

**For Creators:**
1. Creator sees a brand opportunity on the Network tab → clicks "Apply"
2. Application goes to the brand's dashboard → brand reviews creator's profile + media kit
3. If interested, brand initiates a **Deal Room** (conversation thread tied to a specific deal)
4. Inside the Deal Room:
   - Real-time messaging (Supabase Realtime)
   - Proposal builder (template-based, fill in deliverables + rates + timeline)
   - Contract viewer (PDF upload/sign)
   - File sharing (content drafts, brand assets)
   - Payment milestones (mark deliverables as complete, trigger payment)
   - Deal status tracker (visible to both parties)

**For Brands:**
1. Brand creates a brief (requirements, budget, timeline, niche)
2. System matches and suggests creators
3. Brand can browse creator profiles + media kits
4. Brand initiates Deal Room with selected creators
5. Negotiation, approval, content review, payment — all in one thread

### Deal Room Features:
- **Proposal Templates:** Pre-formatted proposals the creator fills out (deliverables, rates, timeline, usage rights)
- **Content Approval Flow:** Creator uploads draft → brand reviews → approved/revision requested → final delivery
- **Payment Integration:** Stripe Connect for direct payments. Escrow option: brand funds deal upfront, money released when deliverables approved.
- **Contract Signing:** Integrated e-signature (DocuSign API or simple "I agree" acknowledgment)
- **Notification System:** "Brand X responded to your proposal" / "Content approved — payment released"
- **Rating & Review:** After deal completion, both parties rate each other (builds trust scores)

### Why This Is Valuable:
- Creators currently juggle email, DMs, WhatsApp, Google Docs — having ONE place for everything is massive
- Brands get a structured workflow instead of chaos
- Platform takes a % commission on deals closed through the platform (revenue model)
- Data from deals feeds into the analytics (actual earnings, brand partnerships, rates)

---

## 6. API Integrations <a id="apis"></a>

### Social Media APIs
| Platform | API | Data Pulled | Auth |
|----------|-----|-------------|------|
| Instagram | Instagram Graph API | Followers, posts, stories, insights, demographics | OAuth (Facebook Login) |
| TikTok | TikTok API for Developers | Videos, views, likes, comments, profile info | OAuth |
| YouTube | YouTube Data API v3 | Subscribers, videos, views, analytics | OAuth (Google) |
| Twitter/X | X API v2 | Followers, tweets, engagement | OAuth 2.0 |
| Pinterest | Pinterest API | Pins, boards, followers, impressions | OAuth |

### AI APIs
| Provider | Use Case | Cost |
|----------|----------|------|
| DeepSeek | Bulk analysis, content generation, hashtags | ~$0.14/M input tokens |
| Claude (Anthropic) | Strategic analysis, complex reasoning | ~$3/M input tokens |
| OpenAI GPT-4o | Fallback, image analysis | ~$2.50/M input tokens |

### Other APIs
| Service | Use Case |
|---------|----------|
| Stripe | Payments, subscriptions, Connect (for brand→creator payments) |
| Supabase | Database, Auth, Realtime, Storage, Edge Functions |
| Resend / SendGrid | Transactional emails |
| Upstash Redis | Caching, rate limiting |
| Puppeteer (server) | PDF generation for media kits |

---

## 7. User Flows <a id="user-flows"></a>

### Flow 1: New User Onboarding
```
Sign Up → Verify Email → Connect First Social Account (OAuth) →
AI Analyzes Profile (loading screen, ~30 sec) →
Dashboard with initial data + "Getting Started" checklist
```

### Flow 2: Daily Creator Workflow
```
Open Dashboard → Review Overview (new insights, deadlines, activity) →
Check Brand Deals (any new messages/approvals?) →
Review AI Growth Tips → Generate Content Ideas →
Post content → Metrics auto-tracked → AI updates insights
```

### Flow 3: Brand Deal Lifecycle
```
Opportunity appears on Network tab → Creator applies →
Brand reviews in their dashboard → Initiates Deal Room →
Negotiate terms → Send Proposal → Brand approves →
Creator produces content → Uploads draft to Deal Room →
Brand reviews/approves → Creator posts → Metrics tracked →
Payment released → Both parties rate each other → Deal archived
```

### Flow 4: Media Kit Share
```
Creator customizes Media Kit in Settings → Clicks "Share Link" →
Gets public URL → Sends to brand → Brand views media kit →
Brand clicks "Contact Creator" → Initiates Deal Room
```

---

## 8. AI Engine Details <a id="ai-engine"></a>

### AI Job Queue System

```
┌─────────────────────────────────────────────┐
│  Supabase Edge Function (Cron: every 4 hrs) │
│  1. Fetch new data from social APIs          │
│  2. Store raw metrics                        │
│  3. Queue AI analysis jobs                   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  AI Job Processor (Edge Function)            │
│  Processes queued jobs:                      │
│  - growth_analysis                           │
│  - content_strategy                          │
│  - hashtag_refresh                           │
│  - smo_score_calculation                     │
│  - earnings_estimate                         │
│  - competitor_update                         │
│  Stores results in ai_analyses table         │
└─────────────────────────────────────────────┘
```

### AI Analysis Types & Caching

| Analysis | Refresh Rate | AI Model | Cached? |
|----------|-------------|----------|---------|
| Growth Tips | Every sync (4-6 hrs) | DeepSeek | Yes |
| Content Strategy | Daily | DeepSeek | Yes |
| Hashtag Set | Weekly + manual | DeepSeek | Yes |
| Earnings Estimate | Every sync | Formula + AI | Yes |
| SMO Score | Every sync | Formula (no AI) | Yes |
| AI Studio — Strategic Analysis | On-demand only | Claude | Yes (per analysis) |
| AI Studio — Content Generator | On-demand only | DeepSeek | No (ephemeral) |
| AI Studio — 30-Day Plan | On-demand only | Claude or DeepSeek | Yes (per plan) |
| Campaign Recommendations | After metric update | DeepSeek | Yes |
| Network Matching | Daily | Algorithm (no AI) | Yes |

---

## 9. Database Schema (High-Level) <a id="database"></a>

### Core Tables

```sql
-- Users & Auth
users (id, email, name, avatar_url, plan, created_at)
subscriptions (id, user_id, stripe_customer_id, plan, status, current_period_end)

-- Social Profiles
social_profiles (id, user_id, platform, handle, access_token_encrypted, followers, engagement_rate, last_synced)

-- Time-Series Metrics
social_metrics (id, profile_id, date, followers, following, posts_count, engagement_rate, avg_views, avg_likes, avg_comments)

-- Content
posts (id, profile_id, platform_post_id, type, caption, hashtags, reach, engagement, saves, shares, posted_at)

-- AI Cache
ai_analyses (id, profile_id, type, content_json, model_used, generated_at, expires_at)

-- Brand Deals
deals (id, user_id, brand_name, platform, deal_type, rate, status, deadline, created_at, completed_at, rating)
deal_deliverables (id, deal_id, type, description, status, due_date)

-- Campaigns
campaigns (id, user_id, name, client, platform, start_date, end_date, status, budget)
campaign_posts (id, campaign_id, post_id)

-- Goals
goals (id, user_id, objective, target_value, current_value, deadline, status)

-- Messaging / Deal Rooms
conversations (id, deal_id, creator_id, brand_user_id, status, created_at)
messages (id, conversation_id, sender_id, content, attachments_json, read_at, created_at)
proposals (id, conversation_id, deliverables_json, rate, timeline, status)

-- Competitors
competitors (id, user_id, handle, platform, followers, engagement_rate, last_updated)

-- Media Kit
media_kits (id, user_id, slug, sections_json, is_public, custom_branding_json, views_count)

-- Notifications
notifications (id, user_id, type, title, body, read, action_url, created_at)
```

---

## 10. My Analysis & Recommendations <a id="analysis"></a>

### What I Think About This Project (Question 16)

**This is a strong product idea with real market demand.** Here's my honest assessment:

**Strengths:**
1. **Real problem, real audience.** Influencers/creators are an underserved market for all-in-one tools. Most use 5-7 separate tools (Later, Iconosquare, Klear, Grin, spreadsheets, email).
2. **Messaging/Deal Room is a killer feature.** No major competitor has a built-in brand↔creator communication + deal management system. This alone could be the product.
3. **SMO Score is novel.** SEO has scores everywhere (Moz, Ahrefs). Social media optimization scoring doesn't really exist as a standardized metric. You could own this concept.
4. **AI integration is well-timed.** Using AI for insights/recommendations/content generation is exactly what creators need. The bulk of competitors still show raw data without actionable AI advice.
5. **Editorial UI is distinctive.** Most influencer tools look like generic SaaS dashboards. The newspaper design makes this memorable and positions it as "intelligent analysis" not just "data dashboard."

**Risks & Considerations:**
1. **Social API access is restrictive.** Instagram/Meta and TikTok have strict API review processes. Getting approved for full insights access (demographics, story data) requires a formal app review. Plan 2-4 weeks for this.
2. **Competitor landscape.** Existing players: Iconosquare, Later, Hootsuite, Sprout Social, CreatorIQ, Grin, AspireIQ. Your differentiator needs to be clear — I'd lead with: AI-first insights + Deal Room messaging + SMO Score.
3. **Marketplace chicken-and-egg.** The brand opportunity matching (Network tab) requires brands to be on the platform. You'll need to seed this — consider scraping public brand campaign postings or partnering with existing influencer marketplaces initially.
4. **Data accuracy for non-connected accounts.** Competitor analysis for accounts you don't have OAuth access to is limited to public data only. Some metrics will be estimates.

**Architecture Decision — Standalone with Shared DNA:**
- **Built as a standalone product** with its own Supabase project, Vercel deployment, Stripe account, and domain. The influencer audience is different from the SEO audience — separate databases, separate billing, separate user accounts.
- **Same architectural mindset as OpticRank** — same Next.js 15 patterns, same Supabase Edge Function patterns, same editorial design system, same component library conventions. An agent that built OpticRank can build this using the same playbook.
- **Future integration possible** — single sign-on, cross-product dashboard, or bundled subscription can be added later without database migration since both use the same Supabase/Postgres patterns.

**Revenue Model:**
- SaaS subscriptions ($29-$199/mo)
- Commission on deals closed through the platform (10-15%)
- Featured placement for brands in the marketplace
- White-label/API access for agencies (Enterprise tier)

---

## 11. Full Build Scope — Go-Live Spec (V2) <a id="full-build"></a>

> **This is NOT an MVP.** This is the complete platform build — every feature, every page, every integration. Ship-ready from day one.
> **Separate infrastructure from OpticRank.** Own Supabase project, own Vercel deployment, own Stripe account. Same architectural patterns and editorial design system.

### Build Order (Dependency-Based, Not Phased)

Everything below ships at launch. Order is based on technical dependencies (what must exist before other things can use it).

#### Layer 1: Foundation (build first — everything depends on this)
| Component | What Gets Built | Dependencies |
|-----------|----------------|-------------|
| **Supabase Project** | Create new Supabase project (separate from OpticRank). Postgres database, Auth, Realtime, Storage, Edge Functions — all independent | None |
| **Project Scaffold** | Next.js 15 App Router, Tailwind v4, editorial design system (CSS variables, typography, components), route groups: `(marketing)`, `(auth)`, `(dashboard)`, `(admin)` | None |
| **Auth System** | Supabase Auth — email/password, Google OAuth, Apple Sign-In. Protected routes, session management, middleware | Supabase project |
| **Database Schema** | All tables (see Section 9). RLS policies, indexes, migrations | Supabase project |
| **Social OAuth Connections** | Instagram Graph API, TikTok API, YouTube Data API — OAuth flows to connect accounts, encrypted token storage, refresh token handling | Auth system |
| **Background Data Sync** | Supabase Edge Function on cron (every 4 hrs). Pulls metrics from all connected social APIs, stores in `social_metrics` time-series table | Social OAuth, Database |
| **AI Engine** | Job queue processor. After each sync: triggers DeepSeek/Claude analysis, stores results in `ai_analyses` table. Includes fallback chain (DeepSeek → Claude → OpenAI) | Background sync, Database |
| **Settings Page** | Account, Connected Accounts, Subscription & Billing (Stripe integration — plans, checkout, portal, webhooks), Notifications, Media Kit editor, Team management | Auth, Stripe |

#### Layer 2: Core Pages (V2 — 14 dashboard tabs, ordered by importance)
| # | Page | User Input | System Output | APIs Used |
|---|------|-----------|---------------|-----------|
| 1 | **Overview** | None | 3-column newspaper grid: AI stories, heatmap, charts, stats, health score, SMO score, deadlines, activity feed | All APIs (aggregated) |
| 2 | **Messages** | Send messages, upload files, send proposals | Real-time messaging, deal rooms, proposal builder, content approval flow, payment milestones | Supabase Realtime + Stripe Connect |
| 3 | **Revenue** | Optional: actual deal amounts. Create deals (brand, platform, type, rate, dates) | Earnings forecast (3 scenarios), revenue breakdown, recommended rates, deal pipeline, completed deals, media kit preview, optimization tips | Formula + DeepSeek + Puppeteer (PDF) |
| 4 | **Campaigns** | Create campaigns (name, client, dates, deliverables) | Metric tracking, progress bars, content performance matrix, calendar, AI optimization recommendations | Social APIs + DeepSeek |
| 5 | **Growth** | Optional: growth goals, time range | 6 AI-generated growth tips with priority/category/impact, trajectory projections | Social APIs + DeepSeek |
| 6 | **Content** | Optional: posting frequency goals | Optimal schedule, content mix analysis, weekly calendar, pro tips | Social APIs + DeepSeek |
| 7 | **Audience** | None | Quality score (0-100), demographics (age/gender/location), interest tags, activity heatmap, growth quality analysis | Social Insights APIs |
| 8 | **SMO Score** | None | Score (0-100) with 6 weighted factors, detail cards with findings + recommendations, checklist, competitor comparison, 30-day improvement plan | Algorithm |
| 9 | **AI Studio** | Content type/topic/tone (Generator), click Regenerate (Analysis/Plan) | 3 sub-tabs: Content Generator (post ideas, captions, scripts, carousels), Strategic Analysis (long-form AI analysis), 30-Day Plan (week-by-week action plan) | DeepSeek + Claude |
| 10 | **Hashtags** | Optional: seed keywords | 30 categorized hashtags with volume/competition/relevance, copy-all buttons, auto-refresh weekly | Social APIs + DeepSeek |
| 11 | **Competitors** | Add competitor handles (or AI-suggested) | Side-by-side comparison, delta indicators, AI strength/weakness analysis | Public social data + DeepSeek |
| 12 | **Network** | None (can "Connect" with collaborators) | Influence score (5 factors), brand opportunities (marketplace matching), suggested collaborators (audience overlap), industry benchmarks | Algorithm + Social APIs |
| 13 | **Goals** | Set goals (objective, target, timeline) | Progress tracking, pace analysis, AI-generated action items, milestone notifications | Internal + DeepSeek |
| 14 | **Settings** | Account info, preferences | Account, Connected Accounts, Billing, Notifications, Media Kit editor, Team management | Stripe + Supabase Auth |

#### Layer 3: Messaging / Deal Room System
| Component | What Gets Built |
|-----------|----------------|
| **Conversation Engine** | Supabase Realtime-powered messaging. Conversation threads tied to deals. Read receipts, typing indicators |
| **Proposal Builder** | Template-based proposal form: deliverables, rates, timeline, usage rights. Send/accept/counter flow |
| **Content Approval Flow** | Creator uploads draft → brand reviews → approved/revision → final delivery. File attachments (Supabase Storage) |
| **Payment Integration** | Stripe Connect for brand→creator payments. Escrow: brand funds deal, money released on deliverable approval |
| **Notification System** | In-app + email notifications for messages, approvals, payments. Badge counts on nav |

#### Layer 4: Media Kit System
| Component | What Gets Built |
|-----------|----------------|
| **Auto-Generation** | Pulls profile data into media kit template: photo, bio, stats, demographics, past collabs, rates, content samples |
| **Editor** | Drag-and-drop section reordering, custom text, portfolio image uploads, branding options |
| **PDF Export** | Server-side PDF generation via React-PDF. Branded template with editorial design |
| **Public Share URL** | `app.domain.com/mediakit/{slug}` — public page with toggleable sections. View analytics (who viewed, when) |

#### Layer 5: Marketing Site & Admin
| Component | What Gets Built |
|-----------|----------------|
| **Marketing Site** | Landing page, pricing page, features page, blog, SEO-optimized. Same editorial design |
| **Admin Dashboard** | User management, subscription analytics, platform metrics, AI usage tracking, content moderation |
| **Onboarding Flow** | Sign up → connect first account → AI analyzes (30s loading) → dashboard with "Getting Started" checklist |

### Complete Page List (V2 — Ship at Launch)

**Marketing (public):**
1. `/` — Landing page
2. `/pricing` — Plan comparison
3. `/features` — Feature showcase
4. `/blog` — SEO content
5. `/mediakit/:slug` — Public media kit pages

**Auth:**
6. `/login`
7. `/signup`
8. `/forgot-password`
9. `/verify-email`

**Dashboard (authenticated — 14 tabs, V2 order):**
10. `/dashboard` — Overview (3-column newspaper grid)
11. `/dashboard/messages` — Deal Room messaging
12. `/dashboard/revenue` — Earnings forecast + brand deals + rates + media kit
13. `/dashboard/campaigns`
14. `/dashboard/growth`
15. `/dashboard/content` — Content strategy
16. `/dashboard/audience`
17. `/dashboard/smo-score`
18. `/dashboard/ai-studio` — Content Generator + Strategic Analysis + 30-Day Plan (sub-tabs)
19. `/dashboard/hashtags`
20. `/dashboard/competitors`
21. `/dashboard/network`
22. `/dashboard/goals`
23. `/dashboard/settings` — Account, billing, connections, notifications, media kit editor, team

**Admin (admin-only):**
24. `/admin` — Platform analytics
25. `/admin/users` — User management
26. `/admin/subscriptions` — Revenue dashboard
27. `/admin/ai-usage` — AI cost tracking

### Technical Requirements for Go-Live

| Requirement | Solution |
|------------|---------|
| SSL/HTTPS | Vercel (automatic) |
| Custom Domain | Vercel DNS |
| CDN | Vercel Edge Network |
| Database Backups | Supabase (automatic daily, point-in-time recovery on Pro) |
| Rate Limiting | Upstash Redis |
| Error Monitoring | Sentry |
| Analytics | PostHog or Mixpanel |
| Email Deliverability | Resend (custom domain, DKIM/SPF) |
| Social API App Review | Instagram (Facebook App Review), TikTok (Developer Portal), YouTube (Google Cloud Console) — submit 2-4 weeks before launch |
| Stripe Activation | Business verification, bank account, tax info |
| Privacy Policy & ToS | Required for social API approval + Stripe |
| GDPR Compliance | Data export, account deletion, consent management |

---

## Appendix: Handoff Notes for Building Agent

### Infrastructure — Separate from OpticRank
- **Own Supabase project.** Do NOT share the OpticRank Supabase instance. Create a new project with its own Postgres database, Auth, Realtime, Storage, and Edge Functions.
- **Own Vercel deployment.** Separate domain, separate environment variables, separate CI/CD.
- **Own Stripe account.** Separate subscription plans, separate Connect accounts for creator↔brand payments.
- **Same architectural patterns as OpticRank.** Same folder structure conventions, same auth middleware patterns, same Edge Function patterns, same component architecture. If you've built OpticRank, you know how to build this — same playbook, new database.

### Tech Stack (Final — All Required)
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4
- **Backend:** Supabase (Postgres + Auth + Realtime + Storage + Edge Functions) — **own project, separate from OpticRank**
- **Deployment:** Vercel — **own deployment, separate from OpticRank**
- **Payments:** Stripe (Subscriptions + Checkout + Customer Portal + Connect for marketplace) — **own Stripe account**
- **AI:** DeepSeek API (primary), Claude API (strategic analysis), OpenAI GPT-4o (fallback)
- **Charts:** Recharts
- **State:** Zustand
- **Forms:** React Hook Form + Zod
- **Caching:** Upstash Redis
- **PDF Generation:** React-PDF (server-side)
- **Email:** Resend
- **Error Monitoring:** Sentry
- **Analytics:** PostHog
- **Real-time:** Supabase Realtime (messaging, notifications)
- **File Storage:** Supabase Storage (media kit images, content drafts, brand assets)
- **Design System:** Editorial/Newspaper (Playfair Display, IBM Plex Sans, IBM Plex Mono) — same as OpticRank

### Design References
- `social-intelligence-mockup-v2.html` — **V2 UI mockup with 14 tabs** (merged Revenue + AI Studio), importance-based tab order (open in browser)
- `social-intelligence-mockup.html` — V1 reference (16 tabs, before merges)
- `mockups/design-6-editorial.html` — Original design system reference (colors, typography, components)

### V2 Tab Structure (14 tabs)
| # | Tab | Route | Notes |
|---|-----|-------|-------|
| 1 | Overview | `/dashboard` | 3-column newspaper grid |
| 2 | Messages | `/dashboard/messages` | Deal Room, real-time messaging |
| 3 | Revenue | `/dashboard/revenue` | Merged: Earnings + Brand Deals |
| 4 | Campaigns | `/dashboard/campaigns` | |
| 5 | Growth | `/dashboard/growth` | |
| 6 | Content | `/dashboard/content` | Content strategy |
| 7 | Audience | `/dashboard/audience` | |
| 8 | SMO Score | `/dashboard/smo-score` | |
| 9 | AI Studio | `/dashboard/ai-studio` | 3 sub-tabs: Content Generator, Strategic Analysis, 30-Day Plan |
| 10 | Hashtags | `/dashboard/hashtags` | |
| 11 | Competitors | `/dashboard/competitors` | |
| 12 | Network | `/dashboard/network` | |
| 13 | Goals | `/dashboard/goals` | |
| 14 | Settings | `/dashboard/settings` | 6 sub-tabs: Account, Connected Accounts, Billing, Notifications, Media Kit, Team |

### Key Principles
1. **NO mock or hardcoded data.** Everything backed by real API integrations. Use loading states, empty states, and onboarding flows.
2. **Build ALL pages and features.** This is not an MVP. Every tab in the V2 mockup ships at launch.
3. **Separate infrastructure.** Own Supabase project, own Vercel deployment, own Stripe account. Same mindset as OpticRank, independent database.
4. **Real-time where it matters.** Messaging, notifications, and live metric updates use Supabase Realtime.
5. **Mobile-responsive from day one.** Every page works on mobile (hamburger drawer nav, stacked layouts).
6. **Dark/light theme toggle.** CSS variables, user preference persisted.
7. **AI results are cached.** Never call AI on page load — read from `ai_analyses` table. Background jobs pre-compute everything.
