# Theme Tokens — Exact Values

These values are extracted directly from the three reference HTML files. Use them verbatim. Do not round, simplify, or adjust.

---

## Glassmorphic

```ts
// packages/design-tokens/src/themes/glassmorphic.ts

export const glassmorphic = {
  name: 'glassmorphic',

  // Backgrounds
  bg: '#0a0618',
  bgMid: '#120a27',
  bgTop: '#1b1236',

  // Background layers (composed at app root)
  bgGradient: {
    // linear-gradient(180deg, #0a0618 0%, #120a27 100%)
    // Plus radial glow top-right + bottom-left
    colors: ['#0a0618', '#120a27'],
    direction: 'vertical',
  },
  auroraGlow: {
    // Top-right radial
    topRight: 'rgba(139,92,246,0.35)',
    // Bottom-left radial
    bottomLeft: 'rgba(255,113,168,0.22)',
  },

  // Foreground
  fg: '#f6f3ff',
  muted: 'rgba(246,243,255,0.6)',
  subtle: 'rgba(246,243,255,0.5)',
  faint: 'rgba(246,243,255,0.4)',

  // Surfaces (glass)
  surface: 'rgba(255,255,255,0.05)',
  surfaceStronger: 'rgba(255,255,255,0.08)',
  surfaceHover: 'rgba(255,255,255,0.12)',
  line: 'rgba(255,255,255,0.12)',
  lineStronger: 'rgba(255,255,255,0.2)',
  lineGlow: 'rgba(199,180,255,0.3)', // violet-tinted hover border

  // Accent palette
  violet: '#8b5cf6',
  violetSoft: '#c7b4ff',
  rose: '#ff71a8',
  mint: '#8affc1',
  amber: '#ffb648',
  cyan: '#6be3ff',

  // Semantic
  primary: '#8b5cf6',
  primarySoft: '#c7b4ff',
  accent: '#ff71a8',
  good: '#8affc1',
  warn: '#ffb648',
  bad: '#ff71a8',
  info: '#6be3ff',

  // Gradients (used as text fills, button fills, ring strokes)
  gradientPrimary: ['#8b5cf6', '#ff71a8'],                // linear 135deg
  gradientHi: ['#c7b4ff', '#ff71a8'],                     // display emphasis
  gradientWarm: ['#ff71a8', '#ffb648'],                   // urgent emphasis
  gradientRing: ['#c7b4ff', '#ff71a8'],                   // score ring stroke
  gradientTop: ['#c7b4ff', '#ff71a8', '#ffb648'],         // next-post top accent line

  // Typography
  fontDisplay: 'InstrumentSerif_400Regular',
  fontDisplayItalic: 'InstrumentSerif_400Regular_Italic',
  fontBody: 'Inter_400Regular',
  fontBodyMedium: 'Inter_500Medium',
  fontBodySemibold: 'Inter_600SemiBold',
  fontBodyBold: 'Inter_700Bold',
  fontMono: 'GeistMono_500Medium',

  // Radii
  radiusSm: 10,
  radiusMd: 16,
  radiusLg: 20,
  radiusXl: 24,
  radiusFull: 9999,

  // Shadows (iOS shadowColor/shadowOffset/shadowOpacity/shadowRadius)
  // For Android, use `elevation` for the common ones, Skia for the critical ones
  shadowCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
  },
  shadowPrimary: {
    // 0 4px 14px -2px rgba(139,92,246,0.5)
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
  },
  shadowGlow: {
    // 0 8px 24px -4px rgba(139,92,246,0.6)
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
  },

  // Blur (expo-blur intensities that match CSS backdrop-filter)
  blurSurface: 24,      // backdrop-filter: blur(24px) saturate(1.2)
  blurDrawer: 40,       // heavier blur for drawer
  blurTabbar: 30,       // medium-heavy

  // Inner highlight (simulates CSS inset 0 1px 0 rgba(255,255,255,0.06))
  // Render as 1px bordered View overlay at the top
  innerHighlight: 'rgba(255,255,255,0.06)',

  // Hairline (for separators)
  hairline: 'rgba(255,255,255,0.08)',
  hairlineStronger: 'rgba(255,255,255,0.12)',
};
```

### Critical glassmorphic details to match

**Aurora glow on the app background:**
```tsx
// Render as <View> absolutely positioned, 500px × 300px, filter: blur(100px)
// or use a radial gradient via react-native-svg
// Position: top-right, offset -5% above top edge
```

**Card backdrop blur:**
Use `<BlurView intensity={24} tint="dark">` from `expo-blur`. Wrap card content inside.

**Gradient text ("Taylor" in headline):**
Use `react-native-linear-gradient` + `MaskedView` to apply gradient to text:
```tsx
<MaskedView maskElement={<Text style={styles.headlineItalic}>Taylor</Text>}>
  <LinearGradient
    colors={['#c7b4ff', '#ff71a8']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
  >
    <Text style={[styles.headlineItalic, { opacity: 0 }]}>Taylor</Text>
  </LinearGradient>
</MaskedView>
```

**Score ring gradient stroke:**
Use `react-native-svg`'s `<LinearGradient>` inside `<Defs>`, apply as `stroke="url(#ringGradient)"`.

---

## Neon Editorial

```ts
// packages/design-tokens/src/themes/neon-editorial.ts

export const neonEditorial = {
  name: 'neon-editorial',

  // Backgrounds
  bg: '#f4ecde',         // cream paper
  bg2: '#ebe1cf',
  bg3: '#e4d7c0',
  paper: '#f4ecde',
  paper2: '#ebe1cf',

  // Foreground
  fg: '#0b0b0b',
  ink: '#0b0b0b',
  muted: '#6b6559',
  subtle: '#8b8478',
  faint: '#a4a093',

  // Surfaces = paper — no opacity plays, just solid cream
  surface: '#f4ecde',
  surfaceAlt: '#ebe1cf',
  line: '#0b0b0b',              // borders are ink
  lineWidth: 1.5,
  lineWidthThick: 2,

  // Accent palette (loud, saturated, clashing on purpose)
  lime: '#c8ff3d',
  limeDark: '#9ecc21',
  pink: '#ff3e88',
  pinkDark: '#d9256a',
  mustard: '#e8b92b',
  blue: '#1c4bff',
  mint: '#43d9a6',
  lilac: '#c7a9ff',

  // Semantic
  primary: '#c8ff3d',           // lime
  accent: '#ff3e88',            // pink
  good: '#c8ff3d',
  warn: '#e8b92b',
  bad: '#ff3e88',
  info: '#1c4bff',

  // Gradients — NONE. Editorial uses solid fills only.
  // If a component accepts a gradient prop, pass a 2-stop of the same color.

  // Typography
  fontDisplay: 'Fraunces_500Medium',
  fontDisplayItalic: 'Fraunces_500Medium_Italic',
  fontDisplayBold: 'Fraunces_700Bold',
  fontBody: 'Satoshi_400Regular',
  fontBodyMedium: 'Satoshi_500Medium',
  fontBodyBold: 'Satoshi_700Bold',
  fontMono: 'JetBrainsMono_600SemiBold',
  fontMonoBold: 'JetBrainsMono_700Bold',

  // Fraunces variable axis (supply to Text style as fontVariant when using variable font)
  frauncesSoft: 100,            // SOFT axis at 100 for friendlier curves

  // Radii — everything is sharp
  radiusSm: 0,
  radiusMd: 2,
  radiusLg: 2,
  radiusXl: 2,
  radiusFull: 9999,             // ONLY for pills / chips / avatars

  // Shadows — hard offsets, zero blur, ink color
  shadowCard: {
    shadowColor: '#0b0b0b',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,               // Android: use the Shadow View hack (see below)
  },
  shadowCardSmall: {
    shadowColor: '#0b0b0b',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  shadowCardLarge: {
    shadowColor: '#0b0b0b',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  shadowButton: {
    shadowColor: '#0b0b0b',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },

  // Border treatments
  border: {
    width: 1.5,
    color: '#0b0b0b',
  },
  borderThick: {
    width: 2,
    color: '#0b0b0b',
  },
};
```

### Critical neon editorial details to match

**Hard offset shadow — Android:**
iOS handles `shadowOffset + shadowRadius: 0` correctly. Android ignores this combo and falls back to a blurred shadow. Solution — render a positioned sibling View as the shadow:

```tsx
// <HardShadow> component
function HardShadow({ offset = 5, children }) {
  return (
    <View style={{ position: 'relative' }}>
      <View style={{
        position: 'absolute',
        top: offset, left: offset,
        width: '100%', height: '100%',
        backgroundColor: '#0b0b0b',
      }} />
      <View style={{ backgroundColor: 'transparent' }}>{children}</View>
    </View>
  );
}
```

Every card in neon editorial wraps in `<HardShadow>`.

**Highlighter-fill text (`The three-tab setup I wish I knew sooner`):**
The word "three-tab setup" has a lime rectangle behind it.

React Native implementation:
```tsx
<Text style={styles.hook}>
  The{' '}
  <Text style={{ backgroundColor: theme.lime, fontStyle: 'italic', paddingHorizontal: 4 }}>
    three-tab setup
  </Text>
  {' '}I wish I knew sooner.
</Text>
```

Note: React Native's inline background on `<Text>` works on iOS natively. Android may require manual `View` positioning — test early.

**Torn-edge zigzag on the pulse stripe (black bar with zigzag top/bottom):**
Use SVG path rendered via `react-native-svg`:
```tsx
// Render a zigzag SVG above and below the black band
// The pattern: triangular teeth pointing into the cream background
```

**Section-number pill ("01", "02", etc.):**
Small black rectangle, cream text, JetBrains Mono 10px, 0.1em letter-spacing. Position inline before each section title.

---

## Neumorphic

```ts
// packages/design-tokens/src/themes/neumorphic.ts

export const neumorphic = {
  name: 'neumorphic',

  // Single surface color — everything lives on this
  surface: '#e4e9f0',
  surfaceLighter: '#eef2f7',
  surfaceDarker: '#c7ccd4',

  // Foreground
  fg: '#425268',
  ink: '#2a3444',
  text: '#425268',
  muted: '#7b8699',
  faint: '#a4adbd',

  // Shadow colors (paired light + dark)
  shadowLight: '#ffffff',
  shadowDark: '#a7adb8',

  // Accent palette (muted — neumorphic is tonal)
  accent: '#5a78d0',            // periwinkle
  accentSoft: '#8098db',
  accentDark: '#3d5bb8',

  // Status colors (desaturated to fit)
  good: '#6aa684',
  warn: '#c39560',
  bad: '#c87878',

  // Semantic
  primary: '#5a78d0',
  primarySoft: '#8098db',

  // Typography
  fontDisplay: 'Fraunces_400Regular',
  fontDisplayItalic: 'Fraunces_500Medium_Italic',
  fontDisplayBold: 'Fraunces_600SemiBold',
  fontBody: 'Manrope_400Regular',
  fontBodyMedium: 'Manrope_500Medium',
  fontBodySemibold: 'Manrope_600SemiBold',
  fontBodyBold: 'Manrope_700Bold',
  fontBodyExtraBold: 'Manrope_800ExtraBold',

  // Radii — softer than neon, not as soft as glassmorphic
  radiusSm: 12,
  radiusMd: 16,
  radiusLg: 22,
  radiusXl: 28,
  radiusFull: 9999,

  // Shadow stacks (this is the whole point)
  // "Out" — raised from surface
  // "In" — pressed into surface
  // Sizes: sm, md, lg for elevation hierarchy
  shadowOutSm: {
    outer: {
      shadowColor: '#a7adb8',
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 10,
    },
    inner: {
      shadowColor: '#ffffff',
      shadowOffset: { width: -4, height: -4 },
      shadowOpacity: 1,
      shadowRadius: 10,
    },
  },
  shadowOutMd: {
    outer: {
      shadowColor: '#a7adb8',
      shadowOffset: { width: 8, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 20,
    },
    inner: {
      shadowColor: '#ffffff',
      shadowOffset: { width: -8, height: -8 },
      shadowOpacity: 1,
      shadowRadius: 20,
    },
  },
  shadowOutLg: {
    outer: {
      shadowColor: '#a7adb8',
      shadowOffset: { width: 14, height: 14 },
      shadowOpacity: 1,
      shadowRadius: 30,
    },
    inner: {
      shadowColor: '#ffffff',
      shadowOffset: { width: -14, height: -14 },
      shadowOpacity: 1,
      shadowRadius: 30,
    },
  },

  // Inset shadows for pressed states — React Native has no native support
  // Use @shopify/react-native-skia
  shadowInSm: 'skia-inset-shadow-sm',    // handled in <PressedSurface> component
  shadowInMd: 'skia-inset-shadow-md',
};
```

### Critical neumorphic details to match

**Paired outer shadows — React Native implementation:**
React Native does not natively support multiple shadows on a single View. Solution — nest two Views:

```tsx
// Outer View: dark shadow
// Inner View: light shadow + actual content
function NeumorphicOut({ children, size = 'md' }) {
  const theme = useTheme();
  const shadow = theme.shadowOutMd; // or other size
  return (
    <View style={{
      shadowColor: shadow.outer.shadowColor,
      shadowOffset: shadow.outer.shadowOffset,
      shadowOpacity: shadow.outer.shadowOpacity,
      shadowRadius: shadow.outer.shadowRadius,
    }}>
      <View style={{
        shadowColor: shadow.inner.shadowColor,
        shadowOffset: shadow.inner.shadowOffset,
        shadowOpacity: shadow.inner.shadowOpacity,
        shadowRadius: shadow.inner.shadowRadius,
        backgroundColor: theme.surface,
        borderRadius: theme.radiusLg,
      }}>
        {children}
      </View>
    </View>
  );
}
```

**Inset shadow for pressed states (the whole active tab, the pressed tray):**
React Native has NO native inset shadow. You must use Skia:

```tsx
import { Canvas, RoundedRect, Shadow } from '@shopify/react-native-skia';

function NeumorphicIn({ width, height, borderRadius, children }) {
  return (
    <View style={{ width, height }}>
      <Canvas style={StyleSheet.absoluteFill}>
        <RoundedRect
          x={0} y={0}
          width={width} height={height}
          r={borderRadius}
          color={theme.surface}
        >
          <Shadow dx={3} dy={3} blur={6} color={theme.shadowDark} inner />
          <Shadow dx={-3} dy={-3} blur={6} color={theme.shadowLight} inner />
        </RoundedRect>
      </Canvas>
      <View style={StyleSheet.absoluteFill}>{children}</View>
    </View>
  );
}
```

Do NOT try to fake inset shadow with borders. It will look wrong.

**The SMO gauge well:**
Deeply inset circular well with a raised "island" inside holding the number. Structurally:
```
Outer View (circle): <NeumorphicIn /> (the well)
  SVG overlay: the progress arc
  Inner View (circle, centered, smaller): <NeumorphicOut /> (the island)
    Text: "82"
    Text: "/ 100"
```

**Factor bars tray:**
The six factor bars sit inside an INSET tray. Each bar itself is ALSO inset (a little valley). The fill is a raised gradient.

**Tab bar rounded top corners:**
The old tab bar has `border-radius: 32px 32px 0 0` — now removed since we're using a drawer. But the drawer itself has `border-radius: 32px` and `shadowOutLg`.

---

## Shared tokens (all themes)

```ts
// packages/design-tokens/src/shared.ts

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
};

export const fontSizes = {
  micro: 11,   // kicker labels, mono caps
  xs: 12,      // body meta
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,      // card title
  '2xl': 22,   // section heading
  '3xl': 26,
  '4xl': 34,   // page headline mobile
  '5xl': 42,   // headline emphasis mobile
  '6xl': 60,   // hero (not used on mobile)
};

export const lineHeights = {
  tight: 1.05,
  snug: 1.2,
  normal: 1.4,
  relaxed: 1.55,
};

export const letterSpacings = {
  tightest: -1.2,    // huge display
  tighter: -0.8,
  tight: -0.4,
  normal: 0,
  wide: 0.02,
  wider: 0.08,
  widest: 0.18,      // mono caps
};

export const durations = {
  instant: 75,
  fast: 150,
  base: 200,
  slow: 300,
  slower: 500,
};

export const screen = {
  width: 390,    // iPhone 14 Pro logical width
  height: 844,   // iPhone 14 Pro logical height
};
```

---

## Type shape (enforced across themes)

All three themes must conform to this interface:

```ts
// packages/design-tokens/src/types.ts

export interface Theme {
  name: 'glassmorphic' | 'neon-editorial' | 'neumorphic';

  // Base
  bg: string;
  fg: string;
  muted: string;
  faint: string;

  // Surfaces
  surface: string;
  surfaceAlt: string;
  line: string;

  // Semantic
  primary: string;
  accent: string;
  good: string;
  warn: string;
  bad: string;
  info: string;

  // Typography
  fontDisplay: string;
  fontDisplayItalic: string;
  fontBody: string;
  fontMono: string;

  // Radii
  radiusSm: number;
  radiusMd: number;
  radiusLg: number;
  radiusXl: number;
  radiusFull: number;

  // Shadows — each theme interprets these differently
  shadowCard: ShadowSpec;
  shadowButton: ShadowSpec;
  // etc.
}

export type ShadowSpec = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
} | NeumorphicShadowPair;

export type NeumorphicShadowPair = {
  outer: ShadowSpec;
  inner: ShadowSpec;
};
```

If a theme doesn't fit this shape, extend the interface — do not bodge values.
