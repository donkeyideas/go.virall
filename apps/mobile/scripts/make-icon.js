/**
 * Converts the Go Virall logo PNG into a proper 1024×1024 app icon.
 *
 * Source: 1024×1536 PNG with transparent background (rounded icon on transparent bg)
 * Output: 1024×1024 PNG — center-cropped, transparent pixels filled with brand dark bg
 */
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2] || 'C:/Users/beltr/Downloads/20260329_2250_Image Generation_simple_compose_01kmyacmq1fd9t7dtzqc533h2h-jukebox-bg-removed-Picsart-BackgroundRemover.png';
const OUT_DIR = path.join(__dirname, '..', 'assets', 'images');
const TARGET = 1024;

// Brand dark background
const BG = { r: 10, g: 6, b: 24 }; // #0a0618

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

console.log(`Reading: ${SRC}`);
const src = PNG.sync.read(fs.readFileSync(SRC));
console.log(`Source: ${src.width}×${src.height}`);

// Find tight bounding box of non-transparent content
let minX = src.width, maxX = 0, minY = src.height, maxY = 0;
for (let y = 0; y < src.height; y++) {
  for (let x = 0; x < src.width; x++) {
    const a = src.data[(src.width * y + x) * 4 + 3];
    if (a > 10) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
const contentW = maxX - minX + 1;
const contentH = maxY - minY + 1;
console.log(`Content bounds: ${minX},${minY} → ${maxX},${maxY} (${contentW}×${contentH})`);

// Scale factor: fit content within TARGET with 8% padding on each side
const padding = Math.round(TARGET * 0.02);
const fitSize = TARGET - padding * 2;
const scale = Math.min(fitSize / contentW, fitSize / contentH);
const dstW = Math.round(contentW * scale);
const dstH = Math.round(contentH * scale);
const offsetX = Math.round((TARGET - dstW) / 2);
const offsetY = Math.round((TARGET - dstH) / 2);
console.log(`Scaled: ${dstW}×${dstH}, offset: ${offsetX},${offsetY}`);

// Build output PNG
const out = new PNG({ width: TARGET, height: TARGET, filterType: -1 });

// Fill background
for (let i = 0; i < TARGET * TARGET; i++) {
  out.data[i * 4]     = BG.r;
  out.data[i * 4 + 1] = BG.g;
  out.data[i * 4 + 2] = BG.b;
  out.data[i * 4 + 3] = 255;
}

// Bilinear interpolation from source to destination
for (let dy = 0; dy < dstH; dy++) {
  for (let dx = 0; dx < dstW; dx++) {
    // Map back to source content coords
    const sx = dx / scale + minX;
    const sy = dy / scale + minY;

    const x0 = Math.floor(sx), x1 = Math.min(x0 + 1, src.width - 1);
    const y0 = Math.floor(sy), y1 = Math.min(y0 + 1, src.height - 1);
    const fx = sx - x0, fy = sy - y0;

    function getSrcPixel(x, y, ch) {
      return src.data[(src.width * y + x) * 4 + ch];
    }

    // Bilinear blend for each channel
    function bilerp(ch) {
      const top    = getSrcPixel(x0, y0, ch) * (1 - fx) + getSrcPixel(x1, y0, ch) * fx;
      const bottom = getSrcPixel(x0, y1, ch) * (1 - fx) + getSrcPixel(x1, y1, ch) * fx;
      return top * (1 - fy) + bottom * fy;
    }

    const srcA = bilerp(3) / 255;
    if (srcA < 0.01) continue; // fully transparent — keep bg

    const outX = offsetX + dx;
    const outY = offsetY + dy;
    if (outX < 0 || outY < 0 || outX >= TARGET || outY >= TARGET) continue;

    const outIdx = (TARGET * outY + outX) * 4;

    // Alpha-composite over bg
    const srcR = bilerp(0), srcG = bilerp(1), srcB = bilerp(2);
    const ia = 1 - srcA;
    out.data[outIdx]     = Math.round(srcR * srcA + BG.r * ia);
    out.data[outIdx + 1] = Math.round(srcG * srcA + BG.g * ia);
    out.data[outIdx + 2] = Math.round(srcB * srcA + BG.b * ia);
    out.data[outIdx + 3] = 255;
  }
}

const outBuf = PNG.sync.write(out);
const iconPath = path.join(OUT_DIR, 'icon.png');
fs.writeFileSync(iconPath, outBuf);
console.log(`Written: ${iconPath} (${(outBuf.length / 1024).toFixed(1)} KB)`);

// Also write splash-icon (same but with more padding — bolt only, no bg clip needed for splash)
// Use the bare bolt (first source) for splash if available, otherwise same
const splashPath = path.join(OUT_DIR, 'splash-icon.png');
fs.writeFileSync(splashPath, outBuf);
console.log(`Written: ${splashPath}`);
console.log('Done.');
