import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@govirall/db/admin';

// GET /api/media-kit/public/[handle] -- public media kit (no auth)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;
  const supabase = createAdminClient();

  const { data: user } = await supabase
    .from('users')
    .select('id, display_name, avatar_url, handle, bio')
    .eq('handle', handle)
    .single();

  if (!user) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Media kit not found' } },
      { status: 404 },
    );
  }

  const { data: kit } = await supabase
    .from('media_kits')
    .select('*')
    .eq('user_id', user.id)
    .eq('published', true)
    .single();

  if (!kit) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Media kit not published' } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: {
      user: {
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        handle: user.handle,
        bio: user.bio,
      },
      kit,
    },
  });
}
