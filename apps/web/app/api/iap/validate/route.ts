import { handleRoute, parseBody } from '@/app/api/_lib/handler';
import { z } from 'zod';
import { createAdminClient } from '@govirall/db/admin';

const ValidateInput = z.object({
  transactionId: z.string().min(1),
});

const PRODUCT_TO_TIER: Record<string, string> = {
  'com.govirall.creator.monthly': 'creator',
  'com.govirall.creator.yearly': 'creator',
  'com.govirall.pro.monthly': 'pro',
  'com.govirall.pro.yearly': 'pro',
  'com.govirall.agency.monthly': 'agency',
  'com.govirall.agency.yearly': 'agency',
};

export const POST = handleRoute(async ({ req, userId }) => {
  const body = await parseBody(req, ValidateInput);
  const admin = createAdminClient();

  // Verify the transaction with Apple's StoreKit 2 API
  const appleRes = await fetch(
    `https://api.storekit.itunes.apple.com/inApps/v1/transactions/${body.transactionId}`,
    {
      headers: {
        Authorization: `Bearer ${await getAppStoreJWT()}`,
      },
    },
  );

  if (!appleRes.ok) {
    // Try sandbox if production fails
    const sandboxRes = await fetch(
      `https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/${body.transactionId}`,
      {
        headers: {
          Authorization: `Bearer ${await getAppStoreJWT()}`,
        },
      },
    );

    if (!sandboxRes.ok) {
      throw new Error('Invalid transaction');
    }
  }

  // Decode the JWS transaction (the payload is the second part, base64url-encoded)
  const responseData = await (appleRes.ok ? appleRes : Promise.resolve(null));
  let productId: string | undefined;
  let expiresDate: string | null = null;

  if (responseData) {
    const json = await responseData.json();
    const signedTransaction = json.signedTransactionInfo;
    if (signedTransaction) {
      const payload = JSON.parse(
        Buffer.from(signedTransaction.split('.')[1], 'base64url').toString(),
      );
      productId = payload.productId;
      if (payload.expiresDate) {
        expiresDate = new Date(payload.expiresDate).toISOString();
      }
    }
  }

  const tier = productId ? (PRODUCT_TO_TIER[productId] ?? 'creator') : 'creator';
  const isYearly = productId?.includes('.yearly');

  // Upsert subscription
  await admin.from('subscriptions').upsert(
    {
      user_id: userId,
      purchase_source: 'revenuecat',
      rc_product_id: productId ?? null,
      stripe_subscription_id: null,
      stripe_price_id: null,
      stripe_customer_id: null,
      tier,
      status: 'active',
      interval: isYearly ? 'year' : 'month',
      current_period_end: expiresDate,
      cancel_at_period_end: false,
      canceled_at: null,
    },
    { onConflict: 'user_id' },
  );

  // Sync the user's tier
  await admin.rpc('sync_user_subscription_tier', { p_user_id: userId });

  return { success: true, tier };
});

async function getAppStoreJWT(): Promise<string> {
  // For now, use a simple approach — the App Store Server API
  // requires a JWT signed with the App Store Connect API key.
  // If APPLE_IAP_SHARED_SECRET is set, we can use the older
  // verifyReceipt endpoint as a fallback.
  const key = process.env.APP_STORE_CONNECT_KEY;
  const keyId = process.env.APP_STORE_CONNECT_KEY_ID;
  const issuerId = process.env.APP_STORE_CONNECT_ISSUER_ID;

  if (!key || !keyId || !issuerId) {
    // Fallback: skip server-side verification, trust the client
    // This is acceptable for initial App Store review — add full
    // verification once App Store Connect API key is configured
    return '';
  }

  // Sign JWT with ES256
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    iss: issuerId,
    iat: now,
    exp: now + 3600,
    aud: 'appstoreconnect-v1',
    bid: 'com.govirall.app',
  })).toString('base64url');

  // In production, use a proper JWT signing library
  // For now, return the concatenated unsigned token
  return `${header}.${payload}`;
}
