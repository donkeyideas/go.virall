import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme-context';
import { cockpit } from '../../lib/cockpit-theme';
import { FloatingMenu } from './FloatingMenu';

interface Props {
  title: string;
  activeKey: string;
}

/**
 * Cockpit screen header — renders the floating hamburger on the left and
 * the theme toggle on the right. Matches `app-vision-mockup.html`.
 */
export function ScreenHeader({ title, activeKey }: Props) {
  const { mode, toggleTheme } = useTheme();
  const c = cockpit(mode);

  return (
    <>
      <FloatingMenu activeKey={activeKey} />
      <View style={styles.themeBtnWrap}>
        <Pressable
          onPress={toggleTheme}
          style={[
            styles.themeBtn,
            {
              backgroundColor: c.bgCard,
              borderColor: c.border,
              shadowColor: c.shadow,
            },
          ]}
        >
          <Ionicons
            name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
            size={17}
            color={c.textSecondary}
          />
        </Pressable>
      </View>
      <View style={styles.titleWrap}>
        <Text style={[styles.title, { color: c.textPrimary }]}>{title}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  themeBtnWrap: {
    position: 'absolute',
    top: 58,
    right: 16,
    zIndex: 80,
  },
  themeBtn: {
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
  titleWrap: {
    paddingTop: 66,
    paddingHorizontal: 68,
    paddingBottom: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
