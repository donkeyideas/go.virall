# Go Virall v2 — Build Status

> Last updated: March 21, 2026

## Project Overview

Go Virall v2 is a social media intelligence platform for influencers and creators. Built at `C:\Users\beltr\SEO Intelligence\go.viral`. Adapted from OpticRank's Social Intel feature with expanded capabilities.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind v4, Supabase, Recharts, DeepSeek AI (primary)

**Supabase Project:** `qrtbfhhhilcoeovdubqb` (same project as old Go Virall, tables wiped and rebuilt)

---

## What's Built & Working

### Auth & Shell
- Sign up / login pages (`/login`, `/signup`)
- Auth middleware (redirects unauthenticated users)
- Auto-provisioning: signup creates org + profile rows
- Editorial newspaper UI (Masthead, PaperHeader, PaperNav, BottomBar)
- Dark theme with Playfair Display / IBM Plex Sans fonts
- 14-tab dashboard nav

### Profile System
- Add social profiles via modal (platform grid + handle input)
- Plan limit check (free = 3 profiles)
- Duplicate detection
- Profile selector bar with platform icons + follower counts
- Profile card with avatar, stats, bio, verified badge
- "Sync Data" button (scrapes fresh data from platform)
- Auto-sync on page load (Instagram only, saves to DB)
- Daily metrics snapshots saved to `social_metrics` table
- Profile switching now updates profile card, recent posts, and analysis status per profile

### Scrapers (all 8 platforms)

| Platform | File | Strategy | API Key |
|----------|------|----------|---------|
| Instagram | `src/lib/social/instagram.ts` | `/embed/` endpoint → contextJSON | No |
| TikTok | `src/lib/social/tiktok.ts` | `__UNIVERSAL_DATA_FOR_REHYDRATION__` / `SIGI_STATE` | No |
| YouTube | `src/lib/social/youtube.ts` | Official YouTube Data API v3 | Yes (`YOUTUBE_API_KEY`) |
| Twitter/X | `src/lib/social/twitter.ts` | 3-tier: Official API → FxTwitter → Syndication | Optional (`TWITTER_BEARER_TOKEN`) |
| LinkedIn | `src/lib/social/linkedin.ts` | JSON-LD structured data from public page | No |
| Threads | `src/lib/social/threads.ts` | og:description meta tags | No |
| Pinterest | `src/lib/social/pinterest.ts` | `__NEXT_DATA__` / relay JSON / meta tags | No |
| Twitch | `src/lib/social/twitch.ts` | Twitch GQL API (public client ID) | No |

All scrapers wired into `addSocialProfile()` and `syncSocialProfile()` in `src/lib/actions/profiles.ts`.

### AI Analysis Engine
- Multi-provider AI with fallback: DeepSeek → OpenAI → Anthropic → Gemini
- Provider config from DB (`platform_api_configs` table) merged with env vars
- API call logging to `api_call_log` table
- 11 analysis types, all working:
  - `growth` — prioritized growth tips
  - `content_strategy` — posting schedule + content mix
  - `hashtags` — categorized hashtag recommendations
  - `competitors` — benchmark analysis
  - `insights` — strategic AI analysis
  - `earnings_forecast` — 3 revenue scenarios
  - `thirty_day_plan` — day-by-day plan
  - `smo_score` — 6-factor social media optimization score
  - `audience` — demographics analysis
  - `network` — collaboration opportunities
  - `campaign_ideas` — campaign recommendations
- "Run All Analyses" button with concurrent queue (3 at a time) + progress bar
- Analysis status grid shows DONE/NOT RUN per type
- Results cached in DB (`social_analyses` table), persist across navigation
- All 10 analysis tab pages load cached results from DB on mount

### Dashboard Tabs (14 total)

| Tab | Route | Status |
|-----|-------|--------|
| Profile | `/dashboard` | Working — profile card, stats, recent posts (Instagram), analysis status |
| Messages | `/dashboard/messages` | Placeholder page |
| Revenue | `/dashboard/revenue` | Working — AI earnings forecast with Run button |
| Campaigns | `/dashboard/campaigns` | Working — AI campaign ideas with Run button |
| Growth | `/dashboard/growth` | Working — AI growth tips with Run button |
| Content | `/dashboard/content` | Working — AI content strategy with Run button |
| Audience | `/dashboard/audience` | Working — AI audience analysis with Run button |
| SMO Score | `/dashboard/smo-score` | Working — AI SMO score with Run button |
| AI Studio | `/dashboard/ai-studio` | Working — AI insights with Run button |
| Hashtags | `/dashboard/hashtags` | Working — AI hashtag recommendations with Run button |
| Competitors | `/dashboard/competitors` | Working — AI competitor analysis with Run button |
| Network | `/dashboard/network` | Working — AI network analysis with Run button |
| Goals | `/dashboard/goals` | Has GoalsClient component |
| Settings | `/dashboard/settings` | Placeholder page |

### API Routes
- `GET /api/proxy/image` — proxies Instagram CDN images to bypass CORS/referrer blocking

### Image Handling
- Instagram CDN URLs routed through `/api/proxy/image` server-side
- `proxyImageUrl()` helper in OverviewClient for all image rendering

---

## Database Schema

Single migration: `supabase/migrations/000_wipe_and_rebuild.sql`

### Tables
- `organizations` — user orgs with plan, limits, stripe fields
- `profiles` — extends auth.users with org link, role, timezone
- `pricing_plans` — free/starter/pro/business reference table
- `social_profiles` — tracked social accounts (8 platforms)
- `social_metrics` — daily follower/engagement snapshots
- `social_analyses` — cached AI analysis results with expiry
- `social_competitors` — competitor profiles for benchmarking
- `social_goals` — one active goal per profile
- `deals` — brand collaboration tracking
- `deal_deliverables` — deliverables per deal
- `campaigns` — campaign management
- `platform_api_configs` — AI provider keys + config
- `api_call_log` — tracks every AI/external API call
- `notifications` — user notifications
- `user_preferences` — theme, email settings

### RLS
- Uses `get_user_org_id()` function for row-level security
- DAL functions use admin client to bypass RLS (with auth check first)

---

## Key File Locations

```
src/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx                    # Profile page (server component, scrapes IG)
│   │   ├── layout.tsx                  # Dashboard shell
│   │   ├── growth/page.tsx             # Growth tab
│   │   ├── content/page.tsx            # Content tab
│   │   ├── ... (14 tabs total)
│   │   └── settings/page.tsx
│   ├── api/proxy/image/route.ts        # Image proxy
│   ├── login/page.tsx
│   └── signup/page.tsx
├── components/
│   ├── dashboard/
│   │   ├── overview/OverviewClient.tsx  # Main profile page UI
│   │   ├── ProfileSelector.tsx          # Profile switcher bar
│   │   ├── AddProfileModal.tsx          # Add profile modal
│   │   ├── RunAnalysisTab.tsx           # Shared analysis tab component
│   │   ├── RunAllButton.tsx             # Run all analyses button
│   │   ├── AnalysisStatus.tsx           # DONE/NOT RUN grid
│   │   └── AnalysisResultRenderer.tsx   # Renders AI results
│   ├── editorial/                       # Masthead, PaperNav, etc.
│   └── icons/PlatformIcons.tsx
├── lib/
│   ├── social/                          # 8 platform scrapers
│   ├── ai/
│   │   ├── provider.ts                  # Multi-provider with fallback
│   │   └── social-analysis.ts           # 11 analysis functions
│   ├── dal/                             # Data access layer (8 files)
│   ├── actions/                         # Server actions (mutations)
│   │   ├── profiles.ts                  # add/sync/delete + scrapeProfile()
│   │   └── analyses.ts                  # runAnalysis()
│   └── supabase/
│       ├── server.ts                    # RSC client
│       ├── client.ts                    # Browser client
│       └── admin.ts                     # Service role client
└── types/index.ts                       # All TypeScript interfaces
```

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DEEPSEEK_API_KEY=              # Primary AI provider
YOUTUBE_API_KEY=               # YouTube Data API v3
TWITTER_BEARER_TOKEN=          # Optional: X/Twitter official API
CRON_SECRET=                   # For cron job auth
```

---

## Known Issues

1. **TikTok scraper returns 0 data** — TikTok may block server-side requests; scraping works inconsistently
2. **Twitter/X scraper returns 0 without bearer token** — FxTwitter fallback may also be blocked
3. **LinkedIn often blocked** — returns login wall (status 999/403)
4. **Instagram embed sometimes returns no contextJSON** — intermittent, works on retry
5. **No DB direct access** — cannot run migrations via CLI (password auth fails); schema changes require Supabase dashboard SQL editor

---

## What's NOT Built Yet

### Features
- [ ] Deals CRUD UI (table exists, no frontend)
- [ ] Campaign management UI (table exists, no frontend)
- [ ] Messages / Deal Room (new feature)
- [ ] Revenue tracking UI (beyond AI forecast)
- [ ] Competitor add/discover UI (only AI analysis exists)
- [ ] Goals form UI (GoalsClient exists but may be incomplete)
- [ ] Settings page (account, API keys, theme, notifications)
- [ ] Landing page at `/`
- [ ] Theme toggle (light/dark)

### Infrastructure
- [ ] Cron jobs (`api/cron/sync-profiles`, `api/cron/process-analyses`)
- [ ] Notifications system
- [ ] Stripe billing integration
- [ ] Mobile responsive testing
- [ ] Plan-based sync frequency throttling

### Scrapers Enhancement
- [ ] Auto-sync on page load for non-Instagram platforms
- [ ] Recent posts for TikTok/YouTube (only Instagram has visual posts grid)
