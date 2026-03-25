-- ============================================================
-- Go Virall v2 — COMPLETE DATABASE REBUILD
-- ============================================================
-- Run this ONCE in the Supabase Dashboard SQL Editor:
--   1. Go to https://supabase.com/dashboard → your project → SQL Editor
--   2. Paste this entire file
--   3. Click "Run"
-- ============================================================

-- ============================================================
-- STEP 1: DROP ALL OLD TABLES (cascade to remove FKs)
-- ============================================================
DROP TABLE IF EXISTS campaign_posts CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS media_kits CASCADE;
DROP TABLE IF EXISTS ai_job_queue CASCADE;
DROP TABLE IF EXISTS ai_analyses CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS deal_deliverables CASCADE;
DROP TABLE IF EXISTS deals CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS competitors CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS social_metrics CASCADE;
DROP TABLE IF EXISTS social_profiles CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS user_api_configs CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS api_call_log CASCADE;
DROP TABLE IF EXISTS platform_api_configs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop old functions if they exist
DROP FUNCTION IF EXISTS get_user_org_id() CASCADE;

-- ============================================================
-- STEP 2: MIGRATION 001 — FOUNDATION
-- ============================================================

-- organizations (replaces old user-centric model)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  plan TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,
  max_social_profiles INT DEFAULT 3,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'owner',
  system_role TEXT DEFAULT 'user',
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Helper function: get current user's organization
CREATE OR REPLACE FUNCTION get_user_org_id() RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- pricing_plans (reference table)
CREATE TABLE pricing_plans (
  id TEXT PRIMARY KEY,
  name TEXT,
  max_social_profiles INT DEFAULT 3,
  price_monthly INT DEFAULT 0,
  features JSONB DEFAULT '{}'
);

INSERT INTO pricing_plans VALUES
  ('free', 'Free', 3, 0, '{"analyses_per_day": 5}'),
  ('starter', 'Starter', 5, 1900, '{"analyses_per_day": 20}'),
  ('pro', 'Pro', 15, 4900, '{"analyses_per_day": 100}'),
  ('business', 'Business', 50, 9900, '{"analyses_per_day": -1}');

-- ============================================================
-- STEP 3: MIGRATION 002 — SOCIAL CORE
-- ============================================================

CREATE TABLE social_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN (
    'instagram','tiktok','youtube','twitter','linkedin','threads','pinterest','twitch'
  )),
  handle TEXT NOT NULL,
  platform_user_id TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  followers_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  posts_count INT DEFAULT 0,
  engagement_rate NUMERIC(5,2),
  verified BOOLEAN DEFAULT false,
  niche TEXT,
  country TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, platform, handle)
);

CREATE TABLE social_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_profile_id UUID NOT NULL REFERENCES social_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  followers INT,
  following INT,
  posts_count INT,
  avg_likes NUMERIC,
  avg_comments NUMERIC,
  avg_shares NUMERIC,
  avg_views NUMERIC,
  engagement_rate NUMERIC(5,2),
  top_post_url TEXT,
  top_post_likes INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(social_profile_id, date)
);

-- ============================================================
-- STEP 4: MIGRATION 003 — SOCIAL ANALYSES
-- ============================================================

CREATE TABLE social_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_profile_id UUID NOT NULL REFERENCES social_profiles(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN (
    'growth','content_strategy','hashtags','competitors','insights',
    'earnings_forecast','thirty_day_plan','smo_score','audience',
    'network','campaign_ideas'
  )),
  result JSONB NOT NULL,
  ai_provider TEXT,
  tokens_used INT DEFAULT 0,
  cost_cents NUMERIC(10,2) DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE social_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_profile_id UUID NOT NULL REFERENCES social_profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  handle TEXT NOT NULL,
  display_name TEXT,
  followers_count INT,
  engagement_rate NUMERIC(5,2),
  avg_views NUMERIC,
  niche TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(social_profile_id, handle)
);

CREATE TABLE social_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_profile_id UUID NOT NULL REFERENCES social_profiles(id) ON DELETE CASCADE,
  primary_objective TEXT,
  target_value INT,
  target_days INT,
  content_niche TEXT,
  monetization_goal TEXT,
  posting_commitment TEXT,
  target_audience TEXT,
  competitive_aspiration TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Only one active goal per profile (enforced at app level, not constraint)

-- ============================================================
-- STEP 5: MIGRATION 004 — DEALS & CAMPAIGNS
-- ============================================================

CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  contact_email TEXT,
  status TEXT DEFAULT 'inquiry' CHECK (status IN (
    'inquiry','negotiation','active','completed','cancelled'
  )),
  total_value NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE deal_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  platform TEXT,
  content_type TEXT,
  deadline TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending','in_progress','submitted','revision','approved'
  )),
  payment_amount NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft','active','paused','completed'
  )),
  start_date DATE,
  end_date DATE,
  budget NUMERIC(10,2),
  target_reach INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- STEP 6: MIGRATION 005 — PLATFORM CONFIGS
-- ============================================================

CREATE TABLE platform_api_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  api_key TEXT,
  base_url TEXT,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO platform_api_configs (provider, display_name, config) VALUES
  ('deepseek', 'DeepSeek AI', '{"model":"deepseek-chat"}'),
  ('openai', 'OpenAI', '{"model":"gpt-4o-mini"}'),
  ('anthropic', 'Anthropic Claude', '{"model":"claude-sonnet-4-20250514"}'),
  ('gemini', 'Google Gemini', '{"model":"gemini-2.5-flash"}')
ON CONFLICT DO NOTHING;

CREATE TABLE api_call_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT DEFAULT 'POST',
  status_code INT,
  response_time_ms INT,
  tokens_used INT DEFAULT 0,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  is_success BOOLEAN DEFAULT true,
  error_message TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- STEP 7: MIGRATION 006 — NOTIFICATIONS & PREFERENCES
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_preferences (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'dark',
  email_notifications BOOLEAN DEFAULT true,
  weekly_report BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- STEP 8: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_call_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_api_configs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Organizations: accessible by members
CREATE POLICY "Org members can read org" ON organizations FOR SELECT USING (
  id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org owners can update org" ON organizations FOR UPDATE USING (
  id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- Social profiles: accessible by org members
CREATE POLICY "Org members can read social profiles" ON social_profiles FOR SELECT USING (
  organization_id = get_user_org_id()
);
CREATE POLICY "Org members can insert social profiles" ON social_profiles FOR INSERT WITH CHECK (
  organization_id = get_user_org_id()
);
CREATE POLICY "Org members can update social profiles" ON social_profiles FOR UPDATE USING (
  organization_id = get_user_org_id()
);
CREATE POLICY "Org members can delete social profiles" ON social_profiles FOR DELETE USING (
  organization_id = get_user_org_id()
);

-- Social metrics: accessible via social_profiles chain
CREATE POLICY "Org members can read metrics" ON social_metrics FOR SELECT USING (
  social_profile_id IN (SELECT id FROM social_profiles WHERE organization_id = get_user_org_id())
);
CREATE POLICY "Org members can insert metrics" ON social_metrics FOR INSERT WITH CHECK (
  social_profile_id IN (SELECT id FROM social_profiles WHERE organization_id = get_user_org_id())
);

-- Social analyses: accessible via social_profiles chain
CREATE POLICY "Org members can read analyses" ON social_analyses FOR SELECT USING (
  social_profile_id IN (SELECT id FROM social_profiles WHERE organization_id = get_user_org_id())
);
CREATE POLICY "Org members can insert analyses" ON social_analyses FOR INSERT WITH CHECK (
  social_profile_id IN (SELECT id FROM social_profiles WHERE organization_id = get_user_org_id())
);

-- Social competitors: accessible via social_profiles chain
CREATE POLICY "Org members can read competitors" ON social_competitors FOR SELECT USING (
  social_profile_id IN (SELECT id FROM social_profiles WHERE organization_id = get_user_org_id())
);
CREATE POLICY "Org members can manage competitors" ON social_competitors FOR ALL USING (
  social_profile_id IN (SELECT id FROM social_profiles WHERE organization_id = get_user_org_id())
);

-- Social goals: accessible via social_profiles chain
CREATE POLICY "Org members can read goals" ON social_goals FOR SELECT USING (
  social_profile_id IN (SELECT id FROM social_profiles WHERE organization_id = get_user_org_id())
);
CREATE POLICY "Org members can manage goals" ON social_goals FOR ALL USING (
  social_profile_id IN (SELECT id FROM social_profiles WHERE organization_id = get_user_org_id())
);

-- Deals: accessible by org members
CREATE POLICY "Org members can read deals" ON deals FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "Org members can manage deals" ON deals FOR ALL USING (organization_id = get_user_org_id());

-- Deal deliverables: accessible via deals chain
CREATE POLICY "Org members can read deliverables" ON deal_deliverables FOR SELECT USING (
  deal_id IN (SELECT id FROM deals WHERE organization_id = get_user_org_id())
);
CREATE POLICY "Org members can manage deliverables" ON deal_deliverables FOR ALL USING (
  deal_id IN (SELECT id FROM deals WHERE organization_id = get_user_org_id())
);

-- Campaigns: accessible by org members
CREATE POLICY "Org members can read campaigns" ON campaigns FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "Org members can manage campaigns" ON campaigns FOR ALL USING (organization_id = get_user_org_id());

-- Notifications: accessible by org members
CREATE POLICY "Org members can read notifications" ON notifications FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "Org members can update notifications" ON notifications FOR UPDATE USING (organization_id = get_user_org_id());

-- User preferences: users can manage own
CREATE POLICY "Users can read own prefs" ON user_preferences FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can manage own prefs" ON user_preferences FOR ALL USING (id = auth.uid());

-- API call log: service role only (no user-level policies needed)
CREATE POLICY "Service role can manage api logs" ON api_call_log FOR ALL USING (true);

-- Platform API configs: readable by all authenticated, writable by service role
CREATE POLICY "Authenticated can read configs" ON platform_api_configs FOR SELECT USING (true);

-- ============================================================
-- STEP 9: INDEXES
-- ============================================================

CREATE INDEX idx_profiles_org ON profiles(organization_id);
CREATE INDEX idx_social_profiles_org ON social_profiles(organization_id);
CREATE INDEX idx_social_profiles_platform ON social_profiles(platform);
CREATE INDEX idx_social_metrics_profile_date ON social_metrics(social_profile_id, date DESC);
CREATE INDEX idx_social_analyses_profile_type ON social_analyses(social_profile_id, analysis_type);
CREATE INDEX idx_social_analyses_expires ON social_analyses(expires_at);
CREATE INDEX idx_deals_org ON deals(organization_id);
CREATE INDEX idx_campaigns_org ON campaigns(organization_id);
CREATE INDEX idx_notifications_org_read ON notifications(organization_id, is_read);
CREATE INDEX idx_api_call_log_created ON api_call_log(created_at DESC);

-- ============================================================
-- DONE! Your Go Virall v2 database is ready.
-- ============================================================
