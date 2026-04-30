import { handleRoute, ApiError } from '../../_lib/handler';
import { createAdminClient } from '@govirall/db/admin';

// DELETE /api/platforms/[id] -- disconnect and remove platform account
export const DELETE = handleRoute(async ({ userId, params }) => {
  const admin = createAdminClient();

  // Delete the row entirely (no soft-delete — keeps the table clean)
  const { error } = await admin
    .from('platform_accounts')
    .delete()
    .eq('id', params!.id)
    .eq('user_id', userId);

  if (error) throw ApiError.badRequest(error.message);

  return { disconnected: true };
});
