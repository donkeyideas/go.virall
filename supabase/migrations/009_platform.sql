-- 009: Feature flags, notifications, user_events, audit_log, model_versions

-- Feature flags
create table feature_flags (
  key text primary key,
  enabled boolean not null default false,
  rollout_percent int not null default 0 check (rollout_percent between 0 and 100),
  enabled_for_user_ids uuid[] not null default '{}',
  description text,
  updated_by uuid references users(id),
  updated_at timestamptz not null default now()
);

-- Notifications
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

-- User events (product analytics)
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

-- Audit log
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

-- Model versions (ML registry)
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
