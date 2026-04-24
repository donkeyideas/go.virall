import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTokens, isGlass, isEditorial } from '@/lib/theme';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { IconLightbulb, IconEdit, IconFilm, IconUser, IconChevronRight } from '@/components/icons/Icons';

const TOOLS = [
  {
    route: '/(drawer)/ideas',
    title: 'Post Ideas',
    description: 'Brainstorm dozens of content ideas with hooks and angles',
    Icon: IconLightbulb,
  },
  {
    route: '/(drawer)/captions',
    title: 'Captions',
    description: 'Craft polished captions with CTAs',
    Icon: IconEdit,
  },
  {
    route: '/(drawer)/scripts',
    title: 'Scripts',
    description: 'Structured video scripts with hooks and timing cues',
    Icon: IconFilm,
  },
  {
    route: '/(drawer)/bio',
    title: 'Bio',
    description: 'Optimized profile bios with keywords',
    Icon: IconUser,
  },
];

export default function StudioScreen() {
  const t = useTokens();
  const insets = useSafeAreaInsets();

  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;
  const iconCircleBg = isGlass(t)
    ? 'rgba(139,92,246,0.18)'
    : isEditorial(t)
      ? t.lime
      : 'rgba(90,120,208,0.15)';
  const iconColor = isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 10, paddingBottom: 40 }}>
        {/* Page title */}
        <View style={{ paddingLeft: 56, paddingTop: 14, paddingBottom: 16 }}>
          <Text
            style={{
              color: fg,
              fontSize: isGlass(t) ? 34 : isEditorial(t) ? 36 : 32,
              fontFamily: isGlass(t) ? t.fontDisplay : isEditorial(t) ? t.fontDisplayItalic : t.fontDisplay,
              lineHeight: isGlass(t) ? 38 : isEditorial(t) ? 40 : 36,
              letterSpacing: -0.5,
            }}
          >
            {'Content '}
            <Text style={{
              fontFamily: t.fontDisplayItalic,
              color: isGlass(t) ? t.violetSoft : isEditorial(t) ? t.ink : t.accent,
            }}>
              Studio
            </Text>
          </Text>
          <Text
            style={{
              color: muted,
              fontSize: isGlass(t) ? 10 : isEditorial(t) ? 10 : 11,
              fontFamily: isGlass(t) ? t.fontMono : isEditorial(t) ? t.fontMono : t.fontBodyBold,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginTop: 8,
            }}
          >
            AI-powered tools
          </Text>
        </View>

        {/* Tool cards */}
        <View style={{ gap: 14 }}>
          {TOOLS.map((tool) => (
            <Pressable key={tool.route} onPress={() => router.push(tool.route as any)}>
              <ThemedCard padding={16}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  {/* Icon circle */}
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: iconCircleBg,
                      justifyContent: 'center',
                      alignItems: 'center',
                      ...(isEditorial(t)
                        ? { borderWidth: t.border.width, borderColor: t.border.color }
                        : {}),
                    }}
                  >
                    <tool.Icon size={20} color={iconColor} />
                  </View>

                  {/* Text content */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: fg,
                        fontSize: 18,
                        fontFamily: t.fontDisplay,
                        fontWeight: '600',
                      }}
                    >
                      {tool.title}
                    </Text>
                    <Text
                      style={{
                        color: muted,
                        fontSize: 13,
                        fontFamily: t.fontBody,
                        marginTop: 2,
                      }}
                    >
                      {tool.description}
                    </Text>
                  </View>

                  {/* Chevron */}
                  <IconChevronRight size={18} color={muted} />
                </View>
              </ThemedCard>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
