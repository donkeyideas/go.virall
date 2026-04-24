# UI Build Instructions for Claude Code

**READ THIS ENTIRE FILE BEFORE WRITING ANY CODE.**
**RE-READ IT BEFORE EVERY NEW COMPONENT.**

You are porting three pixel-exact HTML mockups to React Native (Expo 55) for the Go Virall mobile app. The HTML files are the source of truth. Your job is NOT to design — it is to translate the designs that already exist.

## Hard rules (violations mean the PR is rejected)

### R1. Read the reference every time
Before every screen, every component, every fix, open the relevant `.html` file and read it. Do not work from memory. Do not work from a prior understanding. Read the file right now.

### R2. Exact values only
Every color, dimension, shadow, border-radius, letter-spacing, font-weight, and transition comes from the HTML. Extract them. Paste them into tokens. Never guess. Never "round to a nicer number."

If the HTML says:
```css
box-shadow: 5px 5px 0 #0b0b0b;
```

The React Native version says:
```ts
shadowColor: '#0b0b0b',
shadowOffset: { width: 5, height: 5 },
shadowOpacity: 1,
shadowRadius: 0,
elevation: 0, // not using Android default — we want the sharp offset
```

Not 4. Not 6. Five.

### R3. Design tokens only
Components NEVER contain raw color values, dimensions, or shadow strings. They consume tokens from `@govirall/design-tokens`. If you find yourself writing `color: '#c8ff3d'` inside a component, stop — add it as a token first, then reference the token.

### R4. One component, three themes
`<Card>` is ONE component. It renders different shadows for glassmorphic vs neon-editorial vs neumorphic by reading from `useTheme()`. Never create `GlassmorphicCard`, `NeonCard`, `NeumorphicCard`. That is the wrong abstraction. Three components means three places a bug can hide.

### R5. Match the structure, not just the look
The HTML has a specific layout. If the reference uses a horizontal scrolling pill row for the pulse stats on glassmorphic and a stacked 2x2 grid wrapped in an ink-bordered stripe for neon editorial — those are different components, not the same component styled differently. Read carefully.

### R6. No UI libraries
Do not install:
- NativeBase
- Tamagui
- React Native Paper
- Gluestack
- React Native Elements
- React Native UI Kitten

These come with their own design systems that will fight the one we're building. Use plain React Native primitives (`View`, `Text`, `Pressable`) styled with tokens.

**Allowed:** `react-native-reanimated` (animations), `react-native-svg` (for the score rings, factor bars), `react-native-gesture-handler` (for the drawer swipe), `@shopify/react-native-skia` if needed for complex shadows.

### R7. Fonts are non-negotiable
- Glassmorphic display: **Instrument Serif** (italic variant critical)
- Glassmorphic body: **Inter**
- Glassmorphic mono: **Geist Mono**
- Neon Editorial display: **Fraunces** (variable font, SOFT axis at 100, italic critical)
- Neon Editorial body: **Satoshi**
- Neon Editorial mono: **JetBrains Mono**
- Neumorphic display: **Fraunces** (italic critical)
- Neumorphic body: **Manrope**

If a font doesn't load, fix the font loading. Do not substitute "something similar." The typography IS the design.

### R8. Shadows are the identity
Each theme has a shadow language. Get them exact:

**Glassmorphic shadows:**
- Soft tinted shadows: `0 20px 60px -20px rgba(139,92,246,0.35)` — React Native equivalent uses `shadowOpacity` and `shadowRadius` with the violet tint
- Backdrop blur on glass surfaces — use `<BlurView intensity={...}>` from `expo-blur`
- Inner highlight line: `inset 0 1px 0 rgba(255,255,255,0.08)` — simulate in RN with a 1px bordered overlay View

**Neon Editorial shadows:**
- Hard offset, zero blur: `shadowColor: '#0b0b0b', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1, shadowRadius: 0`
- This is iOS. For Android, use a positioned sibling View as the shadow:
  ```tsx
  <View style={{ position: 'relative' }}>
    <View style={{ position: 'absolute', top: 5, left: 5, right: -5, bottom: -5, backgroundColor: '#0b0b0b' }} />
    <View style={styles.card}>...</View>
  </View>
  ```
- Never use a blurred shadow here. The sharpness is the brand.

**Neumorphic shadows:**
- Paired light + dark shadows. iOS can stack two shadows via nested Views. Android uses Skia or `react-native-shadow-2`.
- Outer shadow (raised):
  ```tsx
  // Outer wrapper View: dark shadow bottom-right
  // Inner wrapper View: light shadow top-left
  ```
- Inset shadow (pressed): use `@shopify/react-native-skia` — React Native has no native inset shadow support. Do not fake it with borders.

### R9. After each screen, parity check
After you build a screen:
1. Run it on iOS simulator (iPhone 14 Pro, 390×844 logical points)
2. Open the matching HTML in a browser at 390×844
3. Put them side by side
4. Compare every element: position, size, color, typography, shadow
5. Document divergences in a checklist
6. Fix divergences before writing the next screen

No skipping this step. If it takes 30 minutes per screen, it takes 30 minutes. UI parity is the deliverable.

### R10. No improvements
Do not "improve" the design:
- "The shadow looks better at 6px" — use 5px
- "This spacing feels cramped" — match the reference
- "A lighter color would read better" — use the exact color
- "This layout is more React Native idiomatic" — use the reference layout

The references were designed deliberately. Your job is translation, not redesign. When you think you've found an improvement, you've found a misread of the reference.

## Build order

Follow this order exactly:

### Phase 1 — Foundation
1. Install all fonts via `expo-font`:
   ```ts
   import { useFonts } from 'expo-font';
   import {
     InstrumentSerif_400Regular,
     InstrumentSerif_400Regular_Italic,
   } from '@expo-google-fonts/instrument-serif';
   // ... etc for all fonts
   ```
   Verify each font renders correctly on a test screen before moving on.

2. Create `packages/design-tokens/src/themes/`:
   - `glassmorphic.ts`
   - `neon-editorial.ts`
   - `neumorphic.ts`
   
   Each exports the complete token set (see `THEME_TOKENS.md`).

3. Create `packages/ui-mobile/src/theme/`:
   - `ThemeProvider.tsx` — React context wrapping children
   - `useTheme.ts` — hook returning current theme tokens
   - `types.ts` — Theme interface (same shape across all three)

### Phase 2 — Primitive components
Build in this order, each with theme awareness:

1. `<Text>` variants: `Display`, `DisplayItalic`, `Body`, `BodyStrong`, `Mono`, `Kicker`
2. `<Card>` (the surface)
3. `<Pressable>` → `<Button>` variants: `Primary`, `Ghost`, `Skip`
4. `<Chip>`
5. `<Avatar>`
6. `<ScoreRing>` — SVG, reads ring colors from theme
7. `<FactorBar>` — one of six factor bars in the SMO card

For each primitive, create a story/example in `apps/mobile/app/__dev__/components.tsx` that renders it in all three themes side by side. This makes visual regression obvious.

### Phase 3 — Today screen
The Today screen is the first real test. Build it to match `01-glassmorphic.html` first (it's the default theme).

Structure, top to bottom:
1. Status bar (`expo-status-bar`)
2. Floating menu button (top-left, absolutely positioned)
3. Greeting area (avatar top-right, headline below)
4. Horizontal scrolling pulse pills
5. SMO card (large card with ring + factor bars)
6. Section header: "Your next post"
7. Next post card
8. Section header: "Do now"
9. Two action cards
10. Section header: "This compounds"
11. One action card
12. Section header: "This week's wins"
13. Two win cards

Use `FlatList` or `ScrollView` for the outer scroll. Use `FlatList` (horizontal) for the pulse pills.

Parity check. Then switch the theme provider to `neon-editorial`. Run again. The same screen should now look like `02-neon-editorial.html`. If it doesn't, your components aren't using tokens correctly — fix them before moving on.

Repeat for `neumorphic`.

### Phase 4 — Drawer
The drawer is three-themed. Build it ONCE, consuming tokens.

- Swipe-from-left gesture via `react-native-gesture-handler`
- Animated using `react-native-reanimated` — spring damping matches the CSS transition timing
- Backdrop fades in, drawer slides in, simultaneously
- Close on: tap backdrop, tap close button, swipe-left gesture, hardware back button (Android)

### Phase 5 — Other screens
Once Today works in all three themes, repeat the pattern for: Compose, Audience, Revenue, Settings. Each must follow the same port discipline — reference, tokens, parity check.

## How to handle things the HTML doesn't show

The HTML mockups show Today in a static state. For things they don't cover:

- **Loading states** — use a skeleton that matches the card shape, using the theme's muted color
- **Empty states** — ask before inventing. Reference the scope doc's copy if available
- **Error states** — use the theme's `bad` color, match an action card pattern

Ask before inventing. Don't design solo.

## Self-check before every PR

Before opening a PR, verify:

- [ ] I re-read the reference HTML
- [ ] Every color is a token, no raw hex in component files
- [ ] Every shadow matches the reference pixel-for-pixel
- [ ] All three fonts are loading
- [ ] Theme switching works (toggle between all three, nothing breaks)
- [ ] Side-by-side comparison documented
- [ ] No UI library imports snuck in
- [ ] No "improvements" were made

If any checkbox is unchecked, do not submit the PR.

## What to do when stuck

If the HTML uses something that doesn't translate cleanly to React Native:

1. **Don't approximate silently.** Stop and ask.
2. Explain what the HTML does.
3. Propose 2-3 React Native approaches.
4. Wait for a decision.

Examples of things to stop and ask about:
- CSS `backdrop-filter: blur()` — RN needs `expo-blur`, which has limitations
- CSS `inset box-shadow` — RN has no native support, needs Skia
- CSS `box-decoration-break: clone` (used for the neon highlighter text) — RN has no direct equivalent
- Complex SVG gradients inside `<svg>` — RN SVG has slightly different API

Do not silently drop these features. They're often THE identity of the theme.
