// Adlaw Deco murals: original Art Deco figures, generated as SVG (vector source) and PNG (used on the site).
//   lapulapu  Lapu-Lapu of Mactan (Visayas, 1521) on a stepped plinth at the shore,
//             a sunburst behind him and two Mindanao vintas under striped sails.
//   kudarat   Sultan Kudarat of Maguindanao (Mindanao, 17th century) before a torogan roof,
//             with okir-style curls and T'nalak diamond weaving.
// Stylized figures: no real portraits of either man exist, and these copy no statue or painting.
// Run: node frontend/art/murals.mjs   (no dependencies; polygons rasterized here with 3x supersampling)
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const W = 960, H = 1200, CX = 480;
const SEA = ['#0d1918', '#102624', '#13322f', '#163d39', '#1b4a45', '#205751'];
const C = {
  ivory: '#f4eedf', gold: '#d2ae5c', goldDeep: '#a9823a', ink: '#0a1110',
  bronze: '#9a6440', bronzeDark: '#6e4128', bronzeLight: '#b9805a', tattoo: '#2a160c', red: '#b8322a', redDark: '#82241e',
  steel: '#e9e1cc', yellow: '#e8b53c', green: '#2f7a4a', blue: '#2b5fa8', wood: '#3a2416',
};

// ---------- shape helpers ----------
function canvas() {
  const shapes = [];
  const poly = (pts, c) => shapes.push({ pts, c });
  const mirror = pts => pts.map(([x, y]) => [2 * CX - x, y]).reverse();
  const both = (pts, c, cRight = c) => { poly(pts, c); poly(mirror(pts), cRight); };
  const rect = (x, y, w, h, c) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], c);
  const arcPts = (cx, cy, rx, ry, a0, a1, n = 64) => Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });
  const ellipse = (cx, cy, rx, ry, c) => poly(arcPts(cx, cy, rx, ry, 0, 2 * Math.PI, 72), c);
  const band = (x1, y1, x2, y2, t, c) => { // a straight stroke of thickness t
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy), px = (-dy / l) * t / 2, py = (dx / l) * t / 2;
    poly([[x1 + px, y1 + py], [x2 + px, y2 + py], [x2 - px, y2 - py], [x1 - px, y1 - py]], c);
  };
  return { shapes, poly, mirror, both, rect, arcPts, ellipse, band };
}

function sky(k, horizon) {
  SEA.forEach((c, i) => k.rect(0, (horizon / SEA.length) * i, W, horizon / SEA.length + 1, c));
}

function sunburst(k, cx, cy, inner, outer, count, wide, thin) {
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count - Math.PI / 2;
    const w = i % 2 ? thin : wide;
    const [dx, dy, px, py] = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a)];
    k.poly([
      [cx + dx * inner - px * w * 0.3, cy + dy * inner - py * w * 0.3],
      [cx + dx * outer - px * w, cy + dy * outer - py * w],
      [cx + dx * outer + px * w, cy + dy * outer + py * w],
      [cx + dx * inner + px * w * 0.3, cy + dy * inner + py * w * 0.3],
    ], i % 2 ? C.goldDeep : C.gold);
  }
}

function waves(k, top, bottom) {
  const R = 34, STEP = R * 1.05;
  for (let row = 0; top + row * STEP < bottom; row++) {
    const y = top + row * STEP;
    const water = SEA[Math.max(0, SEA.length - 1 - Math.floor(row / 2))];
    k.rect(0, y, W, bottom - y, water);
    for (let x = -R * 2 + (row % 2 ? R : 0); x < W + R * 2; x += R * 2) {
      k.poly(k.arcPts(x, y + R, R, R, Math.PI, 2 * Math.PI, 28), row % 2 ? C.goldDeep : C.gold);
      k.poly(k.arcPts(x, y + R, R - 5, R - 5, Math.PI, 2 * Math.PI, 28), water);
      k.poly(k.arcPts(x, y + R, R - 12, R - 12, Math.PI, 2 * Math.PI, 28), row % 2 ? C.gold : C.goldDeep);
      k.poly(k.arcPts(x, y + R, R - 17, R - 17, Math.PI, 2 * Math.PI, 28), water);
    }
  }
}

// T'nalak-inspired band: rows of nested diamonds in red, ivory and gold on dark ground.
function tnalak(k, top, h) {
  k.rect(0, top, W, h, C.ink);
  k.rect(0, top, W, 5, C.gold);
  k.rect(0, top + h - 5, W, 5, C.gold);
  const d = 30, cy = top + h / 2, colors = [C.red, C.ivory, C.gold];
  for (let i = 0, x = d / 2; x < W + d; i++, x += d * 1.25) {
    const dia = (s, c) => k.poly([[x, cy - s], [x + s * 0.8, cy], [x, cy + s], [x - s * 0.8, cy]], c);
    dia(h / 2 - 12, colors[i % 3]);
    dia(h / 2 - 22, C.ink);
    dia(h / 2 - 30, colors[(i + 1) % 3]);
  }
}

// A Mindanao vinta: dark hull with upturned ends, outrigger, and a striped lug sail.
function vinta(k, x0, flip = false) {
  const X = x => (flip ? 2 * CX - x : x);
  const P = pts => pts.map(([x, y]) => [X(x0 + x), y]);
  const stripes = [C.red, C.yellow, C.green, C.blue, C.ivory, C.red];
  const sail = [[40, 700], [190, 682], [208, 880], [24, 884]];
  for (let i = 0; i < stripes.length; i++) {
    const t0 = i / stripes.length, t1 = (i + 1) / stripes.length;
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    k.poly(P([lerp(sail[0], sail[1], t0), lerp(sail[0], sail[1], t1), lerp(sail[3], sail[2], t1), lerp(sail[3], sail[2], t0)]), stripes[i]);
  }
  k.poly(P([[112, 672], [118, 672], [118, 904], [112, 904]]), C.wood); // mast
  k.poly(P([[0, 902], [220, 902], [198, 926], [24, 926]]), C.wood);   // hull
  k.poly(P([[0, 902], [-22, 872], [-12, 870], [14, 902]]), C.wood);    // upturned bow
  k.poly(P([[220, 902], [242, 872], [232, 870], [206, 902]]), C.wood);
  k.poly(P([[-14, 938], [234, 938], [234, 944], [-14, 944]]), C.goldDeep); // outrigger float
  k.poly(P([[40, 924], [46, 924], [46, 940], [40, 940]]), C.wood);
  k.poly(P([[176, 924], [182, 924], [182, 940], [176, 940]]), C.wood);
}

function plinth(k, y) {
  k.rect(CX - 92, y, 184, 18, C.goldDeep);
  k.rect(CX - 120, y + 18, 240, 20, C.gold);
  k.rect(CX - 148, y + 38, 296, 22, C.goldDeep);
  for (let x = CX - 140; x < CX + 140; x += 28) k.rect(x, y + 44, 14, 10, C.gold);
}

// ---------- Lapu-Lapu ----------
function lapulapu() {
  const k = canvas();
  sky(k, 900);
  sunburst(k, CX, 350, 110, 900, 32, 30, 10);
  [[124, C.gold], [114, SEA[3]], [102, C.gold], [92, C.ivory], [84, C.gold]].forEach(([r, c]) => k.ellipse(CX, 350, r, r, c));
  waves(k, 900, 1104);
  vinta(k, 70);
  vinta(k, 70, true);

  // Long hair behind the head and shoulders.
  k.poly([[440, 318], [520, 318], [534, 380], [540, 452], [522, 476], [438, 476], [420, 452], [426, 380]], C.ink);
  // Upper arms hang beside the torso.
  k.both([[374, 438], [414, 444], [414, 542], [382, 550]], C.bronze, C.bronzeDark);
  // Legs set apart in a wide stance (left lit, right in shadow), with the knee and calf shaped.
  k.both([[428, 610], [474, 610], [470, 690], [456, 790], [450, 960], [418, 960], [414, 860], [420, 790], [418, 690]], C.bronze, C.bronzeDark);
  k.both([[408, 956], [452, 956], [456, 978], [394, 978]], C.bronze, C.bronzeDark);
  // Torso, split light and shadow down the centre line: the faceted Deco bronze.
  k.poly([[398, 430], [480, 430], [480, 600], [430, 600], [412, 520]], C.bronze);
  k.poly([[480, 430], [562, 430], [548, 520], [530, 600], [480, 600]], C.bronzeDark);
  k.ellipse(404, 450, 30, 30, C.bronze);
  k.ellipse(556, 450, 30, 30, C.bronzeDark);
  k.poly([[466, 388], [494, 388], [497, 432], [463, 432]], C.bronzeDark); // neck
  // Pintados: Visayan tattoos as chevrons across the chest and bands on the limbs.
  for (let i = 0; i < 4; i++) {
    const y = 462 + i * 16;
    k.band(416 + i * 6, y, CX, y + 34, 5, C.tattoo);
    k.band(CX, y + 34, 544 - i * 6, y, 5, C.tattoo);
  }
  [[470, 8], [484, 4]].forEach(([y, t]) => k.both([[378, y], [414, y + 2], [414, y + 2 + t], [378, y + t]], C.tattoo));
  k.both([[379, 500], [414, 502], [414, 512], [380, 510]], C.gold); // gold armlets
  [[650, 10], [668, 5]].forEach(([y, t]) => k.both([[421, y], [473, y], [472, y + t], [421, y + t]], C.tattoo));
  [[842, 8], [858, 5]].forEach(([y, t]) => k.both([[416, y], [454, y], [453, y + t], [416, y + t]], C.tattoo));
  // Forearms cross in front of the body toward the clasped hands: a lighter bronze with a
  // hard offset shadow so they read clearly against the torso.
  const forearm = [[384, 528], [414, 518], [474, 562], [462, 600]];
  k.both(forearm.map(([x, y]) => [x + 3, y + 5]), C.tattoo);
  k.both(forearm, C.bronzeLight, C.bronze);
  k.both([[398, 532], [412, 527], [420, 534], [406, 541]], C.tattoo);
  // Bahag (loincloth): red waistband and front flap with a gold stripe.
  k.poly([[426, 594], [534, 594], [532, 618], [428, 618]], C.red);
  k.poly([[458, 616], [502, 616], [508, 744], [452, 744]], C.redDark);
  k.rect(452, 726, 56, 8, C.gold);
  // Head, hair cap and the red putong (headcloth) with its tail.
  k.ellipse(CX, 352, 36, 44, C.bronze);
  k.poly([[480, 308], [516, 330], [516, 396], [480, 396]], C.bronzeDark);
  k.poly(k.arcPts(CX, 346, 40, 40, Math.PI, 2 * Math.PI, 40), C.ink);
  k.poly([[440, 326], [520, 326], [520, 342], [440, 342]], C.red);
  k.poly([[516, 330], [568, 352], [562, 366], [512, 342]], C.red);
  k.poly([[512, 340], [552, 380], [540, 386], [508, 346]], C.redDark);
  // Kampilan held point-down: forked pommel, hands, crossguard, broad blade with its spur.
  k.poly([[466, 566], [472, 544], [480, 556], [488, 544], [494, 566]], C.gold);
  k.ellipse(CX + 3, 590, 31, 19, C.tattoo);
  k.ellipse(CX, 586, 30, 18, C.bronzeLight);
  k.poly([[480, 568], [510, 586], [480, 604]], C.bronze);
  k.rect(450, 604, 60, 9, C.gold);
  k.poly([[471, 613], [489, 613], [498, 960], [512, 970], [468, 986], [462, 968]], C.steel);
  k.poly([[479, 618], [482, 618], [484, 950], [477, 950]], C.goldDeep);
  plinth(k, 976);
  tnalak(k, 1104, 96);
  return k.shapes;
}

// ---------- Sultan Kudarat ----------
function kudarat() {
  const k = canvas();
  sky(k, 940);
  sunburst(k, CX, 300, 120, 900, 24, 26, 9);
  // Torogan roof as a canopy over him: a steep saddle roof whose eaves sweep up at the ends,
  // finished with panolong beams that end in okir-style spiral curls.
  k.both([[480, 96], [480, 128], [150, 300], [96, 262]], C.wood);
  k.both([[480, 128], [480, 142], [158, 312], [150, 300]], C.gold);
  k.both([[96, 262], [150, 300], [118, 318], [60, 300], [52, 268]], C.wood);
  for (const side of [-1, 1]) {
    const x = CX + side * 430;
    [[30, C.gold], [22, C.wood], [14, C.gold], [7, C.wood]].forEach(([r, c]) => k.ellipse(x, 300, r, r, c));
    k.poly([[x - side * 4, 318], [x + side * 18, 360], [x + side * 8, 364], [x - side * 12, 322]], C.goldDeep);
  }
  for (let i = 1; i <= 5; i++) { // okir leaf scrolls along each roof slope
    const t = i / 6, x = 480 - t * 320, y = 128 + t * 168;
    [[11, C.goldDeep], [6, C.wood]].forEach(([r, c]) => { k.ellipse(x, y - 8, r, r, c); k.ellipse(2 * CX - x, y - 8, r, r, c); });
  }
  [[124, C.gold], [114, SEA[3]], [102, C.gold], [92, C.ivory], [84, C.gold]].forEach(([r, c]) => k.ellipse(CX, 300, r, r, c));
  waves(k, 940, 1104);

  // Robe: long tunic in sea green with gold trim, split light and shadow; sleeves hang beside it.
  k.both([[372, 400], [412, 404], [410, 552], [378, 560]], SEA[5], SEA[3]);
  k.poly([[400, 392], [480, 392], [480, 944], [404, 944], [418, 640]], SEA[5]);
  k.poly([[480, 392], [560, 392], [542, 640], [556, 944], [480, 944]], SEA[3]);
  k.ellipse(404, 410, 30, 30, SEA[5]);
  k.ellipse(556, 410, 30, 30, SEA[3]);
  k.poly([[462, 392], [498, 392], [480, 470]], C.gold); // collar
  k.rect(470, 470, 20, 474, C.gold); // front placket
  for (let y = 500; y < 940; y += 48) k.poly([[480, y], [490, y + 10], [480, y + 20], [470, y + 10]], C.red);
  k.poly([[404, 930], [556, 930], [556, 944], [404, 944]], C.gold); // hem
  k.both([[404, 640], [418, 640], [404, 944], [392, 944]], C.gold); // side trim
  // Sash (malong-style) at the waist in T'nalak red.
  k.poly([[412, 612], [548, 612], [546, 640], [414, 640]], C.red);
  k.poly([[520, 640], [546, 640], [552, 720], [526, 716]], C.redDark);
  k.poly([[466, 388], [494, 388], [497, 400], [463, 400]], C.bronzeDark); // neck
  // Head with a beard line, and the turban wrapped in bands with a gold crest.
  k.ellipse(CX, 340, 34, 42, C.bronze);
  k.poly([[480, 298], [514, 320], [514, 384], [480, 384]], C.bronzeDark);
  k.poly([[452, 360], [508, 360], [500, 386], [480, 392], [460, 386]], C.ink);
  k.poly(k.arcPts(CX, 316, 50, 40, Math.PI, 2 * Math.PI, 40), C.ivory);
  k.rect(430, 312, 100, 14, C.ivory);
  [[292, C.gold], [304, C.goldDeep]].forEach(([y, c]) => k.band(436, y + 18, 524, y, 4, c));
  k.poly([[480, 262], [490, 284], [480, 300], [470, 284]], C.gold);
  k.ellipse(CX, 304, 7, 7, C.red);
  // Sleeved forearms cross to the hands, with gold cuffs and a hard shadow (as Lapu-Lapu's do).
  const sleeve = [[380, 540], [410, 530], [470, 572], [458, 604]];
  k.both(sleeve.map(([x, y]) => [x + 3, y + 5]), C.ink);
  k.both(sleeve, '#2a6b63', SEA[4]);
  k.both([[446, 572], [458, 562], [470, 572], [460, 586]], C.gold);
  // Kris held point-down before him: pommel, hands, guard, and the wavy blade.
  k.poly([[470, 560], [490, 560], [494, 578], [466, 578]], C.gold);
  k.ellipse(CX + 3, 600, 31, 19, C.ink);
  k.ellipse(CX, 596, 30, 18, C.bronzeLight);
  k.poly([[480, 578], [510, 596], [480, 614]], C.bronze);
  k.rect(452, 614, 56, 9, C.gold);
  const wav = n => Array.from({ length: n + 1 }, (_, i) => [CX + Math.sin(i * 1.1) * 7, 623 + i * 22]);
  const left = wav(14).map(([x, y], i) => [x - 10 + i * 0.5, y]);
  const right = wav(14).map(([x, y], i) => [x + 10 - i * 0.5, y]).reverse();
  k.poly([...left, [CX + Math.sin(14 * 1.1) * 7, 623 + 14 * 22 + 24], ...right], C.steel);
  plinth(k, 944);
  tnalak(k, 1104, 96);
  return k.shapes;
}

// ---------- output: SVG + supersampled PNG ----------
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
};

function render(name, shapes) {
  const f = n => Math.round(n * 10) / 10;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n${
    shapes.map(({ pts, c }) => `<polygon fill="${c}" points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}"/>`).join('\n')}\n</svg>\n`;

  const SS = 3, SW = W * SS, SH = H * SS, big = new Uint8Array(SW * SH * 3);
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  for (const { pts, c } of shapes) {
    const [R0, G0, B0] = hex(c), p = pts.map(([x, y]) => [x * SS, y * SS]), ys = p.map(q => q[1]);
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
    const o = y * (W * 4 + 1) + 1 + x * 4;
    raw[o] = r / 9; raw[o + 1] = g / 9; raw[o + 2] = b / 9; raw[o + 3] = 255;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
  const out = new URL('../public/art/', import.meta.url);
  mkdirSync(out, { recursive: true });
  writeFileSync(new URL(`${name}.svg`, out), svg);
  writeFileSync(new URL(`${name}.png`, out), png);
  console.log(`${name}: ${shapes.length} shapes, png ${png.length} bytes`);
}

const only = process.argv[2];
if (!only || only === 'lapulapu') render('lapulapu', lapulapu());
if (!only || only === 'kudarat') render('kudarat', kudarat());
