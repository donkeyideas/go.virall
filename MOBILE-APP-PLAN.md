# Go Virall — Mobile App Build Plan

## Overview

React Native mobile app for Go Virall, built with **Expo SDK 55** inside the existing monorepo at `apps/mobile/`. Reuses `@govirall/core`, `@govirall/db`, `@govirall/api-types`, and `@govirall/design-tokens`. Two selectable themes: **Glassmorphic** (dark, frosted glass) and **Neon Editorial** (cream paper, ink borders).

**Testing**: Expo Go (SDK 55)
**Deployment**: EAS Build → App Store + Google Play
**Backend**: Same Supabase project (`qrtbfhhhilcoeovdubqb`) + existing Next.js API routes

---

## Architecture

```
go.viral.v4/
├── apps/
│   ├── web/                  # Next.js (existing)
│   └── mobile/               # Expo SDK 55 (NEW)
│       ├── app/              # Expo Router file-based routing
│       ├── components/       # React Native components
│       ├── lib/              # Hooks, theme, API client
│       ├── assets/           # Fonts, images, icons
│       ├── app.json          # Expo config
│       └── package.json
├── packages/
│   ├── core/                 # Business logic (shared ✓)
│   ├── db/                   # Supabase clients (shared ✓)
│   ├── api-types/            # Zod schemas (shared ✓)
│   ├── design-tokens/        # Theme tokens (shared ✓)
│   └── ui-web/               # Web-only components (NOT shared)
```

### Shared Packages (No Changes Needed)
| Package | What Mobile Uses |
|---------|-----------------|
| `@govirall/core` | Viral score computation, SMO scoring, AI provider config, deal pipeline logic |
| `@govirall/db` | Supabase client (create custom mobile client with `@supabase/supabase-js`) |
| `@govirall/api-types` | Zod schemas for request/response validation |
| `@govirall/design-tokens` | Theme color tokens, spacing, font sizes, z-index, platform colors |

### Mobile-Only Code
| Layer | Tech |
|-------|------|
| Navigation | Expo Router (file-based) |
| Styling | React Native StyleSheet + theme context |
| Charts | `react-native-svg` + custom components |
| Animations | `react-native-reanimated` |
| Blur/Glass | `expo-blur` |
| Gradient | `expo-linear-gradient` |
| Auth | `@supabase/supabase-js` + `expo-secure-store` |
| Push | `expo-notifications` |
| Storage | `expo-secure-store` (tokens), `@react-native-async-storage/async-storage` (prefs) |

---

## Theme System

### How It Works

The mobile theme system mirrors the web approach but uses React Context + StyleSheet instead of CSS variables.

```typescript
// lib/theme.tsx
import { glassmorphic, neonEditorial } from '@govirall/design-tokens';

const themes = { glassmorphic, 'neon-editorial': neonEditorial };

// ThemeProvider wraps the app, provides colors + helpers
// User preference stored in AsyncStorage
// Theme selection screen shown on first launch
```

### Glassmorphic Theme (Dark)
- **Background**: `#0a0618` deep violet-black
- **Cards**: `rgba(255,255,255,0.05)` frosted glass with `expo-blur`
- **Primary**: `#8b5cf6` violet
- **Accent**: `#ff71a8` pink/rose
- **Good**: `#8affc1` mint green
- **Borders**: `rgba(255,255,255,0.12)` subtle glow
- **Shadows**: Large soft glows with purple tint
- **Corners**: 20-28px radius
- **Typography**: Instrument Serif (display), Satoshi (body), Geist Mono (mono)

### Neon Editorial Theme (Light)
- **Background**: `#f4ecde` warm cream
- **Cards**: `#f4ecde` solid cream with hard ink borders
- **Primary**: `#c8ff3d` electric lime
- **Accent**: `#ff3e88` hot pink
- **Good**: `#c8ff3d` lime
- **Borders**: `1.5px solid #0b0b0b` hard ink lines
- **Shadows**: `5px 5px 0 #0b0b0b` brutalist offset
- **Corners**: 0-2px radius (sharp/square)
- **Typography**: Fraunces (display), Satoshi (body), JetBrains Mono (mono)

---

## Screens & Navigation

### Navigation Structure (Drawer)
Both themes use drawer navigation with a floating action button (FAB) to toggle.

```
Drawer
├── Today (home/index)
├── Audience
├── Compose
├── Studio (Ideas, Captions, Scripts, Bio)
├── Revenue
├── Deals
├── Settings
│   ├── Account
│   ├── Connected Platforms
│   ├── Billing
│   ├── Notifications
│   ├── Media Kit
│   └── Theme Selection
└── AI Chat
```

### Screen Breakdown

#### 1. Theme Selection (First Launch / Settings)
- Full-screen picker showing live previews of each theme
- Tapping a theme applies it immediately
- Stored in AsyncStorage + synced to `users.preferences` in Supabase

#### 2. Today Screen (Home)
The primary screen, matching the HTML mockups exactly:

- **Greeting Area**: "Good [morning/afternoon], [Name]" + date
- **Pulse Metrics**: Horizontal scroll row — Followers, Engagement, Revenue, Pipeline (each with value + delta badge)
- **SMO Score Card**: Large card with SVG ring chart (score 0-100) + 6 factor bars (Profile, Content, Consistency, Engagement, Growth, Monetization)
- **Next Post Card**: Scheduled post preview with platform icon, caption truncation, time, viral score badge
- **Action Cards**: Urgent (red/pink border), warm (yellow/warn), normal — each with icon, title, description, CTA button
- **Win Cards**: Achievement badges with sparkle animations

#### 3. Audience Screen
- Platform breakdown pie chart
- Follower count per platform
- Growth trends (line chart)
- Competitor comparison cards

#### 4. Compose Screen
- Post editor with platform selector
- Live viral score ring (updates as you type)
- Hashtag suggestions
- Schedule picker
- AI caption generation button

#### 5. Studio Screen
- 4 sub-sections: Ideas, Captions, Scripts, Bio
- AI-powered generation using DeepSeek via API
- Results rendered in scrollable cards

#### 6. Revenue Screen
- Total revenue KPI
- Revenue by platform bar chart
- Deal pipeline summary
- Recent payments list

#### 7. Deals Screen
- Pipeline view (kanban-style or list)
- Deal cards with brand name, value, status
- Deal detail sheet (bottom sheet)

#### 8. Settings Screen
- Tab-based layout matching web
- Connected platforms with add/remove
- Billing + subscription management
- Theme selection
- Notification preferences

#### 9. AI Chat Screen
- Chat interface with message bubbles
- Context-aware AI responses via `/api/chat`
- Markdown rendering in messages

---

## Component Library

### Core Components (Build These First)
```
components/
├── ui/
│   ├── ThemedView.tsx        # View with theme bg
│   ├── ThemedText.tsx        # Text with theme colors
│   ├── ThemedCard.tsx        # Card with glass/ink styling
│   ├── Button.tsx            # Primary, ghost, outline, accent
│   ├── Badge.tsx             # Status badges, delta badges
│   ├── Input.tsx             # Text input with theme styling
│   ├── Avatar.tsx            # User/platform avatars
│   ├── Divider.tsx           # Line divider (theme-aware)
│   └── EmptyState.tsx        # No-data placeholder
├── charts/
│   ├── ScoreRing.tsx         # SVG donut chart (SMO score)
│   ├── FactorBar.tsx         # Horizontal progress bar
│   ├── MiniSparkline.tsx     # Inline trend line
│   └── PlatformPie.tsx       # Platform breakdown chart
├── layout/
│   ├── DrawerMenu.tsx        # Slide-out drawer
│   ├── FABMenuButton.tsx     # Floating action button
│   ├── ScreenHeader.tsx      # Screen title + actions
│   └── PullToRefresh.tsx     # PTR wrapper
├── cards/
│   ├── PulseMetric.tsx       # Followers/engagement pill
│   ├── SmoCard.tsx           # SMO score + factors
│   ├── ActionCard.tsx        # Urgent/warm/normal actions
│   ├── WinCard.tsx           # Achievement card
│   ├── NextPostCard.tsx      # Scheduled post preview
│   ├── DealCard.tsx          # Deal summary card
│   └── KpiCard.tsx           # Big number + label
└── platform/
    ├── PlatformIcon.tsx      # Platform logo icons
    └── PlatformBadge.tsx     # Platform name + icon
```

---

## API Integration

The mobile app calls the existing Next.js API routes hosted at `https://www.govirall.com/api/`.

### Auth Flow
1. User signs in via Supabase Auth (email/password or OAuth)
2. Session token stored in `expo-secure-store`
3. All API calls include `Authorization: Bearer <token>` header
4. Token refresh handled by Supabase JS client

### API Client
```typescript
// lib/api.ts
const BASE_URL = __DEV__
  ? 'http://192.168.x.x:3600/api'
  : 'https://www.govirall.com/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const session = await getSession();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) throw new ApiError(res.status, await res.json());
  return res.json();
}
```

### Key Endpoints Used
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/smo/compute` | POST | Compute SMO score |
| `/api/score` | POST | Compute viral score |
| `/api/posts` | GET/POST | List/create posts |
| `/api/platforms/add` | POST | Connect platform |
| `/api/audience` | GET | Audience analytics |
| `/api/deals` | GET/POST | Deal pipeline |
| `/api/content` | POST | AI content generation |
| `/api/chat` | POST | AI chat messages |
| `/api/user` | GET/PATCH | User profile |
| `/api/billing` | GET/POST | Subscription management |

---

## Build Phases

### Phase 1: Foundation (Week 1)
- [ ] Initialize Expo SDK 55 project at `apps/mobile/`
- [ ] Configure monorepo: `metro.config.js` to resolve `packages/*`
- [ ] Set up theme system (ThemeProvider, color tokens from `@govirall/design-tokens`)
- [ ] Load custom fonts (Instrument Serif, Fraunces, Satoshi, Geist Mono, JetBrains Mono)
- [ ] Build core UI primitives: ThemedView, ThemedText, ThemedCard, Button, Badge, Input
- [ ] Set up Supabase auth with `expo-secure-store`
- [ ] Build auth screens (Login, Signup)
- [ ] Set up Expo Router with drawer navigation
- [ ] Build DrawerMenu + FABMenuButton

### Phase 2: Today Screen (Week 2)
- [ ] Greeting area with time-of-day logic
- [ ] PulseMetric horizontal scroll row
- [ ] ScoreRing SVG component (SMO donut chart)
- [ ] FactorBar component (6 factor bars)
- [ ] SmoCard (ring + factors combined)
- [ ] NextPostCard with platform icon + viral score badge
- [ ] ActionCard (urgent/warm/normal variants)
- [ ] WinCard with achievement styling
- [ ] Pull-to-refresh data loading
- [ ] API integration: `/api/smo/compute`, `/api/posts`, `/api/user`

### Phase 3: Core Screens (Week 3)
- [ ] Compose screen with live viral scoring
- [ ] Audience screen with platform breakdown charts
- [ ] Revenue screen with KPI cards + charts
- [ ] Deals screen with deal cards + detail bottom sheet
- [ ] Studio screen (Ideas, Captions, Scripts, Bio tabs)
- [ ] AI Chat screen with message bubbles

### Phase 4: Settings & Polish (Week 4)
- [ ] Settings screen with all tabs
- [ ] Theme selection screen with live previews
- [ ] Connected platforms management
- [ ] Push notifications setup (`expo-notifications`)
- [ ] Animations and transitions (`react-native-reanimated`)
- [ ] Loading skeletons
- [ ] Error boundaries
- [ ] Offline state handling

### Phase 5: Production (Week 5)
- [ ] EAS Build configuration (`eas.json`)
- [ ] App icons and splash screen (both themes)
- [ ] App Store screenshots
- [ ] `app.json` production config (bundle ID, version, permissions)
- [ ] EAS Submit to App Store Connect + Google Play Console
- [ ] OTA updates via `expo-updates`
- [ ] Analytics integration (Mixpanel or Amplitude via `expo-analytics`)

---

## Key Dependencies

```json
{
  "expo": "~55.0.0",
  "expo-router": "~5.0.0",
  "expo-blur": "~14.0.0",
  "expo-linear-gradient": "~14.0.0",
  "expo-secure-store": "~14.0.0",
  "expo-notifications": "~0.31.0",
  "expo-font": "~13.0.0",
  "expo-updates": "~0.27.0",
  "react-native-reanimated": "~3.17.0",
  "react-native-gesture-handler": "~2.21.0",
  "react-native-svg": "~15.9.0",
  "react-native-safe-area-context": "~5.1.0",
  "@react-native-async-storage/async-storage": "~2.1.0",
  "@supabase/supabase-js": "^2.49.0",
  "@govirall/core": "workspace:*",
  "@govirall/db": "workspace:*",
  "@govirall/api-types": "workspace:*",
  "@govirall/design-tokens": "workspace:*"
}
```

---

## GitHub Setup

### Repository
The mobile app lives in the same monorepo (`go-viral-v4`), branch: `v5-rebuild`.

### CI/CD (GitHub Actions)
```yaml
# .github/workflows/mobile-build.yml
name: Mobile Build
on:
  push:
    paths: ['apps/mobile/**', 'packages/**']
jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @govirall/mobile type-check
  eas-build:
    needs: type-check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: cd apps/mobile && eas build --platform all --non-interactive
```

### Branch Strategy
- `v5-rebuild` — main development branch
- `mobile/feature-name` — feature branches for mobile work
- PR into `v5-rebuild` with build checks

---

## Expo Go Testing (SDK 55)

### Setup
```bash
cd apps/mobile
npx expo start
# Scan QR code with Expo Go on iOS/Android
```

### Dev Environment
- **Local API**: Point to `http://<YOUR_IP>:3600/api` via `.env` or constants
- **Supabase**: Same project, anon key in app config
- **Hot Reload**: Standard Expo fast refresh

### Limitations (Expo Go)
- No native modules that require custom builds (all listed deps are Expo Go compatible)
- Push notifications require development build for full testing
- `expo-blur` works on iOS in Expo Go, Android needs dev build

---

## File Structure (Final)

```
apps/mobile/
├── app/
│   ├── _layout.tsx           # Root layout (ThemeProvider, auth guard)
│   ├── index.tsx             # Redirect to auth or today
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (drawer)/
│   │   ├── _layout.tsx       # Drawer navigator
│   │   ├── index.tsx         # Today screen
│   │   ├── audience.tsx
│   │   ├── compose.tsx
│   │   ├── studio.tsx
│   │   ├── revenue.tsx
│   │   ├── deals.tsx
│   │   ├── chat.tsx
│   │   └── settings.tsx
│   └── theme-select.tsx      # Theme picker (first launch)
├── components/
│   ├── ui/                   # Primitives
│   ├── charts/               # SVG charts
│   ├── layout/               # Navigation, headers
│   ├── cards/                # Content cards
│   └── platform/             # Platform-specific
├── lib/
│   ├── theme.tsx             # ThemeProvider + hooks
│   ├── api.ts                # API client
│   ├── auth.tsx              # Auth context + Supabase
│   ├── storage.ts            # Secure store helpers
│   └── hooks/                # Custom hooks
├── assets/
│   ├── fonts/                # Custom typefaces
│   ├── images/               # App icons, splash
│   └── icons/                # Platform SVG icons
├── app.json                  # Expo config
├── metro.config.js           # Monorepo resolution
├── tsconfig.json
├── babel.config.js
├── eas.json                  # EAS Build config
└── package.json
```

---

## Design Reference

The app matches 3 HTML mockups provided:
1. **`01-glassmorphic.html`** — Dark theme with frosted glass, drawer nav, FAB menu
2. **`02-neon-editorial.html`** (tab bar variant) — Light cream theme, reference only
3. **`02-neon-editorial.html`** (drawer variant) — Light cream theme with FAB menu ← **use this**

Both themes use **drawer navigation with FAB** (no tab bar). The Today screen layout is identical across themes — only colors, borders, shadows, and typography differ.

---

## Quick Start

```bash
# From monorepo root
pnpm install

# Start mobile dev server
cd apps/mobile
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android

# Build for production
eas build --platform all
eas submit --platform all
```
