// Adlaw Deco: generates the masthead artwork as SVG (used on the site) and PNG (share image).
// A half sun with eight main rays (each flanked by two fine rays) rising over stepped waves,
// under a banded dusk sky. No dependencies: polygons are rasterized here with 3x supersampling.
// Run: node frontend/art/sunrise.mjs
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const W = 960, H = 1200;
const SEA = ['#0d1918', '#102624', '#13322f', '#163d39', '#1b4a45', '#205751'];
const IVORY = '#f4eedf', GOLD = '#d2ae5c', GOLD_DEEP = '#a9823a';
const CX = W / 2, HORIZON = 760;

const shapes = [];
const poly = (pts, c) => shapes.push({ pts, c });
const rect = (x, y, w, h, c) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], c);
const arc = (cx, cy, r, a0, a1, n = 96) => Array.from({ length: n + 1 }, (_, i) => {
  const a = a0 + ((a1 - a0) * i) / n;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
});
const halfDisc = (r, c) => poly([...arc(CX, HORIZON, r, Math.PI, 2 * Math.PI), [CX + r, HORIZON]], c);

// Sky: six stepped bands, darkest at the top, like a Deco facade's banding.
SEA.forEach((c, i) => rect(0, (HORIZON / SEA.length) * i, W, HORIZON / SEA.length + 1, c));

// Rays: eight main rays across the upper half, each with two fine rays beside it.
const ray = (angle, inner, outer, halfWidth, c) => {
  const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
  const [px, py] = [-dy, dx];
  poly([
    [CX + dx * inner - px * halfWidth * 0.35, HORIZON + dy * inner - py * halfWidth * 0.35],
    [CX + dx * outer - px * halfWidth, HORIZON + dy * outer - py * halfWidth],
    [CX + dx * outer + px * halfWidth, HORIZON + dy * outer + py * halfWidth],
    [CX + dx * inner + px * halfWidth * 0.35, HORIZON + dy * inner + py * halfWidth * 0.35],
  ], c);
};
for (let k = 1; k <= 8; k++) {
  const a = Math.PI + (Math.PI * k) / 9;
  ray(a - 0.075, 250, 640, 5, GOLD_DEEP);
  ray(a + 0.075, 250, 640, 5, GOLD_DEEP);
  ray(a, 230, 720, 22, GOLD);
}

// The sun: concentric half rings, gold and ivory, then a solid core.
[[230, GOLD], [214, SEA[5]], [200, GOLD], [176, IVORY], [160, GOLD], [118, IVORY], [104, GOLD]].forEach(([r, c]) => halfDisc(r, c));

// Horizon rule, then the sea: rows of scallops, each row a step deeper, offset by half a wave.
rect(0, HORIZON, W, 10, GOLD);
// The sea is lightest at the horizon and darkens with depth, mirroring the sky.
const R = 40, STEP = R * 1.05, ROWS = Math.ceil((H - 14 - HORIZON - 10) / STEP) + 1;
for (let row = 0; row < ROWS; row++) {
  const y = HORIZON + 10 + row * STEP;
  const water = SEA[Math.max(0, SEA.length - 1 - Math.floor(row / 2))];
  rect(0, y, W, H - y, water);
  const offset = row % 2 ? R : 0;
  for (let x = -R * 2 + offset; x < W + R * 2; x += R * 2) {
    poly([...arc(x, y + R, R, Math.PI, 2 * Math.PI, 32)], row % 2 ? GOLD_DEEP : GOLD);
    poly([...arc(x, y + R, R - 6, Math.PI, 2 * Math.PI, 32)], water);
    poly([...arc(x, y + R, R - 14, Math.PI, 2 * Math.PI, 32)], row % 2 ? GOLD : GOLD_DEEP);
    poly([...arc(x, y + R, R - 20, Math.PI, 2 * Math.PI, 32)], water);
  }
}
rect(0, H - 14, W, 14, GOLD);

// ---- SVG ----
const f = n => Math.round(n * 10) / 10;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n${
  shapes.map(({ pts, c }) => `<polygon fill="${c}" points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}"/>`).join('\n')}\n</svg>\n`;

// ---- PNG: scanline polygon fill at 3x, then box-filter down for smooth edges ----
const SS = 3, SW = W * SS, SH = H * SS;
const big = new Uint8Array(SW * SH * 3);
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
for (const { pts, c } of shapes) {
  const [R0, G0, B0] = hex(c);
  const p = pts.map(([x, y]) => [x * SS, y * SS]);
  const ys = p.map(q => q[1]);
  for (let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(SH - 1, Math.ceil(Math.max(...ys))); y++) {
    const sy = y + 0.5, xs = [];
    for (let i = 0; i < p.length; i++) {
      const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length];
      if ((y1 <= sy && y2 > sy) || (y2 <= sy && y1 > sy)) xs.push(x1 + ((sy - y1) / (y2 - y1)) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      for (let x = Math.max(0, Math.ceil(xs[i] - 0.5)); x < Math.min(SW, Math.ceil(xs[i + 1] - 0.5)); x++) {
        const o = (y * SW + x) * 3; big[o] = R0; big[o + 1] = G0; big[o + 2] = B0;
      }
    }
  }
}
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  let r = 0, g = 0, b = 0;
  for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) {
    const o = ((y * SS + j) * SW + x * SS + i) * 3; r += big[o]; g += big[o + 1]; b += big[o + 2];
  }
  const o = y * (W * 4 + 1) + 1 + x * 4, n = SS * SS;
  raw[o] = r / n; raw[o + 1] = g / n; raw[o + 2] = b / n; raw[o + 3] = 255;
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
  chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
]);

const out = new URL('../public/art/', import.meta.url);
mkdirSync(out, { recursive: true });
for (const old of ['woven-broadsheet.svg', 'woven-broadsheet.png']) rmSync(new URL(old, out), { force: true });
writeFileSync(new URL('adlaw.svg', out), svg);
writeFileSync(new URL('adlaw.png', out), png);
console.log(`Wrote ${shapes.length} shapes (svg ${svg.length} bytes, png ${png.length} bytes)`);
