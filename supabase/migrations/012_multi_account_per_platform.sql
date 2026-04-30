-- 012: Allow multiple accounts per platform
-- Changes unique constraint from (user_id, platform) to (user_id, platform, platform_user_id)
-- This lets users connect multiple Instagram accounts, multiple TikTok accounts, etc.

-- Drop the old 1-per-platform constraint
alter table platform_accounts drop constraint if exists platform_accounts_user_id_platform_key;

-- Add new constraint: 1 per platform + username combo
alter table platform_accounts add constraint platform_accounts_user_id_platform_user_key unique (user_id, platform, platform_user_id);
