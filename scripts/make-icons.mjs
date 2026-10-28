// Erzeugt die PWA-Icons (PNG) ohne externe Abhängigkeiten.
// Motiv: stilisiertes Kallax-Regal (2×2) in Neon-Cyan, ein Fach mit Box in Magenta.
// Aufruf: npm run icons
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [7, 11, 18];
const CYAN = [62, 240, 255];
const MAGENTA = [255, 79, 216];

// CRC32 für PNG-Chunks
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Farbe an Position (u,v) in 0..1, ohne Kantenglättung */
function sample(u, v) {
  // Regal: Quadrat 0.28..0.72, Wandstärke 0.035, ein Mittelsteg pro Richtung
  const a = 0.28, b = 0.72, t = 0.035, m = 0.5;
  const inside = u >= a && u <= b && v >= a && v <= b;
  if (!inside) {
    // dezenter Glow um das Regal
    const dx = Math.max(a - u, 0, u - b), dy = Math.max(a - v, 0, v - b);
    const d = Math.hypot(dx, dy);
    const glow = Math.max(0, 1 - d / 0.08) * 0.35;
    return BG.map((c, i) => c + (CYAN[i] - c) * glow);
  }
  const frame = u < a + t || u > b - t || v < a + t || v > b - t || Math.abs(u - m) < t / 2 || Math.abs(v - m) < t / 2;
  if (frame) return CYAN;
  // Box im Fach unten rechts
  if (u > m + 0.04 && u < b - 0.05 && v > m + 0.06 && v < b - 0.05) return MAGENTA;
  return BG;
}

function render(size) {
  const ss = 4; // Supersampling
  return png(size, (x, y) => {
    const acc = [0, 0, 0];
    for (let i = 0; i < ss; i++)
      for (let j = 0; j < ss; j++) {
        const c = sample((x + (i + 0.5) / ss) / size, (y + (j + 0.5) / ss) / size);
        acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
      }
    return acc.map((c) => Math.round(c / (ss * ss)));
  });
}

mkdirSync('public/icons', { recursive: true });
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(`public/icons/${name}`, render(size));
  console.log('geschrieben:', name);
}
