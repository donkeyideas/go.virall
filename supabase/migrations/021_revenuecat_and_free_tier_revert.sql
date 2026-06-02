-- 021: RevenueCat IAP + Free Tier Revert
-- Run via Supabase Dashboard SQL Editor.
-- ============================================================

-- ============ A. Revert free tier to 1 platform ============

UPDATE subscription_plans SET
  max_platforms = 1,
  features = ARRAY[
    '1 connected account',
    '10 analyses per month',
    '5 content generations',
    '5 AI strategist msgs / day',
    'Viral score on every post'
  ]
WHERE tier = 'free';

-- ============ B. Add RevenueCat columns to subscription_plans ============

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS rc_product_monthly text,
  ADD COLUMN IF NOT EXISTS rc_product_yearly text,
  ADD COLUMN IF NOT EXISTS rc_entitlement text;

UPDATE subscription_plans SET
  rc_product_monthly = 'com.govirall.creator.monthly',
  rc_product_yearly = 'com.govirall.creator.yearly',
  rc_entitlement = 'creator_access'
WHERE tier = 'creator';

UPDATE subscription_plans SET
  rc_product_monthly = 'com.govirall.pro.monthly',
  rc_product_yearly = 'com.govirall.pro.yearly',
  rc_entitlement = 'pro_access'
WHERE tier = 'pro';

UPDATE subscription_plans SET
  rc_product_monthly = 'com.govirall.agency.monthly',
  rc_product_yearly = 'com.govirall.agency.yearly',
  rc_entitlement = 'agency_access'
WHERE tier = 'agency';

-- ============ C. Make Stripe columns nullable on subscriptions ============
-- RevenueCat rows won't have Stripe IDs, so these must be nullable.

ALTER TABLE subscriptions ALTER COLUMN stripe_subscription_id DROP NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN stripe_price_id DROP NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN stripe_customer_id DROP NOT NULL;

-- ============ D. Add RevenueCat columns to subscriptions ============

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS purchase_source text NOT NULL DEFAULT 'stripe'
    CHECK (purchase_source IN ('stripe', 'revenuecat')),
  ADD COLUMN IF NOT EXISTS rc_customer_id text,
  ADD COLUMN IF NOT EXISTS rc_product_id text;

-- ============ E. Grandfathering — track existing free users with >1 platform ============

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS free_platform_override integer;

-- Set override for existing free users who have >1 connected platform
UPDATE users u SET
  free_platform_override = sub.cnt
FROM (
  SELECT user_id, COUNT(*) as cnt
  FROM platform_accounts
  WHERE sync_status != 'disconnected'
  GROUP BY user_id
  HAVING COUNT(*) > 1
) sub
WHERE u.id = sub.user_id
  AND u.subscription_tier = 'free';

-- ============ F. sync_user_subscription_tier() function ============
-- Called by both Stripe and RevenueCat webhook handlers.

CREATE OR REPLACE FUNCTION sync_user_subscription_tier(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_tier text;
  v_status text;
  v_renews_at timestamptz;
BEGIN
  SELECT tier, status, current_period_end
    INTO v_tier, v_status, v_renews_at
  FROM subscriptions
  WHERE user_id = p_user_id
  ORDER BY
    CASE tier
      WHEN 'agency' THEN 4
      WHEN 'pro' THEN 3
      WHEN 'creator' THEN 2
      ELSE 1
    END DESC
  LIMIT 1;

  IF v_tier IS NOT NULL AND v_status IN ('active', 'trialing') THEN
    UPDATE users SET
      subscription_tier = v_tier,
      subscription_status = v_status,
      subscription_renews_at = v_renews_at,
      updated_at = now()
    WHERE id = p_user_id;
  ELSE
    UPDATE users SET
      subscription_tier = 'free',
      subscription_status = NULL,
      subscription_renews_at = NULL,
      updated_at = now()
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION sync_user_subscription_tier(uuid) TO service_role;
