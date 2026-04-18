-- ============================================================
-- Go Virall — Sync Queue + Algorithm Monitor Tables
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Sync Run Log ──
-- Tracks each automated cron sync execution
CREATE TABLE IF NOT EXISTS sync_run_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  profiles_processed INT DEFAULT 0,
  profiles_succeeded INT DEFAULT 0,
  profiles_failed INT DEFAULT 0,
  duration_ms INT,
  metadata JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_sync_run_log_started ON sync_run_log(started_at DESC);

-- ── Algorithm Events ──
-- Detected algorithm changes or scraper issues
CREATE TABLE IF NOT EXISTS algorithm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'engagement_drop', 'engagement_spike', 'scraper_failure', 'pattern_shift', 'manual'
  )),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  metrics_snapshot JSONB DEFAULT '{}',
  ai_analysis TEXT,
  status TEXT DEFAULT 'detected' CHECK (status IN (
    'detected', 'analyzing', 'confirmed', 'resolved', 'false_positive'
  )),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_algo_events_platform ON algorithm_events(platform, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_algo_events_status ON algorithm_events(status, created_at DESC);

-- ── Algorithm Adjustments ──
-- Suggested or applied changes to scoring/recommendations
CREATE TABLE IF NOT EXISTS algorithm_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES algorithm_events(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN (
    'smo_weight', 'content_strategy', 'posting_time', 'engagement_benchmark'
  )),
  current_value JSONB NOT NULL DEFAULT '{}',
  suggested_value JSONB NOT NULL DEFAULT '{}',
  ai_reasoning TEXT,
  status TEXT DEFAULT 'suggested' CHECK (status IN (
    'suggested', 'approved', 'applied', 'rejected'
  )),
  applied_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  applied_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_algo_adj_event ON algorithm_adjustments(event_id);
CREATE INDEX IF NOT EXISTS idx_algo_adj_platform ON algorithm_adjustments(platform, created_at DESC);

-- ── Platform Health Snapshots ──
-- Periodic scraper stats per platform
CREATE TABLE IF NOT EXISTS platform_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_syncs INT DEFAULT 0,
  successful_syncs INT DEFAULT 0,
  failed_syncs INT DEFAULT 0,
  avg_engagement_rate NUMERIC(6,3),
  median_followers INT,
  avg_followers_change NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_platform_health_platform ON platform_health_snapshots(platform, period_start DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_health_unique ON platform_health_snapshots(platform, period_start);
