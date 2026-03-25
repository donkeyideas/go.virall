-- Add platform_data JSONB column to social_profiles
-- Stores platform-specific fields: TikTok hearts, YouTube totalViews, Twitch isLive, etc.
ALTER TABLE social_profiles ADD COLUMN IF NOT EXISTS platform_data JSONB DEFAULT NULL;
