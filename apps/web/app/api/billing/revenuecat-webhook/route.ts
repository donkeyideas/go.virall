import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@govirall/db/admin';

const PRODUCT_TO_TIER: Record<string, string> = {
  'com.govirall.creator.monthly': 'creator',
  'com.govirall.creator.yearly': 'creator',
  'com.govirall.pro.monthly': 'pro',
  'com.govirall.pro.yearly': 'pro',
  'com.govirall.agency.monthly': 'agency',
  'com.govirall.agency.yearly': 'agency',
};

const ACTIVE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
]);

const CANCEL_EVENTS = new Set([
  'CANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
]);

export async function POST(req: NextRequest) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  const authHeader = req.headers.get('authorization');

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const event = body.event;

  if (!event) {
    return NextResponse.json({ error: 'No event in body' }, { status: 400 });
  }

  const userId = event.app_user_id;
  const productId = event.product_id;
  const eventType = event.type;

  if (!userId || userId.startsWith('$')) {
    return NextResponse.json({ received: true, skipped: 'anonymous' });
  }

  const supabase = createAdminClient();
  const tier = PRODUCT_TO_TIER[productId] ?? 'creator';
  const isYearly = productId?.includes('.yearly');

  if (ACTIVE_EVENTS.has(eventType)) {
    await supabase.from('subscriptions').upsert(
      {
        user_id: userId,
        purchase_source: 'revenuecat',
        rc_customer_id: event.subscriber_id ?? null,
        rc_product_id: productId,
        stripe_subscription_id: null,
        stripe_price_id: null,
        stripe_customer_id: null,
        tier,
        status: 'active',
        interval: isYearly ? 'year' : 'month',
        current_period_start: event.purchased_at_ms
          ? new Date(event.purchased_at_ms).toISOString()
          : new Date().toISOString(),
        current_period_end: event.expiration_at_ms
          ? new Date(event.expiration_at_ms).toISOString()
          : null,
        cancel_at_period_end: false,
        canceled_at: null,
      },
      { onConflict: 'user_id' },
    );

    await supabase.rpc('sync_user_subscription_tier', { p_user_id: userId });
  } else if (CANCEL_EVENTS.has(eventType)) {
    await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        cancel_at_period_end: true,
      })
      .eq('user_id', userId)
      .eq('purchase_source', 'revenuecat');

    await supabase.rpc('sync_user_subscription_tier', { p_user_id: userId });
  }

  return NextResponse.json({ received: true });
}
