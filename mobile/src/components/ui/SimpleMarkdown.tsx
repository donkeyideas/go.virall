import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  content: string;
  baseStyle?: any;
  color?: string;
  mutedColor?: string;
  accentColor?: string;
}

/**
 * Lightweight markdown renderer for React Native.
 * Handles: **bold**, ## headings, --- dividers, - bullets, numbered lists.
 */
export const SimpleMarkdown = React.memo(function SimpleMarkdown({ content, baseStyle, color = '#fff', mutedColor = '#888', accentColor = '#FFB84D' }: Props) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line → small spacer
    if (!trimmed) {
      elements.push(<View key={`sp-${i}`} style={styles.spacer} />);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed)) {
      elements.push(
        <View key={`hr-${i}`} style={[styles.hr, { backgroundColor: mutedColor + '40' }]} />
      );
      i++;
      continue;
    }

    // Heading (## or ###)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const fontSize = level === 1 ? 18 : level === 2 ? 16 : level === 3 ? 15 : 14;
      elements.push(
        <Text key={`h-${i}`} style={[styles.heading, { fontSize, color }]}>
          {renderInline(text, color, accentColor)}
        </Text>
      );
      i++;
      continue;
    }

    // Bullet list
    if (/^[-*]\s/.test(trimmed)) {
      const bulletLines: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        bulletLines.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <View key={`ul-${i}`} style={styles.list}>
          {bulletLines.map((bl, j) => (
            <View key={j} style={styles.listItem}>
              <Text style={[styles.bullet, { color: accentColor }]}>•</Text>
              <Text style={[styles.listText, baseStyle, { color }]}>
                {renderInline(bl, color, accentColor)}
              </Text>
            </View>
          ))}
        </View>
      );
      continue;
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)[.)]\s/);
    if (numMatch) {
      const numLines: { num: string; text: string }[] = [];
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i].trim())) {
        const m = lines[i].trim().match(/^(\d+)[.)]\s+(.*)/);
        if (m) numLines.push({ num: m[1], text: m[2] });
        i++;
      }
      elements.push(
        <View key={`ol-${i}`} style={styles.list}>
          {numLines.map((nl, j) => (
            <View key={j} style={styles.listItem}>
              <Text style={[styles.numBullet, { color: accentColor }]}>{nl.num}.</Text>
              <Text style={[styles.listText, baseStyle, { color }]}>
                {renderInline(nl.text, color, accentColor)}
              </Text>
            </View>
          ))}
        </View>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <Text key={`p-${i}`} style={[styles.paragraph, baseStyle, { color }]}>
        {renderInline(trimmed, color, accentColor)}
      </Text>
    );
    i++;
  }

  return <View>{elements}</View>;
});

/** Parse inline markdown: **bold**, *italic*, `code` */
function renderInline(text: string, color: string, accentColor: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Pattern: **bold**, *italic*, `code`
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // **bold**
      parts.push(
        <Text key={`b-${key++}`} style={{ fontWeight: '700' }}>{match[2]}</Text>
      );
    } else if (match[3]) {
      // *italic*
      parts.push(
        <Text key={`i-${key++}`} style={{ fontStyle: 'italic' }}>{match[3]}</Text>
      );
    } else if (match[4]) {
      // `code`
      parts.push(
        <Text key={`c-${key++}`} style={{ fontFamily: 'monospace', backgroundColor: accentColor + '20' }}>{match[4]}</Text>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

const styles = StyleSheet.create({
  spacer: { height: 6 },
  hr: { height: 1, marginVertical: 8 },
  heading: { fontWeight: '700', marginTop: 8, marginBottom: 4, lineHeight: 22 },
  paragraph: { fontSize: 15, lineHeight: 22, marginBottom: 2 },
  list: { marginBottom: 4 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4, paddingLeft: 4 },
  bullet: { fontSize: 14, fontWeight: '700', marginRight: 8, marginTop: 1 },
  numBullet: { fontSize: 14, fontWeight: '700', marginRight: 8, marginTop: 1, minWidth: 18 },
  listText: { flex: 1, fontSize: 15, lineHeight: 22 },
});
