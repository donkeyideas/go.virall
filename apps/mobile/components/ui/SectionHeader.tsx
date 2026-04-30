import React from 'react';
import { View, Text } from 'react-native';
import { useTokens, isGlass, isEditorial } from '@/lib/theme';

interface SectionHeaderProps {
  number: string;
  title: string;
  emphasisWord?: string;
  meta?: string;
}

export function SectionHeader({ number, title, emphasisWord, meta }: SectionHeaderProps) {
  const t = useTokens();

  if (isGlass(t)) {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 10, marginTop: 12 }}>
        <Text style={{ fontFamily: t.fontDisplay, fontSize: 22, color: t.fg, letterSpacing: -0.3 }}>
          {emphasisWord && title.includes(emphasisWord) ? (
            <>
              {title.split(emphasisWord)[0]}
              <Text style={{ fontFamily: t.fontDisplayItalic, color: t.violetSoft }}>{emphasisWord}</Text>
              {title.split(emphasisWord)[1]}
            </>
          ) : title}
        </Text>
        {meta && <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: t.faint }}>{meta}</Text>}
      </View>
    );
  }

  if (isEditorial(t)) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, marginTop: 12, gap: 10 }}>
        <View style={{ backgroundColor: t.ink, paddingVertical: 2, paddingHorizontal: 6 }}>
          <Text style={{ fontFamily: t.fontMono, fontSize: 10, letterSpacing: 1, color: t.bg }}>{number}</Text>
        </View>
        <Text style={{ fontFamily: t.fontDisplay, fontSize: 22, letterSpacing: -0.3, color: t.ink }}>
          {emphasisWord && title.includes(emphasisWord) ? (
            <>
              {title.split(emphasisWord)[0]}
              <Text style={{ fontStyle: 'italic' }}>{emphasisWord}</Text>
              {title.split(emphasisWord)[1]}
            </>
          ) : title}
        </Text>
        {meta && <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: t.muted, marginLeft: 'auto' }}>{meta}</Text>}
      </View>
    );
  }

  // Neumorphic
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 10, marginTop: 12 }}>
      <Text style={{ fontFamily: t.fontDisplay, fontSize: 22, color: t.ink, letterSpacing: -0.4 }}>
        {emphasisWord && title.includes(emphasisWord) ? (
          <>
            {title.split(emphasisWord)[0]}
            <Text style={{ fontFamily: t.fontDisplayItalic, color: t.accent }}>{emphasisWord}</Text>
            {title.split(emphasisWord)[1]}
          </>
        ) : title}
      </Text>
      {meta && <Text style={{ fontFamily: t.fontBodyExtraBold, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: t.faint }}>{meta}</Text>}
    </View>
  );
}
