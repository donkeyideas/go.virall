# Component Contract

Every shared component in `packages/ui-mobile/src/` has ONE interface and THREE theme implementations (delivered via tokens, not code forks).

This file specifies the public API of every component. Claude Code implements these interfaces. The props shape must not deviate.

---

## `<ThemeProvider>`

```tsx
type ThemeName = 'glassmorphic' | 'neon-editorial' | 'neumorphic';

interface ThemeProviderProps {
  theme: ThemeName;
  children: React.ReactNode;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps): JSX.Element;
```

Switches the root theme at runtime. Every child component reads from `useTheme()`.

On mount, the provider also sets the root View's `backgroundColor` to the theme's `bg`.

```tsx
// packages/ui-mobile/src/theme/useTheme.ts
export function useTheme(): Theme;
```

---

## `<Display>` — serif display text

```tsx
interface DisplayProps {
  children: React.ReactNode;
  size?: '2xl' | '3xl' | '4xl' | '5xl';    // default '4xl'
  italic?: boolean;                          // default false
  emphasis?: boolean;                        // default false — applies gradient/highlighter
  color?: 'fg' | 'muted' | 'accent';        // default 'fg'
  style?: TextStyle;
}

export function Display(props: DisplayProps): JSX.Element;
```

Behavior per theme when `emphasis=true`:
- **Glassmorphic**: applies `gradientHi` as text fill using MaskedView + LinearGradient
- **Neon Editorial**: applies lime background (highlighter effect), italic forced
- **Neumorphic**: applies `accent` color, italic forced

---

## `<Body>` — sans-serif body text

```tsx
interface BodyProps {
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'base' | 'lg';       // default 'base'
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';  // default 'regular'
  color?: 'fg' | 'muted' | 'faint' | 'accent' | 'good' | 'warn' | 'bad';
  style?: TextStyle;
}
```

---

## `<Kicker>` — mono uppercase label

```tsx
interface KickerProps {
  children: React.ReactNode;
  color?: 'muted' | 'accent' | 'good' | 'warn' | 'bad';
  style?: TextStyle;
}
```

Always 10–11px, uppercase, wide letter-spacing. One variant, theme handles the rest.

---

## `<Card>` — primary surface

```tsx
interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'urgent' | 'warm' | 'success';  // default 'default'
  elevation?: 'sm' | 'md' | 'lg';                        // default 'md'
  style?: ViewStyle;
  onPress?: () => void;
}
```

Behavior per theme:
- **Glassmorphic**: `BlurView` intensity=24 + semi-transparent surface + inset highlight. Variants shift border color.
- **Neon Editorial**: solid cream background, 1.5px ink border, hard offset shadow via `<HardShadow>`. Variants change background color (pink for urgent, lime for success).
- **Neumorphic**: raised neumorphic effect (paired shadows). Variants use a subtle inset border or slight tint.

If `onPress` provided, wraps in `<Pressable>` with theme-aware press state.

---

## `<Button>`

```tsx
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'ghost' | 'skip';   // default 'primary'
  size?: 'sm' | 'md' | 'lg';                 // default 'md'
  icon?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}
```

Behavior per theme:
- **Glassmorphic primary**: gradient fill (violet→rose), glow shadow, no border
- **Neon Editorial primary**: lime fill, ink border, hard offset shadow, press = shift + reduced shadow
- **Neumorphic primary**: raised neumorphic surface, accent text color, press = inset shadow

---

## `<Chip>`

```tsx
interface ChipProps {
  label: string;
  variant?: 'default' | 'active' | 'good' | 'warn' | 'bad';
  icon?: React.ReactNode;
  onPress?: () => void;
}
```

---

## `<Avatar>`

```tsx
interface AvatarProps {
  initials: string;           // e.g., "TK"
  size?: number;              // default 36
  showStatus?: boolean;       // online dot
}
```

Theme-specific rendering:
- **Glassmorphic**: gradient background (violet→rose), soft glow
- **Neon Editorial**: pink background, ink border, hard shadow
- **Neumorphic**: surface-color background, inset shadow, accent text

---

## `<ScoreRing>`

```tsx
interface ScoreRingProps {
  value: number;             // 0-100
  max?: number;              // default 100
  size?: number;              // default 120
  label?: string;             // default "/ 100"
  showPercentile?: boolean;
}
```

Theme-specific rendering (all SVG via `react-native-svg`):
- **Glassmorphic**: violet→rose gradient stroke, glow filter, italic Instrument Serif number
- **Neon Editorial**: solid lime stroke, dashed background ring, ink frame circles (inner + outer), pink end-dot marker, italic Fraunces number
- **Neumorphic**: deeply inset well (Skia), accent gradient stroke arc, raised center island containing the number

---

## `<FactorBar>`

```tsx
interface FactorBarProps {
  label: string;             // "Profile"
  value: number;             // 0-100
  variant?: 'default' | 'good' | 'warn';
}
```

Vertical bar with label below (6 of these inline in the SMO card).

Theme-specific:
- **Glassmorphic**: gradient fill (violet by default, mint for good, amber for warn), subtle glow
- **Neon Editorial**: solid lime/mint/mustard fill inside ink-bordered box
- **Neumorphic**: inset track, raised gradient fill, theme-muted variant colors

---

## `<PulseStats>` — the horizontal stat strip

```tsx
interface PulseStatsProps {
  stats: PulseStat[];
}

interface PulseStat {
  label: string;
  value: string;
  delta?: string;
  deltaVariant?: 'good' | 'flat' | 'bad';
}
```

Theme-specific layouts (this is important — NOT the same visual structure):
- **Glassmorphic**: horizontal scrolling `FlatList` of pill-shaped cards with scroll snap
- **Neon Editorial**: 2×2 grid inside a solid ink stripe with torn zigzag edges top/bottom
- **Neumorphic**: 2×2 grid inside an inset tray, one cell rendered as active (pressed state)

These are different components internally. Provide all three under one API — `<PulseStats>` component picks the renderer based on theme.

---

## `<ActionCard>` — feed item

```tsx
interface ActionCardProps {
  kicker: string;              // "Overdue · 6 days"
  eyebrow?: string;            // subtitle
  title: React.ReactNode;      // supports <Emphasis>
  meta?: string;               // one-line description
  variant?: 'default' | 'urgent' | 'warm';
  icon?: React.ReactNode;      // left-side glyph
  primaryCta?: { label: string; onPress: () => void };
  skipCta?: { label: string; onPress: () => void };
}
```

---

## `<NextPostCard>` — the scheduled post card

```tsx
interface NextPostCardProps {
  status: string;              // "Scheduled · Reel · IG"
  time: string;                // "6:42 PM ET"
  hook: React.ReactNode;       // supports <Emphasis>
  score: number;
  hookStrength: string;
  predicted: string;
}
```

Theme-specific decorations:
- **Glassmorphic**: top accent gradient line (violet→rose→amber)
- **Neon Editorial**: ink band across top with status pill, no accent line
- **Neumorphic**: subtle scheduled-chip with `good` dot glow

---

## `<WinCard>`

```tsx
interface WinCardProps {
  kicker: string;              // "Best week · Q2"
  text: React.ReactNode;       // supports <Emphasis>
  number: string;              // "2.8K"
  iconName: 'trending-up' | 'dollar-sign' | 'trophy';
  variant?: 'default' | 'success';
}
```

---

## `<FloatingMenuButton>`

```tsx
interface FloatingMenuButtonProps {
  onPress: () => void;
}
```

Fixed-positioned top-left FAB. Opens the drawer.

Theme-specific rendering:
- **Glassmorphic**: BlurView pill with gradient-tinted menu lines
- **Neon Editorial**: lime square with ink border and hard offset shadow
- **Neumorphic**: raised rounded square with accent-color menu lines

---

## `<Drawer>`

```tsx
interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeRoute: string;
  onNavigate: (route: string) => void;
}
```

Animated via `react-native-reanimated`. Swipe-to-close via `react-native-gesture-handler`.

Contains:
- Brand row (logo + name)
- Close button
- Status pill
- Nav items (Today / Compose / Audience / Revenue / Schedule / Messages / Settings)
- Divider
- Settings item
- Footer (avatar + name + plan)

Each nav item is a `<DrawerItem>`.

---

## `<DrawerItem>`

```tsx
interface DrawerItemProps {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  badge?: string;
  onPress: () => void;
}
```

Theme-specific active state:
- **Glassmorphic**: gradient-tinted background + violet border + left indicator bar
- **Neon Editorial**: lime fill + ink border + hard shadow
- **Neumorphic**: inset shadow (pressed into the surface) + accent text color

---

## Anti-patterns — what NOT to do

### ❌ Theme-specific components
```tsx
// NO
<GlassmorphicCard />
<NeonCard />
<NeumorphicCard />
```

One `<Card>`, three theme implementations internally.

### ❌ Raw style values in component files
```tsx
// NO
<View style={{ backgroundColor: '#c8ff3d' }} />

// YES
<View style={{ backgroundColor: theme.lime }} />
```

### ❌ Conditional renders based on theme.name
```tsx
// Avoid this pattern
if (theme.name === 'neon-editorial') {
  return <HardShadowCard>...</HardShadowCard>;
}
```

Only use this pattern when the underlying structure is genuinely different (e.g., PulseStats). For styling differences, let tokens do the work.

### ❌ Using a UI library
```tsx
// NO
import { Card } from 'react-native-paper';
```

Use native RN primitives.

### ❌ Inline shadows
```tsx
// NO
<View style={{ shadowColor: '#000', shadowOffset: {width:5,height:5}, shadowRadius: 0, shadowOpacity: 1 }}>

// YES
<View style={theme.shadowCard}>
```
