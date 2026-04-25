import { handleRoute, parseBody, ApiError } from '../../_lib/handler';
import { createAdminClient } from '@govirall/db/admin';
import { AddCompetitorInput } from '@govirall/api-types';

// GET /api/audience/competitors
export const GET = handleRoute(async ({ userId }) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('competitors')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });

  if (error) throw ApiError.badRequest(error.message);

  return data ?? [];
});

// POST /api/audience/competitors
export const POST = handleRoute(async ({ req, userId }) => {
  const body = await parseBody(req, AddCompetitorInput);

  const handle = body.handle.replace(/^@/, '');

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('competitors')
    .insert({
      user_id: userId,
      platform: body.platform,
      platform_user_id: handle,
      handle,
      label: body.label,
    })
    .select()
    .single();

  if (error) throw ApiError.badRequest(error.message);

  return data;
});
