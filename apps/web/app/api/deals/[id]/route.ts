import { handleRoute, parseBody, ApiError } from '../../_lib/handler';
import { UpdateDealInput } from '@govirall/api-types';
import { isValidTransition } from '@govirall/core';
import type { DealStage } from '@govirall/core';

// GET /api/deals/[id]
export const GET = handleRoute(async ({ userId, params, supabase }) => {

  const { data, error } = await supabase
    .from('deals')
    .select('*, deal_events(*)')
    .eq('id', params!.id)
    .eq('user_id', userId)
    .single();

  if (error || !data) throw ApiError.notFound('Deal not found');

  return data;
});

// PATCH /api/deals/[id]
export const PATCH = handleRoute(async ({ req, userId, params, supabase }) => {
  const body = await parseBody(req, UpdateDealInput);

  // If stage is changing, validate the transition
  if (body.stage) {
    const { data: current } = await supabase
      .from('deals')
      .select('stage')
      .eq('id', params!.id)
      .eq('user_id', userId)
      .single();

    if (current && !isValidTransition(current.stage as DealStage, body.stage as DealStage)) {
      throw ApiError.badRequest(`Cannot transition from ${current.stage} to ${body.stage}`);
    }
  }

  const { data, error } = await supabase
    .from('deals')
    .update(body)
    .eq('id', params!.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) throw ApiError.notFound('Deal not found');

  return data;
});

// DELETE /api/deals/[id]
export const DELETE = handleRoute(async ({ userId, params, supabase }) => {

  const { error } = await supabase
    .from('deals')
    .delete()
    .eq('id', params!.id)
    .eq('user_id', userId);

  if (error) throw ApiError.badRequest(error.message);

  return { deleted: true };
});
