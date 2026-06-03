import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { useSubscription } from '@/lib/revenuecat';
import { useAccount } from '@/lib/account-context';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { IconX, IconCheck, IconCrown, IconShield, IconStar } from '@/components/icons/Icons';
import type { PurchasesPackage } from 'react-native-purchases';

const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    '1 connected account',
    '10 analyses / month',
    '5 content generations',
    '5 AI strategist msgs / day',
    'Viral score on every post',
  ],
  creator: [
    'Up to 10 accounts',
    'Unlimited analyses',
    'Unlimited content generations',
    'Full AI strategist access',
    'Audience intelligence',
    'Revenue tracking',
  ],
  pro: [
    'Up to 20 accounts',
    'Advanced analytics',
    'AI Content Studio',
    'Viral Score',
    'Audience Intelligence',
    'Competitor analysis',
  ],
  agency: [
    'Unlimited accounts',
    'Full Analytics Suite',
    'Priority AI',
    'Team Collaboration',
    'White-label Reports',
    'API Access',
  ],
};

type PlanKey = 'creator' | 'pro' | 'agency';

export default function PaywallScreen() {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { offerings, purchase, restore, loading: rcLoading, subscription } = useSubscription();
  const { refreshAccounts } = useAccount();

  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('creator');
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;
  const accent = isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent;

  const getPackage = useCallback((plan: PlanKey, int: 'monthly' | 'yearly'): PurchasesPackage | undefined => {
    const productId = `com.govirall.${plan}.${int}`;
    return offerings.find((pkg) => pkg.product.identifier === productId);
  }, [offerings]);

  const selectedPackage = getPackage(selectedPlan, interval);

  const handlePurchase = useCallback(async () => {
    if (!selectedPackage) return;
    setPurchasing(true);
    const result = await purchase(selectedPackage);
    setPurchasing(false);
    if (result.success) {
      await refreshAccounts();
      router.back();
    } else if (result.error && result.error !== 'Purchase cancelled') {
      Alert.alert('Purchase Failed', result.error);
    }
  }, [selectedPackage, purchase, refreshAccounts, router]);

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    const result = await restore();
    setRestoring(false);
    if (result.success && result.tier && result.tier !== 'free') {
      Alert.alert('Restored', `Your ${result.tier} plan has been restored.`);
      await refreshAccounts();
      router.back();
    } else if (result.success) {
      Alert.alert('No Purchases Found', 'No active subscriptions were found to restore.');
    } else {
      Alert.alert('Restore Failed', result.error ?? 'Could not restore purchases.');
    }
  }, [restore, refreshAccounts, router]);

  if (subscription.isActive && subscription.tier !== 'free') {
    return (
      <View style={{ flex: 1, backgroundColor: isGlass(t) ? 'transparent' : t.bg, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <IconCrown size={48} color={accent} />
        <Text style={{ fontSize: 24, fontWeight: '700', color: fg, fontFamily: t.fontDisplay, marginTop: 16, textAlign: 'center' }}>
          You're on the {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} Plan
        </Text>
        <Text style={{ fontSize: 14, color: muted, fontFamily: t.fontBody, marginTop: 8, textAlign: 'center' }}>
          Your subscription is active.
        </Text>
        <Pressable
          onPress={() => {
            const url = Platform.OS === 'ios'
              ? 'https://apps.apple.com/account/subscriptions'
              : 'https://play.google.com/store/account/subscriptions';
            Linking.openURL(url);
          }}
          style={{
            marginTop: 24,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 14,
            backgroundColor: isGlass(t) ? 'rgba(139,92,246,0.15)' : isEditorial(t) ? t.ink : t.surface,
          }}
        >
          <Text style={{ color: isEditorial(t) ? t.bg : accent, fontSize: 14, fontWeight: '600', fontFamily: t.fontBody }}>
            Manage Subscription
          </Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: muted, fontSize: 14, fontFamily: t.fontBody }}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const plans: Array<{ key: PlanKey; name: string; badge?: string }> = [
    { key: 'creator', name: 'Creator', badge: 'Most Popular' },
    { key: 'pro', name: 'Pro' },
    { key: 'agency', name: 'Agency' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: isGlass(t) ? 'transparent' : t.bg }}>
      {/* Close button */}
      <Pressable
        onPress={() => router.back()}
        style={{
          position: 'absolute',
          top: insets.top + 12,
          right: 16,
          zIndex: 10,
          width: 36,
          height: 36,
          borderRadius: 18,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.08)' : isEditorial(t) ? t.surfaceAlt : t.surface,
        }}
      >
        <IconX size={18} color={muted} />
      </Pressable>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <IconCrown size={40} color={accent} />
          <Text style={{
            fontSize: 28,
            fontWeight: '700',
            color: fg,
            fontFamily: t.fontDisplay,
            marginTop: 12,
            textAlign: 'center',
          }}>
            Unlock Your Full Potential
          </Text>
          <Text style={{
            fontSize: 14,
            color: muted,
            fontFamily: t.fontBody,
            marginTop: 8,
            textAlign: 'center',
            lineHeight: 20,
          }}>
            Connect more accounts, unlimited AI content, and advanced analytics.
          </Text>
        </View>

        {/* Interval toggle */}
        <View style={{
          flexDirection: 'row',
          alignSelf: 'center',
          borderRadius: isNeumorphic(t) ? 16 : isEditorial(t) ? 2 : 14,
          overflow: 'hidden',
          marginBottom: 20,
          backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.04)' : isEditorial(t) ? t.surfaceAlt : t.surface,
          ...(isNeumorphic(t) ? t.shadowOutSm.inner : {}),
          ...(isEditorial(t) ? { borderWidth: 1.5, borderColor: t.ink } : {}),
        }}>
          {(['monthly', 'yearly'] as const).map((int) => (
            <Pressable
              key={int}
              onPress={() => setInterval(int)}
              style={{
                paddingHorizontal: 24,
                paddingVertical: 10,
                backgroundColor: interval === int
                  ? (isEditorial(t) ? t.ink : isGlass(t) ? t.violet : t.accent)
                  : 'transparent',
              }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: interval === int ? '700' : '500',
                fontFamily: t.fontBody,
                color: interval === int
                  ? (isEditorial(t) ? t.bg : '#fff')
                  : muted,
              }}>
                {int === 'monthly' ? 'Monthly' : 'Yearly (Save 20%)'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Plan selector pills */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20, justifyContent: 'center' }}>
          {plans.map((plan) => (
            <Pressable
              key={plan.key}
              onPress={() => setSelectedPlan(plan.key)}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: isNeumorphic(t) ? 16 : isEditorial(t) ? 2 : 12,
                ...(selectedPlan === plan.key
                  ? isEditorial(t)
                    ? { backgroundColor: t.ink, borderWidth: 1.5, borderColor: t.ink }
                    : isNeumorphic(t)
                    ? { backgroundColor: t.surface, ...t.shadowOutSm.inner }
                    : { backgroundColor: t.violet }
                  : isEditorial(t)
                  ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: t.ink }
                  : isNeumorphic(t)
                  ? { backgroundColor: t.surface, ...t.shadowOutSm.outer }
                  : { backgroundColor: 'rgba(255,255,255,0.04)' }),
              }}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: selectedPlan === plan.key ? '700' : '500',
                fontFamily: t.fontBody,
                color: selectedPlan === plan.key
                  ? (isEditorial(t) ? t.bg : '#fff')
                  : muted,
              }}>
                {plan.name}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Price display with required subscription info */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: accent, fontFamily: t.fontBody, marginBottom: 6, letterSpacing: 0.5 }}>
            {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Plan
          </Text>
          {rcLoading ? (
            <ActivityIndicator size="small" color={accent} />
          ) : selectedPackage ? (
            <>
              <Text style={{
                fontSize: 42,
                fontWeight: '800',
                color: fg,
                fontFamily: t.fontDisplay,
              }}>
                {selectedPackage.product.priceString}
              </Text>
              <Text style={{ fontSize: 14, color: muted, fontFamily: t.fontBody, marginTop: 4 }}>
                per {interval === 'monthly' ? 'month' : 'year'} — auto-renewable
              </Text>
            </>
          ) : (
            <Text style={{ fontSize: 14, color: muted, fontFamily: t.fontBody }}>
              Price unavailable
            </Text>
          )}
        </View>

        {/* Features list */}
        <ThemedCard padding={20} style={{ marginBottom: 20 }}>
          <Text style={{
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: muted,
            fontFamily: t.fontBody,
            marginBottom: 14,
          }}>
            What you get
          </Text>
          {(PLAN_FEATURES[selectedPlan] ?? []).map((feature, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <View style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: isGlass(t) ? 'rgba(34,197,94,0.15)' : isEditorial(t) ? t.lime : 'rgba(34,197,94,0.15)',
              }}>
                <IconCheck size={12} color={isGlass(t) ? '#22c55e' : isEditorial(t) ? t.ink : '#22c55e'} strokeWidth={3} />
              </View>
              <Text style={{ fontSize: 14, color: fg, fontFamily: t.fontBody, flex: 1 }}>
                {feature}
              </Text>
            </View>
          ))}
        </ThemedCard>

        {/* Subscribe button */}
        <Pressable
          onPress={handlePurchase}
          disabled={purchasing || !selectedPackage}
          style={{
            height: 54,
            borderRadius: isNeumorphic(t) ? 18 : isEditorial(t) ? 2 : 16,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 12,
            opacity: purchasing || !selectedPackage ? 0.5 : 1,
            ...(isEditorial(t)
              ? { backgroundColor: t.ink }
              : isNeumorphic(t)
              ? { backgroundColor: t.surface, ...t.shadowOutSm.outer }
              : { backgroundColor: t.violet }),
          }}
        >
          {purchasing ? (
            <ActivityIndicator color={isEditorial(t) ? t.bg : '#fff'} />
          ) : (
            <Text style={{
              fontSize: 16,
              fontWeight: '700',
              fontFamily: t.fontBody,
              color: isEditorial(t) ? t.bg : isNeumorphic(t) ? t.accent : '#fff',
            }}>
              Subscribe to {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}
            </Text>
          )}
        </Pressable>

        {/* Restore purchases */}
        <Pressable onPress={handleRestore} disabled={restoring} style={{ alignItems: 'center', paddingVertical: 12 }}>
          {restoring ? (
            <ActivityIndicator size="small" color={muted} />
          ) : (
            <Text style={{ fontSize: 13, color: accent, fontFamily: t.fontBody, fontWeight: '500' }}>
              Restore Purchases
            </Text>
          )}
        </Pressable>

        {/* Legal */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, marginBottom: 8 }}>
          <IconShield size={12} color={muted} />
          <Text style={{ fontSize: 11, color: muted, fontFamily: t.fontBody }}>
            Secure purchase via {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}
          </Text>
        </View>
        <Text style={{ fontSize: 10, color: muted, fontFamily: t.fontBody, textAlign: 'center', lineHeight: 16, opacity: 0.7 }}>
          Payment charged to your {Platform.OS === 'ios' ? 'Apple ID' : 'Google'} account. Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period. {selectedPackage ? `${selectedPackage.product.priceString}/${interval === 'monthly' ? 'month' : 'year'}.` : ''}
        </Text>

        {/* Terms and Privacy — required by Apple Guideline 3.1.2(c) */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12, marginBottom: 8 }}>
          <Pressable onPress={() => Linking.openURL('https://www.govirall.com/terms')}>
            <Text style={{ fontSize: 11, color: accent, fontFamily: t.fontBody, textDecorationLine: 'underline' }}>
              Terms of Use
            </Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL('https://www.govirall.com/privacy')}>
            <Text style={{ fontSize: 11, color: accent, fontFamily: t.fontBody, textDecorationLine: 'underline' }}>
              Privacy Policy
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
