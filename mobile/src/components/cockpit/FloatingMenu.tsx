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
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { cockpit } from '../../lib/cockpit-theme';

interface MenuItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  badge?: number;
  group?: 'primary' | 'secondary';
}

const ITEMS: MenuItem[] = [
  { key: 'overview', label: 'Overview', icon: 'home-outline', route: '/(tabs)' },
  { key: 'alerts', label: 'Alerts', icon: 'notifications-outline', route: '/(tabs)/alerts' },
  { key: 'messages', label: 'Messages', icon: 'chatbubbles-outline', route: '/(tabs)/messages' },
  { key: 'ideas', label: 'Quick Ideas', icon: 'bulb-outline', route: '/(tabs)/ideas', group: 'secondary' },
  { key: 'profile', label: 'Profile', icon: 'person-outline', route: '/(tabs)/profile', group: 'secondary' },
];

interface Props {
  activeKey?: string;
}

export function FloatingMenu({ activeKey }: Props) {
  const router = useRouter();
  const { mode } = useTheme();
  const c = cockpit(mode);
  const [open, setOpen] = useState(false);

  const go = (item: MenuItem) => {
    setOpen(false);
    router.push(item.route as any);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.toggle,
          {
            backgroundColor: open ? c.bgElevated : c.bgCard,
            borderColor: open ? c.borderActive : c.border,
            shadowColor: c.shadow,
          },
        ]}
      >
        <Ionicons name="menu" size={18} color={open ? c.gold : c.textSecondary} />
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.dropdown,
                  {
                    backgroundColor: c.bgCard,
                    borderColor: c.borderActive,
                    shadowColor: c.shadow,
                  },
                ]}
              >
                {ITEMS.map((item, i) => {
                  const isSecondary = item.group === 'secondary';
                  const prevSecondary = ITEMS[i - 1]?.group === 'secondary';
                  const showDivider = isSecondary && !prevSecondary;
                  const active = activeKey === item.key;
                  return (
                    <React.Fragment key={item.key}>
                      {showDivider && (
                        <View style={[styles.divider, { backgroundColor: c.border }]} />
                      )}
                      <Pressable
                        onPress={() => go(item)}
                        style={[
                          styles.item,
                          active && { backgroundColor: c.goldDim },
                        ]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={18}
                          color={active ? c.gold : c.textSecondary}
                        />
                        <Text
                          style={[
                            styles.itemText,
                            { color: active ? c.gold : c.textSecondary },
                          ]}
                        >
                          {item.label}
                        </Text>
                        {item.badge ? (
                          <View style={[styles.badge, { backgroundColor: c.red }]}>
                            <Text style={styles.badgeText}>{item.badge}</Text>
                          </View>
                        ) : null}
                      </Pressable>
                    </React.Fragment>
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
  wrap: {
    position: 'absolute',
    top: 58,
    left: 16,
    zIndex: 80,
  },
  toggle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 4,
  },
  overlay: {
    flex: 1,
    paddingTop: 106,
    paddingLeft: 16,
  },
  dropdown: {
    width: 200,
    borderWidth: 1,
    borderRadius: 16,
    padding: 6,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 48,
    elevation: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  itemText: { fontSize: 13, fontWeight: '500', flex: 1 },
  divider: { height: 1, marginVertical: 3, marginHorizontal: 8 },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
