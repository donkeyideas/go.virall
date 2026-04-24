-- 014: Add facebook/twitch platforms + content_generations table

-- Extend platform enum
ALTER TYPE platform ADD VALUE IF NOT EXISTS 'facebook';
ALTER TYPE platform ADD VALUE IF NOT EXISTS 'twitch';

-- Content generations (AI-generated content storage)
create table content_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  platform_account_id uuid references platform_accounts(id) on delete set null,
  platform text not null,
  content_type text not null check (content_type in ('post_ideas','captions','scripts','bio')),
  topic text,
  tone text,
  result jsonb not null,
  ai_provider text,
  tokens_used int default 0,
  cost_cents numeric(8,2) default 0,
  created_at timestamptz not null default now()
);

create index on content_generations (user_id, created_at desc);
