-- 005: Audience snapshots, AQS scores, competitors, collab matches

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

create unique index on audience_snapshots (platform_account_id, (captured_at::date));
create index on audience_snapshots (user_id, captured_at desc);

-- Audience Quality Score
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

-- Competitors
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

-- Competitor snapshots (daily)
create table competitor_snapshots (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references competitors(id) on delete cascade,

  follower_count int not null,
  engagement_rate numeric(5,4),
  cadence_per_week numeric(4,2),

  captured_at timestamptz not null default now()
);

create unique index on competitor_snapshots (competitor_id, (captured_at::date));
create index on competitor_snapshots (competitor_id, captured_at desc);

-- Collab matches (AI-generated weekly)
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
