# Admin Dashboard — Rebuild Plan

> Current state: 19 pages exist but the quality is poor. Every page needs significant work across styling, UX, data visualization, accessibility, and functionality. This document is the single source of truth for what needs to be fixed.

---

## Critical Issues (Must Fix)

### 1. Route Group Was Wrong
- **Fixed**: `(admin)` renamed to `admin` — routes now serve at `/admin/*`

### 2. Zero Recharts Visualizations
Every page that should have charts uses basic inline `<div>` bars with hardcoded widths. None of the 19 pages use Recharts despite the project having it installed.

**Pages that need real charts:**
| Page | Chart Needed |
|------|-------------|
| Overview | AreaChart: new users/day (30d), PieChart: tier distribution |
| Billing | BarChart: monthly revenue by tier, LineChart: MRR trend |
| Analytics | BarChart: posts by platform, AreaChart: follower growth |
| AI | LineChart: AI calls/day, PieChart: calls by provider, BarChart: tokens/day |
| Data | Histogram: SMO score distribution, BarChart: top events |
| Search | LineChart: search volume/day |
| Health | AreaChart: active users/hour |

### 3. No Pagination Anywhere
Every page hardcodes `LIMIT 50` or `LIMIT 100`. There is no pagination component, no "Load More", no page controls. Tables render all rows at once.

**Fix**: Build a reusable `AdminPagination` component. Every table page needs server-side pagination with `offset` + `limit` query params.

### 4. No Sorting on Any Table
`AdminTable` renders headers but they're not clickable. No sort arrows, no sort state, no server-side ordering.

**Fix**: Add `sortable?: boolean` to column definitions, sort indicator arrows, onClick handler that calls back to parent with `{ column, direction }`.

### 5. API Config Stores Plaintext as "Encrypted"
`api.ts` → `setApiConfig()` stores the raw value in `value_encrypted` without any actual encryption. This is a security issue.

**Fix**: Either encrypt server-side before storing, or rename the column and add a warning that values are stored in plain text (acceptable for admin-only service-role access).

---

## Styling Issues (Every Component)

### 6. 100% Inline Styles — No CSS Classes
Every admin component uses `style={{}}` props exclusively. This causes:
- Massive code duplication (same colors/spacing repeated 100+ times)
- No hover states possible (inline styles can't do `:hover`)
- No responsive design possible (no media queries)
- No focus indicators (accessibility failure)
- Components are unmaintainable

**Fix**: Either:
- (A) Use Tailwind utility classes, or
- (B) Create admin CSS module (`admin.module.css`), or
- (C) At minimum, extract shared style objects into a `admin-styles.ts` constants file

### 7. Hardcoded Colors Instead of CSS Variables
Components hardcode hex values like `#1a1b20`, `#c0392b`, `#6b6e7b` instead of using the CSS variables already defined in `[data-theme="admin-dark"]`.

Examples of what should change:
| Hardcoded | Should Be |
|-----------|-----------|
| `'#1a1b20'` | `var(--admin-surface)` |
| `'#c0392b'` | `var(--admin-red)` |
| `'#27ae60'` | `var(--admin-green)` |
| `'#6b6e7b'` | `var(--admin-muted)` or `var(--muted)` |
| `'#e67e22'` | `var(--admin-amber)` |

### 8. Hardcoded Font Names
Components write `fontFamily: 'Fraunces, serif'` and `fontFamily: 'JetBrains Mono, monospace'` instead of `var(--font-display)` and `var(--font-mono)`.

### 9. Hardcoded Spacing & Sizes
No spacing scale. Values like `padding: '20px 22px'`, `fontSize: 38`, `borderRadius: 4` are scattered everywhere with no consistency.

**Fix**: Add spacing tokens to `[data-theme="admin-dark"]`:
```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;
```

### 10. No Responsive Design
- Sidebar is fixed 220px — no mobile collapse, no hamburger menu
- Tables don't scroll horizontally on small screens
- Modals don't adapt to mobile
- Grid layouts break below 768px
- No `@media` queries anywhere

---

## Component Issues

### 11. AdminTable
- No sorting (headers not clickable)
- No pagination
- No row selection / checkboxes for bulk actions
- Hover state uses DOM mutation (`onMouseEnter` sets `style.background`) instead of CSS `:hover`
- No column resize
- No `role="table"`, no `scope="col"` on headers
- No keyboard navigation
- No loading/skeleton state

### 12. AdminModal
- No `role="dialog"` or `aria-modal="true"`
- No focus trapping (Tab escapes the modal)
- No `aria-labelledby` pointing to title
- Close button has no `aria-label`
- `zIndex: 9999` hardcoded (should use `var(--z-modal)`)
- No enter/exit animation
- No scroll management on body

### 13. AdminStatCard
- Icon is a single Unicode character (not an SVG/icon component)
- No loading/skeleton state
- No trend indicator (up/down arrow with % change)
- Value doesn't format numbers (no separators, no currency, no abbreviation)
- Fixed font size 38px will overflow on small screens

### 14. AdminTabs
- No `role="tablist"` / `role="tab"` / `aria-selected`
- No keyboard navigation (arrow keys)
- No scroll overflow handling for many tabs
- Doesn't persist active tab in URL

### 15. AdminStatusBadge
- All status-to-color mappings hardcoded in component
- No support for custom statuses without code changes
- Color only (not colorblind-safe — needs icon or pattern)

### 16. AdminSidebar
- Icons are Unicode symbols (◉, ♟, ⊛) — not accessible, screen readers read gibberish
- No collapse/expand
- No mobile drawer variant
- Active state is subtle (color only)
- Nav groups have no ARIA labels

### 17. AdminTopBar
- `LABEL_MAP` for breadcrumbs is hardcoded — must be manually synced with sidebar
- No search functionality (just breadcrumb + avatar)
- Avatar has no `<img>` fallback for real avatar URLs

---

## Per-Page Issues

### Overview (`/admin`)
- [ ] Add Recharts AreaChart for new users/day (30d)
- [ ] Add Recharts PieChart for tier distribution
- [ ] Add Recharts BarChart for posts/day
- [ ] Add daily active users metric
- [ ] Remove duplicate "New Users 30d" stat card
- [ ] Add click-through from stat cards to detail pages
- [ ] Add date range selector

### Users (`/admin/users`)
- [ ] Add server-side pagination
- [ ] Add sorting (by joined date, last seen, platform count)
- [ ] Add bulk actions (ban multiple, export)
- [ ] Add confirmation dialog before ban/role change
- [ ] Show user's platforms in detail modal
- [ ] Add "View as user" impersonation link
- [ ] Fix avatar to show actual image when `avatar_url` exists

### Billing (`/admin/billing`)
- [ ] Add Recharts LineChart for MRR trend over time
- [ ] Add Recharts BarChart for monthly revenue by tier
- [ ] Add pagination to subscription & events tables
- [ ] Add revenue forecast/projection
- [ ] Add churn cohort analysis
- [ ] Show LTV per tier
- [ ] Add refund tracking

### Subscriptions (`/admin/subscriptions`)
- [ ] Pull real prices from Stripe API instead of hardcoding
- [ ] Pull real plan features from config instead of hardcoding
- [ ] Add subscription timeline/history
- [ ] Add manual subscription override capability
- [ ] Show trial status

### Blog (`/admin/blog`)
- [ ] Add edit functionality (currently create-only)
- [ ] Add markdown preview for body
- [ ] Add pagination
- [ ] Add image upload for cover
- [ ] Add word count / reading time estimate
- [ ] Add draft scheduling (publish at future date)
- [ ] Add SEO preview snippet

### Social (`/admin/social`)
- [ ] Add edit functionality
- [ ] Add media preview (thumbnail)
- [ ] Add platform-specific character limits
- [ ] Add scheduling calendar view
- [ ] Add cross-platform conflict detection
- [ ] Add engagement tracking for published posts

### Email Templates (`/admin/email-templates`)
- [ ] Add edit modal with HTML editor
- [ ] Add template preview with sample data
- [ ] Add test send functionality
- [ ] Add variable validation (check placeholders match)
- [ ] Add version history

### Notifications (`/admin/notifications`)
- [ ] Add validation (prevent empty title/body)
- [ ] Add rate limiting warning for "send to all"
- [ ] Add delivery tracking / read receipt stats
- [ ] Add notification scheduling
- [ ] Fix memory issue: "send to all" loads all user IDs at once

### Contacts (`/admin/contacts`)
- [ ] Add ticket assignment dropdown (assign to support/admin users)
- [ ] Add reply/comment thread functionality
- [ ] Add SLA timer (time since opened)
- [ ] Add priority color coding
- [ ] Add attachment support
- [ ] Add customer history (previous tickets)

### Content (`/admin/content`)
- [ ] Add date range filter
- [ ] Add cost breakdown by provider
- [ ] Add Recharts LineChart for generations/day
- [ ] Add content type filter as tabs
- [ ] Format cost to 2 decimal places (not 4)
- [ ] Add usage quotas and alerts

### Analytics (`/admin/analytics`)
- [ ] Add Recharts BarChart for posts by platform
- [ ] Add Recharts AreaChart for follower growth over time
- [ ] Add engagement metrics (likes, comments, shares)
- [ ] Add per-user analytics drill-down
- [ ] Add best posting time analysis
- [ ] Add date range selector

### AI (`/admin/ai`)
- [ ] Add Recharts LineChart for AI calls/day per provider
- [ ] Add Recharts PieChart for cost distribution
- [ ] Add cost forecasting / budget alerts
- [ ] Add circuit breaker status display
- [ ] Add model performance metrics (latency, error rate)
- [ ] Add model version deployment UI

### Data (`/admin/data`)
- [ ] Fix: currently loads 5000 events client-side (performance)
- [ ] Add Recharts Histogram for SMO distribution
- [ ] Add cohort analysis (signup week → conversion)
- [ ] Add funnel visualization
- [ ] Add custom date range picker
- [ ] Server-side aggregation instead of client-side

### Search (`/admin/search`)
- [ ] Add Recharts LineChart for search volume/day
- [ ] Add zero-result queries tracking
- [ ] Add search quality metrics
- [ ] Add trending queries
- [ ] Increase beyond 500-event limit

### API (`/admin/api`)
- [ ] Fix encryption — currently stores plaintext in `value_encrypted`
- [ ] Add API key format validation (Stripe starts with `sk_`, etc.)
- [ ] Add key rotation tracking (last changed date)
- [ ] Add API usage monitoring
- [ ] Add rate limit display
- [ ] Add webhook test/replay
- [ ] Seed default config entries

### Flags (`/admin/flags`)
- [ ] Validate rollout percent is 0-100
- [ ] Add user whitelist management (add/remove users)
- [ ] Add flag usage analytics
- [ ] Add flag dependency tracking
- [ ] Add gradual rollout scheduling
- [ ] Add flag history/changelog

### Health (`/admin/health`)
- [ ] Add Recharts AreaChart for active users/hour
- [ ] Add real health checks (not just count query)
- [ ] Add background job status monitoring
- [ ] Add queue depth metrics
- [ ] Add cache hit rate display
- [ ] Add reprocess result feedback (success/fail toast)
- [ ] Add uptime percentage

### Changelog (`/admin/changelog`)
- [ ] Add category filter tabs
- [ ] Add markdown preview for body
- [ ] Add version validation (semver format)
- [ ] Add scheduled publishing
- [ ] Add edit functionality
- [ ] Add public changelog page link

### Audit (`/admin/audit`)
- [ ] Add date range filter
- [ ] Add actor filter dropdown
- [ ] Add target type filter
- [ ] Add export as JSON/CSV
- [ ] Increase beyond 100-entry limit (pagination)
- [ ] Add suspicious activity alerts
- [ ] Better metadata display (not raw JSON dump)

---

## Server Action Issues

### Missing Input Validation (All Actions)
No action validates input. UUIDs, enums, string lengths, number ranges — nothing is checked.

**Fix**: Add Zod schemas to every server action matching the pattern in `packages/api-types/`.

### Missing Error Handling (All Actions)
No action checks if the DB update/insert actually succeeded. They return `{ success: true }` regardless.

**Fix**: Check `error` from Supabase response, return `{ error: message }` on failure.

### Audit Logging Gaps
- Actions don't capture before/after state
- Some actions log metadata that could contain sensitive data
- No way to correlate related actions

### Missing Actions
- No `editBlogPost` (only create)
- No `editSocialPost` action connected to UI
- No `editEmailTemplate` with body editing
- No `adminRefundInvoice` (planned but not built)
- No `retryPlatformSync` (planned but not built)
- No bulk operations (ban multiple users, delete multiple posts)

---

## Accessibility Failures (WCAG)

1. **No ARIA attributes** on any component (no `role`, `aria-label`, `aria-selected`, etc.)
2. **No focus indicators** — Tab key doesn't show where focus is
3. **No keyboard navigation** — Tables, tabs, modals are mouse-only
4. **Color-only status** — Status badges use color without icons (colorblind users can't distinguish)
5. **Unicode icons** — Screen readers will read "BLACK CIRCLE" instead of meaningful labels
6. **No skip links** — No way to skip sidebar navigation
7. **Modal focus not trapped** — Tab key escapes modal overlay
8. **No semantic HTML** — Missing `<nav>`, `<main>`, `<aside>`, `<header>` landmarks

---

## Missing Infrastructure

- [ ] **Toast/notification system** — No feedback after actions (save, delete, ban, etc.)
- [ ] **Confirmation dialogs** — Destructive actions have no "Are you sure?" prompt
- [ ] **Loading states** — No skeleton screens, no spinners, no optimistic updates
- [ ] **Error boundaries** — No `error.tsx` for admin routes
- [ ] **Data refresh** — No `revalidatePath()` after mutations (stale UI after actions)
- [ ] **Breadcrumb consistency** — `LABEL_MAP` in TopBar must be manually synced with sidebar links
- [ ] **Mobile layout** — Completely broken below 768px

---

## Priority Order

### P0 — Blocking / Broken
1. Fix inline styles → extract to CSS classes or style objects
2. Add Recharts to Overview, Billing, Analytics, AI pages
3. Add pagination to all table pages
4. Add toast feedback after every server action
5. Fix API config encryption issue
6. Add confirmation dialogs for destructive actions

### P1 — Important
7. Add table sorting
8. Add loading/skeleton states
9. Add error boundaries
10. Add responsive sidebar (mobile drawer)
11. Replace Unicode icons with SVGs
12. Add Zod validation to all server actions
13. Add `revalidatePath()` calls after mutations

### P2 — Polish
14. Add ARIA attributes across all components
15. Add keyboard navigation to tables/tabs
16. Add focus trapping to modal
17. Add enter/exit animations
18. Add date range filters
19. Add data export (CSV/JSON)
20. Add bulk actions

### P3 — Nice to Have
21. Add real-time updates (polling or SSE)
22. Add admin activity dashboard
23. Add role hierarchy (admin > support > viewer)
24. Add scheduled publishing for blog/changelog
25. Add impersonation ("View as user")
