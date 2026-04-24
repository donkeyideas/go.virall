import { createServerClient } from '@govirall/db/server';
import { redirect } from 'next/navigation';

export async function POST() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect('/signin');
}
