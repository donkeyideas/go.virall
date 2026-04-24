import { createServerClient } from '@govirall/db/server';
import { createAdminClient } from '@govirall/db/admin';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@govirall/ui-web';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
  }

  // Use admin client to bypass RLS for profile lookup
  // (auth already verified above)
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('users')
    .select('display_name, avatar_url, handle, theme, onboarded_at, role')
    .eq('id', user.id)
    .single();

  if (!profile?.onboarded_at) {
    redirect('/onboarding');
  }

  const theme = profile?.theme ?? 'glassmorphic';

  return (
    <DashboardShell
      theme={theme}
      displayName={profile?.display_name ?? user.email ?? ''}
      avatarUrl={profile?.avatar_url ?? undefined}
      handle={profile?.handle ?? undefined}
      isAdmin={profile?.role === 'admin'}
    >
      {children}
    </DashboardShell>
  );
}
