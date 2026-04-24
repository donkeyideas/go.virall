<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes -- APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Go Virall v5

## Architecture
- **Monorepo**: pnpm workspaces + Turborepo
- **Web**: Next.js 16.2.1 (Turbopack) at `apps/web/`
- **Packages**: `packages/core/` (business logic), `packages/db/` (Supabase), `packages/api-types/` (Zod), `packages/design-tokens/` (themes), `packages/ui-web/` (components)
- **DB**: Supabase (Postgres + Auth + Storage)
- **Billing**: Stripe
- **Port**: 3700 (Windows Hyper-V blocks 2944-3043)

## Theme System
Three themes via `data-theme` attribute on `<html>`:
- `glassmorphic` (dark violet, frosted glass)
- `neon-editorial` (cream paper, ink borders)
- `neumorphic` (soft gray, inset/outset shadows)

**Never hardcode colors.** All components use CSS variables (`var(--color-primary)`, `var(--ink)`, etc.)

## File Patterns
- Server actions: `apps/web/lib/actions/*.ts` -- `"use server"`, return `{success}` or `{error}`
- API routes: `apps/web/app/api/**/route.ts` -- Zod validation, `handleRoute()` wrapper
- Supabase admin: `packages/db/src/admin.ts` -- bypasses RLS, server-only
- Components: `packages/ui-web/src/` -- use `cva` for variants, consume CSS vars only

## DB Migrations
Run via Supabase Dashboard SQL Editor (CLI password auth fails).
