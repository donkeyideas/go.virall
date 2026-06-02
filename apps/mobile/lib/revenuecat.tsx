import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  type PurchasesOfferings,
  LOG_LEVEL,
} from 'react-native-purchases';
import { useAuth } from './auth';

interface SubscriptionState {
  tier: 'free' | 'creator' | 'pro' | 'agency';
  isActive: boolean;
  expiresAt: string | null;
  willRenew: boolean;
}

interface RevenueCatContextValue {
  customerInfo: CustomerInfo | null;
  subscription: SubscriptionState;
  offerings: PurchasesPackage[];
  loading: boolean;
  purchase: (pkg: PurchasesPackage) => Promise<{ success: boolean; error?: string }>;
  restore: () => Promise<{ success: boolean; tier?: string; error?: string }>;
  refresh: () => Promise<void>;
}

const RevenueCatContext = createContext<RevenueCatContextValue | null>(null);

function deriveTier(info: CustomerInfo | null): SubscriptionState {
  if (!info) return { tier: 'free', isActive: false, expiresAt: null, willRenew: false };

  const checks: Array<{ entId: string; tier: 'agency' | 'pro' | 'creator' }> = [
    { entId: 'agency_access', tier: 'agency' },
    { entId: 'pro_access', tier: 'pro' },
    { entId: 'creator_access', tier: 'creator' },
  ];

  for (const { entId, tier } of checks) {
    const ent = info.entitlements.active[entId];
    if (ent) {
      return {
        tier,
        isActive: true,
        expiresAt: ent.expirationDate ?? null,
        willRenew: ent.willRenew !== false,
      };
    }
  }

  return { tier: 'free', isActive: false, expiresAt: null, willRenew: false };
}

let configured = false;

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (configured) return;

    const apiKey = Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY;

    if (!apiKey) {
      setLoading(false);
      return;
    }

    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey });
    configured = true;
  }, []);

  useEffect(() => {
    if (!user) {
      setCustomerInfo(null);
      setOfferings([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { customerInfo: info } = await Purchases.logIn(user.id);
        if (!cancelled) setCustomerInfo(info);

        const result: PurchasesOfferings = await Purchases.getOfferings();
        if (!cancelled && result.current) {
          setOfferings(result.current.availablePackages);
        }
      } catch (err) {
        console.error('[RevenueCat] Init error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const listener = (info: CustomerInfo) => {
      if (!cancelled) setCustomerInfo(info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      cancelled = true;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [user]);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    try {
      const result = await Purchases.purchasePackage(pkg);
      setCustomerInfo(result.customerInfo);
      return { success: true };
    } catch (err: unknown) {
      const e = err as { userCancelled?: boolean; message?: string };
      if (e.userCancelled) return { success: false, error: 'Purchase cancelled' };
      return { success: false, error: e.message ?? 'Purchase failed' };
    }
  }, []);

  const restore = useCallback(async () => {
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      const restored = deriveTier(info);
      return { success: true, tier: restored.tier };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return { success: false, error: e.message ?? 'Restore failed' };
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
    } catch {}
  }, []);

  const subscription = deriveTier(customerInfo);

  return (
    <RevenueCatContext.Provider value={{
      customerInfo,
      subscription,
      offerings,
      loading,
      purchase,
      restore,
      refresh,
    }}>
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useSubscription(): RevenueCatContextValue {
  const ctx = useContext(RevenueCatContext);
  if (!ctx) throw new Error('useSubscription must be used within RevenueCatProvider');
  return ctx;
}
