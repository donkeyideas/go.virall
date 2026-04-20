-- Feature flags: let users opt-in to advanced features
-- All default to FALSE for a simplified new-user experience
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS feature_inbox BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_business BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_publish BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_hashtags BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_media_kit BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_team BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_api_keys BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_growth BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_revenue BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_strategy BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_intelligence BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_trust_score BOOLEAN DEFAULT false;
