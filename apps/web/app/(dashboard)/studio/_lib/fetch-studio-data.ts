import { createServerClient } from '@govirall/db/server';
import { createAdminClient } from '@govirall/db/admin';

export type PlatformAccount = {
  id: string;
  platform: string;
  platform_username: string;
  follower_count: number | null;
  sync_status: string;
};

export type StudioData = {
  theme: string;
  mission: string | null;
  platforms: PlatformAccount[];
};

export async function fetchStudioData(): Promise<StudioData> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user!.id;
  const admin = createAdminClient();

  const [userRes, platformsRes] = await Promise.all([
    admin
      .from('users')
      .select('theme, mission')
      .eq('id', userId)
      .single(),
    admin
      .from('platform_accounts_safe')
      .select('id, platform, platform_username, follower_count, sync_status')
      .eq('user_id', userId),
  ]);

  return {
    theme: userRes.data?.theme ?? 'glassmorphic',
    mission: userRes.data?.mission ?? null,
    platforms: platformsRes.data ?? [],
  };
}
