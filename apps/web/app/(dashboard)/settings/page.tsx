import { createServerClient } from '@govirall/db/server';
import { createAdminClient } from '@govirall/db/admin';
import { SettingsClient } from './settings-client';
import { getPublicPlans } from '../../../lib/actions/admin/plans';

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user!.id;
  const admin = createAdminClient();

  const [profileRes, platformsRes, subscriptionRes] = await Promise.all([
    admin
      .from('users')
      .select('display_name, handle, email, bio, timezone, theme, mission, notification_prefs, avatar_url')
      .eq('id', userId)
      .single(),
    admin
      .from('platform_accounts_safe')
      .select('id, platform, platform_username, follower_count, sync_status')
      .eq('user_id', userId),
    admin
      .from('subscriptions')
      .select('tier, status, current_period_end')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single(),
  ]);

  const profile = profileRes.data;
  const platforms = platformsRes.data ?? [];
  const subscription = subscriptionRes.data;

  // Read theme from the layout-level query as fallback
  const { data: themeRow } = await admin
    .from('users')
    .select('theme')
    .eq('id', userId)
    .single();
  const theme = profile?.theme ?? themeRow?.theme ?? 'glassmorphic';

  const plans = await getPublicPlans();
  const upgradePlan = plans.find((p) => p.tier === 'creator') ?? plans[1];

  return (
    <SettingsClient
      profile={profile}
      platforms={platforms}
      subscription={subscription}
      theme={theme}
      upgradePlan={upgradePlan ? { name: upgradePlan.name, price: upgradePlan.priceMonthly, features: upgradePlan.features, tier: upgradePlan.tier } : undefined}
    />
  );
}
