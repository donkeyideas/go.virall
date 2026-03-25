-- ============================================================
-- Migration 005: Stripe billing columns + fix pricing_plans
-- ============================================================

-- Add Stripe subscription columns to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Indexes for webhook lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer
  ON organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription
  ON organizations(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Fix pricing_plans to match actual UI pricing
DELETE FROM pricing_plans;
INSERT INTO pricing_plans (id, name, max_social_profiles, price_monthly, features) VALUES
  ('free',       'Free',        1,     0, '{"ai_insights_per_month": 3, "max_deals": 2, "data_sync_hours": 24, "competitors": 0, "ai_content_per_month": 0, "conversations": 0}'),
  ('pro',        'Pro',         3,  2900, '{"ai_insights_per_month": -1, "max_deals": 10, "data_sync_hours": 6, "competitors": 5, "ai_content_per_month": 50, "conversations": 10}'),
  ('business',   'Business',   10,  7900, '{"ai_insights_per_month": -1, "max_deals": -1, "data_sync_hours": 2, "competitors": 15, "ai_content_per_month": -1, "conversations": -1}'),
  ('enterprise', 'Enterprise', -1, 19900, '{"ai_insights_per_month": -1, "max_deals": -1, "data_sync_hours": 0, "competitors": -1, "ai_content_per_month": -1, "conversations": -1}');
