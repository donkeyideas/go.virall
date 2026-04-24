# Parity Checklist

Claude Code MUST complete this checklist for every screen before moving to the next one.

Open the HTML reference in a browser at exactly 390×844 (iPhone 14 Pro logical size). Open the built screen on iOS simulator. Side by side.

For each line: `[ ]` = unchecked, `[x]` = verified match, `[!]` = divergence found — must fix before proceeding.

---

## Today screen — Parity checklist

### Global
- [ ] Status bar text color matches theme (white on glass, ink on neon, ink on neumorphic)
- [ ] Dynamic Island is black, positioned at `top: 11, left: 50%, width: 126, height: 37`
- [ ] App background matches — glass has violet aurora top-right + rose bottom-left, neon is solid cream, neumorphic is solid #e4e9f0
- [ ] Home indicator positioned at `bottom: 8, centered`, color per theme

### Floating menu button (top-left FAB)
- [ ] Positioned at `top: 54, left: 16`
- [ ] Size: 46–48px square
- [ ] Glass: BlurView pill with gradient lines
- [ ] Neon: lime fill, 1.5px ink border, 3×3px hard offset shadow, ink menu bars
- [ ] Neumorphic: raised surface with accent menu bars
- [ ] Press state matches: glass scales 0.95, neon shifts + reduces shadow, neumorphic shows inset

### Greeting area
- [ ] Padding accounts for FAB (left ~76px, not 20)
- [ ] Avatar positioned top-right (or right side of greeting row)
- [ ] Headline "Good afternoon, Taylor." uses correct display font
- [ ] "Taylor" is emphasis (gradient text on glass, lime highlighter on neon, accent color on neumorphic)
- [ ] Sub-text "Tue · Apr 21 · 2:14 PM" uses mono font

### Pulse row
- [ ] **Glass**: horizontal scrolling pills with scroll snap — check 4 pills visible partially
- [ ] **Neon**: 2×2 grid inside solid ink stripe, torn zigzag top AND bottom
- [ ] **Neumorphic**: 2×2 grid inside inset tray, one cell shows active/pressed state
- [ ] Each cell shows label (mono caps), value (display serif), delta (mono)
- [ ] Delta colors correct: good = green-ish, flat = muted, bad = red-ish

### SMO card
- [ ] Card has correct elevation (glass = glow shadow, neon = 5px hard offset, neumorphic = out-md)
- [ ] Top row: "SMO Score · 82nd pct" kicker + "↑ 6 this mo" delta chip
- [ ] Score ring on left, text on right
- [ ] **Glass ring**: violet→rose gradient stroke, 8px width, glow filter, italic Instrument Serif "82"
- [ ] **Neon ring**: solid lime stroke 14px, dashed background ring, ink frames (inner+outer), pink end dot, italic Fraunces "82"
- [ ] **Neumorphic ring**: deeply inset well, accent gradient arc, raised center island with "82"
- [ ] Title right of ring: "Your optimization, at a glance."
- [ ] Meta: "Strongest: Engagement (94)" and "Biggest lift: Consistency (+8)"
- [ ] Six factor bars below, labeled: Prof 91, Cont 88, Cons 68, Enga 94, Grow 83, Mone 66
- [ ] Factor 68 (Cons) and 66 (Mone) render in warn color
- [ ] Factor 94 (Enga) renders in good color

### Section: Your next post
- [ ] Section header uses numbered style per theme
- [ ] Right-aligned "Ships 4h 28m" meta in mono
- [ ] Next post card has theme decoration (top line on glass, ink band on neon, chip only on neumorphic)
- [ ] Chip: "● Scheduled · Reel · IG" — dot is good color
- [ ] Time: "6:42 PM ET"
- [ ] Hook: "The three-tab setup I wish I knew sooner." — "three-tab setup" is emphasis
- [ ] Meta row: Score 78, Hook Strong, Predicted 14.8K

### Section: Do now (2 urgent)
- [ ] Two action cards

**Card 1: Hatch invoice**
- [ ] Variant: urgent
- [ ] Kicker: "Overdue · 6 days"
- [ ] Eyebrow: "Invoice INV-2026-0037"
- [ ] Title: "Nudge Hatch on the $4,800 invoice." — "Hatch" is emphasis
- [ ] Meta: "Due April 15 · last viewed April 12"
- [ ] Primary CTA: "Send nudge"
- [ ] Skip: "Remind tomorrow" (glass) / "Tomorrow" (neon) / "Tomorrow" (neumorphic)
- [ ] Neon: card is pink with cream text, cream button with ink text
- [ ] Glass: card has rose-tinted border + background
- [ ] Neumorphic: card has subtle red inset border

**Card 2: Logitech**
- [ ] Variant: warm
- [ ] Kicker: "Closing in 48h · 94% match"
- [ ] Eyebrow: "Logitech MX Creators"
- [ ] Title: "Apply to Logitech MX Creators." — "Logitech MX Creators" is emphasis
- [ ] Meta: "$3K–$8K · Reel + carousel · deadline Thursday"
- [ ] Primary CTA: "Apply now" / "Apply"
- [ ] Glass: amber-tinted border + background
- [ ] Neon: cream card (default)
- [ ] Neumorphic: warn icon color

### Section: This compounds
- [ ] Section header numbered
- [ ] One action card

**Card: @sam_okafor**
- [ ] Kicker: "Collab · 94% match" or "Collab · 94%"
- [ ] Eyebrow: "38% audience overlap" or "38% overlap"
- [ ] Title: "Draft a DM to @sam_okafor." — "@sam_okafor" is emphasis
- [ ] Meta: "112K followers · same niche · open collab slot"
- [ ] Button: "Draft DM"
- [ ] Skip: "Later"

### Section: This week's wins
- [ ] Section header numbered

**Card 1: Follower gain**
- [ ] Icon: trending-up glyph
- [ ] Kicker: "Best week · Q2"
- [ ] Text: "+2,847 new followers" — "new followers" is emphasis (green)
- [ ] Number: "2.8K"

**Card 2: Skillshare**
- [ ] Icon: dollar-sign glyph
- [ ] Kicker: "Deal closed"
- [ ] Text: "Skillshare paid in full" — "Skillshare" is emphasis
- [ ] Number: "$2.5K"

### Drawer (when opened)
- [ ] Slides in from left, ~280–290px wide
- [ ] Backdrop fades in over app
- [ ] Brand row at top: logo square + "Go Virall"
- [ ] Close button top-right
- [ ] Status/tag row (differs per theme — status pill on glass/neumorphic, two tags on neon)
- [ ] Nav items: Today (active), Compose, Audience (badge "3 new"), Revenue (badge "$4.8K"), Schedule, Messages
- [ ] Active item has theme-specific highlight
- [ ] Divider
- [ ] Settings item
- [ ] Footer at bottom: avatar + "Taylor Kai" + "Pro · Renews May 3"

### Typography spot checks (font actually loaded?)
- [ ] Glass headline uses Instrument Serif (curved S's, high contrast)
- [ ] Neon headline uses Fraunces with SOFT 100 (friendlier curves)
- [ ] Neumorphic headline uses Fraunces regular
- [ ] All mono labels use correct mono font per theme (Geist / JetBrains / n/a for neumorphic)

### Theme switching
- [ ] Switching themes updates entire screen immediately
- [ ] No layout shifts during switch
- [ ] No stale colors left over
- [ ] Drawer renders correctly in new theme

### Interactions
- [ ] FAB opens drawer
- [ ] Drawer backdrop closes on tap
- [ ] Drawer close button closes drawer
- [ ] Swipe-left on drawer closes it
- [ ] Card press states work (glass = slight scale, neon = shift+reduce shadow, neumorphic = inset)
- [ ] Button press states match

---

## Divergence log

When you find a divergence, record it here before moving on:

| # | Element | Reference (HTML) | Actual (RN) | Severity | Fixed? |
|---|---------|------------------|-------------|----------|--------|
|   |         |                  |             |          |        |

Severity scale:
- **Critical**: changes the aesthetic identity (wrong shadow type, wrong font, wrong accent color)
- **Major**: visible at a glance (wrong spacing, wrong radius, missing decoration)
- **Minor**: only visible on close inspection (off by 1-2px, slightly wrong opacity)

Critical and Major divergences must be fixed before the screen is accepted. Minor divergences can be batched into a cleanup PR but must be logged.

---

## Sign-off

Before closing the PR for this screen:

- [ ] I re-read the reference HTML files
- [ ] Every token I used is defined in the theme files
- [ ] I tested all three themes
- [ ] I completed the parity checklist
- [ ] All critical/major divergences are fixed
- [ ] Minor divergences are logged for cleanup
- [ ] Side-by-side screenshots attached to the PR
