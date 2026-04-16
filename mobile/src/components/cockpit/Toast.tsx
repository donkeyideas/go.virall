import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme-context';
import { cockpit } from '../../lib/cockpit-theme';

type ToastKind = 'success' | 'info' | 'error';

interface ToastState {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { mode } = useTheme();
  const c = cockpit(mode);
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setToast({ id: Date.now(), message, kind });
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 18,
          stiffness: 220,
          useNativeDriver: true,
        }),
      ]).start();
      timeoutRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 12,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => setToast(null));
      }, 2200);
    },
    [opacity, translateY],
  );

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const palette = (kind: ToastKind) => {
    if (kind === 'error')
      return {
        bg: c.bgCard,
        border: c.red,
        icon: 'alert-circle' as const,
        iconColor: c.red,
        text: c.textPrimary,
      };
    if (kind === 'info')
      return {
        bg: c.bgCard,
        border: c.tealBorder,
        icon: 'information-circle' as const,
        iconColor: c.teal,
        text: c.textPrimary,
      };
    return {
      bg: c.bgCard,
      border: c.goldBorder,
      icon: 'checkmark-circle' as const,
      iconColor: c.gold,
      text: c.textPrimary,
    };
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <View pointerEvents="none" style={styles.wrap}>
          <Animated.View
            style={[
              styles.pill,
              {
                backgroundColor: palette(toast.kind).bg,
                borderColor: palette(toast.kind).border,
                shadowColor: c.shadow,
                opacity,
                transform: [{ translateY }],
              },
            ]}
          >
            <Ionicons
              name={palette(toast.kind).icon}
              size={16}
              color={palette(toast.kind).iconColor}
            />
            <Text
              style={[styles.text, { color: palette(toast.kind).text }]}
              numberOfLines={2}
            >
              {toast.message}
            </Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: width - 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  text: { fontSize: 12.5, fontWeight: '600', flexShrink: 1 },
});
