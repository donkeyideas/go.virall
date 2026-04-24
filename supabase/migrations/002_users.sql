-- 002: Users table (extends auth.users)

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

  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on users (handle);
create index on users (stripe_customer_id);
create index on users (subscription_tier, subscription_status);
