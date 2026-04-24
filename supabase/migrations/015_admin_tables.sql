-- 015: Admin-specific tables
-- Run in Supabase Dashboard SQL Editor

-- Blog posts
create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text,
  body text not null default '',
  cover_url text,
  author_user_id uuid references users(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  tags text[] not null default '{}',
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Changelog entries
create table if not exists changelog_entries (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  title text not null,
  body text not null,
  category text not null check (category in ('feature','improvement','fix','security','deprecation')),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Contact/support tickets
create table if not exists contact_tickets (
  id uuid primary key default gen_random_uuid(),
  from_name text not null,
  from_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_to uuid references users(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  tags text[] not null default '{}',
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Social posts (admin-managed company posts)
create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  caption text not null,
  media_url text,
  status text not null default 'draft' check (status in ('draft','scheduled','published')),
  scheduled_at timestamptz,
  published_at timestamptz,
  author_user_id uuid references users(id) on delete set null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Email templates
create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  subject text not null,
  html_body text not null,
  text_body text,
  variables text[] not null default '{}',
  category text not null default 'transactional',
  active boolean not null default true,
  updated_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- API key configs (admin-managed)
create table if not exists api_configs (
  key text primary key,
  label text not null,
  description text,
  value_encrypted text,
  is_set boolean not null default false,
  category text not null default 'integration',
  updated_by uuid references users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Enable RLS (no policies = service role only)
alter table blog_posts enable row level security;
alter table changelog_entries enable row level security;
alter table contact_tickets enable row level security;
alter table social_posts enable row level security;
alter table email_templates enable row level security;
alter table api_configs enable row level security;

-- Indexes
create index if not exists blog_posts_status_published on blog_posts (status, published_at desc);
create index if not exists changelog_entries_published on changelog_entries (published_at desc);
create index if not exists contact_tickets_status on contact_tickets (status, created_at desc);
create index if not exists social_posts_status on social_posts (status, scheduled_at);
