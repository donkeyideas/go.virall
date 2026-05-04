/**
 * Generates Android adaptive icon foreground (1024×1024, transparent bg).
 * Android adaptive icons use a 108dp canvas; the inner 72dp (66.7%) is
 * the safe zone. Content must fit within that area to avoid clipping.
 */
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const SRC = 'C:/Users/beltr/Downloads/ChatGPT Image Mar 31, 2026, 07_47_21 PM.png';
const OUT = path.join(__dirname, '..', 'assets', 'images', 'adaptive-icon.png');
const TARGET = 1024;

// Android safe zone: inner 66.7% of 1024 = ~683px
// Add some margin within safe zone
const SAFE_ZONE = Math.round(TARGET * 0.60);

console.log(`Reading: ${SRC}`);
const src = PNG.sync.read(fs.readFileSync(SRC));
console.log(`Source: ${src.width}×${src.height}`);

// Find content bounds
let minX = src.width, maxX = 0, minY = src.height, maxY = 0;
for (let y = 0; y < src.height; y++) {
  for (let x = 0; x < src.width; x++) {
    if (src.data[(src.width * y + x) * 4 + 3] > 10) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
const contentW = maxX - minX + 1;
const contentH = maxY - minY + 1;
console.log(`Content: ${contentW}×${contentH}`);

// Scale to fit within safe zone
const scale = Math.min(SAFE_ZONE / contentW, SAFE_ZONE / contentH);
const dstW = Math.round(contentW * scale);
const dstH = Math.round(contentH * scale);
const offsetX = Math.round((TARGET - dstW) / 2);
const offsetY = Math.round((TARGET - dstH) / 2);
console.log(`Scaled: ${dstW}×${dstH}, offset: ${offsetX},${offsetY}`);

// Create transparent output
const out = new PNG({ width: TARGET, height: TARGET, filterType: -1 });
// All pixels start as 0,0,0,0 (transparent)

// Bilinear sample from source
for (let dy = 0; dy < dstH; dy++) {
  for (let dx = 0; dx < dstW; dx++) {
    const sx = dx / scale + minX;
    const sy = dy / scale + minY;
    const x0 = Math.floor(sx), x1 = Math.min(x0 + 1, src.width - 1);
    const y0 = Math.floor(sy), y1 = Math.min(y0 + 1, src.height - 1);
    const fx = sx - x0, fy = sy - y0;

    function get(x, y, ch) { return src.data[(src.width * y + x) * 4 + ch]; }
    function bilerp(ch) {
      const top    = get(x0, y0, ch) * (1 - fx) + get(x1, y0, ch) * fx;
      const bottom = get(x0, y1, ch) * (1 - fx) + get(x1, y1, ch) * fx;
      return Math.round(top * (1 - fy) + bottom * fy);
    }

    const outX = offsetX + dx;
    const outY = offsetY + dy;
    if (outX < 0 || outY < 0 || outX >= TARGET || outY >= TARGET) continue;

    const idx = (TARGET * outY + outX) * 4;
    out.data[idx]     = bilerp(0);
    out.data[idx + 1] = bilerp(1);
    out.data[idx + 2] = bilerp(2);
    out.data[idx + 3] = bilerp(3); // preserve alpha
  }
}

const buf = PNG.sync.write(out);
fs.writeFileSync(OUT, buf);
console.log(`Written: ${OUT} (${(buf.length / 1024).toFixed(1)} KB)`);
