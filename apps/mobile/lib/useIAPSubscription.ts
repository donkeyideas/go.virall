import { useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import {
  useIAP,
  type Purchase,
  type PurchaseError,
  type Subscription,
} from 'react-native-iap';
import { api } from './api';
import { IAP_PRODUCT_IDS } from './iap';

export function useIAPSubscription() {
  const processingRef = useRef(false);
  const iapRef = useRef<ReturnType<typeof useIAP>>(undefined);

  const handlePurchaseSuccess = useCallback(
    async (purchase: Purchase) => {
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        await api.post('/iap/validate', {
          transactionId: purchase.purchaseToken ?? purchase.id,
        });

        if (iapRef.current) {
          await iapRef.current.finishTransaction({ purchase, isConsumable: false });
        }

        Alert.alert('Success', 'Your subscription is now active.');
      } catch (err: unknown) {
        const e = err as { message?: string };
        console.error('[IAP] Purchase validation error:', e);
        Alert.alert(
          'Purchase Error',
          e?.message || 'Could not validate purchase. Please try again.',
        );
      } finally {
        processingRef.current = false;
      }
    },
    [],
  );

  const handlePurchaseError = useCallback((error: PurchaseError) => {
    if (error.code === 'user-cancelled') return;
    console.error('[IAP] Purchase error:', error);
    Alert.alert(
      'Purchase Failed',
      error.message || 'An error occurred during purchase.',
    );
  }, []);

  const iap = useIAP({
    onPurchaseSuccess: handlePurchaseSuccess,
    onPurchaseError: handlePurchaseError,
  });

  useEffect(() => {
    iapRef.current = iap;
  });

  const fetchSubscriptions = useCallback(async () => {
    if (iap.subscriptions.length > 0) return;
    try {
      await iap.fetchProducts({ skus: IAP_PRODUCT_IDS, type: 'subs' });
    } catch (err) {
      console.error('[IAP] Failed to fetch subscriptions:', err);
    }
  }, [iap.subscriptions.length]);

  const purchase = useCallback(
    async (productId: string) => {
      try {
        await iap.requestPurchase({
          type: 'subs',
          request: { apple: { sku: productId } },
        });
      } catch (err: unknown) {
        const e = err as { code?: string; message?: string };
        if (e?.code === 'user-cancelled') return;
        console.error('[IAP] Purchase request error:', e);
        Alert.alert(
          'Purchase Error',
          e?.message || 'Could not initiate purchase.',
        );
      }
    },
    [iap.requestPurchase],
  );

  const restorePurchases = useCallback(async () => {
    try {
      await iap.restorePurchases();

      const purchases = iap.availablePurchases;
      if (purchases.length === 0) {
        Alert.alert(
          'No Purchases Found',
          'No previous subscriptions were found for this Apple ID.',
        );
        return;
      }

      const latest = purchases.sort(
        (a, b) => b.transactionDate - a.transactionDate,
      )[0];
      await handlePurchaseSuccess(latest);
    } catch (err: unknown) {
      const e = err as { message?: string };
      console.error('[IAP] Restore error:', e);
      Alert.alert(
        'Restore Failed',
        e?.message || 'Could not restore purchases.',
      );
    }
  }, [iap.restorePurchases, iap.availablePurchases, handlePurchaseSuccess]);

  const getSubscription = useCallback(
    (productId: string): Subscription | undefined => {
      return iap.subscriptions.find((s) => s.id === productId);
    },
    [iap.subscriptions],
  );

  return {
    connected: iap.connected,
    subscriptions: iap.subscriptions,
    purchasing: processingRef.current,
    fetchSubscriptions,
    purchase,
    restorePurchases,
    getSubscription,
  };
}
