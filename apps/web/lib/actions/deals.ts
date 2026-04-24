'use server';

import { createServerClient } from '@govirall/db/server';
import { isValidTransition } from '@govirall/core';
import type { DealStage } from '@govirall/core';

export async function createDeal(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const brandName = formData.get('brand_name') as string;
  if (!brandName) return { error: 'Brand name is required' };

  const { data, error } = await supabase
    .from('deals')
    .insert({
      user_id: user.id,
      brand_name: brandName,
      contact_name: (formData.get('contact_name') as string) || '',
      contact_email: (formData.get('contact_email') as string) || null,
      value: Number(formData.get('value') || 0),
      currency: (formData.get('currency') as string) || 'USD',
      stage: (formData.get('stage') as string) || 'lead',
      notes: (formData.get('notes') as string) || '',
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { success: true, data };
}

export async function updateDealStage(dealId: string, newStage: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: deal } = await supabase
    .from('deals')
    .select('stage')
    .eq('id', dealId)
    .eq('user_id', user.id)
    .single();

  if (!deal) return { error: 'Deal not found' };

  if (!isValidTransition(deal.stage as DealStage, newStage as DealStage)) {
    return { error: `Cannot transition from ${deal.stage} to ${newStage}` };
  }

  const { error } = await supabase
    .from('deals')
    .update({ stage: newStage })
    .eq('id', dealId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteDeal(dealId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('deals')
    .delete()
    .eq('id', dealId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}
