/**
 * Generates Go Virall app icon (1024×1024) and splash icon (1024×1024)
 * using pngjs — no native deps required.
 *
 * Brand: dark violet bg (#0a0618), violet accent (#8B5CF6), pink (#FF71A8)
 */
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const SIZE = 1024;
const OUT_DIR = path.join(__dirname, '..', 'assets', 'images');

// ── Color helpers ────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function lerp(a, b, t) { return a + (b - a) * t; }

function lerpColor(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
}

// ── Draw helpers ─────────────────────────────────────────────────────────────

function setPixel(img, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const idx = (SIZE * y + x) * 4;
  img.data[idx]     = r;
  img.data[idx + 1] = g;
  img.data[idx + 2] = b;
  img.data[idx + 3] = a;
}

function fillRect(img, x0, y0, w, h, r, g, b) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      setPixel(img, x, y, r, g, b);
    }
  }
}

/** Filled circle with anti-aliased edge (1px feather) */
function fillCircle(img, cx, cy, radius, r, g, b) {
  const r2 = radius * radius;
  const feather = 1.5;
  for (let y = Math.floor(cy - radius - feather); y <= Math.ceil(cy + radius + feather); y++) {
    for (let x = Math.floor(cx - radius - feather); x <= Math.ceil(cx + radius + feather); x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const alpha = Math.max(0, Math.min(1, radius + feather - dist));
      if (alpha > 0) {
        const idx = (SIZE * y + x) * 4;
        if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) continue;
        // Blend over existing pixel
        const a = Math.round(alpha * 255);
        const ia = 255 - a;
        img.data[idx]     = Math.round((r * a + img.data[idx]     * ia) / 255);
        img.data[idx + 1] = Math.round((g * a + img.data[idx + 1] * ia) / 255);
        img.data[idx + 2] = Math.round((b * a + img.data[idx + 2] * ia) / 255);
        img.data[idx + 3] = 255;
      }
    }
  }
}

/** Rounded rectangle */
function fillRoundedRect(img, x0, y0, w, h, radius, r, g, b) {
  // Fill inner rect (no rounded corners)
  fillRect(img, x0 + radius, y0, w - 2 * radius, h, r, g, b);
  fillRect(img, x0, y0 + radius, w, h - 2 * radius, r, g, b);
  // Four corner circles
  fillCircle(img, x0 + radius, y0 + radius, radius, r, g, b);
  fillCircle(img, x0 + w - radius, y0 + radius, radius, r, g, b);
  fillCircle(img, x0 + radius, y0 + h - radius, radius, r, g, b);
  fillCircle(img, x0 + w - radius, y0 + h - radius, radius, r, g, b);
}

// ── Font: minimal pixel "G" bitmask (14×14 grid, rendered at scale) ──────────
// We'll draw a clean "G" using filled rectangles (pixel-art style, scaled up)

function drawLetterG(img, cx, cy, size, r, g, b) {
  // "G" as normalized strokes: each entry is [x0, y0, x1, y1] in [0,1] space
  // Built as a set of filled rects in a 7×9 logical grid
  const grid = 9; // columns
  const rows = 11; // rows
  const cw = size / grid;
  const ch = size / rows;
  const ox = cx - size / 2;
  const oy = cy - size / 2;

  // G shape (on/off cells in a 9×11 grid)
  const cells = [
    // row 0: top arc  [col range]
    [2,0,7,1],
    // row 1:
    [1,1,2,2],[7,1,8,2],
    // row 2:
    [0,2,1,3],[8,2,9,3],
    // row 3: top open
    [0,3,1,4],
    // row 4: middle right bar
    [0,4,1,5],[5,4,9,5],
    // row 5:
    [0,5,1,6],[5,5,9,6],
    // row 6:
    [0,6,1,7],[8,6,9,7],
    // row 7:
    [1,7,2,8],[7,7,9,8],
    // row 8: bottom arc
    [2,8,7,9],[7,8,8,9],
    // row 9:
    [2,9,8,10],
    // row 10:
    [2,10,7,11],
  ];

  for (const [c0, r0, c1, r1] of cells) {
    const px = Math.round(ox + c0 * cw);
    const py = Math.round(oy + r0 * ch);
    const pw = Math.round((c1 - c0) * cw);
    const ph = Math.round((r1 - r0) * ch);
    fillRect(img, px, py, pw, ph, r, g, b);
  }
}

// ── Build icon ───────────────────────────────────────────────────────────────

function buildIcon() {
  const img = new PNG({ width: SIZE, height: SIZE, filterType: -1 });

  const BG    = hexToRgb('#0a0618');
  const MID   = hexToRgb('#160c2e');   // slightly lighter violet-dark
  const VIOLET = hexToRgb('#8B5CF6');
  const PINK   = hexToRgb('#FF71A8');
  const WHITE  = [255, 255, 255];

  // 1. Background gradient: radial from center (#160c2e → #0a0618)
  const CX = SIZE / 2, CY = SIZE / 2;
  const maxDist = Math.sqrt(CX * CX + CY * CY);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - CX, dy = y - CY;
      const t = Math.sqrt(dx * dx + dy * dy) / maxDist;
      const [r, g, b] = lerpColor(MID, BG, t * 0.9);
      setPixel(img, x, y, r, g, b);
    }
  }

  // 2. Soft glow rings
  const GLOW_VIOLET = hexToRgb('#4C1D95');
  const glowRadius = 340;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - CX, dy = y - CY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < glowRadius) {
        const t = 1 - dist / glowRadius;
        const strength = t * t * 0.35;
        const idx = (SIZE * y + x) * 4;
        img.data[idx]     = Math.min(255, img.data[idx]     + Math.round(GLOW_VIOLET[0] * strength));
        img.data[idx + 1] = Math.min(255, img.data[idx + 1] + Math.round(GLOW_VIOLET[1] * strength));
        img.data[idx + 2] = Math.min(255, img.data[idx + 2] + Math.round(GLOW_VIOLET[2] * strength));
      }
    }
  }

  // 3. Outer ring (thin violet circle)
  const RING_R = 460;
  const RING_W = 6;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - CX, dy = y - CY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const inner = RING_R - RING_W / 2;
      const outer = RING_R + RING_W / 2;
      if (dist >= inner && dist <= outer) {
        // gradient around the ring: violet→pink
        const angle = Math.atan2(dy, dx); // -π to π
        const t = (angle + Math.PI) / (2 * Math.PI);
        const [r, g, b] = lerpColor(VIOLET, PINK, t);
        const alpha = 1 - Math.abs(dist - RING_R) / (RING_W / 2);
        const idx = (SIZE * y + x) * 4;
        img.data[idx]     = Math.round(img.data[idx]     * (1 - alpha * 0.8) + r * alpha * 0.8);
        img.data[idx + 1] = Math.round(img.data[idx + 1] * (1 - alpha * 0.8) + g * alpha * 0.8);
        img.data[idx + 2] = Math.round(img.data[idx + 2] * (1 - alpha * 0.8) + b * alpha * 0.8);
      }
    }
  }

  // 4. Center rounded-rect badge (frosted glass look)
  const BADGE_SIZE = 520;
  const BADGE_RADIUS = 120;
  const bx = CX - BADGE_SIZE / 2;
  const by = CY - BADGE_SIZE / 2;
  // Badge fill: semi-transparent violet
  fillRoundedRect(img, Math.round(bx), Math.round(by), BADGE_SIZE, BADGE_SIZE, BADGE_RADIUS,
    40, 20, 80);  // #281450 ish

  // 5. "G" letter
  drawLetterG(img, CX, CY + 10, 300, ...WHITE);

  // 6. Small pink accent dot top-right of G (viral spark)
  fillCircle(img, CX + 110, CY - 110, 22, ...PINK);
  fillCircle(img, CX + 110, CY - 110, 12, 255, 255, 255);

  return img;
}

// ── Build splash icon (simpler: just the G on dark bg, no badge) ─────────────

function buildSplashIcon() {
  const img = new PNG({ width: SIZE, height: SIZE, filterType: -1 });

  const BG    = hexToRgb('#0a0618');
  const MID   = hexToRgb('#160c2e');
  const VIOLET = hexToRgb('#8B5CF6');
  const WHITE  = [255, 255, 255];
  const CX = SIZE / 2, CY = SIZE / 2;
  const maxDist = Math.sqrt(CX * CX + CY * CY);

  // Radial gradient background
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - CX, dy = y - CY;
      const t = Math.sqrt(dx * dx + dy * dy) / maxDist;
      const [r, g, b] = lerpColor(MID, BG, t);
      setPixel(img, x, y, r, g, b);
    }
  }

  // Glow
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - CX, dy = y - CY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 280) {
        const t = 1 - dist / 280;
        const strength = t * t * 0.25;
        const idx = (SIZE * y + x) * 4;
        img.data[idx]     = Math.min(255, img.data[idx]     + Math.round(VIOLET[0] * strength));
        img.data[idx + 1] = Math.min(255, img.data[idx + 1] + Math.round(VIOLET[1] * strength));
        img.data[idx + 2] = Math.min(255, img.data[idx + 2] + Math.round(VIOLET[2] * strength));
      }
    }
  }

  // "G" in white
  drawLetterG(img, CX, CY + 10, 280, ...WHITE);

  return img;
}

// ── Write files ──────────────────────────────────────────────────────────────

function writeIcon(img, filename) {
  const buf = PNG.sync.write(img);
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, buf);
  console.log(`Written: ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
}

console.log('Generating Go Virall icons...');
writeIcon(buildIcon(), 'icon.png');
writeIcon(buildSplashIcon(), 'splash-icon.png');
console.log('Done.');
