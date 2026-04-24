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
  previousResults: unknown[] | null;
  previousMeta: { platform: string; topic: string; tone: string } | null;
};

export async function fetchStudioData(contentType?: string): Promise<StudioData> {
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

  // Optionally fetch the most recent generation for this content type
  let genRes: { data: { result: unknown; platform: string; topic: string; tone: string } | null } | null = null;
  if (contentType) {
    genRes = await admin
      .from('content_generations')
      .select('result, platform, topic, tone, created_at')
      .eq('user_id', userId)
      .eq('content_type', contentType)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
  }

  // Parse previous results — DB stores objects like { scripts: [...] }, not plain arrays
  let previousResults: unknown[] | null = null;
  let previousMeta: { platform: string; topic: string; tone: string } | null = null;

  if (genRes?.data) {
    const row = genRes.data;
    try {
      const parsed = typeof row.result === 'string'
        ? JSON.parse(row.result)
        : row.result;

      // Extract the array from the content-type key
      const CONTENT_KEY_MAP: Record<string, string> = {
        scripts: 'scripts',
        captions: 'captions',
        post_ideas: 'ideas',
        bio: 'bios',
      };
      const key = contentType ? CONTENT_KEY_MAP[contentType] : null;

      if (Array.isArray(parsed)) {
        previousResults = parsed;
      } else if (key && Array.isArray((parsed as Record<string, unknown>)?.[key])) {
        previousResults = (parsed as Record<string, unknown>)[key] as unknown[];
      }
    } catch {
      previousResults = null;
    }

    if (row.platform && row.topic) {
      previousMeta = {
        platform: row.platform,
        topic: row.topic ?? '',
        tone: row.tone ?? '',
      };
    }
  }

  return {
    theme: userRes.data?.theme ?? 'glassmorphic',
    mission: userRes.data?.mission ?? null,
    platforms: platformsRes.data ?? [],
    previousResults,
    previousMeta,
  };
}
