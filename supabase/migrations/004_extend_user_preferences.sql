-- ============================================================
-- Migration 004: Extend user_preferences & profiles for Settings page
-- ============================================================

-- Granular notification preferences
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS daily_digest BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS brand_deal_updates BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS growth_milestones BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS collab_opportunities BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_updates BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deal_room_messages BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS campaign_reminders BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_analysis_complete BOOLEAN DEFAULT true;

-- Extended profile fields for Account tab
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS niche TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT;
