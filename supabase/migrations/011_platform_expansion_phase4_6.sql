-- ============================================================
-- Go Virall v4 — Platform Expansion Phase 4-6 Migration
-- Run this in Supabase Dashboard SQL Editor
-- ============================================================

-- ─── Phase 4.4: Trending Topics ────────────────────────────

CREATE TABLE IF NOT EXISTS trending_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  niche TEXT NOT NULL,
  topic TEXT NOT NULL,
  hashtags JSONB DEFAULT '[]',
  trend_score DECIMAL(5,2),
  volume INT,
  growth_rate DECIMAL(5,2),
  ai_analysis TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trending_topics_platform_niche ON trending_topics(platform, niche);
CREATE INDEX IF NOT EXISTS idx_trending_topics_score ON trending_topics(trend_score DESC);

ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read trending topics" ON trending_topics
  FOR SELECT USING (true);

-- ─── Phase 5.2: Brand-Creator Matches ──────────────────────

CREATE TABLE IF NOT EXISTS brand_creator_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creator_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_score INT NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_reasons JSONB DEFAULT '[]',
  brand_interests JSONB DEFAULT '{}',
  creator_strengths JSONB DEFAULT '{}',
  status TEXT DEFAULT 'suggested' CHECK (status IN ('suggested', 'interested', 'contacted', 'dismissed')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_profile_id, creator_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_brand_matches_brand ON brand_creator_matches(brand_profile_id, match_score DESC);
CREATE INDEX IF NOT EXISTS idx_brand_matches_creator ON brand_creator_matches(creator_profile_id, match_score DESC);

ALTER TABLE brand_creator_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their matches" ON brand_creator_matches
  FOR SELECT USING (brand_profile_id = auth.uid() OR creator_profile_id = auth.uid());

CREATE POLICY "System can create matches" ON brand_creator_matches
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their matches" ON brand_creator_matches
  FOR UPDATE USING (brand_profile_id = auth.uid() OR creator_profile_id = auth.uid());

-- ─── Phase 5.3: Scheduled Posts (Cross-Platform Publishing) ─

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  social_profile_id UUID REFERENCES social_profiles(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  media_urls JSONB DEFAULT '[]',
  hashtags JSONB DEFAULT '[]',
  scheduled_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  platform_post_id TEXT,
  error_message TEXT,
  ai_optimized BOOLEAN DEFAULT FALSE,
  ai_suggestions JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user ON scheduled_posts(user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_org ON scheduled_posts(organization_id);

ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their scheduled posts" ON scheduled_posts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create scheduled posts" ON scheduled_posts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their scheduled posts" ON scheduled_posts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their scheduled posts" ON scheduled_posts
  FOR DELETE USING (user_id = auth.uid());

-- ─── Team Invites ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('viewer', 'manager', 'owner')),
  token TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_invites_org ON team_invites(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_team_invites_email ON team_invites(email, status);
CREATE INDEX IF NOT EXISTS idx_team_invites_token ON team_invites(token);

ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owners can view their invites" ON team_invites
  FOR SELECT USING (invited_by = auth.uid());

CREATE POLICY "Org owners can create invites" ON team_invites
  FOR INSERT WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Org owners can delete invites" ON team_invites
  FOR DELETE USING (invited_by = auth.uid());
