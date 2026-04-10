-- Add recent_posts JSONB column to social_profiles
-- Stores an array of recent post objects scraped during profile sync
ALTER TABLE social_profiles ADD COLUMN IF NOT EXISTS recent_posts JSONB DEFAULT NULL;
