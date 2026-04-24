-- 007: Media kits

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
