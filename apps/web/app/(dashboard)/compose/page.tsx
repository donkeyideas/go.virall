import { createServerClient } from '@govirall/db/server';
import { createAdminClient } from '@govirall/db/admin';
import { ComposeClient } from './compose-client';

export default async function ComposePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const [{ data: profile }, { data: latestDraft }, { data: platforms }] = await Promise.all([
    admin
      .from('users')
      .select('theme, mission')
      .eq('id', user!.id)
      .single(),
    admin
      .from('posts')
      .select('id, platform, format, hook, caption, hashtags, status')
      .eq('user_id', user!.id)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    admin
      .from('platform_accounts_safe')
      .select('id, platform, platform_username, follower_count')
      .eq('user_id', user!.id),
  ]);

  const theme = profile?.theme ?? 'glassmorphic';

  return (
    <ComposeClient
      theme={theme}
      draft={latestDraft ?? undefined}
      mission={profile?.mission ?? null}
      connectedPlatforms={platforms ?? []}
    />
  );
}
