-- ============================================================
-- Go Virall v4 — Deliverable Verification + Trust System
-- Run in Supabase Dashboard SQL Editor
-- ============================================================

-- ─── Phase 1: Deliverable Submissions ────────────────────────

-- Extend deal_deliverables with submission tracking
ALTER TABLE deal_deliverables ADD COLUMN IF NOT EXISTS submission_url TEXT;
ALTER TABLE deal_deliverables ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE deal_deliverables ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE deal_deliverables ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE deal_deliverables ADD COLUMN IF NOT EXISTS revision_comment TEXT;

-- Submission history (audit trail of all submissions per deliverable)
CREATE TABLE IF NOT EXISTS deliverable_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES deal_deliverables(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  platform_detected TEXT,
  oembed_data JSONB,
  note TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revision_requested')),
  reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  review_comment TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_del_submissions_deliverable ON deliverable_submissions(deliverable_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_del_submissions_submitted_by ON deliverable_submissions(submitted_by);

ALTER TABLE deliverable_submissions ENABLE ROW LEVEL SECURITY;

-- Both deal parties can view submissions
CREATE POLICY "Deal parties can view submissions" ON deliverable_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deal_deliverables dd
      JOIN deals d ON d.id = dd.deal_id
      JOIN profiles p ON p.organization_id = d.organization_id
      WHERE dd.id = deliverable_submissions.deliverable_id
      AND (p.id = auth.uid() OR d.brand_profile_id = auth.uid())
    )
  );

CREATE POLICY "Users can submit deliverables" ON deliverable_submissions
  FOR INSERT WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Users can view own submissions" ON deliverable_submissions
  FOR SELECT USING (submitted_by = auth.uid());

-- ─── Phase 3: Deal Closure (Honor System) ────────────────────

-- Extend deals with closure tracking
ALTER TABLE deals ADD COLUMN IF NOT EXISTS closure_status TEXT CHECK (closure_status IN ('pending_closure', 'matched', 'disputed', 'stale'));
ALTER TABLE deals ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS dispute_deadline TIMESTAMPTZ;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS final_outcome TEXT CHECK (final_outcome IN ('paid', 'partially_paid', 'not_paid', 'cancelled', 'disputed', 'stale'));

-- Each party's independently reported outcome
CREATE TABLE IF NOT EXISTS deal_closure_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK (outcome IN ('paid', 'partially_paid', 'not_paid', 'cancelled')),
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  is_locked BOOLEAN DEFAULT FALSE,
  UNIQUE(deal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_deal_closure_deal ON deal_closure_outcomes(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_closure_user ON deal_closure_outcomes(user_id);

ALTER TABLE deal_closure_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deal parties can view closure outcomes" ON deal_closure_outcomes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deals d
      JOIN profiles p ON p.organization_id = d.organization_id
      WHERE d.id = deal_closure_outcomes.deal_id
      AND (p.id = auth.uid() OR d.brand_profile_id = auth.uid())
    )
  );

CREATE POLICY "Users can submit own outcome" ON deal_closure_outcomes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own unlocked outcome" ON deal_closure_outcomes
  FOR UPDATE USING (user_id = auth.uid() AND is_locked = FALSE);

-- ─── Phase 4: Trust & Reputation Scores ──────────────────────

CREATE TABLE IF NOT EXISTS trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  overall_score NUMERIC(4,1) NOT NULL DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
  completion_rate NUMERIC(4,1) DEFAULT 0,
  response_time_score NUMERIC(4,1) DEFAULT 0,
  dispute_rate NUMERIC(4,1) DEFAULT 0,
  consistency_score NUMERIC(4,1) DEFAULT 0,
  deal_volume_score NUMERIC(4,1) DEFAULT 0,
  total_deals_closed INT DEFAULT 0,
  total_deals_completed INT DEFAULT 0,
  total_deals_disputed INT DEFAULT 0,
  avg_response_hours NUMERIC(6,1),
  is_public BOOLEAN DEFAULT FALSE,
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_scores_profile ON trust_scores(profile_id);
CREATE INDEX IF NOT EXISTS idx_trust_scores_public ON trust_scores(is_public, overall_score DESC);

ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;

-- Public scores visible to everyone; own score always visible
CREATE POLICY "Anyone can view public trust scores" ON trust_scores
  FOR SELECT USING (is_public = TRUE OR profile_id = auth.uid());

-- Admin can upsert (server actions use admin client)
-- No user-level INSERT/UPDATE policies needed since trust_scores are system-managed

-- Trust score history for trending
CREATE TABLE IF NOT EXISTS trust_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  overall_score NUMERIC(4,1) NOT NULL,
  breakdown JSONB DEFAULT '{}',
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_history_profile ON trust_score_history(profile_id, created_at DESC);

ALTER TABLE trust_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trust history" ON trust_score_history
  FOR SELECT USING (profile_id = auth.uid());

-- Public trust history for viewing other user trends
CREATE POLICY "Anyone can view public trust history" ON trust_score_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trust_scores ts
      WHERE ts.profile_id = trust_score_history.profile_id
      AND ts.is_public = TRUE
    )
  );
