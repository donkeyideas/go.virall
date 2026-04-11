-- SEO System tables for GoVirall admin
-- Stores audit results and recommendations

-- seo_audits: stores audit snapshots
CREATE TABLE IF NOT EXISTS seo_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  overall_score INT NOT NULL DEFAULT 0,
  technical_score INT NOT NULL DEFAULT 0,
  content_score INT NOT NULL DEFAULT 0,
  performance_score INT NOT NULL DEFAULT 0,
  geo_score INT NOT NULL DEFAULT 0,
  total_issues INT NOT NULL DEFAULT 0,
  critical_issues INT NOT NULL DEFAULT 0,
  warning_issues INT NOT NULL DEFAULT 0,
  info_issues INT NOT NULL DEFAULT 0,
  categories JSONB NOT NULL DEFAULT '{}',
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- seo_recommendations: tracks actionable items
CREATE TABLE IF NOT EXISTS seo_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES seo_audits(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  impact TEXT NOT NULL DEFAULT 'medium',
  effort TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  page_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seo_audits_created ON seo_audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_recommendations_audit ON seo_recommendations(audit_id);
CREATE INDEX IF NOT EXISTS idx_seo_recommendations_status ON seo_recommendations(status);
