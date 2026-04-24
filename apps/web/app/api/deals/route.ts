import { handleRoute, parseBody, parseQuery, ApiError } from '../_lib/handler';
import { CreateDealInput, ListDealsQuery } from '@govirall/api-types';

// GET /api/deals
export const GET = handleRoute(async ({ req, userId, supabase }) => {
  const query = parseQuery(req, ListDealsQuery);

  let q = supabase
    .from('deals')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(query.limit);

  if (query.stage) q = q.eq('stage', query.stage);
  if (query.cursor) q = q.lt('updated_at', query.cursor);

  const { data, error } = await q;

  if (error) throw ApiError.badRequest(error.message);

  return {
    items: data ?? [],
    cursor: data && data.length === query.limit ? data[data.length - 1].updated_at : null,
  };
});

// POST /api/deals
export const POST = handleRoute(async ({ req, userId, supabase }) => {
  const body = await parseBody(req, CreateDealInput);

  const { data, error } = await supabase
    .from('deals')
    .insert({
      user_id: userId,
      brand_name: body.brand_name,
      contact_name: body.contact_name,
      contact_email: body.contact_email || null,
      value: body.value,
      currency: body.currency,
      stage: body.stage,
      notes: body.notes,
      close_date: body.close_date ?? null,
    })
    .select()
    .single();

  if (error) throw ApiError.badRequest(error.message);

  return data;
});
