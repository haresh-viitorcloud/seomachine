/**
 * Generates scripts/app-icon.ico — a branded icon for the desktop launcher.
 * Renders an SVG (gradient rounded square + lightning bolt) to a 256x256 PNG
 * via sharp, then wraps it in a single-image ICO container (PNG-in-ICO, which
 * Windows Vista+ supports natively).
 *
 *   node scripts/make-icon.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6366f1"/>
      <stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect x="8" y="8" width="240" height="240" rx="52" fill="url(#g)"/>
  <path d="M150 36 L74 148 H120 L106 220 L184 104 H134 Z"
        fill="#ffffff" stroke="#ffffff" stroke-width="4" stroke-linejoin="round"/>
</svg>`;

(async () => {
  const png = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();

  // ICONDIR (6 bytes)
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0); // reserved
  dir.writeUInt16LE(1, 2); // type: 1 = icon
  dir.writeUInt16LE(1, 4); // image count

  // ICONDIRENTRY (16 bytes)
  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0);              // width  (0 => 256)
  entry.writeUInt8(0, 1);              // height (0 => 256)
  entry.writeUInt8(0, 2);              // palette colours
  entry.writeUInt8(0, 3);              // reserved
  entry.writeUInt16LE(1, 4);           // colour planes
  entry.writeUInt16LE(32, 6);          // bits per pixel
  entry.writeUInt32LE(png.length, 8);  // size of image data
  entry.writeUInt32LE(22, 12);         // offset of image data (6 + 16)

  const ico = Buffer.concat([dir, entry, png]);
  const out = path.join(__dirname, 'app-icon.ico');
  fs.writeFileSync(out, ico);
  console.log('Wrote', out, `(${ico.length} bytes)`);
})().catch((e) => { console.error(e); process.exit(1); });
