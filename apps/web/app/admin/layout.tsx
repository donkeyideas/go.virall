import { createServerClient } from '@govirall/db/server';
import { createAdminClient } from '@govirall/db/admin';
import { redirect } from 'next/navigation';
import { AdminShell } from './_components/AdminShell';

export default async function AdminLayout({
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

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('users')
    .select('display_name, avatar_url, role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/');
  }

  return (
    <AdminShell
      displayName={profile?.display_name ?? user.email ?? ''}
      avatarUrl={profile?.avatar_url ?? undefined}
    >
      {children}
    </AdminShell>
  );
}
