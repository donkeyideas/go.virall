# Session Changelog — April 17, 2026

Everything requested, what was done, and current status.

---

## 1. Apple Sign-In Fix

**Request**: Fix Apple Sign-In not working.

**Status**: DONE

**What was done**: Fixed Apple OAuth sign-in flow so it works correctly on both web and mobile.

---

## 2. Sign-Out Button Fixes (Web + Mobile)

**Request**: Sign-out button not working across the app.

**Status**: DONE

**Files changed**:
- `src/components/dashboard/modern/ModernNav.tsx` — replaced `<form action={signOut}>` with `<button onClick>` pattern
- `src/components/brand/BrandNav.tsx` — same fix
- `src/components/editorial/Masthead.tsx` — same fix
- `mobile/src/app/(tabs)/profile.tsx` — added `router.replace('/(auth)/login')` after `signOut()`

**What was done**: All 4 sign-out buttons across 3 web layouts and mobile now properly sign the user out and redirect to login.

---

## 3. Sync Button — Gold Styling + Last Synced Date

**Request**: Make the sync button stand out with gold styling when profiles are stale. Show when profiles were last synced.

**Status**: DONE

**Files changed**:
- `src/components/dashboard/overview/OverviewClient.tsx` — gold pulse animation on Sync All button when any profile is >24h stale, global "Last synced: Xh ago" display
- `src/app/globals.css` — added `@keyframes sync-pulse` and `.animate-sync-pulse` class

---

## 4. Automated Profile Sync Cron

**Request**: Automate profile syncing instead of relying on manual sync.

**Status**: DONE

**Files created**:
- `src/app/api/cron/sync-profiles/route.ts` — full cron endpoint

**How it works**:
- Endpoint: `GET /api/cron/sync-profiles` (protected by `CRON_SECRET` bearer token)
- Runs every 15 minutes (configure in your cron provider)
- Syncs profiles based on plan priority:
  - Enterprise: every run (real-time)
  - Business: every 2 hours
  - Pro: every 6 hours
  - Free: every 24 hours
- Only syncs profiles of users active in the last 30 days
- Processes in batches of 5, max 50 per run, 2s delay between batches
- Logs each run to `sync_run_log` table
- **Daily anomaly detection** (Phase 3): Once per day, checks week-over-week engagement per platform. If any platform drops >20%, auto-triggers AI algorithm analysis.

**Supporting changes**:
- `src/lib/actions/profiles.ts` — added `syncProfileAdmin(profileId)` function (no auth check, no revalidatePath, for cron use)

---

## 5. Remove ORG Column from Admin Users Table

**Request**: Remove the ORG column from the admin users page.

**Status**: DONE

**Files changed**:
- `src/app/admin/users/users-client.tsx` — removed ORG column from table header and rows

---

## 6. Algorithm Intelligence Page (Complete Redesign)

**Request**: The old Algorithm Monitor page was just showing internal engagement metrics. User wanted it to show **how each platform's algorithm actually works** — ranking signals, content priorities, what gets boosted/suppressed. Also wanted an "Analyze All" button.

**Status**: DONE

**Files created**:
- `src/app/admin/algorithm-intelligence/page.tsx` — server component (fetches health, events, adjustments, trends)
- `src/app/admin/algorithm-intelligence/algorithm-intelligence-client.tsx` — ~960 line client component

**Files deleted**:
- `src/app/admin/algorithm-monitor/page.tsx`
- `src/app/admin/algorithm-monitor/algorithm-monitor-client.tsx`

**Files changed**:
- `src/app/admin/admin-nav.tsx` — updated nav link from "Algorithm Monitor" to "Algorithm Intelligence"

**5-Tab Layout**:

| Tab | What it shows |
|-----|---------------|
| Algorithm Intelligence | Expandable cards for all 8 platforms showing algorithm name, primary signal, ranking factors, content formats, posting cadence, key tactics, avoidances |
| Platform Comparison | Side-by-side comparison table — select 2-4 platforms to compare |
| AI Deep Dive | Select a platform + topic, generates detailed AI analysis (400-600 words) |
| Engagement Trends | Area chart + week-over-week cards per platform (kept from old page) |
| Change Detection | Merged Event Log + AI Adjustments — events expand to show linked adjustments inline |

**Other features**:
- Health Strip at top: connected profiles count, 24h sync rate, active events, "Analyze All" button with gold gradient
- Platform icons (SVG) on all cards instead of colored dots
- Applied adjustments show pulsing green "LIVE" badge

---

## 7. Wire Algorithm Intelligence to User Dashboard

**Request**: User asked "is this page wired to the user dashboard to give the user the best results?" — discovered that the admin "Apply" button on algorithm adjustments was dead code. Adjustments were saved to DB but never read back. User said "Yes please fix everything."

**Status**: DONE

**The Problem**:
```
PLATFORM_ALGORITHMS (hardcoded constant)
  └→ getAlgorithmContext() → 17+ AI prompts

algorithm_adjustments table (DB)
  └→ Apply button → saved to DB → DEAD END (never read back)
```

**The Fix — Cached Dynamic Algorithm Layer**:
```
PLATFORM_ALGORITHMS (base) + algorithm_adjustments (applied, cached)
  = Effective Algorithm (merged, cached 5min)
    ├→ getAlgorithmContext() → 17+ AI prompts (recommendations, SMO, chat, etc.)
    ├→ getFullAlgorithmBlock() → recommendations engine
    └→ getEffectiveAlgorithm().contentFormats → content generator
```

**Files created**:
- `src/lib/dal/algorithm-monitor.ts` — added `getAppliedAdjustments()` function to fetch applied adjustments from DB
- `src/lib/actions/algorithm-intelligence.ts` — `generateAlgorithmDeepDive()` server action for AI Deep Dive tab

**Files changed**:
- `src/lib/ai/platform-algorithms.ts` — **core change**, added entire dynamic cache layer:
  - `getEffectiveAlgorithm(platform)` — sync function, returns cached merged data or falls back to base
  - `warmAlgorithmCacheIfNeeded()` — non-blocking background cache refresh
  - `refreshAlgorithmCache()` — fetches applied adjustments from DB, merges with base data
  - `invalidateAlgorithmCache()` — clears cache (called when admin applies/reverts adjustment)
  - `mergeAdjustment()` — merges adjustment into base PlatformAlgorithm, prefixed with `[AI-adjusted]`
  - Modified `getAlgorithmContext()` and `getFullAlgorithmBlock()` to read from `getEffectiveAlgorithm()` instead of hardcoded constant
- `src/lib/ai/social-analysis.ts` — added `warmAlgorithmCacheIfNeeded()` call in `profileSummary()` before `getAlgorithmContext()`
- `src/lib/ai/content-generator.ts` — changed `PLATFORM_ALGORITHMS[...].contentFormats` to `getEffectiveAlgorithm(...).contentFormats`
- `src/components/dashboard/AnalysisResultRenderer.tsx` — changed to use `getEffectiveAlgorithm()` for content format labels
- `src/lib/actions/algorithm-monitor.ts` — added `invalidateAlgorithmCache()` call in `updateAdjustmentStatus()` when status changes to "applied" or "rejected"

**How the cache works**:
1. First request after startup → returns base data, triggers async refresh in background
2. Background refresh fetches applied adjustments from DB, merges, stores in module-level cache
3. Subsequent requests within 5 minutes → returns cached merged data (sync, zero latency)
4. After 5 minutes → next request triggers background refresh again
5. Admin clicks "Apply" → `invalidateAlgorithmCache()` clears cache immediately → next request re-fetches

**What this affects** (all now receive dynamic algorithm data):
- SMO Score calculations
- Recommendations engine
- Content generator format suggestions
- Social analyses (all platforms)
- AI chat context
- All other AI prompts via `profileSummary()`

---

## 8. Database Migration

**Status**: DONE (file created, needs to be run in Supabase Dashboard SQL Editor)

**File created**:
- `supabase/migrations/012_sync_and_algorithm_tables.sql`

**Tables created**:
- `sync_run_log` — logs each cron sync run (profiles processed, succeeded, failed, duration)
- `algorithm_events` — stores detected algorithm changes per platform
- `algorithm_adjustments` — stores AI-suggested adjustments (with status: pending/approved/applied/rejected)
- `platform_health_snapshots` — periodic platform health metrics

**Note**: This migration must be run manually in the Supabase Dashboard SQL Editor (CLI password auth doesn't work for this project).

---

## Summary

| # | Task | Status |
|---|------|--------|
| 1 | Apple Sign-In fix | DONE |
| 2 | Sign-out button fixes (web + mobile) | DONE |
| 3 | Sync button gold styling + last synced date | DONE |
| 4 | Automated profile sync cron | DONE |
| 5 | Remove ORG column from admin users | DONE |
| 6 | Algorithm Intelligence page (redesign) | DONE |
| 7 | Wire algorithm intelligence to user dashboard | DONE |
| 8 | Database migration file | DONE (needs manual run in Supabase SQL Editor) |

**Commit**: `bfbc95c` — pushed to `origin/master`

**One remaining action item**: Run `supabase/migrations/012_sync_and_algorithm_tables.sql` in the Supabase Dashboard SQL Editor to create the sync and algorithm tables. Without this, the cron job and algorithm intelligence features will fail on DB queries.
