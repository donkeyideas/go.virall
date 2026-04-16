import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme-context';
import { cockpit } from '../../lib/cockpit-theme';

type ModalKind = 'info' | 'warning' | 'danger' | 'success';

interface ModalButton {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface ModalState {
  title: string;
  message?: string;
  kind?: ModalKind;
  buttons?: ModalButton[];
}

interface AppModalContextValue {
  showModal: (opts: ModalState) => void;
  hideModal: () => void;
}

const AppModalContext = createContext<AppModalContextValue>({
  showModal: () => {},
  hideModal: () => {},
});

export function useAppModal() {
  return useContext(AppModalContext);
}

export function AppModalProvider({ children }: { children: React.ReactNode }) {
  const { mode } = useTheme();
  const c = cockpit(mode);
  const [state, setState] = useState<ModalState | null>(null);

  const hideModal = useCallback(() => setState(null), []);
  const showModal = useCallback((opts: ModalState) => setState(opts), []);

  const iconFor = (k?: ModalKind): keyof typeof Ionicons.glyphMap => {
    if (k === 'danger') return 'warning';
    if (k === 'warning') return 'alert-circle';
    if (k === 'success') return 'checkmark-circle';
    return 'information-circle';
  };
  const iconColorFor = (k?: ModalKind) => {
    if (k === 'danger') return c.red;
    if (k === 'warning') return c.gold;
    if (k === 'success') return c.green;
    return c.teal;
  };
  const iconBgFor = (k?: ModalKind) => {
    if (k === 'danger') return c.redDim;
    if (k === 'warning') return c.goldDim;
    if (k === 'success') return c.greenDim;
    return c.tealDim;
  };

  const buttons: ModalButton[] = state?.buttons?.length
    ? state.buttons
    : [{ label: 'OK', variant: 'primary' }];

  return (
    <AppModalContext.Provider value={{ showModal, hideModal }}>
      {children}
      <Modal
        transparent
        visible={!!state}
        animationType="fade"
        onRequestClose={hideModal}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
          onPress={hideModal}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.card,
              {
                backgroundColor: c.bgCard,
                borderColor: c.borderActive,
                shadowColor: c.shadow,
              },
            ]}
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: iconBgFor(state?.kind) },
              ]}
            >
              <Ionicons
                name={iconFor(state?.kind)}
                size={22}
                color={iconColorFor(state?.kind)}
              />
            </View>
            <Text style={[styles.title, { color: c.textPrimary }]}>
              {state?.title}
            </Text>
            {state?.message ? (
              <Text style={[styles.message, { color: c.textSecondary }]}>
                {state.message}
              </Text>
            ) : null}
            <View style={styles.row}>
              {buttons.map((b, i) => {
                const isPrimary = b.variant === 'primary' || (!b.variant && buttons.length === 1);
                const isDanger = b.variant === 'danger';
                const bg = isDanger
                  ? c.red
                  : isPrimary
                    ? c.gold
                    : c.bgElevated;
                const fg = isDanger || isPrimary ? c.goldContrast : c.textPrimary;
                return (
                  <Pressable
                    key={i}
                    onPress={() => {
                      b.onPress?.();
                      hideModal();
                    }}
                    style={({ pressed }) => [
                      styles.btn,
                      {
                        backgroundColor: bg,
                        borderColor: isPrimary || isDanger ? 'transparent' : c.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.btnText, { color: fg }]}>{b.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AppModalContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 36,
    elevation: 16,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
    marginTop: 6,
  },
  btn: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnText: { fontSize: 13, fontWeight: '700' },
});
