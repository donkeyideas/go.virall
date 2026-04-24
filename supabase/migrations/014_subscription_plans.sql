-- ============================================================
-- 014: Subscription Plans (editable from admin)
-- ============================================================

create table if not exists subscription_plans (
  tier text primary key check (tier in ('free','creator','pro','agency')),
  name text not null,
  price_monthly integer not null default 0,
  price_yearly integer not null default 0,
  stripe_price_monthly text,
  stripe_price_yearly text,
  tagline text not null default '',
  features text[] not null default '{}',
  max_platforms integer not null default 1,
  max_analyses integer not null default 10,
  max_content_gens integer not null default 5,
  max_ai_messages integer not null default 5,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed plans
insert into subscription_plans (tier, name, price_monthly, price_yearly, tagline, features, max_platforms, max_analyses, max_content_gens, max_ai_messages, sort_order) values
  ('free',    'Free',    0,     0,     'For creators just getting started.',          ARRAY['1 connected platform','10 analyses per month','5 content generations','5 AI strategist msgs / day','Viral score on every post'],               1, 10, 5,  5,  0),
  ('creator', 'Creator', 2900,  27840, 'For serious creators ready to compound.',     ARRAY['7 connected platforms','Unlimited analyses','Unlimited content generations','Full AI strategist access','Audience intelligence','Revenue tracking'], 7, -1, -1, -1, 1),
  ('pro',     'Pro',     7900,  75840, 'For teams scaling their creator business.',   ARRAY['7 Platforms','Advanced Analytics','AI Content Studio','Viral Score','Audience Intelligence','Competitor Analysis'],                              7, -1, -1, -1, 2),
  ('agency',  'Agency',  19900, 191040,'For agencies managing multiple creators.',    ARRAY['Unlimited Platforms','Full Analytics Suite','Priority AI','Team Collaboration','White-label Reports','API Access'],                              -1, -1, -1, -1, 3)
on conflict (tier) do nothing;

-- RLS: anyone can read plans, only service role can write
alter table subscription_plans enable row level security;
drop policy if exists "Public read plans" on subscription_plans;
create policy "Public read plans" on subscription_plans for select using (true);
