import { View, Text, Modal, Pressable } from 'react-native';
import { useTokens, isGlass, isEditorial } from '@/lib/theme';
import { IconRocket } from '@/components/icons/Icons';
import { Button } from '@/components/ui/Button';

interface PaywallGateProps {
  visible: boolean;
  onClose: () => void;
}

export function PaywallGate({ visible, onClose }: PaywallGateProps) {
  const t = useTokens();
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
            <IconRocket size={28} color={accent} />
          </View>

          <Text style={{
            fontFamily: t.fontDisplay,
            fontSize: 24,
            color: fg,
            textAlign: 'center',
            letterSpacing: -0.5,
            marginBottom: 4,
          }}>
            {'Platform '}
            <Text style={{ fontFamily: t.fontDisplayItalic, color: accent }}>limit reached</Text>
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
            You can connect up to 3 platforms on the free plan. Disconnect an existing platform to connect a different one.
          </Text>

          <View style={{ width: '100%', gap: 10 }}>
            <Button label="Got it" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
