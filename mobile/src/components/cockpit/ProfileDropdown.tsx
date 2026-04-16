import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme-context';
import { cockpit } from '../../lib/cockpit-theme';

export interface ProfileOption {
  id: string;
  platform: string; // instagram | tiktok | youtube | twitter | ...
  handle?: string | null;
  username?: string | null; // legacy alias
  display_name?: string | null;
}

function platformName(p: string): string {
  const key = p.toLowerCase();
  if (key === 'instagram') return 'Instagram';
  if (key === 'tiktok') return 'TikTok';
  if (key === 'youtube') return 'YouTube';
  if (key === 'twitter') return 'Twitter';
  if (key === 'x') return 'X';
  if (key === 'linkedin') return 'LinkedIn';
  if (key === 'facebook') return 'Facebook';
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function handleFor(p: ProfileOption): string {
  const raw = (p.handle ?? p.username ?? '').trim();
  if (raw) return `@${raw.replace(/^@/, '')}`;
  if (p.display_name && p.display_name.trim()) return p.display_name.trim();
  return platformName(p.platform);
}

interface Props {
  profiles: ProfileOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

function platformLabel(p: string): string {
  const key = p.toLowerCase();
  if (key === 'instagram') return 'IG';
  if (key === 'tiktok') return 'TT';
  if (key === 'youtube') return 'YT';
  if (key === 'twitter' || key === 'x') return 'X';
  if (key === 'linkedin') return 'IN';
  if (key === 'facebook') return 'FB';
  return key.slice(0, 2).toUpperCase();
}

function platformBg(p: string): string {
  const key = p.toLowerCase();
  if (key === 'instagram') return '#ec4899';
  if (key === 'tiktok') return '#06b6d4';
  if (key === 'youtube') return '#ef4444';
  if (key === 'twitter' || key === 'x') return '#1d9bf0';
  if (key === 'linkedin') return '#0a66c2';
  if (key === 'facebook') return '#1877f2';
  return '#64748b';
}

export function ProfileDropdown({ profiles, selectedId, onSelect }: Props) {
  const { mode } = useTheme();
  const c = cockpit(mode);
  const [open, setOpen] = useState(false);

  const selected = selectedId
    ? profiles.find((p) => p.id === selectedId) ?? null
    : null;

  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.btn,
          {
            backgroundColor: open ? c.goldDim : c.bgCard,
            borderColor: open ? c.gold : c.border,
          },
        ]}
      >
        <View
          style={[
            styles.iconSm,
            {
              backgroundColor: selected ? platformBg(selected.platform) : c.goldDim,
            },
          ]}
        >
          {selected ? (
            <Text style={styles.iconSmText}>{platformLabel(selected.platform)}</Text>
          ) : (
            <Ionicons name="menu" size={10} color={c.gold} />
          )}
        </View>
        <Text style={[styles.label, { color: c.gold }]} numberOfLines={1}>
          {selected ? handleFor(selected) : 'All Profiles'}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={12}
          color={c.gold}
        />
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.menu,
                  {
                    backgroundColor: c.bgCard,
                    borderColor: c.borderActive,
                    shadowColor: c.shadow,
                  },
                ]}
              >
                <Pressable
                  onPress={() => {
                    onSelect(null);
                    setOpen(false);
                  }}
                  style={[
                    styles.item,
                    selectedId === null && { backgroundColor: c.goldDim },
                  ]}
                >
                  <View style={[styles.iconMd, { backgroundColor: c.goldDim }]}>
                    <Ionicons name="menu" size={12} color={c.gold} />
                  </View>
                  <Text
                    style={[
                      styles.itemText,
                      {
                        color: selectedId === null ? c.gold : c.textSecondary,
                        fontWeight: selectedId === null ? '700' : '500',
                      },
                    ]}
                  >
                    All Profiles
                  </Text>
                </Pressable>
                {profiles.map((p) => {
                  const active = selectedId === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => {
                        onSelect(p.id);
                        setOpen(false);
                      }}
                      style={[styles.item, active && { backgroundColor: c.goldDim }]}
                    >
                      <View
                        style={[
                          styles.iconMd,
                          { backgroundColor: platformBg(p.platform) },
                        ]}
                      >
                        <Text style={styles.iconMdText}>{platformLabel(p.platform)}</Text>
                      </View>
                      <Text
                        style={[
                          styles.itemText,
                          {
                            color: active ? c.gold : c.textSecondary,
                            fontWeight: active ? '700' : '500',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {handleFor(p)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: 170,
  },
  iconSm: {
    width: 18,
    height: 18,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSmText: { color: '#fff', fontSize: 8, fontWeight: '800' },
  label: { fontSize: 11, fontWeight: '600', flexShrink: 1 },
  overlay: {
    flex: 1,
    paddingTop: 100,
    paddingRight: 18,
    alignItems: 'flex-end',
  },
  menu: {
    width: 200,
    borderWidth: 1,
    borderRadius: 14,
    padding: 5,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 36,
    elevation: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  iconMd: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMdText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  itemText: { fontSize: 12, flex: 1 },
});
