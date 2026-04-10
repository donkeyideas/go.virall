-- ============================================================
-- Go Virall v4 — Platform Expansion Migration (Phases 1-3)
-- Run this in Supabase Dashboard SQL Editor
-- ============================================================

-- ─── Phase 1.1: Account Type System ────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'creator' CHECK (account_type IN ('creator', 'brand'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_website TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_size TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS brand_logo_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS brand_description TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_connect_onboarded BOOLEAN DEFAULT FALSE;

-- ─── Phase 1.2: Messaging System ───────────────────────────

CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  unread_count_1 INT DEFAULT 0,
  unread_count_2 INT DEFAULT 0,
  is_archived_1 BOOLEAN DEFAULT FALSE,
  is_archived_2 BOOLEAN DEFAULT FALSE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_1, participant_2)
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'proposal', 'file', 'system')),
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for messaging
CREATE INDEX IF NOT EXISTS idx_direct_messages_thread ON direct_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_p1 ON message_threads(participant_1);
CREATE INDEX IF NOT EXISTS idx_message_threads_p2 ON message_threads(participant_2);
CREATE INDEX IF NOT EXISTS idx_message_threads_last ON message_threads(last_message_at DESC);

-- RLS for messaging
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their threads" ON message_threads
  FOR SELECT USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can create threads" ON message_threads
  FOR INSERT WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can update their threads" ON message_threads
  FOR UPDATE USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can view messages in their threads" ON direct_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM message_threads t
      WHERE t.id = direct_messages.thread_id
      AND (t.participant_1 = auth.uid() OR t.participant_2 = auth.uid())
    )
  );

CREATE POLICY "Users can send messages" ON direct_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their messages" ON direct_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM message_threads t
      WHERE t.id = direct_messages.thread_id
      AND (t.participant_1 = auth.uid() OR t.participant_2 = auth.uid())
    )
  );

CREATE POLICY "Users can view attachments in their threads" ON message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM direct_messages dm
      JOIN message_threads t ON t.id = dm.thread_id
      WHERE dm.id = message_attachments.message_id
      AND (t.participant_1 = auth.uid() OR t.participant_2 = auth.uid())
    )
  );

CREATE POLICY "Users can add attachments" ON message_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM direct_messages dm WHERE dm.id = message_attachments.message_id AND dm.sender_id = auth.uid()
    )
  );

-- Enable realtime for messaging
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_threads;

-- ─── Phase 2.1: Proposals ──────────────────────────────────

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  thread_id UUID REFERENCES message_threads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  proposal_type TEXT DEFAULT 'brand_to_creator' CHECK (proposal_type IN ('brand_to_creator', 'creator_to_brand')),
  deliverables JSONB NOT NULL DEFAULT '[]',
  total_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  payment_type TEXT DEFAULT 'fixed' CHECK (payment_type IN ('fixed', 'per_deliverable', 'revenue_share', 'product_only')),
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'negotiating', 'accepted', 'declined', 'expired', 'cancelled')),
  counter_offer JSONB,
  revision_count INT DEFAULT 0,
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS proposal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for proposals
CREATE INDEX IF NOT EXISTS idx_proposals_sender ON proposals(sender_id);
CREATE INDEX IF NOT EXISTS idx_proposals_receiver ON proposals(receiver_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposal_events_proposal ON proposal_events(proposal_id);

-- RLS for proposals
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their proposals" ON proposals
  FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can create proposals" ON proposals
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their proposals" ON proposals
  FOR UPDATE USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can view proposal events" ON proposal_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM proposals p WHERE p.id = proposal_events.proposal_id
      AND (p.sender_id = auth.uid() OR p.receiver_id = auth.uid())
    )
  );

CREATE POLICY "Users can create proposal events" ON proposal_events
  FOR INSERT WITH CHECK (actor_id = auth.uid());

-- ─── Phase 2.2: Enhanced Deals ─────────────────────────────

ALTER TABLE deals ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'lead' CHECK (pipeline_stage IN ('lead', 'outreach', 'negotiating', 'contracted', 'in_progress', 'delivered', 'invoiced', 'paid', 'completed'));
ALTER TABLE deals ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES message_threads(id) ON DELETE SET NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS brand_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS contract_url TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS is_from_platform BOOLEAN DEFAULT FALSE;

-- ─── Phase 2.3: Platform Payments ──────────────────────────

CREATE TABLE IF NOT EXISTS platform_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  payer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  platform_fee DECIMAL(10,2) DEFAULT 0,
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_platform_payments_payer ON platform_payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_platform_payments_payee ON platform_payments(payee_id);
CREATE INDEX IF NOT EXISTS idx_platform_payments_deal ON platform_payments(deal_id);

-- RLS for payments
ALTER TABLE platform_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their payments" ON platform_payments
  FOR SELECT USING (payer_id = auth.uid() OR payee_id = auth.uid());

CREATE POLICY "Users can create payments" ON platform_payments
  FOR INSERT WITH CHECK (payer_id = auth.uid());

-- ─── Phase 3.1: Audience Quality Scores ────────────────────

CREATE TABLE IF NOT EXISTS audience_quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_profile_id UUID NOT NULL REFERENCES social_profiles(id) ON DELETE CASCADE,
  overall_score INT NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  engagement_quality INT CHECK (engagement_quality >= 0 AND engagement_quality <= 100),
  follower_authenticity INT CHECK (follower_authenticity >= 0 AND follower_authenticity <= 100),
  growth_health INT CHECK (growth_health >= 0 AND growth_health <= 100),
  content_consistency INT CHECK (content_consistency >= 0 AND content_consistency <= 100),
  audience_demographics JSONB DEFAULT '{}',
  risk_flags JSONB DEFAULT '[]',
  breakdown JSONB DEFAULT '{}',
  grade TEXT CHECK (grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-')),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_aqs_profile ON audience_quality_scores(social_profile_id, calculated_at DESC);

ALTER TABLE audience_quality_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view AQS for their profiles" ON audience_quality_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM social_profiles sp
      JOIN profiles p ON p.organization_id = sp.organization_id
      WHERE sp.id = audience_quality_scores.social_profile_id
      AND p.id = auth.uid()
    )
  );

-- ─── Phase 3.2: Content Optimizations ──────────────────────

CREATE TABLE IF NOT EXISTS content_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_profile_id UUID NOT NULL REFERENCES social_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  draft_content TEXT NOT NULL,
  target_platform TEXT NOT NULL,
  content_type TEXT,
  predicted_engagement DECIMAL(5,2),
  optimized_content TEXT,
  suggestions JSONB DEFAULT '[]',
  hashtag_recommendations JSONB DEFAULT '[]',
  best_posting_time TIMESTAMPTZ,
  tone_analysis JSONB,
  competitor_comparison JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_opt_profile ON content_optimizations(social_profile_id);
CREATE INDEX IF NOT EXISTS idx_content_opt_user ON content_optimizations(user_id);

ALTER TABLE content_optimizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their optimizations" ON content_optimizations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create optimizations" ON content_optimizations
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ─── Phase 3.3: Competitor Insights ────────────────────────

CREATE TABLE IF NOT EXISTS competitor_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_profile_id UUID NOT NULL REFERENCES social_profiles(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES social_competitors(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('weekly_summary', 'trend_alert', 'strategy_change', 'viral_content')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  actionable_tips JSONB DEFAULT '[]',
  data_snapshot JSONB DEFAULT '{}',
  priority TEXT DEFAULT 'info' CHECK (priority IN ('critical', 'high', 'medium', 'info')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_insights_profile ON competitor_insights(social_profile_id, created_at DESC);

ALTER TABLE competitor_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view insights for their profiles" ON competitor_insights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM social_profiles sp
      JOIN profiles p ON p.organization_id = sp.organization_id
      WHERE sp.id = competitor_insights.social_profile_id
      AND p.id = auth.uid()
    )
  );

-- ─── Phase 4: Creator Marketplace Profiles ─────────────────

CREATE TABLE IF NOT EXISTS creator_marketplace_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  is_listed BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  categories JSONB DEFAULT '[]',
  content_types JSONB DEFAULT '[]',
  languages JSONB DEFAULT '["en"]',
  rate_card JSONB DEFAULT '{}',
  minimum_budget DECIMAL(10,2),
  total_followers INT DEFAULT 0,
  avg_engagement_rate DECIMAL(5,2) DEFAULT 0,
  audience_quality_score INT,
  platforms_active JSONB DEFAULT '[]',
  highlight_reel JSONB DEFAULT '[]',
  past_brands JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_listed ON creator_marketplace_profiles(is_listed) WHERE is_listed = TRUE;

ALTER TABLE creator_marketplace_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view listed creators" ON creator_marketplace_profiles
  FOR SELECT USING (is_listed = TRUE);

CREATE POLICY "Users can manage their own marketplace profile" ON creator_marketplace_profiles
  FOR ALL USING (profile_id = auth.uid());

-- ─── Admin bypass policies ─────────────────────────────────
-- Note: Admin operations use createAdminClient() which bypasses RLS
