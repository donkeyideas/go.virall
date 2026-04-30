import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import {
  IconInstagram, IconTikTok, IconYouTube, IconLinkedIn,
  IconTwitter, IconFacebook, IconTwitch, IconGlobe,
  IconChevronDown,
} from '@/components/icons/Icons';
import type { ConnectedAccount } from '@/hooks/useConnectedAccounts';

type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

const PLATFORM_ICONS: Record<string, IconComponent> = {
  instagram: IconInstagram,
  tiktok: IconTikTok,
  youtube: IconYouTube,
  linkedin: IconLinkedIn,
  x: IconTwitter,
  facebook: IconFacebook,
  twitch: IconTwitch,
};

function formatCount(n: number | null | undefined): string {
  if (n == null || typeof n !== 'number' || isNaN(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

interface AccountPickerProps {
  accounts: ConnectedAccount[];
  selectedAccountId: string | null;
  onSelect: (accountId: string | null, platform: string | null) => void;
  showAllOption?: boolean;
  loading?: boolean;
  label?: string;
}

export function AccountPicker({
  accounts,
  selectedAccountId,
  onSelect,
  showAllOption = false,
  loading = false,
  label = 'Account',
}: AccountPickerProps) {
  const t = useTokens();
  const [open, setOpen] = useState(false);

  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;
  const accent = isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent;

  const selected = accounts.find((a) => a.id === selectedAccountId) ?? null;
  const PlatformIcon = selected ? (PLATFORM_ICONS[selected.platform] ?? IconGlobe) : IconGlobe;

  const triggerBg = isGlass(t)
    ? 'rgba(255,255,255,0.06)'
    : isEditorial(t) ? t.surface : t.surfaceDarker;
  const triggerBorder = isGlass(t)
    ? { borderWidth: 1, borderColor: t.line }
    : isEditorial(t)
    ? { borderWidth: 1.5, borderColor: t.border.color }
    : {};
  const triggerRadius = isNeumorphic(t) ? 14 : isEditorial(t) ? 0 : 14;

  const dropdownBg = isGlass(t)
    ? t.bgMid
    : isEditorial(t) ? t.surface : t.surfaceLighter;
  const dropdownExtra = isEditorial(t)
    ? { borderWidth: 1.5, borderColor: t.ink }
    : isNeumorphic(t)
    ? (t as any).shadowOutSm?.outer ?? {}
    : {};

  if (loading) {
    return (
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: muted, fontFamily: isEditorial(t) ? t.fontMono : t.fontBody, marginBottom: 6 }}>
          {label}
        </Text>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingHorizontal: 14, paddingVertical: 12,
          backgroundColor: triggerBg, borderRadius: triggerRadius, ...triggerBorder,
        }}>
          <ActivityIndicator size="small" color={accent} />
          <Text style={{ color: muted, fontSize: 13, fontFamily: t.fontBody }}>Loading accounts...</Text>
        </View>
      </View>
    );
  }

  if (accounts.length === 0) {
    return (
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: muted, fontFamily: isEditorial(t) ? t.fontMono : t.fontBody, marginBottom: 6 }}>
          {label}
        </Text>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingHorizontal: 14, paddingVertical: 12,
          backgroundColor: triggerBg, borderRadius: triggerRadius, ...triggerBorder,
        }}>
          <IconGlobe size={18} color={muted} />
          <Text style={{ color: muted, fontSize: 13, fontFamily: t.fontBody }}>No accounts connected</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 12, zIndex: 10 }}>
      <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: muted, fontFamily: isEditorial(t) ? t.fontMono : t.fontBody, marginBottom: 6 }}>
        {label}
      </Text>

      {/* Trigger */}
      <Pressable
        onPress={() => setOpen(!open)}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 14, paddingVertical: 12,
          backgroundColor: triggerBg, borderRadius: triggerRadius, ...triggerBorder,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <PlatformIcon size={20} color={selected ? accent : muted} />
          <Text style={{ color: fg, fontSize: 14, fontFamily: t.fontBody, flex: 1 }} numberOfLines={1}>
            {selected ? `@${selected.username}` : (showAllOption ? 'All accounts' : 'Select account')}
          </Text>
          {selected && (
            <Text style={{ color: muted, fontSize: 12, fontFamily: t.fontBody }}>
              {formatCount(selected.followerCount)}
            </Text>
          )}
        </View>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }], marginLeft: 6 }}>
          <IconChevronDown size={14} color={muted} />
        </View>
      </Pressable>

      {/* Dropdown */}
      {open && (
        <View style={{
          marginTop: 4,
          borderRadius: isEditorial(t) ? 0 : 12,
          backgroundColor: dropdownBg,
          ...dropdownExtra,
          overflow: 'hidden',
        }}>
          {/* All accounts option */}
          {showAllOption && (
            <Pressable
              onPress={() => { onSelect(null, null); setOpen(false); }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                paddingHorizontal: 14, paddingVertical: 11,
                backgroundColor: !selectedAccountId
                  ? (isGlass(t) ? 'rgba(139,92,246,0.15)' : isEditorial(t) ? t.lime : t.surfaceDarker)
                  : 'transparent',
              }}
            >
              <IconGlobe size={18} color={!selectedAccountId ? accent : muted} />
              <Text style={{ color: fg, fontSize: 13, fontFamily: t.fontBody, flex: 1 }}>All accounts</Text>
              <Text style={{ color: muted, fontSize: 11, fontFamily: t.fontBody }}>
                {formatCount(accounts.reduce((s, a) => s + a.followerCount, 0))}
              </Text>
            </Pressable>
          )}

          {/* Account rows */}
          {accounts.map((account) => {
            const Icon = PLATFORM_ICONS[account.platform] ?? IconGlobe;
            const isSelected = account.id === selectedAccountId;
            return (
              <Pressable
                key={account.id}
                onPress={() => { onSelect(account.id, account.platform); setOpen(false); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  paddingHorizontal: 14, paddingVertical: 11,
                  backgroundColor: isSelected
                    ? (isGlass(t) ? 'rgba(139,92,246,0.15)' : isEditorial(t) ? t.lime : t.surfaceDarker)
                    : 'transparent',
                }}
              >
                <Icon size={18} color={isSelected ? accent : muted} />
                <Text style={{ color: fg, fontSize: 13, fontFamily: t.fontBody, flex: 1 }} numberOfLines={1}>
                  @{account.username}
                </Text>
                <Text style={{ color: muted, fontSize: 11, fontFamily: t.fontBody }}>
                  {formatCount(account.followerCount)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
