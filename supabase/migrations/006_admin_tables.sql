-- ============================================================
-- Migration 006: Admin Dashboard Tables
-- ============================================================

-- 1. audit_log — tracks admin & user actions
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC);

-- 2. billing_events — Stripe webhook events log
CREATE TABLE billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT,
  amount_cents INT DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_billing_events_org ON billing_events(organization_id, created_at DESC);
CREATE INDEX idx_billing_events_created ON billing_events(created_at DESC);

-- 3. contact_submissions — from marketing site contact form
CREATE TABLE contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_contacts_status ON contact_submissions(status, created_at DESC);

-- 4. site_content — CMS blocks for marketing pages
CREATE TABLE site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page TEXT NOT NULL,
  section TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_site_content_page ON site_content(page, sort_order);

-- 5. posts — blog articles, guides, tutorials
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT DEFAULT 'blog' CHECK (type IN ('blog', 'guide', 'tutorial')),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  author_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  tags TEXT[] DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_status ON posts(status, published_at DESC);

-- 6. changelog_entries
CREATE TABLE changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT DEFAULT 'improvement' CHECK (type IN ('feature', 'improvement', 'fix', 'breaking')),
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. roadmap_items
CREATE TABLE roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  category TEXT,
  votes INT DEFAULT 0,
  target_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. job_listings — careers page
CREATE TABLE job_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT,
  location TEXT,
  type TEXT DEFAULT 'full-time',
  description TEXT NOT NULL,
  requirements TEXT,
  salary_range TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. email_templates — transactional email templates
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. social_posts — platform social media posts (Go Virall's own social accounts)
CREATE TABLE social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. ai_interactions — full AI call log for knowledge base
CREATE TABLE ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  feature TEXT NOT NULL,
  sub_type TEXT,
  prompt_text TEXT NOT NULL,
  response_text TEXT,
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  provider TEXT NOT NULL,
  model TEXT,
  response_time_ms INT,
  is_success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ai_interactions_feature ON ai_interactions(feature, created_at DESC);
CREATE INDEX idx_ai_interactions_created ON ai_interactions(created_at DESC);

-- 12. platform_insights — AI-generated data intelligence
CREATE TABLE platform_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'health_score', 'anomaly', 'trend', 'recommendation', 'prediction', 'summary'
  )),
  category TEXT NOT NULL CHECK (category IN (
    'revenue', 'engagement', 'growth', 'churn',
    'feature_adoption', 'system', 'ai_usage', 'overall'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('critical', 'warning', 'info', 'positive')),
  confidence DECIMAL(3,2) DEFAULT 0.80,
  data_snapshot JSONB DEFAULT '{}',
  recommendations JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  is_dismissed BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX idx_platform_insights_active ON platform_insights(is_active, generated_at DESC);

-- ============================================================
-- RLS — all new tables: enable + service role full access
-- ============================================================
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE changelog_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON audit_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON billing_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON contact_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON site_content FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON changelog_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON roadmap_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON job_listings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON email_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON social_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON ai_interactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON platform_insights FOR ALL USING (true) WITH CHECK (true);

-- Public read policies for marketing content
CREATE POLICY "Public can read published posts" ON posts FOR SELECT USING (status = 'published');
CREATE POLICY "Public can read published changelog" ON changelog_entries FOR SELECT USING (is_published = true);
CREATE POLICY "Public can read roadmap" ON roadmap_items FOR SELECT USING (true);
CREATE POLICY "Public can read active jobs" ON job_listings FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read active site content" ON site_content FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can submit contact" ON contact_submissions FOR INSERT WITH CHECK (true);
