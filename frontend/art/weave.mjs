// Woven Broadsheet: generates the masthead artwork as SVG (used on the site) and PNG (print/share).
// Strips of ink and paper, hand-cut widths, a twill that turns halfway down, one pink thread.
// Run: node frontend/art/weave.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const W = 960, H = 1200, M = 72;
const INK = '#09090B', PAPER = '#FAFAFA', STRIP = '#E4E4E7', PINK = '#EC4899';
const COLS = 18, ROWS = 26, PINK_ROW = 9;

// Seeded random so the "hand-cut" variation is identical on every run.
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// Hand-cut strips: each one a little wider or narrower than the last.
const cuts = (count, span) => {
  const weights = Array.from({ length: count }, () => 0.8 + rand() * 0.4);
  const total = weights.reduce((a, b) => a + b, 0);
  let at = 0;
  return weights.map(w => { const size = (w / total) * span; const strip = [at, size]; at += size; return strip; });
};
const cols = cuts(COLS, W - 2 * M);
const rows = cuts(ROWS, H - 2 * M - 64);
const GAP = 4;

const rects = [{ x: 0, y: 0, w: W, h: H, c: PAPER }];
rows.forEach(([ry, rh], j) => {
  cols.forEach(([cx, cw], i) => {
    // Twill steps right in the top half, left in the bottom half: the story turns.
    const step = j < ROWS / 2 ? i + j : i - j + ROWS;
    const warpOver = ((step % 4) + 4) % 4 < 2;
    const x = M + cx, y = M + ry;
    if (warpOver) rects.push({ x: x + GAP / 2, y, w: cw - GAP, h: rh, c: INK });
    else rects.push({ x, y: y + GAP / 2, w: cw, h: rh - GAP, c: j === PINK_ROW ? PINK : STRIP });
  });
  // Tally mark per row in the left margin: a quiet index, like line numbers on a galley proof.
  rects.push({ x: M - 28, y: M + ry + rh / 2 - 3, w: j % 5 === 4 ? 18 : 10, h: 6, c: INK });
});
// Column ticks along the foot, and one heavy rule that closes the sheet.
cols.forEach(([cx, cw], i) => rects.push({ x: M + cx + cw / 2 - 2, y: H - M - 44, w: 4, h: i % 3 === 0 ? 20 : 10, c: INK }));
rects.push({ x: M, y: H - M - 12, w: W - 2 * M, h: 12, c: INK });

// ---- SVG ----
const r = n => Math.round(n * 10) / 10;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="crispEdges">\n${
  rects.map(({ x, y, w, h, c }) => `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" fill="${c}"/>`).join('\n')}\n</svg>\n`;

// ---- PNG (no dependencies: raw RGBA + zlib + CRC32) ----
const px = Buffer.alloc((W * 4 + 1) * H);
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
for (const { x, y, w, h, c } of rects) {
  const [R, G, B] = hex(c);
  for (let yy = Math.max(0, Math.round(y)); yy < Math.min(H, Math.round(y + h)); yy++) {
    for (let xx = Math.max(0, Math.round(x)); xx < Math.min(W, Math.round(x + w)); xx++) {
      const o = yy * (W * 4 + 1) + 1 + xx * 4;
      px[o] = R; px[o + 1] = G; px[o + 2] = B; px[o + 3] = 255;
    }
  }
}
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr), chunk('IDAT', deflateSync(px, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
]);

const out = new URL('../public/art/', import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(new URL('woven-broadsheet.svg', out), svg);
writeFileSync(new URL('woven-broadsheet.png', out), png);
console.log(`Wrote ${rects.length} strips to frontend/public/art/ (svg ${svg.length} bytes, png ${png.length} bytes)`);
