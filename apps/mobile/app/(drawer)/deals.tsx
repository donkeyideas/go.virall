import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTokens } from '@/lib/theme';
import { ThemedCard } from '@/components/ui/ThemedCard';

export default function DealsScreen() {
  const t = useTokens();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ color: t.fg, fontSize: 24, fontFamily: t.fontDisplay, fontWeight: '700', marginBottom: 20 }}>
          Deals
        </Text>
        <ThemedCard padding={20}>
          <Text style={{ color: t.muted, fontSize: 14, fontFamily: t.fontBody }}>
            Deal pipeline, brand proposals, and contract management coming soon.
          </Text>
        </ThemedCard>
      </ScrollView>
    </SafeAreaView>
  );
}
