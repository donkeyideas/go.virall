import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { FontSize, Spacing, BorderRadius } from '../../constants/theme';

type StatusType =
  | 'pending' | 'active' | 'completed' | 'cancelled' | 'declined'
  | 'negotiating' | 'accepted' | 'draft' | 'scheduled' | 'published'
  | 'inquiry' | 'negotiation' | 'processing' | 'failed' | 'expired';

const STATUS_COLORS: Record<StatusType, { bg: string; text: string }> = {
  pending:      { bg: '#FEF3C7', text: '#92400E' },
  active:       { bg: '#D1FAE5', text: '#065F46' },
  completed:    { bg: '#DBEAFE', text: '#1E40AF' },
  cancelled:    { bg: '#F3F4F6', text: '#6B7280' },
  declined:     { bg: '#FEE2E2', text: '#991B1B' },
  negotiating:  { bg: '#FEF3C7', text: '#92400E' },
  accepted:     { bg: '#D1FAE5', text: '#065F46' },
  draft:        { bg: '#F3F4F6', text: '#6B7280' },
  scheduled:    { bg: '#E0E7FF', text: '#3730A3' },
  published:    { bg: '#D1FAE5', text: '#065F46' },
  inquiry:      { bg: '#E3EDF6', text: '#2C7BE5' },
  negotiation:  { bg: '#FEF3C7', text: '#92400E' },
  processing:   { bg: '#FEF3C7', text: '#92400E' },
  failed:       { bg: '#FEE2E2', text: '#991B1B' },
  expired:      { bg: '#F3F4F6', text: '#6B7280' },
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const { colors } = useTheme();
  const normalized = status.toLowerCase().replace(/\s+/g, '_') as StatusType;
  const colorScheme = STATUS_COLORS[normalized] ?? { bg: colors.surfaceLight, text: colors.textSecondary };

  return (
    <View style={[styles.badge, size === 'md' && styles.badgeMd, { backgroundColor: colorScheme.bg }]}>
      <Text style={[styles.text, size === 'md' && styles.textMd, { color: colorScheme.text }]}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  textMd: {
    fontSize: FontSize.sm,
  },
});
