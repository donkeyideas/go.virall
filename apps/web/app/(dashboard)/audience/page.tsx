import { createServerClient } from '@govirall/db/server';
import { createAdminClient } from '@govirall/db/admin';
import { AudienceClient } from './audience-client';

export default async function AudiencePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user!.id;
  const admin = createAdminClient();

  const [profileRes, platformsRes, snapshotsRes, competitorsRes, collabsRes, aqsRes] = await Promise.all([
    admin
      .from('users')
      .select('theme')
      .eq('id', userId)
      .single(),
    admin
      .from('platform_accounts_safe')
      .select('id, platform, platform_username, follower_count, sync_status')
      .eq('user_id', userId),
    admin
      .from('audience_snapshots')
      .select('platform_account_id, follower_count, captured_at')
      .eq('user_id', userId)
      .order('captured_at', { ascending: true })
      .limit(90),
    admin
      .from('competitors')
      .select('id, platform, handle, label, follower_count, engagement_rate, added_at')
      .eq('user_id', userId)
      .order('added_at', { ascending: false }),
    admin
      .from('collab_matches')
      .select('id, handle, platform, match_score, follower_count, niche, status, created_at')
      .eq('user_id', userId)
      .neq('status', 'dismissed')
      .order('match_score', { ascending: false })
      .limit(6),
    admin
      .from('aqs_scores')
      .select('score, authenticity, engagement_quality, growth_quality, computed_at')
      .eq('user_id', userId)
      .order('computed_at', { ascending: false })
      .limit(1)
      .single(),
  ]);

  const theme = profileRes.data?.theme ?? 'glassmorphic';
  const platforms = platformsRes.data ?? [];
  const snapshots = snapshotsRes.data ?? [];
  const competitors = competitorsRes.data ?? [];
  const collabs = collabsRes.data ?? [];
  const aqs = aqsRes.data;

  const connectedPlatforms = platforms.filter((p) => p.sync_status === 'healthy');
  const totalFollowers = connectedPlatforms.reduce((sum, p) => sum + (p.follower_count ?? 0), 0);

  return (
    <AudienceClient
      theme={theme}
      connectedPlatforms={connectedPlatforms}
      totalFollowers={totalFollowers}
      aqs={aqs}
      snapshots={snapshots}
      competitors={competitors}
      collabs={collabs}
    />
  );
}
