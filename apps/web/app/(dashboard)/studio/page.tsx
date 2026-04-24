import { createServerClient } from '@govirall/db/server';
import { createAdminClient } from '@govirall/db/admin';
import { StudioHub } from './studio-hub';

export default async function StudioPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user!.id;
  const admin = createAdminClient();

  const { data } = await admin
    .from('users')
    .select('theme')
    .eq('id', userId)
    .single();

  return <StudioHub theme={data?.theme ?? 'glassmorphic'} />;
}
