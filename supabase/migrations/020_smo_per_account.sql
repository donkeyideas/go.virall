-- 020: SMO scores per platform account + engagement_rate on platform_accounts
-- Run in Supabase Dashboard SQL Editor.

-- ============ A. Add engagement_rate to platform_accounts ============

-- 1. Add engagement_rate column
alter table platform_accounts
  add column if not exists engagement_rate numeric(7,4);

-- 2. Add platform_bio column (already used by add endpoint, may already exist)
alter table platform_accounts
  add column if not exists platform_bio text;

-- 3. Recreate the safe view to include engagement_rate
drop view if exists platform_accounts_safe cascade;

create view platform_accounts_safe as
  select
    id, user_id, platform, platform_user_id, platform_username,
    platform_display_name, avatar_url, platform_bio,
    follower_count, following_count, post_count,
    engagement_rate, verified, sync_status, sync_error,
    last_synced_at, connected_at, disconnected_at, scopes
  from platform_accounts;

-- Re-grant after view recreation
grant select on platform_accounts_safe to authenticated;
grant select on platform_accounts_safe to service_role;

-- ============ B. SMO scores per platform account ============

-- 4. Add platform_account_id to smo_scores
alter table smo_scores
  add column if not exists platform_account_id uuid references platform_accounts(id) on delete cascade;

-- 5. Drop the old unique index (one score per user per day)
drop index if exists smo_scores_user_id_utc_date_idx;

-- 6. Create new unique index: one score per user + account + day
create unique index smo_scores_user_account_day_idx
  on smo_scores (user_id, coalesce(platform_account_id, '00000000-0000-0000-0000-000000000000'), utc_date(computed_at));

-- 7. Add a plain lookup index
create index smo_scores_account_lookup_idx
  on smo_scores (platform_account_id, computed_at desc)
  where platform_account_id is not null;

-- 8. GRANTs for smo_scores
grant select, insert, update, delete on smo_scores to service_role;
grant select on smo_scores to authenticated;
