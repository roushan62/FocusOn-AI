/**
 * Generates extension icons (16/32/48/128) as valid PNGs with zero
 * dependencies — a PNG encoder built on Node's zlib. Navy rounded square,
 * gold ring, white "F" (FocusOn brand: #1A1F5C / #C9A227).
 * Usage: node tools/make-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "extension", "icons");
mkdirSync(OUT, { recursive: true });

const NAVY = [26, 31, 92, 255];
const GOLD = [201, 162, 39, 255];
const WHITE = [255, 255, 255, 255];

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(size, pixels) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function draw(size) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, c) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = c[3];
  };
  const fillRect = (x0, y0, w, h, c) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, c);
  };

  const radius = Math.round(size * 0.22);
  const ring = Math.max(1, Math.round(size * 0.045));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inRounded =
        (x >= radius && x < size - radius) ||
        (y >= radius && y < size - radius) ||
        Math.hypot(x - radius + 0.5, y - radius + 0.5) <= radius ||
        Math.hypot(x - (size - radius) + 0.5, y - radius + 0.5) <= radius ||
        Math.hypot(x - radius + 0.5, y - (size - radius) + 0.5) <= radius ||
        Math.hypot(x - (size - radius) + 0.5, y - (size - radius) + 0.5) <= radius;
      if (!inRounded) continue;
      const nearEdge =
        x < ring || y < ring || x >= size - ring || y >= size - ring ||
        (Math.hypot(Math.min(x, radius) - radius, Math.min(y, radius) - radius) >= radius - ring && x < radius && y < radius);
      set(x, y, nearEdge ? GOLD : NAVY);
    }
  }

  // White "F" — bold block letter centered.
  const fw = Math.round(size * 0.42);      // letter width
  const fh = Math.round(size * 0.52);      // letter height
  const thick = Math.max(2, Math.round(size * 0.115));
  const x0 = Math.round((size - fw) / 2) - Math.round(size * 0.03);
  const y0 = Math.round((size - fh) / 2);
  fillRect(x0, y0, thick, fh, WHITE);                    // stem
  fillRect(x0, y0, fw, thick, WHITE);                    // top bar
  fillRect(x0, y0 + Math.round(fh * 0.45), Math.round(fw * 0.8), thick, WHITE); // mid bar

  return px;
}

for (const size of [16, 32, 48, 128]) {
  const png = encodePng(size, draw(size));
  const file = join(OUT, `icon${size}.png`);
  writeFileSync(file, png);
  console.log(`wrote ${file} (${png.length} bytes)`);
}
