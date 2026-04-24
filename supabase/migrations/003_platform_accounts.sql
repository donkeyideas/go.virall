-- 003: Platform accounts (OAuth connections)

create type platform as enum ('instagram','tiktok','youtube','linkedin','x');

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

-- Safe view: excludes access_token and refresh_token
create view platform_accounts_safe as
  select
    id, user_id, platform, platform_user_id, platform_username,
    platform_display_name, avatar_url, follower_count, following_count,
    post_count, verified, sync_status, sync_error, last_synced_at,
    connected_at, disconnected_at, scopes
  from platform_accounts;
