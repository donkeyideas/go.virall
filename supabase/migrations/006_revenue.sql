-- 006: Deals, deal_events, invoices, brand_opportunities, opportunity_matches

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

-- Deal events (audit log of stage transitions)
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

-- Invoices
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

-- Brand opportunities (platform-curated)
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

-- Opportunity matches (per-user)
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
