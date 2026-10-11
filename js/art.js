// Procedural pixel-art monsters: a 40x40 grid built from simple shapes per body plan, decorated per type, outlined and shaded.
// Each species has its own seed (shape details) and 4 colour variants + a hidden rainbow one.
import { SPECIES, TYPE_INFO, rng } from './data.js?v=1';

const N = 40;
const cache = new Map();

function grid() { return Array.from({ length: N }, () => new Array(N).fill(null)); }
function put(g, x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = c; }
function ell(g, cx, cy, rx, ry, c) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) put(g, x, y, c); }
function rect(g, x0, y0, x1, y1, c) { for (let y = Math.round(y0); y <= y1; y++) for (let x = Math.round(x0); x <= x1; x++) put(g, x, y, c); }
function tri(g, ax, ay, bx, by, cx, cy, c) {
  const minX = Math.floor(Math.min(ax, bx, cx)), maxX = Math.ceil(Math.max(ax, bx, cx)), minY = Math.floor(Math.min(ay, by, cy)), maxY = Math.ceil(Math.max(ay, by, cy));
  const s = (px, py, x1, y1, x2, y2) => (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const d1 = s(x, y, ax, ay, bx, by), d2 = s(x, y, bx, by, cx, cy), d3 = s(x, y, cx, cy, ax, ay);
    if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) put(g, x, y, c);
  }
}
function line(g, x0, y0, x1, y1, w, c) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) + 1; for (let i = 0; i <= n; i++) { const t = i / n; ell(g, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, w / 2, c); } }
function eye(g, x, y, style, big) {
  if (style === 'angry') { rect(g, x - 1, y, x + 1, y + 1, 'E'); put(g, x, y + 1, 'P'); put(g, x - 1, y - 1, 'K'); put(g, x + 1, y - 2, 'K'); return; }
  if (style === 'sleepy') { rect(g, x - 1, y + 1, x + 1, y + 1, 'K'); return; }
  if (big) { rect(g, x - 1, y - 1, x + 1, y + 1, 'E'); rect(g, x - 1, y, x, y + 1, 'P'); put(g, x - 1, y - 1, 'W'); return; }
  rect(g, x, y, x + 1, y + 1, 'E'); put(g, x, y + 1, 'P');
}

// ------------------------------------------------------------------ body plans (all face left); return anchor points for decorations
const BODY = {
  slime(g, r) {
    const rx = 12 + r() * 3, ry = 10 + r() * 2, cy = 26;
    ell(g, 20, cy, rx, ry, 'M'); rect(g, 6, 33, 34, 39, null);
    for (let x = 0; x < N; x++) for (let y = 33; y < N; y++) g[y][x] = null;
    tri(g, 18, cy - ry - 5, 23, cy - ry + 2, 15, cy - ry + 2, 'M');
    ell(g, 21, 29, rx * 0.55, 3, 'S');
    const st = r() < 0.2 ? 'angry' : 'round';
    eye(g, 15, 22, st, true); eye(g, 23, 22, st, true);
    rect(g, 17, 28, 20, 28, 'K');
    return { head: [19, cy - ry - 2], back: [28, cy - ry + 3], tail: [31, 28], face: [15, 22] };
  },
  bug(g, r) {
    ell(g, 27, 26, 8 + r() * 2, 6, 'M'); ell(g, 17, 25, 5, 5, 'M'); ell(g, 10, 22, 5, 5, 'M');
    for (const x of [14, 18, 22]) { line(g, x, 28, x - 2, 35, 1.4, 'K'); }
    if (r() < 0.6) ell(g, 24, 17, 8, 4, 'S');
    for (let i = 0; i < 3; i++) rect(g, 23 + i * 3, 23, 23 + i * 3, 29, 'D');
    tri(g, 5, 24, 8, 25, 6, 27, 'K');
    eye(g, 8, 20, r() < 0.5 ? 'angry' : 'round');
    return { head: [10, 17], back: [27, 20], tail: [35, 27], face: [8, 20] };
  },
  bird(g, r) {
    ell(g, 21, 24, 9, 8, 'M'); ell(g, 13, 15, 6, 6, 'M'); ell(g, 21, 27, 6, 4, 'S');
    tri(g, 7, 14, 1, 16, 7, 18, 'A');
    ell(g, 24, 21, 8, 5, 'S'); tri(g, 28, 18, 38, 14 + r() * 4, 30, 24, 'S');
    tri(g, 29, 26, 38, 30, 29, 30, 'M');
    line(g, 18, 31, 17, 36, 1.2, 'A'); line(g, 23, 31, 23, 36, 1.2, 'A');
    eye(g, 11, 13, r() < 0.4 ? 'angry' : 'round');
    return { head: [14, 9], back: [24, 16], tail: [36, 28], face: [11, 13] };
  },
  beast(g, r) {
    const big = r() * 2;
    ell(g, 22, 25, 10 + big, 6 + big / 2, 'M'); ell(g, 11, 19, 6, 6, 'M'); ell(g, 6, 21, 3, 2, 'S');
    tri(g, 8, 15, 10, 8, 13, 14, 'M'); tri(g, 13, 14, 16, 8, 17, 15, 'M');
    for (const x of [14, 18, 26, 30]) rect(g, x, 29, x + 2, 36, 'M');
    ell(g, 22, 28, 7, 2, 'S');
    line(g, 32, 24, 37, 16 + r() * 4, 2, 'M');
    eye(g, 9, 18, r() < 0.5 ? 'angry' : 'round');
    put(g, 4, 21, 'K');
    return { head: [12, 12], back: [22, 18], tail: [37, 17], face: [9, 18] };
  },
  fish(g, r) {
    ell(g, 19, 21, 12, 7 + r() * 2, 'M'); ell(g, 18, 24, 8, 3, 'S');
    tri(g, 30, 21, 38, 13, 38, 29, 'M');
    tri(g, 14, 15, 22, 9, 24, 16, 'S'); tri(g, 18, 27, 23, 32, 25, 27, 'S');
    eye(g, 11, 19, r() < 0.3 ? 'angry' : 'round', true);
    rect(g, 7, 23, 8, 23, 'K');
    for (let i = 0; i < 3; i++) put(g, 22 + i * 3, 19, 'D');
    return { head: [16, 13], back: [21, 14], tail: [37, 21], face: [11, 19] };
  },
  plant(g, r) {
    ell(g, 20, 29, 9, 7, 'M'); ell(g, 20, 31, 6, 3, 'S');
    const petals = 5 + Math.floor(r() * 3);
    for (let i = 0; i < petals; i++) { const a = (i / petals) * Math.PI * 2; ell(g, 20 + Math.cos(a) * 7, 15 + Math.sin(a) * 7, 4, 4, 'S'); }
    ell(g, 20, 15, 6, 6, 'A');
    tri(g, 11, 27, 3, 22, 9, 31, 'M'); tri(g, 29, 27, 37, 22, 31, 31, 'M');
    eye(g, 17, 14, 'round'); eye(g, 22, 14, 'round');
    rect(g, 19, 18, 21, 18, 'K');
    for (const x of [15, 20, 25]) line(g, x, 35, x + (x - 20) * 0.3, 38, 1.2, 'D');
    return { head: [20, 6], back: [27, 24], tail: [30, 32], face: [17, 14] };
  },
  imp(g, r) {
    ell(g, 17, 15, 7, 7, 'M'); ell(g, 19, 26, 5, 6, 'M'); ell(g, 19, 27, 3, 4, 'S');
    tri(g, 12, 9, 10, 2, 15, 8, 'A'); tri(g, 20, 8, 24, 2, 23, 10, 'A');
    tri(g, 23, 22, 34, 14, 30, 27, 'S');
    line(g, 15, 24, 10, 29, 2, 'M'); line(g, 22, 24, 26, 30, 2, 'M');
    rect(g, 16, 31, 17, 36, 'M'); rect(g, 21, 31, 22, 36, 'M');
    line(g, 23, 30, 33, 34, 1.4, 'M'); tri(g, 33, 32, 37, 34, 33, 36, 'A');
    eye(g, 14, 14, r() < 0.6 ? 'angry' : 'round'); eye(g, 19, 14, r() < 0.6 ? 'angry' : 'round');
    rect(g, 15, 19, 18, 19, 'K'); put(g, 16, 20, 'E');
    return { head: [17, 7], back: [24, 21], tail: [36, 34], face: [14, 14] };
  },
  ghost(g, r) {
    ell(g, 20, 18, 11, 12, 'M');
    rect(g, 9, 18, 31, 31, 'M');
    for (let x = 9; x <= 31; x++) { const h = 31 + Math.round(Math.sin(x * 0.9) * 2); for (let y = h; y < N; y++) g[y][x] = null; for (let y = 18; y < h; y++) if (!g[y][x]) g[y][x] = 'M'; }
    ell(g, 7, 21, 3, 2, 'M'); ell(g, 33, 23, 3, 2, 'M');
    rect(g, 14, 15, 16, 19, 'A'); rect(g, 23, 15, 25, 19, 'A');
    ell(g, 20, 25, 3, 2, 'K');
    if (r() < 0.5) for (let i = 0; i < 4; i++) put(g, 12 + i * 5, 10 + (i % 2), 'S');
    return { head: [20, 5], back: [28, 12], tail: [31, 30], face: [14, 15] };
  },
  golem(g, r) {
    rect(g, 10, 14, 30, 31, 'M'); rect(g, 13, 5, 26, 14, 'M');
    rect(g, 4, 15, 9, 29, 'M'); rect(g, 31, 15, 36, 29, 'M');
    rect(g, 12, 32, 18, 38, 'M'); rect(g, 22, 32, 28, 38, 'M');
    rect(g, 14, 18, 26, 27, 'S');
    rect(g, 15, 8, 24, 10, 'K'); rect(g, 16, 9, 18, 9, 'A'); rect(g, 21, 9, 23, 9, 'A');
    for (let i = 0; i < 4; i++) put(g, 11 + (i * 5) % 18, 15 + (i * 7) % 15, 'D');
    if (r() < 0.6) { tri(g, 4, 15, 6, 9, 9, 15, 'A'); tri(g, 31, 15, 34, 9, 36, 15, 'A'); }
    return { head: [19, 2], back: [30, 10], tail: [36, 30], face: [16, 9] };
  },
  dragon(g, r) {
    tri(g, 20, 20, 34, 2, 36, 18, 'S'); tri(g, 24, 20, 38, 8, 36, 22, 'S');
    ell(g, 22, 26, 10, 7, 'M'); line(g, 15, 23, 11, 13, 4, 'M'); ell(g, 10, 11, 5, 4, 'M'); ell(g, 5, 13, 3, 2, 'M');
    ell(g, 21, 29, 7, 3, 'S');
    line(g, 31, 27, 38, 33, 2.4, 'M'); tri(g, 37, 31, 39, 36, 35, 35, 'A');
    rect(g, 15, 31, 18, 37, 'M'); rect(g, 25, 31, 28, 37, 'M');
    tri(g, 8, 8, 6, 2, 11, 7, 'A'); tri(g, 12, 8, 13, 2, 15, 8, 'A');
    eye(g, 8, 10, 'angry');
    put(g, 3, 13, 'K');
    for (let i = 0; i < 4; i++) tri(g, 18 + i * 4, 19, 20 + i * 4, 15, 22 + i * 4, 19, 'A');
    return { head: [10, 5], back: [24, 18], tail: [38, 32], face: [8, 10] };
  },
};

// ------------------------------------------------------------------ type decorations
const DECOR = {
  fire(g, p) { const [x, y] = p.head; tri(g, x - 3, y + 2, x, y - 6, x + 3, y + 2, 'A'); tri(g, x - 1, y + 2, x + 1, y - 3, x + 2, y + 2, 'W'); const [tx, ty] = p.tail; tri(g, tx - 2, ty, tx + 1, ty - 6, tx + 2, ty + 1, 'A'); },
  water(g, p) { const [x, y] = p.back; tri(g, x - 3, y + 2, x + 2, y - 5, x + 4, y + 2, 'S'); },
  grass(g, p) { const [x, y] = p.head; ell(g, x + 2, y - 2, 3, 1.6, 'A'); line(g, x, y, x + 2, y - 2, 1, 'D'); },
  electric(g, p) { const [x, y] = p.tail; line(g, x, y, x + 2, y - 3, 1.4, 'A'); line(g, x + 2, y - 3, x - 1, y - 5, 1.4, 'A'); line(g, x - 1, y - 5, x + 2, y - 9, 1.4, 'A'); },
  ice(g, p) { const [x, y] = p.back; for (let i = -1; i <= 1; i++) tri(g, x + i * 4 - 1, y + 1, x + i * 4, y - 5 + Math.abs(i) * 2, x + i * 4 + 1, y + 1, 'A'); },
  fight(g, p) { const [x, y] = p.face; rect(g, x - 2, y - 3, x + 9, y - 2, 'A'); line(g, x + 9, y - 3, x + 13, y - 1, 1, 'A'); },
  poison(g, p) { const [x, y] = p.back; for (let i = 0; i < 4; i++) ell(g, x - 4 + i * 3, y + 4 + (i % 2) * 3, 1, 1, 'A'); },
  earth(g, p) { const [x, y] = p.back; rect(g, x - 4, y - 1, x - 1, y + 1, 'A'); rect(g, x + 1, y - 2, x + 4, y, 'A'); },
  wind(g, p) { const [x, y] = p.head; tri(g, x, y + 2, x + 5, y - 5, x + 3, y + 3, 'A'); tri(g, x + 2, y + 3, x + 8, y - 2, x + 5, y + 4, 'S'); },
  psychic(g, p) { const [x, y] = p.face; ell(g, x + 3, y - 4, 1.4, 1.4, 'A'); put(g, x + 3, y - 4, 'W'); },
  bug(g, p) { const [x, y] = p.head; line(g, x, y + 2, x - 3, y - 4, 1, 'K'); line(g, x + 2, y + 2, x + 4, y - 4, 1, 'K'); put(g, x - 3, y - 5, 'A'); put(g, x + 4, y - 5, 'A'); },
  rock(g, p) { const [x, y] = p.back; tri(g, x - 5, y + 2, x - 2, y - 4, x + 1, y + 2, 'A'); tri(g, x, y + 2, x + 3, y - 3, x + 6, y + 2, 'A'); },
  ghost(g, p) { const [x, y] = p.tail; ell(g, x, y - 2, 2, 2, 'A'); ell(g, x + 2, y - 6, 1.4, 1.4, 'A'); },
  dragon(g, p) { const [x, y] = p.head; tri(g, x - 3, y + 3, x - 4, y - 4, x - 1, y + 2, 'A'); tri(g, x + 1, y + 2, x + 3, y - 4, x + 3, y + 3, 'A'); },
  normal(g, p) { const [x, y] = p.head; ell(g, x, y, 3, 2, 'S'); },
};

// ------------------------------------------------------------------ colours
const ACCENT = { fire: '#ffd23a', water: '#d8f2ff', grass: '#4ad04a', electric: '#fff24a', ice: '#f0ffff', fight: '#ff3a3a', poison: '#d070ff', earth: '#8a6a3a',
  wind: '#ffffff', psychic: '#ff4aa0', bug: '#3a3a2a', rock: '#8a8070', ghost: '#e0c0ff', dragon: '#ffe08a', normal: '#fff2d0' };
const LIGHT = { normal: [28, 64], ice: [55, 72], ghost: [42, 46], dragon: [62, 50], electric: [80, 56], rock: [40, 52], earth: [50, 58], bug: [62, 46] };
const hsl = (h, s, l) => `hsl(${((h % 360) + 360) % 360},${Math.max(0, Math.min(100, s))}%,${Math.max(0, Math.min(100, l))}%)`;
export function palette(spId, v) {
  const s = SPECIES[spId - 1], r = rng(s.seed + 3);
  const h0 = TYPE_INFO[s.type].hue + (r() - 0.5) * 24;
  const [sat, lum] = LIGHT[s.type] || [62, 55];
  const h = h0 + [0, 42, -42, 180, 0][v];
  return { M: hsl(h, sat, lum), L: hsl(h, sat, lum + 15), D: hsl(h, sat, lum - 14), S: hsl(h + 28, sat - 8, lum + 14), SL: hsl(h + 28, sat - 8, lum + 26), SD: hsl(h + 28, sat - 8, lum + 2),
    O: hsl(h, sat + 10, 14), A: ACCENT[s.type], E: '#ffffff', P: '#141414', K: hsl(h, 30, 12), W: '#ffffff', rainbow: v === 4, h };
}
export const VARIANT_HUES = (spId) => [0, 1, 2, 3, 4].map((v) => palette(spId, v).M);

function build(spId) {
  const s = SPECIES[spId - 1], r = rng(s.seed);
  const g = grid();
  const anchors = BODY[s.body](g, r);
  DECOR[s.type](g, anchors);
  // a pattern of its own: spots, stripes or a belly band (same body plan, different look)
  const pat = Math.floor(r() * 4), ph = Math.floor(r() * 5);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (g[y][x] !== 'M') continue;
    if (pat === 1 && (x * 7 + y * 13 + ph) % 23 === 0) { g[y][x] = 'S'; if (g[y][x + 1] === 'M') g[y][x + 1] = 'S'; }
    if (pat === 2 && (x + ph) % 6 === 0 && y % 2 === 0) g[y][x] = 'D';
    if (pat === 3 && y === anchors.face[1] + 9 + (ph % 3)) g[y][x] = 'S';
  }
  // shading: light where the pixel above-left is empty, dark where below-right is empty
  const out = grid();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const c = g[y][x];
    if (!c) { const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx]); if (nb) out[y][x] = 'O'; continue; }
    if (c === 'M' || c === 'S') {
      const ul = !(g[y - 1] && g[y - 1][x - 1]), dr = !(g[y + 1] && g[y + 1][x + 1]);
      out[y][x] = c === 'M' ? (ul ? 'L' : dr ? 'D' : 'M') : ul ? 'SL' : dr ? 'SD' : 'S';
    } else out[y][x] = c;
  }
  return out;
}

// draw a monster: returns a canvas (cached). opts: { flip, scale, shadow (silhouette for unseen dex entries) }
export function sprite(spId, v = 0, opts = {}) {
  const scale = opts.scale || 3, key = `${spId}/${v}/${opts.flip ? 1 : 0}/${scale}/${opts.shadow ? 1 : 0}`;
  if (cache.has(key)) return cache.get(key);
  let shape = cache.get('g' + spId);
  if (!shape) { shape = build(spId); cache.set('g' + spId, shape); }
  const pal = palette(spId, v);
  const cv = document.createElement('canvas'); cv.width = cv.height = N * scale;
  const c = cv.getContext('2d');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const k = shape[y][x]; if (!k) continue;
    let col = pal[k] || pal.M;
    if (opts.shadow) col = k === 'O' ? '#0a0a14' : '#2a2a3a';
    else if (pal.rainbow && (k === 'M' || k === 'L' || k === 'D')) col = hsl(x * 9 + y * 6, 85, k === 'L' ? 72 : k === 'D' ? 46 : 60);
    else if (pal.rainbow && k === 'O') col = '#5a3a00';
    c.fillStyle = col;
    c.fillRect((opts.flip ? N - 1 - x : x) * scale, y * scale, scale, scale);
  }
  if (pal.rainbow && !opts.shadow) {           // sparkles
    c.fillStyle = '#ffffff';
    for (const [x, y] of [[6, 6], [33, 9], [30, 34]]) { const X = opts.flip ? N - 1 - x : x; c.fillRect(X * scale, (y - 1) * scale, scale, scale * 3); c.fillRect((X - 1) * scale, y * scale, scale * 3, scale); }
  }
  cache.set(key, cv);
  return cv;
}
export const spriteURL = (spId, v, opts) => { const k = 'u' + spId + '/' + v + JSON.stringify(opts || {}); if (!cache.has(k)) cache.set(k, sprite(spId, v, opts).toDataURL()); return cache.get(k); };
