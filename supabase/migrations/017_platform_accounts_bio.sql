-- 017: Add bio column to platform_accounts
-- Stores the scraped bio/description from the social media profile

alter table platform_accounts add column if not exists platform_bio text;

-- Update the safe view to include bio
drop view if exists platform_accounts_safe;
create view platform_accounts_safe as
  select
    id, user_id, platform, platform_user_id, platform_username,
    platform_display_name, avatar_url, platform_bio, follower_count, following_count,
    post_count, verified, sync_status, sync_error, last_synced_at,
    connected_at, disconnected_at, scopes
  from platform_accounts;

-- Grant access
grant select on platform_accounts_safe to authenticated, anon, service_role;
grant all on platform_accounts to service_role;
