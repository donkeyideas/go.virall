# How to instruct Claude Code to build the UI correctly

## The problem you're hitting
Claude Code rebuilds UIs from general training knowledge. When you say "make it glassmorphic," it generates a *generic* glassmorphic look — nothing like the three mockups. The fix is to stop asking for styles and start giving Claude Code **pixel-exact reference files + a strict set of rules**.

## What to give Claude Code

### Step 1 — Put the three HTML mockups in the repo
Create this folder in your project:

```
apps/mobile/design-reference/
├── 01-glassmorphic.html
├── 02-neon-editorial.html
├── 03-neumorphic.html
└── README.md   ← the one in this folder
```

These HTML files are the **source of truth**. Not Figma. Not a description. The exact files you've already seen.

### Step 2 — Give Claude Code this exact prompt

Copy-paste this to Claude Code when you start the UI build:

---

> I have three reference HTML files at `apps/mobile/design-reference/` that are the pixel-exact specification for the mobile app UI:
> - `01-glassmorphic.html` — Glassmorphic theme
> - `02-neon-editorial.html` — Neon Editorial theme
> - `03-neumorphic.html` — Neumorphic theme
>
> Your job is to port these to React Native (Expo 55) with the following non-negotiable rules:
>
> 1. **Before writing any component, open and read all three HTML reference files.** Not once — every time you're about to build a screen, re-read the relevant section.
>
> 2. **Extract exact values, never approximate.** If the reference uses `#c8ff3d`, use `#c8ff3d`. Never "close enough." Never "a similar green." Never "a nice lime." Every hex value, every pixel dimension, every shadow offset is deliberate.
>
> 3. **Build from design tokens, never from inline styles.** Create `packages/design-tokens/src/themes/glassmorphic.ts`, `neon-editorial.ts`, `neumorphic.ts`. Each file exports ALL tokens from the reference HTML. Components consume tokens, not raw values.
>
> 4. **One component library, three theme providers.** Not three sets of components. The `<Card>` component renders differently based on the active theme by reading from `useTheme()`. Same API, different shadows/borders/backgrounds.
>
> 5. **Match the exact layout structure.** If the reference has a horizontal scrolling pulse row, build a horizontal scrolling pulse row — don't substitute a grid because grids are "more React Native native."
>
> 6. **Match the exact typography stack.**
>    - Glassmorphic: Instrument Serif (display), Inter (body), Geist Mono (mono)
>    - Neon Editorial: Fraunces with SOFT axis at 100 (display), Satoshi (body), JetBrains Mono (mono)
>    - Neumorphic: Fraunces (display), Manrope (body)
>    Install these via `expo-font`. If a font isn't loading, fix it — don't substitute.
>
> 7. **Shadows are the identity of each theme. Get them exact.**
>    - Glassmorphic: soft violet-tinted glow shadows + backdrop blur
>    - Neon Editorial: 3-5px solid offset ink-black shadows, zero blur
>    - Neumorphic: paired light+dark shadows, inset for pressed states
>    For React Native, use `react-native-shadow-2` or platform-specific shadow props. Match the reference pixel-for-pixel.
>
> 8. **After each screen, show me a side-by-side.** Before moving on, render the screen on iOS simulator AND open the HTML reference in a browser at 390×844. Compare them. Flag every divergence. If anything differs by more than a few pixels, fix it before moving on.
>
> 9. **Do not "improve" the design.** If a button has a 3px hard shadow in the reference and you think 4px looks better, use 3px. The reference wins every time.
>
> 10. **Build order:**
>     a. Install all three font families
>     b. Create the three theme token files from the references
>     c. Create the `ThemeProvider` and `useTheme` hook
>     d. Build the primitive components (Card, Button, Chip, Avatar, ScoreRing) with theme awareness
>     e. Build the Today screen (matches the HTML references)
>     f. Side-by-side review, fix divergences
>     g. Move on to the next screen
>
> Start by confirming you've read all three reference files and showing me your plan for the theme token files.

---

## Step 3 — What to expect from Claude Code

When Claude Code responds, it should:

1. **Acknowledge it read all three files.** If it jumps to writing code without re-reading, stop it.
2. **Propose the token file structure first.** Three files, identical shape, different values extracted from the HTML.
3. **Ask clarifying questions about anything ambiguous** — like exactly which SVGs to use for the score ring.

**Red flags that mean it's about to go off-script:**

- It says "I'll build a glassmorphic theme" without opening the HTML
- It starts generating colors like `#8B5CF6` when your reference has `#8b5cf6` — it's writing from memory, not reading the file
- It suggests using a UI library (NativeBase, Tamagui, React Native Paper) — these come with their own opinions that will override yours
- It uses `StyleSheet.create({...})` with hardcoded values instead of importing tokens
- It's skipping the side-by-side review step

If any of these happen, paste this:

> Stop. You're generating from memory, not from the reference HTML. Re-open `apps/mobile/design-reference/[file].html`, read lines [X–Y], and tell me the exact shadow value on the card. Then continue.

## Step 4 — The UI-build-spec folder in this message

I'm including files in this output that you should also give to Claude Code:

- `UI_BUILD_INSTRUCTIONS.md` — the full ruleset (longer version of the prompt above)
- `THEME_TOKENS.md` — the exact token values extracted from each HTML file
- `COMPONENT_CONTRACT.md` — the shape of every shared component, with theme variants
- `PARITY_CHECKLIST.md` — a per-screen checklist Claude Code must complete before moving on

Put all of these plus the three HTML files into `apps/mobile/design-reference/` and point Claude Code at that folder.

## Step 5 — The single biggest thing

After Claude Code builds each screen, **run it on a simulator at 390×844 and put it next to the HTML reference open in a browser at 390×844**. Side by side. If they don't match, that's the failure — not the code. Ask Claude Code to fix the divergence before writing another line.

This is boring. This is the difference between the UI matching your vision and Claude Code's generic interpretation.

---

## Appendix — phrases that make Claude Code regress to generic

Avoid these phrasings:
- "Make it look glassmorphic" → vague, triggers generic generation
- "Add some nice shadows" → Claude Code invents values
- "Use a modern design" → Claude Code defaults to Material/iOS patterns
- "Make it feel premium" → pure interpretation

Instead, phrase like:
- "Extract the card shadow from line 128 of 01-glassmorphic.html and use exactly that value"
- "The button in the reference uses box-shadow: 3px 3px 0 #0b0b0b. Match this in React Native"
- "The SMO ring in 03-neumorphic.html uses a deep inset well effect — here's the exact shadow stack: [paste]"
