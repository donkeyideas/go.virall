-- ============================================================
-- 013 — Brand pricing plans + admin-editable plan fields
-- ============================================================

-- Add account_type to distinguish creator vs brand plans
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'creator';
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Tag existing plans as creator plans
UPDATE pricing_plans SET account_type = 'creator' WHERE account_type IS NULL;

-- Seed brand plans
INSERT INTO pricing_plans (id, name, account_type, max_social_profiles, price_monthly, sort_order, description, features) VALUES
(
  'brand_starter',
  'Starter',
  'brand',
  0,
  0,
  0,
  'Try Go Virall before committing',
  '{"creator_searches_per_month": 3, "active_campaigns": 1, "team_seats": 1, "tracked_creators": 5, "ai_matching": false, "api_access": false, "priority_support": false}'
),
(
  'brand_growth',
  'Growth',
  'brand',
  0,
  9900,
  1,
  'For small brands and solopreneurs',
  '{"creator_searches_per_month": 50, "active_campaigns": 3, "team_seats": 2, "tracked_creators": 20, "ai_matching": false, "api_access": false, "priority_support": false}'
),
(
  'brand_pro',
  'Pro',
  'brand',
  0,
  29900,
  2,
  'For growing brands scaling partnerships',
  '{"creator_searches_per_month": 300, "active_campaigns": 10, "team_seats": 5, "tracked_creators": 100, "ai_matching": true, "api_access": false, "priority_support": false}'
),
(
  'brand_enterprise',
  'Enterprise',
  'brand',
  0,
  79900,
  3,
  'For agencies and large brands',
  '{"creator_searches_per_month": -1, "active_campaigns": -1, "team_seats": -1, "tracked_creators": -1, "ai_matching": true, "api_access": true, "priority_support": true}'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  account_type = EXCLUDED.account_type,
  price_monthly = EXCLUDED.price_monthly,
  sort_order = EXCLUDED.sort_order,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  updated_at = now();
