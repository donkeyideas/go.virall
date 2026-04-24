-- 008: Subscriptions + Stripe events

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

-- Stripe events (idempotent webhook log)
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
