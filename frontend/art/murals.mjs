// Adlaw Deco murals: original Art Deco figures, generated with no dependencies.
//   lapulapu  Lapu-Lapu of Mactan (Visayas, 1521) on a plinth at the shore, sunburst halo,
//             two Mindanao vintas. Layered SVG (animated on hover) + PNG share image.
//   mactan    Panorama of the Battle of Mactan, 27 April 1521: Lapu-Lapu and his warriors hold
//             the shore while Magellan's men fall back to their boats. Layered SVG (animated).
//   kudarat   Sultan Kudarat of Maguindanao (Mindanao, 1600s) under a torogan roof. PNG.
// Stylized figures: no real portraits of these men exist, and none of this copies a statue or painting.
// Layers are <g class="m-..."> groups that the site's CSS animates; see frontend/src/index.css.
// Run: node frontend/art/murals.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const W = 960, H = 1200, CX = 480;
const SEA = ['#0d1918', '#102624', '#13322f', '#163d39', '#1b4a45', '#205751'];
const C = {
  ivory: '#f4eedf', gold: '#d2ae5c', goldDeep: '#a9823a', ink: '#0a1110',
  bronze: '#9a6440', bronzeDark: '#6e4128', bronzeLight: '#b9805a', tattoo: '#2a160c',
  red: '#b8322a', redDark: '#82241e', steel: '#e9e1cc', yellow: '#e8b53c', green: '#2f7a4a',
  blue: '#2b5fa8', wood: '#3a2416', woodDark: '#2c1b12', sand: '#c8a462', sandDark: '#a8874c',
  armor: '#a9b0b5', armorDark: '#7c848a', cloth: '#3b2f2a', skin: '#d8b28c',
};

// ---------- drawing kit: polygons, optional transform, optional named groups ----------
function canvas(w = W, h = H) {
  const shapes = [];
  let tf = null; // { x, y, ox, oy, s }: local (ox, oy) lands on (x, y), scaled by s
  const T = ([x, y]) => (tf ? [tf.x + (x - tf.ox) * tf.s, tf.y + (y - tf.oy) * tf.s] : [x, y]);
  const poly = (pts, c) => shapes.push({ pts: pts.map(T), c });
  const mirror = pts => pts.map(([x, y]) => [2 * CX - x, y]).reverse();
  const both = (pts, c, cRight = c) => { poly(pts, c); poly(mirror(pts), cRight); };
  const rect = (x, y, rw, rh, c) => poly([[x, y], [x + rw, y], [x + rw, y + rh], [x, y + rh]], c);
  const arcPts = (cx, cy, rx, ry, a0, a1, n = 64) => Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });
  const ellipse = (cx, cy, rx, ry, c) => poly(arcPts(cx, cy, rx, ry, 0, 2 * Math.PI, 48), c);
  const band = (x1, y1, x2, y2, t, c) => {
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy), px = (-dy / l) * t / 2, py = (dx / l) * t / 2;
    poly([[x1 + px, y1 + py], [x2 + px, y2 + py], [x2 - px, y2 - py], [x1 - px, y1 - py]], c);
  };
  const group = (cls, fn, { hidden = false } = {}) => { shapes.push({ open: cls, hidden }); fn(); shapes.push({ close: true }); };
  const place = (t, fn) => { const prev = tf; tf = t; fn(); tf = prev; };
  return { w, h, shapes, defs: [], poly, mirror, both, rect, arcPts, ellipse, band, group, place };
}

function sky(k, horizon) {
  SEA.forEach((c, i) => k.rect(0, (horizon / SEA.length) * i, k.w, horizon / SEA.length + 1, c));
}

function sunburst(k, cx, cy, inner, outer, count, wide, thin, [ca, cb] = [C.gold, C.goldDeep]) {
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count - Math.PI / 2;
    const wd = i % 2 ? thin : wide;
    const [dx, dy, px, py] = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a)];
    k.poly([
      [cx + dx * inner - px * wd * 0.3, cy + dy * inner - py * wd * 0.3],
      [cx + dx * outer - px * wd, cy + dy * outer - py * wd],
      [cx + dx * outer + px * wd, cy + dy * outer + py * wd],
      [cx + dx * inner + px * wd * 0.3, cy + dy * inner + py * wd * 0.3],
    ], i % 2 ? cb : ca);
  }
}

// Rows of Deco scallops. Each row is its own layer (alternate rows drift opposite ways when
// animated), and is drawn two wavelengths wider than the canvas so a drift never shows an edge.
function waves(k, top, bottom, R = 34) {
  const STEP = R * 1.05;
  for (let row = 0; top + row * STEP < bottom; row++) {
    const y = top + row * STEP;
    const water = SEA[Math.max(0, SEA.length - 1 - Math.floor(row / 2))];
    k.group(row % 2 ? 'm-waves-b' : 'm-waves-a', () => {
      k.rect(-R * 4, y, k.w + R * 8, bottom - y, water);
      for (let x = -R * 4 + (row % 2 ? R : 0); x < k.w + R * 4; x += R * 2) {
        k.poly(k.arcPts(x, y + R, R, R, Math.PI, 2 * Math.PI, 12), row % 2 ? C.goldDeep : C.gold);
        k.poly(k.arcPts(x, y + R, R - 5, R - 5, Math.PI, 2 * Math.PI, 12), water);
        k.poly(k.arcPts(x, y + R, R - 12, R - 12, Math.PI, 2 * Math.PI, 10), row % 2 ? C.gold : C.goldDeep);
        k.poly(k.arcPts(x, y + R, R - 17, R - 17, Math.PI, 2 * Math.PI, 10), water);
      }
    });
  }
}

// T'nalak-inspired band: nested diamonds in red, ivory and gold on dark ground (T'boli, Mindanao).
function tnalak(k, top, h) {
  k.rect(0, top, k.w, h, C.ink);
  k.rect(0, top, k.w, 5, C.gold);
  k.rect(0, top + h - 5, k.w, 5, C.gold);
  const cy = top + h / 2, colors = [C.red, C.ivory, C.gold], d = h * 0.31;
  for (let i = 0, x = d / 2; x < k.w + d; i++, x += d * 1.25) {
    const dia = (s, c) => k.poly([[x, cy - s], [x + s * 0.8, cy], [x, cy + s], [x - s * 0.8, cy]], c);
    dia(h / 2 - 12, colors[i % 3]);
    dia(h / 2 - 22, C.ink);
    dia(h / 2 - 30, colors[(i + 1) % 3]);
  }
}

// A Mindanao vinta: dark hull with upturned ends, outrigger, striped lug sail.
function vinta(k, x0, flip = false) {
  const X = x => (flip ? 2 * CX - x : x);
  const P = pts => pts.map(([x, y]) => [X(x0 + x), y]);
  const stripes = [C.red, C.yellow, C.green, C.blue, C.ivory, C.red];
  const sail = [[40, 700], [190, 682], [208, 880], [24, 884]];
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  stripes.forEach((c, i) => {
    const t0 = i / stripes.length, t1 = (i + 1) / stripes.length;
    k.poly(P([lerp(sail[0], sail[1], t0), lerp(sail[0], sail[1], t1), lerp(sail[3], sail[2], t1), lerp(sail[3], sail[2], t0)]), c);
  });
  k.poly(P([[112, 672], [118, 672], [118, 904], [112, 904]]), C.wood);
  k.poly(P([[0, 902], [220, 902], [198, 926], [24, 926]]), C.wood);
  k.poly(P([[0, 902], [-22, 872], [-12, 870], [14, 902]]), C.wood);
  k.poly(P([[220, 902], [242, 872], [232, 870], [206, 902]]), C.wood);
  k.poly(P([[-14, 938], [234, 938], [234, 944], [-14, 944]]), C.goldDeep);
  k.poly(P([[40, 924], [46, 924], [46, 940], [40, 940]]), C.wood);
  k.poly(P([[176, 924], [182, 924], [182, 940], [176, 940]]), C.wood);
}

function plinth(k, y) {
  k.rect(CX - 92, y, 184, 18, C.goldDeep);
  k.rect(CX - 120, y + 18, 240, 20, C.gold);
  k.rect(CX - 148, y + 38, 296, 22, C.goldDeep);
  for (let x = CX - 140; x < CX + 140; x += 28) k.rect(x, y + 44, 14, 10, C.gold);
}

// ---------- the Visayan warrior figure (Lapu-Lapu, and his warriors in the panorama) ----------
// Drawn in mural coordinates: centred on x = 480, feet at y = 978.
// pose: 'clasp' (kampilan held point-down), 'raised' (weapon raised overhead),
//       'both' (clasp shown, raised hidden: the hover animation swaps them).
// weapon: 'kampilan' or 'spear'; shield adds a kalasag in the left hand (raised pose).
function warrior(k, { pose = 'clasp', weapon = 'kampilan', shield = false, cloth = C.red, putong = true } = {}) {
  const animated = pose === 'both';
  const clasp = fn => (pose === 'raised' ? null : animated ? k.group('m-clasp', fn) : fn());
  const raised = (cls, fn) => (pose === 'clasp' ? null : animated ? k.group(cls, fn, { hidden: true }) : fn());

  k.poly([[440, 318], [520, 318], [534, 380], [540, 452], [522, 476], [438, 476], [420, 452], [426, 380]], C.ink); // hair
  k.poly([[374, 438], [414, 444], [414, 542], [382, 550]], C.bronze); // left upper arm
  clasp(() => k.poly(k.mirror([[374, 438], [414, 444], [414, 542], [382, 550]]), C.bronzeDark));
  k.both([[428, 610], [474, 610], [470, 690], [456, 790], [450, 960], [418, 960], [414, 860], [420, 790], [418, 690]], C.bronze, C.bronzeDark);
  k.both([[408, 956], [452, 956], [456, 978], [394, 978]], C.bronze, C.bronzeDark);
  k.poly([[398, 430], [480, 430], [480, 600], [430, 600], [412, 520]], C.bronze);
  k.poly([[480, 430], [562, 430], [548, 520], [530, 600], [480, 600]], C.bronzeDark);
  k.ellipse(404, 450, 30, 30, C.bronze);
  k.ellipse(556, 450, 30, 30, C.bronzeDark);
  k.poly([[466, 388], [494, 388], [497, 432], [463, 432]], C.bronzeDark);
  // Pintados (Visayan tattoos): chest chevrons, limb bands; gold armlets.
  for (let i = 0; i < 4; i++) {
    const y = 462 + i * 16;
    k.band(416 + i * 6, y, CX, y + 34, 5, C.tattoo);
    k.band(CX, y + 34, 544 - i * 6, y, 5, C.tattoo);
  }
  const leftArmMarks = () => {
    [[470, 8], [484, 4]].forEach(([y, t]) => k.poly([[378, y], [414, y + 2], [414, y + 2 + t], [378, y + t]], C.tattoo));
    k.poly([[379, 500], [414, 502], [414, 512], [380, 510]], C.gold);
  };
  leftArmMarks();
  clasp(() => {
    [[470, 8], [484, 4]].forEach(([y, t]) => k.poly(k.mirror([[378, y], [414, y + 2], [414, y + 2 + t], [378, y + t]]), C.tattoo));
    k.poly(k.mirror([[379, 500], [414, 502], [414, 512], [380, 510]]), C.gold);
  });
  [[650, 10], [668, 5]].forEach(([y, t]) => k.both([[421, y], [473, y], [472, y + t], [421, y + t]], C.tattoo));
  [[842, 8], [858, 5]].forEach(([y, t]) => k.both([[416, y], [454, y], [453, y + t], [416, y + t]], C.tattoo));

  // Clasp pose, part 1: forearms crossing to the hands.
  clasp(() => {
    const forearm = [[384, 528], [414, 518], [474, 562], [462, 600]];
    k.both(forearm.map(([x, y]) => [x + 3, y + 5]), C.tattoo);
    k.both(forearm, C.bronzeLight, C.bronze);
    k.both([[398, 532], [412, 527], [420, 534], [406, 541]], C.tattoo);
  });
  // Raised pose: the free left hand rests on the hip.
  raised('m-hip', () => {
    const forearm = [[384, 528], [414, 518], [442, 598], [414, 608]];
    k.poly(forearm.map(([x, y]) => [x + 3, y + 5]), C.tattoo);
    k.poly(forearm, C.bronzeLight);
    k.ellipse(428, 606, 17, 14, C.bronzeLight);
  });

  // Bahag (loincloth), then the head with hair cap and putong (headcloth).
  k.poly([[426, 594], [534, 594], [532, 618], [428, 618]], cloth);
  k.poly([[458, 616], [502, 616], [508, 744], [452, 744]], cloth === C.red ? C.redDark : C.ink);
  k.rect(452, 726, 56, 8, C.gold);
  k.ellipse(CX, 352, 36, 44, C.bronze);
  k.poly([[480, 308], [516, 330], [516, 396], [480, 396]], C.bronzeDark);
  k.poly(k.arcPts(CX, 346, 40, 40, Math.PI, 2 * Math.PI, 32), C.ink);
  if (putong) {
    k.poly([[440, 326], [520, 326], [520, 342], [440, 342]], C.red);
    k.group('w-putong', () => { // the headcloth tail: flutters in the sea wind
      k.poly([[516, 330], [568, 352], [562, 366], [512, 342]], C.red);
      k.poly([[512, 340], [552, 380], [540, 386], [508, 346]], C.redDark);
    });
  }

  // Clasp pose, part 2: forked pommel, hands, guard and the kampilan, point-down.
  clasp(() => {
    k.poly([[466, 566], [472, 544], [480, 556], [488, 544], [494, 566]], C.gold);
    k.ellipse(CX + 3, 590, 31, 19, C.tattoo);
    k.ellipse(CX, 586, 30, 18, C.bronzeLight);
    k.poly([[480, 568], [510, 586], [480, 604]], C.bronze);
    k.rect(450, 604, 60, 9, C.gold);
    k.poly([[471, 613], [489, 613], [498, 960], [512, 970], [468, 986], [462, 968]], C.steel);
    k.poly([[479, 618], [482, 618], [484, 950], [477, 950]], C.goldDeep);
  });

  // Raised pose: right arm lifts the weapon overhead. When animated this layer rotates up
  // from the shoulder (556, 446).
  raised('m-raise', () => {
    k.poly([[536, 440], [574, 452], [614, 366], [584, 350]], C.bronzeDark);
    k.band(560, 398, 590, 413, 8, C.gold);
    k.poly([[584, 362], [614, 362], [608, 268], [580, 272]], C.bronze);
    const d = [0.16, -0.987], p = [0.987, 0.16], b = [596, 240];
    const at = (t, s) => [b[0] + d[0] * t + p[0] * s, b[1] + d[1] * t + p[1] * s];
    if (weapon === 'spear') {
      k.band(...at(-260, 0), ...at(300, 0), 7, C.wood);
      k.poly([at(300, -10), at(352, 0), at(300, 10)], C.steel);
      k.band(...at(296, -11), ...at(296, 11), 5, C.gold);
    } else {
      k.poly([[584, 282], [590, 300], [594, 290], [598, 300], [604, 282]], C.gold);
      k.band(...at(0, -28), ...at(0, 28), 9, C.gold);
      const L = 230;
      k.poly([at(0, -8), at(L - 24, -13), at(L, -10), at(L - 6, 13), at(L - 30, 20), at(L - 40, 12), at(0, 8)], C.steel);
      k.band(...at(4, 0), ...at(L - 34, 0), 3, C.goldDeep);
    }
    k.ellipse(597, 266, 19, 17, C.tattoo);
    k.ellipse(594, 262, 18, 16, C.bronzeLight);
  });

  if (shield && pose === 'raised') { // kalasag: tall narrow shield, red and ivory
    k.poly([[352, 470], [412, 462], [420, 760], [360, 770]], C.ivory);
    k.poly([[364, 486], [404, 480], [410, 744], [370, 752]], C.red);
    k.band(386, 486, 390, 748, 6, C.ink);
  }
}

// ---------- Spanish soldier and ships, for the panorama (local origin: feet / waterline) ----------
function soldier(k) {
  k.poly([[-26, -140], [-4, -140], [-6, -36], [-24, -36]], C.cloth);
  k.poly([[4, -140], [26, -140], [24, -36], [6, -36]], C.cloth);
  k.rect(-26, -38, 22, 38, C.ink);
  k.rect(4, -38, 22, 38, C.ink);
  k.poly([[-60, -232], [-40, -236], [-30, -150], [-46, -146]], C.cloth); // arms
  k.poly([[60, -232], [40, -236], [30, -150], [46, -146]], C.cloth);
  k.poly([[-40, -244], [40, -244], [32, -136], [-32, -136]], C.armor); // breastplate
  k.poly([[0, -244], [40, -244], [32, -136], [0, -136]], C.armorDark);
  k.rect(-32, -146, 64, 10, C.ink);
  k.ellipse(0, -266, 16, 19, C.skin);
  k.poly([[-12, -262], [12, -262], [8, -246], [-8, -246]], C.cloth); // beard
  k.poly([[-44, -276], [-20, -288], [20, -288], [44, -276], [18, -282], [-18, -282]], C.armor); // morion brim
  k.poly(k.arcPts(0, -284, 20, 18, Math.PI, 2 * Math.PI, 20), C.armor);
  k.poly([[-5, -318], [5, -318], [14, -288], [-14, -288]], C.steel); // comb
  k.band(-50, -150, 60, -420, 4, C.wood); // pike, slanting back as they withdraw
  k.poly([[56, -412], [66, -440], [64, -410]], C.steel);
}

function galleon(k) {
  k.poly([[-170, -40], [-140, 0], [140, 0], [170, -50], [176, -98], [118, -98], [114, -46], [-120, -46], [-126, -72], [-166, -72]], C.woodDark);
  k.rect(-140, -26, 280, 6, C.goldDeep);
  [[-80, -300, 110], [12, -340, 130], [96, -270, 90]].forEach(([x, top, sw]) => {
    k.rect(x - 3, top, 6, -46 - top, C.woodDark);
    const sail = (y, h) => {
      k.rect(x - sw / 2, y, sw, h, '#ece3cc');
      k.band(x - sw / 2 + 8, y + 6, x + sw / 2 - 8, y + h - 6, 7, C.red); // the red saltire on the sails
      k.band(x + sw / 2 - 8, y + 6, x - sw / 2 + 8, y + h - 6, 7, C.red);
    };
    sail(top + 30, (-46 - top) * 0.38);
    sail(top + 40 + (-46 - top) * 0.4, (-46 - top) * 0.36);
    k.poly([[x, top], [x + 34, top + 8], [x, top + 16]], C.red);
  });
}

function longboat(k) {
  k.poly([[-110, -18], [110, -18], [86, 8], [-86, 8]], C.woodDark);
  for (let x = -70; x <= 70; x += 35) k.band(x, -14, x - 26, 26, 4, C.wood);
}

// ---------- Lapu-Lapu (home mural) ----------
function lapulapu() {
  const k = canvas();
  sky(k, 900);
  k.group('m-rays', () => sunburst(k, CX, 350, 110, 900, 32, 30, 10));
  [[124, C.gold], [114, SEA[3]], [102, C.gold], [92, C.ivory], [84, C.gold]].forEach(([r, c]) => k.ellipse(CX, 350, r, r, c));
  waves(k, 900, 1104);
  k.group('m-boat m-boat-l', () => vinta(k, 70));
  k.group('m-boat m-boat-r', () => vinta(k, 70, true));
  warrior(k, { pose: 'both' });
  plinth(k, 976);
  tnalak(k, 1104, 96);
  return k;
}

// ---------- The Battle of Mactan (story panorama) ----------
function mactan() {
  const k = canvas(1600, 900);
  const HZ = 600;
  sky(k, HZ);
  k.group('m-rays', () => sunburst(k, 1100, HZ, 140, 1500, 44, 34, 12));
  [[150, C.gold], [138, SEA[3]], [124, C.gold], [110, C.ivory], [100, C.gold]].forEach(([r, c]) =>
    k.poly([...k.arcPts(1100, HZ, r, r, Math.PI, 2 * Math.PI, 48), [1100 + r, HZ]], c));
  k.group('m-ship m-ship-1', () => k.place({ x: 330, y: HZ + 6, ox: 0, oy: 0, s: 0.72 }, () => galleon(k)));
  k.group('m-ship m-ship-2', () => k.place({ x: 640, y: HZ + 14, ox: 0, oy: 0, s: 0.5 }, () => galleon(k)));
  waves(k, HZ, 790, 30);
  k.group('m-boat m-longboat', () => k.place({ x: 250, y: 742, ox: 0, oy: 0, s: 1 }, () => longboat(k)));
  k.group('m-retreat', () => {
    [[170, 0.5], [300, 0.56], [400, 0.52], [500, 0.6]].forEach(([x, s]) => k.place({ x, y: 800, ox: 0, oy: 0, s }, () => soldier(k)));
  });
  k.group('m-surf', () => waves(k, 748, 832, 22)); // the shallows over the reef, around their legs
  // The shore of Mactan: sand with Deco stripes and dark reef stones.
  k.poly([[620, 830], [700, 792], [1600, 770], [1600, 830]], C.sand);
  for (let i = 0; i < 4; i++) k.poly([[700 + i * 40, 800 - i * 2], [1600, 778 + i * 12], [1600, 782 + i * 12], [704 + i * 40, 804 - i * 2]], C.sandDark);
  [[760, 812, 34, 16], [1480, 800, 46, 20], [1560, 812, 40, 16]].forEach(([x, y, rx, ry]) => k.ellipse(x, y, rx, ry, '#1d2b29'));
  // Warriors of Mactan, weapons raised; they rise into place when the page opens.
  [[860, 0.44, 'm-w1', C.ink], [1300, 0.46, 'm-w2', C.red], [1430, 0.42, 'm-w3', C.ink], [740, 0.4, 'm-w4', C.red]].forEach(([x, s, cls, cloth]) =>
    k.group(`m-warrior ${cls}`, () => k.place({ x, y: 812, ox: CX, oy: 978, s }, () => warrior(k, { pose: 'raised', weapon: 'spear', shield: true, cloth, putong: cls === 'm-w2' }))));
  k.group('m-hero', () => {
    [[78, C.gold], [70, SEA[3]], [62, C.gold], [56, C.ivory]].forEach(([r, c]) => k.ellipse(1100, 822 - (978 - 352) * 0.62, r, r, c));
    k.place({ x: 1100, y: 822, ox: CX, oy: 978, s: 0.62 }, () => warrior(k, { pose: 'raised' }));
  });
  tnalak(k, 830, 70);
  return k;
}

// ---------- The living world (home arch and story banner share it) ----------
// One 1600 x 900 scene. The site shows it through a camera: a tight crop on Lapu-Lapu inside the
// home arch, the whole shore in the story banner. Groups named w-* carry two states in CSS
// (.is-arch / .is-panorama) so every element travels to its place when the camera pulls back.
// Groups drawn around (0, 0) are positioned by CSS (the rays).
const HERO = { x: 1100, y: 822, s: 0.62 };
const heroPoint = (lx, ly) => [HERO.x + (lx - CX) * HERO.s, HERO.y + (ly - 978) * HERO.s];

function palm(k, x, y, h, lean) {
  k.group('w-palm', () => {
    const pts = Array.from({ length: 9 }, (_, i) => {
      const t = i / 8;
      return [x + lean * Math.sin((t * Math.PI) / 2) * h * 0.28, y - t * h];
    });
    for (let i = 0; i < 8; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      k.band(x1, y1, x2, y2 - 2, 14 - i * 0.8, i % 2 ? '#4a3220' : '#3a2416');
    }
    const [cx, cy] = pts[8];
    const leaf = (a, L, c) => {
      const dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
      const mid = [cx + dx * L * 0.5 + px * 6, cy + dy * L * 0.5 - L * 0.08];
      const tip = [cx + dx * L, cy + dy * L + L * 0.28];
      k.poly([[cx + px * 4, cy + py * 4], [mid[0] + px * 12, mid[1] + py * 12], tip, [mid[0] - px * 9, mid[1] - py * 9], [cx - px * 4, cy - py * 4]], c);
      k.band(cx, cy, mid[0], mid[1], 2, C.goldDeep);
    };
    [[-2.9, 96, '#21523a'], [-2.4, 110, '#2f6a4a'], [-1.9, 84, '#21523a'], [-1.25, 86, '#2f6a4a'], [-0.7, 108, '#21523a'], [-0.2, 98, '#2f6a4a'], [0.35, 80, '#21523a'], [2.8, 76, '#2f6a4a']]
      .forEach(([a, L, c]) => leaf(a, L, c));
    [[-6, 8], [6, 9], [0, 14]].forEach(([ox, oy]) => k.ellipse(cx + ox, cy + oy, 7, 7, '#5a3b1e'));
  });
}

// SVG gradients for the poster look (world.svg only; the PNG murals keep flat fills).
const stops = list => list.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('');
const linear = (k, id, y1, y2, list) => k.defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${y1}" x2="0" y2="${y2}">${stops(list)}</linearGradient>`);
const radial = (k, id, list, at = '') => k.defs.push(`<radialGradient id="${id}" ${at}>${stops(list)}</radialGradient>`);

function world() {
  const k = canvas(1600, 900);
  const HZ = 600;
  // Poster sky: night at the top, banded down to an amber horizon, as on 1930s travel posters.
  linear(k, 'w-sky', 0, HZ, [[0, '#061010'], [0.35, '#0d1918'], [0.62, '#163d39'], [0.82, '#3d5f4c'], [0.94, '#a98a4e'], [1, '#d9b46a']]);
  linear(k, 'w-hill-far', 500, HZ, [[0, '#2a4a40'], [1, '#12302c']]); // the far range hazier: aerial depth
  linear(k, 'w-hill-near', 548, HZ, [[0, '#183632'], [1, '#0f2523']]);
  radial(k, 'w-ray', [[0, '#f7e6b8', 0.95], [0.3, '#d2ae5c', 0.7], [1, '#a9823a', 0.05]], 'gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1500"');
  radial(k, 'w-ray-deep', [[0, '#d2ae5c', 0.85], [0.3, '#a9823a', 0.5], [1, '#6e5420', 0]], 'gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1500"');
  radial(k, 'w-core', [[0, '#fffaf0'], [1, '#f0d79a']]);
  radial(k, 'w-glow', [[0, '#ffe6a8', 0.55], [0.5, '#e8b860', 0.2], [1, '#e8b860', 0]]);
  linear(k, 'w-seaglow', HZ, HZ + 140, [[0, '#f0c878', 0.35], [1, '#f0c878', 0]]);
  linear(k, 'w-reflect', HZ, 830, [[0, '#fff0c8', 0.6], [0.6, '#f0c878', 0.18], [1, '#f0c878', 0]]);
  linear(k, 'w-sand', 752, 830, [[0, '#dcbc7a'], [1, '#a8874c']]);
  k.rect(0, 0, k.w, HZ + 1, 'url(#w-sky)');
  // Across the strait: the hills of Cebu, two ranges deep.
  k.poly([[-40, 600], [-40, 548], [80, 520], [190, 540], [300, 500], [420, 534], [560, 512], [700, 548], [820, 556], [880, 600]], 'url(#w-hill-far)');
  k.poly([[-40, 600], [-40, 572], [120, 556], [260, 566], [380, 548], [520, 566], [660, 574], [780, 600]], 'url(#w-hill-near)');
  k.group('w-rays', () => k.group('w-par w-par-far', () => k.group('w-spin', () => sunburst(k, 0, 0, 120, 1500, 44, 34, 12, ['url(#w-ray)', 'url(#w-ray-deep)']))));
  k.group('w-sun', () => {
    k.ellipse(1100, HZ, 560, 330, 'url(#w-glow)');
    [[150, C.gold], [138, SEA[3]], [124, C.gold], [110, 'url(#w-core)'], [100, C.gold]].forEach(([r, c]) =>
      k.poly([...k.arcPts(1100, HZ, r, r, Math.PI, 2 * Math.PI, 48), [1100 + r, HZ]], c));
  });
  [[330, 6, 0.72, 'w-ship-1'], [640, 14, 0.5, 'w-ship-2']].forEach(([x, dy, s, cls]) =>
    k.group(`w-ship ${cls}`, () => k.group('w-bob', () => k.place({ x, y: HZ + dy, ox: 0, oy: 0, s }, () => galleon(k)))));
  k.group('w-par w-par-mid', () => waves(k, HZ, 790, 30));
  // Sunlight on the water. Inside .w-sun so it rises (and sets) with the sun; .w-glint shimmers.
  k.group('w-sun', () => k.group('w-glint', () => {
    k.rect(0, HZ, k.w, 140, 'url(#w-seaglow)');
    k.poly([[1046, HZ], [1154, HZ], [1290, 830], [910, 830]], 'url(#w-reflect)');
  }));
  k.group('w-vinta w-vinta-l', () => k.group('w-bob', () => k.place({ x: 950, y: 768, ox: 180, oy: 944, s: 0.45 }, () => vinta(k, 70))));
  k.group('w-vinta w-vinta-r', () => k.group('w-bob', () => k.place({ x: 1250, y: 768, ox: 780, oy: 944, s: 0.45 }, () => vinta(k, 70, true))));
  k.group('w-retreat', () => {
    k.group('w-bob', () => k.place({ x: 250, y: 742, ox: 0, oy: 0, s: 1 }, () => longboat(k)));
    [[170, 0.5], [300, 0.56], [400, 0.52], [500, 0.6]].forEach(([x, s]) =>
      k.group('w-wade', () => k.place({ x, y: 800, ox: 0, oy: 0, s }, () => soldier(k))));
  });
  k.group('w-surf', () => waves(k, 748, 832, 22));
  // The island of Mactan: a low shore of sand and reef stone, coconut palms along it.
  k.poly([[620, 830], [700, 792], [1020, 780], [1600, 752], [1600, 830]], 'url(#w-sand)');
  for (let i = 0; i < 4; i++) k.poly([[700 + i * 40, 800 - i * 2], [1600, 760 + i * 14], [1600, 764 + i * 14], [704 + i * 40, 804 - i * 2]], C.sandDark);
  palm(k, 1560, 790, 300, -1);
  palm(k, 1500, 800, 250, -0.6);
  palm(k, 1335, 792, 230, 0.7);
  palm(k, 690, 806, 210, -0.9);
  [[760, 812, 34, 16], [1480, 800, 46, 20], [1560, 812, 40, 16]].forEach(([x, y, rx, ry]) => k.ellipse(x, y, rx, ry, '#1d2b29'));
  [[860, 0.44, 'w1', C.ink], [1300, 0.46, 'w2', C.red], [1430, 0.42, 'w3', C.ink], [740, 0.4, 'w4', C.red]].forEach(([x, s, cls, cloth]) =>
    k.group(`w-warrior ${cls}`, () => k.group('w-sway', () => k.place({ x, y: 812, ox: CX, oy: 978, s }, () =>
      warrior(k, { pose: 'raised', weapon: 'spear', shield: true, cloth, putong: cls === 'w2' })))));
  k.group('w-hero', () => k.group('w-par w-par-near', () => {
    const [hx, hy] = heroPoint(CX, 352);
    k.group('w-halo', () => [[78, C.gold], [70, SEA[3]], [62, C.gold], [56, C.ivory]].forEach(([r, c]) => k.ellipse(hx, hy, r, r, c)));
    k.place({ x: HERO.x, y: HERO.y, ox: CX, oy: 978, s: HERO.s }, () => {
      plinth(k, 976);
      k.group('w-breathe', () => warrior(k, { pose: 'both' }));
    });
  }));
  tnalak(k, 830, 70);
  return k;
}

// ---------- Sultan Kudarat (login and sign-up pages) ----------
function kudarat() {
  const k = canvas();
  sky(k, 940);
  sunburst(k, CX, 300, 120, 900, 24, 26, 9);
  k.both([[480, 96], [480, 128], [150, 300], [96, 262]], C.wood);
  k.both([[480, 128], [480, 142], [158, 312], [150, 300]], C.gold);
  k.both([[96, 262], [150, 300], [118, 318], [60, 300], [52, 268]], C.wood);
  for (const side of [-1, 1]) {
    const x = CX + side * 430;
    [[30, C.gold], [22, C.wood], [14, C.gold], [7, C.wood]].forEach(([r, c]) => k.ellipse(x, 300, r, r, c));
    k.poly([[x - side * 4, 318], [x + side * 18, 360], [x + side * 8, 364], [x - side * 12, 322]], C.goldDeep);
  }
  for (let i = 1; i <= 5; i++) {
    const t = i / 6, x = 480 - t * 320, y = 128 + t * 168;
    [[11, C.goldDeep], [6, C.wood]].forEach(([r, c]) => { k.ellipse(x, y - 8, r, r, c); k.ellipse(2 * CX - x, y - 8, r, r, c); });
  }
  [[124, C.gold], [114, SEA[3]], [102, C.gold], [92, C.ivory], [84, C.gold]].forEach(([r, c]) => k.ellipse(CX, 300, r, r, c));
  waves(k, 940, 1104);
  k.both([[372, 400], [412, 404], [410, 552], [378, 560]], SEA[5], SEA[3]);
  k.poly([[400, 392], [480, 392], [480, 944], [404, 944], [418, 640]], SEA[5]);
  k.poly([[480, 392], [560, 392], [542, 640], [556, 944], [480, 944]], SEA[3]);
  k.ellipse(404, 410, 30, 30, SEA[5]);
  k.ellipse(556, 410, 30, 30, SEA[3]);
  k.poly([[462, 392], [498, 392], [480, 470]], C.gold);
  k.rect(470, 470, 20, 474, C.gold);
  for (let y = 500; y < 940; y += 48) k.poly([[480, y], [490, y + 10], [480, y + 20], [470, y + 10]], C.red);
  k.poly([[404, 930], [556, 930], [556, 944], [404, 944]], C.gold);
  k.both([[404, 640], [418, 640], [404, 944], [392, 944]], C.gold);
  k.poly([[412, 612], [548, 612], [546, 640], [414, 640]], C.red);
  k.poly([[520, 640], [546, 640], [552, 720], [526, 716]], C.redDark);
  k.poly([[466, 388], [494, 388], [497, 400], [463, 400]], C.bronzeDark);
  k.ellipse(CX, 340, 34, 42, C.bronze);
  k.poly([[480, 298], [514, 320], [514, 384], [480, 384]], C.bronzeDark);
  k.poly([[452, 360], [508, 360], [500, 386], [480, 392], [460, 386]], C.ink);
  k.poly(k.arcPts(CX, 316, 50, 40, Math.PI, 2 * Math.PI, 40), C.ivory);
  k.rect(430, 312, 100, 14, C.ivory);
  [[292, C.gold], [304, C.goldDeep]].forEach(([y, c]) => k.band(436, y + 18, 524, y, 4, c));
  k.poly([[480, 262], [490, 284], [480, 300], [470, 284]], C.gold);
  k.ellipse(CX, 304, 7, 7, C.red);
  const sleeve = [[380, 540], [410, 530], [470, 572], [458, 604]];
  k.both(sleeve.map(([x, y]) => [x + 3, y + 5]), C.ink);
  k.both(sleeve, '#2a6b63', SEA[4]);
  k.both([[446, 572], [458, 562], [470, 572], [460, 586]], C.gold);
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
  return k;
}

// ---------- output ----------
const f = n => Math.round(n); // whole user units: invisible at display size, much smaller files
function toSvg(k) {
  const body = k.shapes.map(s => {
    if (s.open) return `<g class="${s.open}">`;
    if (s.close) return '</g>';
    return `<polygon fill="${s.c}" points="${s.pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}"/>`;
  }).join('');
  const defs = k.defs.length ? `<defs>${k.defs.join('')}</defs>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${k.w} ${k.h}" preserveAspectRatio="xMidYMid slice">${defs}${body}</svg>\n`;
}

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
};
// PNG of the resting state: shapes inside hidden layers are skipped. 3x supersampled.
function toPng(k) {
  const { w, h } = k, SS = 3, SW = w * SS, SH = h * SS, big = new Uint8Array(SW * SH * 3);
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const hiddenStack = [];
  for (const s of k.shapes) {
    if (s.open) { hiddenStack.push(s.hidden); continue; }
    if (s.close) { hiddenStack.pop(); continue; }
    if (hiddenStack.includes(true)) continue;
    const [R0, G0, B0] = hex(s.c), p = s.pts.map(([x, y]) => [x * SS, y * SS]), ys = p.map(q => q[1]);
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
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0;
    for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) {
      const o = ((y * SS + j) * SW + x * SS + i) * 3; r += big[o]; g += big[o + 1]; b += big[o + 2];
    }
    const o = y * (w * 4 + 1) + 1 + x * 4;
    raw[o] = r / 9; raw[o + 1] = g / 9; raw[o + 2] = b / 9; raw[o + 3] = 255;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const pub = new URL('../public/art/', import.meta.url), src = new URL('../src/art/', import.meta.url);
mkdirSync(pub, { recursive: true });
mkdirSync(src, { recursive: true });
// world.svg is the living scene the site animates; the PNGs are share images and the login art.
const jobs = { world: [world, true, false], lapulapu: [lapulapu, false, true], mactan: [mactan, false, true], kudarat: [kudarat, false, true] };
for (const [name, [draw, svg, png]] of Object.entries(jobs)) {
  if (process.argv[2] && process.argv[2] !== name) continue;
  const k = draw();
  if (svg) writeFileSync(new URL(`${name}.svg`, src), toSvg(k));
  if (png) writeFileSync(new URL(`${name}.png`, pub), toPng(k));
  console.log(`${name}: ${k.shapes.filter(s => s.pts).length} shapes`);
}
