import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@govirall/db/admin';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  return new Stripe(key);
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Idempotency check
  const { data: existing } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single();

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Record event
  await supabase.from('stripe_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: JSON.parse(JSON.stringify(event.data.object)),
  });

  // Handle events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const tier = session.metadata?.tier ?? 'creator';

      if (userId && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(
          session.subscription as string,
          { expand: ['latest_invoice'] },
        );

        const inv = sub.latest_invoice as Stripe.Invoice | null;
        const periodStart = inv?.period_start ?? sub.start_date;
        const periodEnd = inv?.period_end ?? (periodStart + 30 * 86400);

        const item = sub.items.data[0];
        const stripePriceId = typeof item?.price === 'string' ? item.price : item?.price?.id ?? '';

        await supabase.from('subscriptions').upsert(
          {
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: sub.id,
            stripe_price_id: stripePriceId,
            tier,
            status: sub.status,
            current_period_start: new Date(periodStart * 1000).toISOString(),
            current_period_end: new Date(periodEnd * 1000).toISOString(),
          },
          { onConflict: 'user_id' },
        );
      }
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .single();

      if (existingSub) {
        // Get period dates from the latest invoice
        let periodStart = subscription.start_date;
        let periodEnd = periodStart + 30 * 86400;
        if (subscription.latest_invoice && typeof subscription.latest_invoice === 'string') {
          const inv = await stripe.invoices.retrieve(subscription.latest_invoice);
          periodStart = inv.period_start;
          periodEnd = inv.period_end;
        }

        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(periodStart * 1000).toISOString(),
            current_period_end: new Date(periodEnd * 1000).toISOString(),
            canceled_at: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : null,
          })
          .eq('stripe_subscription_id', subscription.id);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      console.warn('[Stripe] Payment failed for customer:', invoice.customer);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
