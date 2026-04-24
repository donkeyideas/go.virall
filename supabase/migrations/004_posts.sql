-- 004: Posts + viral_scores + smo_scores

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

-- Viral scores: every computation is saved (training data)
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

-- SMO scores: daily snapshot per user
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

-- Functional unique: one score per user per day (cast to date is immutable)
create unique index on smo_scores (user_id, (computed_at::date));
create index on smo_scores (user_id, computed_at desc);
