import { View, Text, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { IconCrown } from '@/components/icons/Icons';

interface PaywallGateProps {
  visible: boolean;
  onClose: () => void;
  currentLimit?: number;
}

export function PaywallGate({ visible, onClose, currentLimit = 1 }: PaywallGateProps) {
  const t = useTokens();
  const router = useRouter();
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;
  const accent = isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
        onPress={onClose}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: '100%',
            maxWidth: 360,
            padding: 28,
            borderRadius: isEditorial(t) ? 2 : 20,
            backgroundColor: isGlass(t) ? t.bgMid : isEditorial(t) ? t.bg : t.surface,
            borderWidth: isEditorial(t) ? 1.5 : isGlass(t) ? 1 : 0,
            borderColor: isGlass(t) ? t.line : isEditorial(t) ? t.border.color : 'transparent',
            alignItems: 'center',
          }}
        >
          <View style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: isGlass(t) ? 'rgba(139,92,246,0.15)' : isEditorial(t) ? t.surfaceAlt : t.surfaceLighter,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <IconCrown size={28} color={accent} />
          </View>

          <Text style={{
            fontFamily: t.fontDisplay,
            fontSize: 24,
            color: fg,
            textAlign: 'center',
            letterSpacing: -0.5,
            marginBottom: 4,
          }}>
            {'Upgrade to '}
            <Text style={{ fontFamily: t.fontDisplayItalic, color: accent }}>unlock more</Text>
          </Text>

          <Text style={{
            fontFamily: t.fontBody,
            fontSize: 14,
            color: muted,
            textAlign: 'center',
            lineHeight: 20,
            marginBottom: 24,
            marginTop: 8,
          }}>
            Your free plan allows {currentLimit} connected account{currentLimit === 1 ? '' : 's'}. Upgrade to connect more accounts and unlock unlimited AI content.
          </Text>

          <View style={{ width: '100%', gap: 10 }}>
            <Pressable
              onPress={() => {
                onClose();
                router.push('/paywall');
              }}
              style={{
                height: 48,
                borderRadius: isNeumorphic(t) ? 16 : isEditorial(t) ? 2 : 14,
                justifyContent: 'center',
                alignItems: 'center',
                ...(isEditorial(t)
                  ? { backgroundColor: t.ink }
                  : isNeumorphic(t)
                  ? { backgroundColor: t.surface, ...t.shadowOutSm.outer }
                  : { backgroundColor: t.violet }),
              }}
            >
              <Text style={{
                fontSize: 15,
                fontWeight: '700',
                fontFamily: t.fontBody,
                color: isEditorial(t) ? t.bg : isNeumorphic(t) ? t.accent : '#fff',
              }}>
                Upgrade Now
              </Text>
            </Pressable>
            <Pressable onPress={onClose} style={{ height: 40, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: muted, fontFamily: t.fontBody }}>Dismiss</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
