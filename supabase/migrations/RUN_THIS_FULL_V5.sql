-- ============================================================
-- FULL V5 MIGRATION: Run this in the Supabase SQL Editor
--
-- This creates ALL v5 tables from scratch.
-- Safe to run even if some old v4 tables exist (they'll be dropped).
--
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Paste this ENTIRE file
-- 3. Click Run
-- ============================================================


-- ============ 001: Extensions ============
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists "pg_stat_statements";


-- ============ Immutable helper ============
create or replace function utc_date(ts timestamptz)
returns date
language sql
immutable parallel safe
as $$ select (ts at time zone 'UTC')::date $$;


-- ============ 002: Users ============
drop table if exists users cascade;

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null,
  email text not null,
  avatar_url text,
  bio text,
  timezone text not null default 'America/New_York',
  role text not null default 'creator' check (role in ('creator','admin','support')),

  theme text not null default 'glassmorphic' check (theme in ('glassmorphic','neon-editorial','neumorphic')),
  mission text not null default 'grow-audience' check (mission in ('grow-audience','monetize','launch-product','community','land-deals')),

  onboarded_at timestamptz,
  last_seen_at timestamptz,

  stripe_customer_id text unique,
  subscription_tier text not null default 'free' check (subscription_tier in ('free','creator','pro','agency')),
  subscription_status text check (subscription_status in ('active','trialing','past_due','canceled','incomplete')),
  subscription_renews_at timestamptz,

  notification_prefs jsonb not null default '{}',

  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on users (handle);
create index on users (stripe_customer_id);
create index on users (subscription_tier, subscription_status);


-- ============ 003: Platform accounts ============
drop view if exists platform_accounts_safe cascade;
drop table if exists platform_accounts cascade;
drop type if exists platform cascade;

create type platform as enum ('instagram','tiktok','youtube','linkedin','x','facebook','twitch');

create table platform_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  platform platform not null,

  platform_user_id text not null,
  platform_username text not null,
  platform_display_name text,
  avatar_url text,

  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',

  follower_count int,
  following_count int,
  post_count int,
  verified boolean default false,

  sync_status text not null default 'pending' check (sync_status in ('pending','syncing','healthy','error','disconnected')),
  sync_error text,
  last_synced_at timestamptz,

  connected_at timestamptz not null default now(),
  disconnected_at timestamptz,
  updated_at timestamptz not null default now(),

  unique(user_id, platform)
);

create index on platform_accounts (user_id);
create index on platform_accounts (platform, last_synced_at);
create index on platform_accounts (token_expires_at) where token_expires_at is not null;

create view platform_accounts_safe as
  select
    id, user_id, platform, platform_user_id, platform_username,
    platform_display_name, avatar_url, follower_count, following_count,
    post_count, verified, sync_status, sync_error, last_synced_at,
    connected_at, disconnected_at, scopes
  from platform_accounts;


-- ============ 004: Posts + viral_scores + smo_scores ============
drop table if exists smo_scores cascade;
drop table if exists viral_scores cascade;
drop table if exists posts cascade;
drop type if exists post_status cascade;
drop type if exists post_format cascade;

create type post_status as enum ('draft','scheduled','publishing','published','failed','deleted');
create type post_format as enum ('reel','short','story','carousel','static','long-video','thread','article');

create table posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  platform_account_id uuid references platform_accounts(id) on delete set null,

  platform platform not null,
  platform_post_id text,
  format post_format not null,
  status post_status not null default 'draft',

  hook text,
  caption text,
  hashtags text[] not null default '{}',
  mentions text[] not null default '{}',
  media_urls text[] not null default '{}',

  scheduled_at timestamptz,
  published_at timestamptz,

  views int,
  likes int,
  comments int,
  shares int,
  saves int,
  reach int,
  impressions int,
  watch_time_seconds int,

  metadata jsonb not null default '{}',
  failure_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (status != 'scheduled' or scheduled_at is not null),
  check (status != 'published' or published_at is not null)
);

create index on posts (user_id, created_at desc);
create index on posts (user_id, status) where status in ('draft','scheduled');
create index on posts (platform, platform_post_id) where platform_post_id is not null;
create index on posts (user_id, published_at desc) where published_at is not null;

create table viral_scores (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,

  model_version text not null,
  score int not null check (score between 0 and 100),
  confidence numeric(4,3) not null check (confidence between 0 and 1),

  factor_profile int not null check (factor_profile between 0 and 100),
  factor_content int not null check (factor_content between 0 and 100),
  factor_consistency int not null check (factor_consistency between 0 and 100),
  factor_engagement int not null check (factor_engagement between 0 and 100),
  factor_growth int not null check (factor_growth between 0 and 100),
  factor_monetization int not null check (factor_monetization between 0 and 100),

  signals jsonb not null,
  suggestions jsonb not null default '[]',

  actual_performance_ratio numeric(6,3),
  created_at timestamptz not null default now()
);

create index on viral_scores (post_id, created_at desc);
create index on viral_scores (user_id, created_at desc);
create index on viral_scores (model_version, created_at desc);

create table smo_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,

  score int not null check (score between 0 and 100),
  factor_profile int not null,
  factor_content int not null,
  factor_consistency int not null,
  factor_engagement int not null,
  factor_growth int not null,
  factor_monetization int not null,

  percentile int check (percentile between 0 and 100),
  computed_at timestamptz not null default now()
);

create unique index on smo_scores (user_id, utc_date(computed_at));
create index on smo_scores (user_id, computed_at desc);


-- ============ 005: Audience ============
drop table if exists collab_matches cascade;
drop table if exists competitor_snapshots cascade;
drop table if exists competitors cascade;
drop table if exists aqs_scores cascade;
drop table if exists audience_snapshots cascade;
drop type if exists competitor_label cascade;

create table audience_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  platform_account_id uuid not null references platform_accounts(id) on delete cascade,

  follower_count int not null,
  following_count int not null,
  post_count int not null,

  gender_breakdown jsonb default '{}',
  age_breakdown jsonb default '{}',
  country_breakdown jsonb default '{}',
  city_breakdown jsonb default '{}',
  language_breakdown jsonb default '{}',
  interests jsonb default '[]',

  engagement_rate numeric(5,4),
  reach_7d int,
  impressions_7d int,

  captured_at timestamptz not null default now()
);

create unique index on audience_snapshots (platform_account_id, utc_date(captured_at));
create index on audience_snapshots (user_id, captured_at desc);

create table aqs_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,

  score int not null check (score between 0 and 100),
  real_percent numeric(4,3) not null,
  active_30d_percent numeric(4,3) not null,
  geo_value_score int not null,

  model_version text not null,
  computed_at timestamptz not null default now()
);

create index on aqs_scores (user_id, computed_at desc);

create type competitor_label as enum ('benchmark','rival','watch','collab');

create table competitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,

  platform platform not null,
  platform_user_id text not null,
  handle text not null,
  display_name text,
  avatar_url text,
  niche text,

  label competitor_label not null default 'watch',
  added_at timestamptz not null default now(),

  unique(user_id, platform, platform_user_id)
);

create index on competitors (user_id);

create table competitor_snapshots (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references competitors(id) on delete cascade,

  follower_count int not null,
  engagement_rate numeric(5,4),
  cadence_per_week numeric(4,2),

  captured_at timestamptz not null default now()
);

create unique index on competitor_snapshots (competitor_id, utc_date(captured_at));
create index on competitor_snapshots (competitor_id, captured_at desc);

create table collab_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,

  matched_user_id uuid references users(id) on delete cascade,
  external_platform platform,
  external_handle text,

  match_score int not null check (match_score between 0 and 100),
  overlap_pct numeric(4,3),
  reason text not null,
  metadata jsonb not null default '{}',

  dismissed_at timestamptz,
  acted_on_at timestamptz,

  model_version text not null,
  created_at timestamptz not null default now()
);

create index on collab_matches (user_id, match_score desc) where dismissed_at is null;


-- ============ 006: Revenue ============
drop table if exists opportunity_matches cascade;
drop table if exists brand_opportunities cascade;
drop table if exists invoices cascade;
drop table if exists deal_events cascade;
drop table if exists deal_notes cascade;
drop table if exists deals cascade;
drop type if exists deal_stage cascade;
drop type if exists invoice_status cascade;
drop type if exists opportunity_source cascade;

create type deal_stage as enum ('lead','pitched','negotiating','contract','delivering','review','invoiced','paid','done','lost');

create table deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,

  brand_name text not null,
  brand_contact_email text,
  brand_website text,
  brand_logo_url text,

  title text not null,
  description text,
  format text,
  amount_cents bigint not null default 0,
  currency text not null default 'USD',

  stage deal_stage not null default 'lead',
  probability numeric(3,2),

  due_date date,
  contract_url text,
  brief_url text,

  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on deals (user_id, stage);
create index on deals (user_id, due_date) where archived_at is null;

create table deal_events (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,

  event_type text not null,
  from_stage deal_stage,
  to_stage deal_stage,
  note text,
  metadata jsonb default '{}',

  created_at timestamptz not null default now(),
  created_by uuid not null references users(id)
);

create index on deal_events (deal_id, created_at desc);

create table deal_notes (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,

  body text not null,
  created_at timestamptz not null default now()
);

create index on deal_notes (deal_id, created_at desc);

create type invoice_status as enum ('draft','sent','viewed','paid','overdue','void');

create table invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  deal_id uuid references deals(id) on delete set null,

  invoice_number text not null,
  amount_cents bigint not null,
  currency text not null default 'USD',

  brand_name text not null,
  brand_email text not null,
  brand_address text,

  status invoice_status not null default 'draft',
  sent_at timestamptz,
  viewed_at timestamptz,
  paid_at timestamptz,
  due_date date,

  pdf_url text,
  payment_link text,

  line_items jsonb not null default '[]',
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, invoice_number)
);

create index on invoices (user_id, status);
create index on invoices (user_id, due_date) where status in ('sent','viewed','overdue');

create type opportunity_source as enum ('curated','scraped','native','partner');

create table brand_opportunities (
  id uuid primary key default gen_random_uuid(),

  brand_name text not null,
  brand_slug text unique not null,
  brand_logo_url text,
  brand_website text,
  brand_industry text,

  title text not null,
  summary text not null,
  description text,

  budget_min_cents bigint,
  budget_max_cents bigint,
  currency text not null default 'USD',

  application_url text not null,
  deadline date,
  format_requirements text[],
  platforms platform[] not null,

  min_follower_count int,
  max_follower_count int,
  required_niches text[] not null default '{}',
  required_countries text[] not null default '{}',
  required_aqs int,

  source opportunity_source not null default 'curated',
  source_url text,
  source_notes text,

  active boolean not null default true,
  priority int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on brand_opportunities (active, deadline) where active = true;
create index on brand_opportunities (priority desc, created_at desc) where active = true;

create table opportunity_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  opportunity_id uuid not null references brand_opportunities(id) on delete cascade,

  match_score int not null check (match_score between 0 and 100),
  reason text not null,

  dismissed_at timestamptz,
  applied_at timestamptz,

  model_version text not null,
  created_at timestamptz not null default now(),

  unique(user_id, opportunity_id)
);

create index on opportunity_matches (user_id, match_score desc) where dismissed_at is null;


-- ============ 007: Media kits ============
drop table if exists media_kits cascade;

create table media_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references users(id) on delete cascade,

  public boolean not null default true,
  slug text unique not null,

  headline text,
  long_bio text,

  rate_cards jsonb not null default '[]',
  featured_post_ids uuid[] default '{}',
  brand_logos text[] default '{}',
  testimonials jsonb default '[]',

  contact_email text,
  booking_url text,

  theme text not null default 'creator' check (theme in ('creator','editorial','minimal')),

  last_refreshed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on media_kits (slug) where public = true;


-- ============ 008: Billing ============
drop table if exists stripe_events cascade;
drop table if exists subscriptions cascade;

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references users(id) on delete cascade,

  stripe_subscription_id text unique not null,
  stripe_price_id text not null,
  stripe_customer_id text not null,

  tier text not null check (tier in ('free','creator','pro','agency')),
  status text not null check (status in ('active','trialing','past_due','canceled','incomplete','incomplete_expired','paused')),

  interval text check (interval in ('month','year')),
  amount_cents bigint,
  currency text default 'USD',

  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  trial_end timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on subscriptions (user_id);
create index on subscriptions (stripe_subscription_id);
create index on subscriptions (status, current_period_end);

create table stripe_events (
  id text primary key,
  type text not null,
  processed boolean not null default false,
  payload jsonb not null,
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index on stripe_events (type, received_at desc);
create index on stripe_events (processed, received_at) where processed = false;


-- ============ 009: Platform-wide ============
drop table if exists model_versions cascade;
drop table if exists audit_log cascade;
drop table if exists user_events cascade;
drop table if exists notifications cascade;
drop table if exists feature_flags cascade;
drop type if exists notification_kind cascade;

create table feature_flags (
  key text primary key,
  enabled boolean not null default false,
  rollout_percent int not null default 0 check (rollout_percent between 0 and 100),
  enabled_for_user_ids uuid[] not null default '{}',
  description text,
  updated_by uuid references users(id),
  updated_at timestamptz not null default now()
);

create type notification_kind as enum (
  'score_drop','new_opportunity','deal_stage_changed','invoice_paid','invoice_overdue',
  'platform_sync_error','new_collab_match','weekly_wins','system'
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,

  kind notification_kind not null,
  title text not null,
  body text not null,
  deep_link text,

  read_at timestamptz,
  clicked_at timestamptz,

  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index on notifications (user_id, created_at desc);
create index on notifications (user_id) where read_at is null;

create table user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,

  event_name text not null,
  properties jsonb not null default '{}',

  session_id text,
  device text,
  ip_address inet,
  user_agent text,

  created_at timestamptz not null default now()
);

create index on user_events (user_id, created_at desc);
create index on user_events (event_name, created_at desc);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id) on delete set null,
  actor_role text not null,

  action text not null,
  target_type text,
  target_id text,

  metadata jsonb not null default '{}',
  ip_address inet,

  created_at timestamptz not null default now()
);

create index on audit_log (actor_user_id, created_at desc);
create index on audit_log (action, created_at desc);
create index on audit_log (target_type, target_id, created_at desc);

create table model_versions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version text not null,

  registry_url text not null,
  hash text not null,

  metrics jsonb not null,
  deployed_at timestamptz,
  retired_at timestamptz,

  created_at timestamptz not null default now(),
  unique(name, version)
);

create index on model_versions (name, deployed_at desc) where retired_at is null;


-- ============ 014: Content generations ============
create table if not exists content_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  platform_account_id uuid references platform_accounts(id) on delete set null,
  platform text not null,
  content_type text not null check (content_type in ('post_ideas','captions','calendar','scripts','carousels','bio')),
  topic text,
  tone text,
  result jsonb not null,
  ai_provider text,
  tokens_used int default 0,
  cost_cents numeric(8,2) default 0,
  created_at timestamptz not null default now()
);

create index on content_generations (user_id, created_at desc);


-- ============ 010: RLS ============

create or replace function auth_user_id() returns uuid
  language sql stable
as $$ select auth.uid() $$;

create or replace function is_admin() returns boolean
  language sql stable
as $$
  select exists (
    select 1 from users
    where id = auth.uid() and role = 'admin' and deleted_at is null
  );
$$;

-- users
alter table users enable row level security;

create policy users_select_self on users
  for select using (id = auth_user_id());

create policy users_update_self on users
  for update using (id = auth_user_id())
  with check (
    id = auth_user_id()
    and role = (select role from users where id = auth_user_id())
    and subscription_tier = (select subscription_tier from users where id = auth_user_id())
  );

create view users_public as
  select id, handle, display_name, avatar_url, bio
  from users
  where deleted_at is null;

grant select on users_public to anon, authenticated;

-- platform_accounts
alter table platform_accounts enable row level security;
create policy platform_accounts_owner_all on platform_accounts
  for all using (user_id = auth_user_id()) with check (user_id = auth_user_id());
grant select on platform_accounts_safe to authenticated;
revoke select on platform_accounts from authenticated, anon;

-- posts
alter table posts enable row level security;
create policy posts_owner_all on posts
  for all using (user_id = auth_user_id()) with check (user_id = auth_user_id());

-- viral_scores
alter table viral_scores enable row level security;
create policy viral_scores_owner_read on viral_scores
  for select using (user_id = auth_user_id());

-- smo_scores
alter table smo_scores enable row level security;
create policy smo_scores_owner_read on smo_scores
  for select using (user_id = auth_user_id());

-- audience_snapshots
alter table audience_snapshots enable row level security;
create policy audience_snapshots_owner_read on audience_snapshots
  for select using (user_id = auth_user_id());

-- aqs_scores
alter table aqs_scores enable row level security;
create policy aqs_scores_owner_read on aqs_scores
  for select using (user_id = auth_user_id());

-- competitors
alter table competitors enable row level security;
create policy competitors_owner_all on competitors
  for all using (user_id = auth_user_id()) with check (user_id = auth_user_id());

-- competitor_snapshots
alter table competitor_snapshots enable row level security;
create policy competitor_snapshots_read on competitor_snapshots
  for select using (
    exists (select 1 from competitors c where c.id = competitor_id and c.user_id = auth_user_id())
  );

-- collab_matches
alter table collab_matches enable row level security;
create policy collab_matches_owner_read on collab_matches
  for select using (user_id = auth_user_id());
create policy collab_matches_owner_update on collab_matches
  for update using (user_id = auth_user_id()) with check (user_id = auth_user_id());

-- deals
alter table deals enable row level security;
create policy deals_owner_all on deals
  for all using (user_id = auth_user_id()) with check (user_id = auth_user_id());

-- deal_events
alter table deal_events enable row level security;
create policy deal_events_read on deal_events
  for select using (
    exists (select 1 from deals d where d.id = deal_id and d.user_id = auth_user_id())
  );
create policy deal_events_insert on deal_events
  for insert with check (
    exists (select 1 from deals d where d.id = deal_id and d.user_id = auth_user_id())
    and created_by = auth_user_id()
  );

-- deal_notes
alter table deal_notes enable row level security;
create policy deal_notes_owner_all on deal_notes
  for all using (user_id = auth_user_id()) with check (user_id = auth_user_id());

-- invoices
alter table invoices enable row level security;
create policy invoices_owner_all on invoices
  for all using (user_id = auth_user_id()) with check (user_id = auth_user_id());

-- brand_opportunities
alter table brand_opportunities enable row level security;
create policy opportunities_read_active on brand_opportunities
  for select using (active = true);

-- opportunity_matches
alter table opportunity_matches enable row level security;
create policy opp_matches_owner_read on opportunity_matches
  for select using (user_id = auth_user_id());
create policy opp_matches_owner_update on opportunity_matches
  for update using (user_id = auth_user_id()) with check (user_id = auth_user_id());

-- media_kits
alter table media_kits enable row level security;
create policy media_kits_read on media_kits
  for select using (
    user_id = auth_user_id()
    or (public = true and user_id is not null)
  );
create policy media_kits_update_owner on media_kits
  for update using (user_id = auth_user_id()) with check (user_id = auth_user_id());
create policy media_kits_insert_owner on media_kits
  for insert with check (user_id = auth_user_id());

-- subscriptions
alter table subscriptions enable row level security;
create policy subscriptions_read_own on subscriptions
  for select using (user_id = auth_user_id());

-- stripe_events
alter table stripe_events enable row level security;

-- feature_flags
alter table feature_flags enable row level security;
create policy feature_flags_read on feature_flags
  for select using (true);

-- notifications
alter table notifications enable row level security;
create policy notifications_owner_read on notifications
  for select using (user_id = auth_user_id());
create policy notifications_owner_update on notifications
  for update using (user_id = auth_user_id()) with check (user_id = auth_user_id());

-- content_generations
alter table content_generations enable row level security;
create policy content_generations_owner_all on content_generations
  for all using (user_id = auth_user_id()) with check (user_id = auth_user_id());

-- user_events
alter table user_events enable row level security;
create policy user_events_insert_own on user_events
  for insert with check (user_id = auth_user_id() or user_id is null);

-- audit_log
alter table audit_log enable row level security;

-- model_versions
alter table model_versions enable row level security;


-- ============ 011: Triggers ============

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger trg_users_updated_at before update on users
  for each row execute function touch_updated_at();
create trigger trg_platform_accounts_updated_at before update on platform_accounts
  for each row execute function touch_updated_at();
create trigger trg_posts_updated_at before update on posts
  for each row execute function touch_updated_at();
create trigger trg_deals_updated_at before update on deals
  for each row execute function touch_updated_at();
create trigger trg_invoices_updated_at before update on invoices
  for each row execute function touch_updated_at();
create trigger trg_brand_opportunities_updated_at before update on brand_opportunities
  for each row execute function touch_updated_at();
create trigger trg_media_kits_updated_at before update on media_kits
  for each row execute function touch_updated_at();
create trigger trg_subscriptions_updated_at before update on subscriptions
  for each row execute function touch_updated_at();
create trigger trg_feature_flags_updated_at before update on feature_flags
  for each row execute function touch_updated_at();

-- auth.users -> public.users sync on signup
drop trigger if exists on_auth_user_created on auth.users;

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, display_name, handle)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '', 'g'))
  )
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Deal stage change -> deal_events
create or replace function log_deal_stage_change()
returns trigger language plpgsql as $$
begin
  if old.stage is distinct from new.stage then
    insert into deal_events (deal_id, event_type, from_stage, to_stage, created_by)
    values (new.id, 'stage_changed', old.stage, new.stage, new.user_id);
  end if;
  return new;
end; $$;

create trigger trg_deal_stage after update on deals
  for each row execute function log_deal_stage_change();


-- ============ 012: Storage ============

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

drop policy if exists avatars_own on storage.objects;
create policy avatars_own on storage.objects for all
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

insert into storage.buckets (id, name, public)
  values ('media', 'media', false)
  on conflict (id) do nothing;

drop policy if exists media_own on storage.objects;
create policy media_own on storage.objects for all
  using (bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]);

insert into storage.buckets (id, name, public)
  values ('invoices', 'invoices', false)
  on conflict (id) do nothing;

drop policy if exists invoices_own on storage.objects;
create policy invoices_own on storage.objects for all
  using (bucket_id = 'invoices' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'invoices' and auth.uid()::text = (storage.foldername(name))[1]);

insert into storage.buckets (id, name, public)
  values ('media-kits', 'media-kits', true)
  on conflict (id) do nothing;

drop policy if exists media_kits_own_write on storage.objects;
create policy media_kits_own_write on storage.objects for insert
  with check (bucket_id = 'media-kits' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists media_kits_own_update on storage.objects;
create policy media_kits_own_update on storage.objects for update
  using (bucket_id = 'media-kits' and auth.uid()::text = (storage.foldername(name))[1]);


-- ============ 013: Seed ============

insert into feature_flags (key, enabled, description) values
  ('opportunities_curated_v1', true, 'Show curated brand opportunities'),
  ('opportunities_native_v1', false, 'Self-serve brand portal opportunities'),
  ('brand_portal_v1', false, 'Let brands create accounts'),
  ('agency_tier', false, 'Multi-seat agency accounts'),
  ('ml_scoring_v2', false, 'Next-gen scoring model'),
  ('newsletter_tool', false, 'Built-in newsletter feature')
on conflict (key) do nothing;

insert into model_versions (name, version, registry_url, hash, metrics, deployed_at) values
  ('viral_score', 'v1.0.0', 'local://rules-engine', 'rules-v1', '{"type":"rules-based","factors":6,"signals":42}', now())
on conflict (name, version) do nothing;

-- Public media kit function
create or replace function get_media_kit_data(kit_slug text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'kit', row_to_json(mk.*),
    'user', jsonb_build_object(
      'handle', u.handle,
      'display_name', u.display_name,
      'avatar_url', u.avatar_url,
      'bio', u.bio
    ),
    'platforms', (select coalesce(jsonb_agg(row_to_json(p.*)), '[]'::jsonb) from platform_accounts_safe p where p.user_id = u.id),
    'stats', (
      select jsonb_build_object(
        'total_followers', coalesce(sum(p.follower_count), 0),
        'platform_count', count(*)
      )
      from platform_accounts_safe p where p.user_id = u.id
    )
  )
  from media_kits mk
  join users u on u.id = mk.user_id
  where mk.slug = kit_slug and mk.public = true;
$$;

grant execute on function get_media_kit_data(text) to anon, authenticated;


-- ============ Backfill existing auth users into public.users ============
-- This creates public.users rows for any auth.users that already exist
insert into public.users (id, email, display_name, handle)
select
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1)),
  lower(regexp_replace(split_part(au.email, '@', 1), '[^a-z0-9_]', '', 'g'))
from auth.users au
where not exists (select 1 from public.users u where u.id = au.id)
on conflict (id) do nothing;


-- ============ Done! ============
-- After running this, refresh your app and everything should work.
