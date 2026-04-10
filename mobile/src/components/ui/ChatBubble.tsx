import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { FontSize, Spacing, BorderRadius } from '../../constants/theme';

interface ChatBubbleProps {
  content: string;
  isMine: boolean;
  timestamp: string;
  messageType?: string;
}

export function ChatBubble({ content, isMine, timestamp, messageType }: ChatBubbleProps) {
  const { colors } = useTheme();
  const isSystem = messageType === 'system' || messageType === 'proposal';

  if (isSystem) {
    return (
      <View style={styles.systemRow}>
        <Text style={[styles.systemText, { color: colors.textMuted }]}>{content}</Text>
      </View>
    );
  }

  const time = new Date(timestamp);
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.row, isMine && styles.rowMine]}>
      <View
        style={[
          styles.bubble,
          isMine
            ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
            : { backgroundColor: colors.surfaceLight, borderBottomLeftRadius: 4 },
        ]}
      >
        <Text style={[styles.content, { color: isMine ? '#FFFFFF' : colors.text }]}>
          {content}
        </Text>
        <Text style={[styles.time, { color: isMine ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
          {timeStr}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  content: {
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  time: {
    fontSize: FontSize.xs,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  systemRow: {
    alignItems: 'center',
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  systemText: {
    fontSize: FontSize.sm,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
