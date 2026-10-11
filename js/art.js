// Procedural pixel monsters in a friendly Dragon-Quest-like style: front-facing, chunky, big glossy eyes, wide smiles,
// bold outlines and 4-tone shading. A 56x56 grid of part keys is built from shapes per body plan, decorated per type,
// varied per species (eyes, mouth, size, extras), then outlined and shaded. 4 colour variants + a hidden rainbow one.
import { SPECIES, TYPE_INFO, rng } from './data.js?v=2';

const N = 56, CX = 27.5;
const cache = new Map();

// ------------------------------------------------------------------ raster helpers (keys: M main, S belly, A accent, H horn, W wing,
// K dark line, E eye white, P pupil, G gloss, R mouth, T tongue, Y teeth, C crown)
function grid() { return Array.from({ length: N }, () => new Array(N).fill(null)); }
function put(g, x, y, c, only) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < N && y < N && (!only || only.includes(g[y][x]))) g[y][x] = c; }
function ell(g, cx, cy, rx, ry, c, only) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) put(g, x, y, c, only); }
function poly(g, pts, c, only) {
  const ys = pts.map((p) => p[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
  for (let y = y0; y <= y1; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) xs.push(ax + ((y + 0.5 - ay) / (by - ay)) * (bx - ax)); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) put(g, x, y, c, only);
  }
}
function line(g, x0, y0, x1, y1, w, c) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1; for (let i = 0; i <= n; i++) { const t = i / n; ell(g, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, w / 2, c); } }
const mx = (x) => 2 * CX - x;                                     // mirror an x coordinate
function sym(fn) { fn(1, (x) => x); fn(-1, mx); }                 // draw something and its mirror image
const mpts = (pts) => pts.map(([x, y]) => [mx(x), y]);

// big glossy eye (DQ style). style: round | lid | angry | dot
function eye(g, x, y, s, style, side) {
  if (style === 'dot') { ell(g, x, y, 1.6 * s, 2.2 * s, 'P'); put(g, x - side * 0.5, y - 1, 'G'); return; }
  ell(g, x, y, 3.2 * s, 4 * s, 'E');
  ell(g, x + side * 0.6, y + 0.8 * s, 1.9 * s, 2.6 * s, 'P');
  ell(g, x + side * 0.1, y - 0.3 * s, 0.8, 0.9, 'G');
  if (style === 'lid') for (let yy = Math.floor(y - 4 * s); yy <= y - 1.2 * s; yy++) for (let xx = Math.floor(x - 4 * s); xx <= x + 4 * s; xx++) if (g[yy] && (g[yy][xx] === 'E' || g[yy][xx] === 'P' || g[yy][xx] === 'G')) g[yy][xx] = 'M';
  if (style === 'angry') line(g, x - side * 3.4 * s, y - 5.4 * s, x + side * 2.6 * s, y - 3.2 * s, 1.4, 'K');
}
// wide DQ smile: an open mouth with a tongue (or a fanged grin)
function mouth(g, cx, y, w, h, style) {
  if (style === 'line') { for (let x = -w; x <= w; x++) put(g, cx + x, y + Math.round((x / w) ** 2 * -2 + 2), 'K'); return; }
  for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++) {
    const u = (x - cx) / w; if (Math.abs(u) > 1) continue;
    const top = y + (1 - u * u) * h * 0.18, bot = y + (1 - u * u) * h;
    for (let yy = Math.round(top); yy <= Math.round(bot); yy++) put(g, x, yy, 'R');
  }
  if (style !== 'grin') ell(g, cx + 0.5, y + h * 0.78, w * 0.48, h * 0.32, 'T', ['R']);
  if (style === 'fang' || style === 'grin') sym((d, X) => poly(g, [[X(cx - w * 0.62), y + 0.2], [X(cx - w * 0.38), y + 0.2], [X(cx - w * 0.5), y + h * 0.5]], 'Y', ['R', 'M', 'S', null]));
  if (style === 'grin') for (let x = Math.ceil(cx - w * 0.7); x <= cx + w * 0.7; x += 2) put(g, x, y + h * 0.35, 'Y', ['R']);
}

// ------------------------------------------------------------------ body plans (front view). return anchors: top, eyes y, mouth y, back
const BODY = {
  slime(g, r, f) {
    const s = 0.92 + r() * 0.16, rx = 19 * s, ry = 14 * s, cy = 39;
    ell(g, CX, cy, rx, ry, 'M');
    poly(g, [[CX - 13 * s, cy - 6], [CX - 3, cy - 26 * s], [CX + 1, cy - 28 * s], [CX + 13 * s, cy - 6]], 'M');
    ell(g, CX - 1, cy - 9, 11 * s, 9, 'M');
    for (let y = 52; y < N; y++) for (let x = 0; x < N; x++) g[y][x] = null;
    if (f.curl) { line(g, CX + 1, cy - 27 * s, CX + 5, cy - 29 * s, 2.4, 'M'); line(g, CX + 5, cy - 29 * s, CX + 6, cy - 26 * s, 2, 'M'); }
    const ey = cy - 3;
    sym((d, X) => eye(g, X(CX - 7 * s), ey, 1.05, f.eyes, d));
    mouth(g, CX, ey + 6, 8 * s, 6, f.mouth);
    ell(g, CX - 10 * s, cy - 10, 2.6, 4, 'G', ['M']); put(g, CX - 7 * s, cy - 15, 'G', ['M']);
    return { top: [CX, cy - 28 * s], eyeY: ey, back: [CX + 12, cy - 10], hand: [CX + rx - 2, cy + 4], s };
  },
  bug(g, r, f) {
    // armoured beetle: shell body, big head with mandibles, six stubby legs
    sym((d, X) => { for (const [y, len] of [[40, 8], [45, 9], [49, 7]]) line(g, X(CX - 12), y, X(CX - 12 - len), y + 3, 2.2, 'K'); });
    ell(g, CX, 41, 15, 11, 'M'); for (let y = 31; y <= 51; y++) put(g, CX, y, 'K', ['M']); put(g, CX + 1, 33, 'K', ['M']);
    sym((d, X) => ell(g, X(CX - 7), 38, 3, 2, 'S', ['M']));
    ell(g, CX, 24, 12, 10, 'M'); ell(g, CX, 27, 8, 5, 'S');
    sym((d, X) => { poly(g, [[X(CX - 6), 31], [X(CX - 11), 36], [X(CX - 6), 39], [X(CX - 3), 34]], 'H'); });
    sym((d, X) => { line(g, X(CX - 5), 15, X(CX - 9), 6, 1.4, 'K'); ell(g, X(CX - 9.5), 5.5, 1.6, 1.6, 'A'); });
    sym((d, X) => eye(g, X(CX - 6), 22, 1.05, f.eyes === 'dot' ? 'round' : f.eyes, d));
    mouth(g, CX, 28, 3.5, 3, 'line');
    return { top: [CX, 13], eyeY: 22, back: [CX + 10, 33], hand: [CX + 13, 44], s: 1 };
  },
  bird(g, r, f) {
    // chubby round bird with spread wings
    sym((d, X) => poly(g, [[X(CX - 12), 26], [X(CX - 27), 20], [X(CX - 25), 27], [X(CX - 27), 31], [X(CX - 23), 33], [X(CX - 24), 37], [X(CX - 13), 38]], 'W'));
    sym((d, X) => { for (const y of [27, 32]) line(g, X(CX - 15), y + 2, X(CX - 23), y, 1, 'K'); });
    ell(g, CX, 34, 15, 14, 'M'); ell(g, CX, 39, 9, 8, 'S');
    sym((d, X) => poly(g, [[X(CX - 4), 47], [X(CX - 7), 53], [X(CX - 2), 53]], 'A'));
    sym((d, X) => poly(g, [[X(CX - 2), 21], [X(CX - 6), 13], [X(CX + 1), 19]], 'M'));
    poly(g, [[CX - 0.5, 22], [CX + 4, 15], [CX + 3, 22]], 'M');
    sym((d, X) => eye(g, X(CX - 6), 30, 1.0, f.eyes, d));
    poly(g, [[CX - 4, 34], [CX + 4, 34], [CX, 39]], 'A'); for (let x = -3; x <= 3; x++) put(g, CX + x, 35, 'K', ['A']);
    return { top: [CX, 14], eyeY: 30, back: [CX + 11, 24], hand: [CX + 22, 30], s: 1 };
  },
  beast(g, r, f) {
    // big-headed cub: ears, muzzle with fangs, round body and paws, a curly tail
    line(g, CX + 10, 46, CX + 20, 38, 3.6, 'M'); ell(g, CX + 21, 35, 3.4, 3.4, 'S');
    ell(g, CX, 44, 12, 9, 'M'); ell(g, CX, 46, 7, 6, 'S');
    sym((d, X) => { ell(g, X(CX - 8), 51, 4.4, 3, 'M'); for (const o of [-1.5, 0, 1.5]) put(g, X(CX - 8 + o), 53, 'K', ['M']); });
    sym((d, X) => { poly(g, [[X(CX - 13), 21], [X(CX - 14), 6], [X(CX - 5), 13]], 'M'); poly(g, [[X(CX - 12), 18], [X(CX - 12.5), 9.5], [X(CX - 7), 14]], 'S'); });
    ell(g, CX, 24, 14, 12, 'M'); if (f.mane) sym((d, X) => { for (const [y, o] of [[18, 0], [25, 1], [32, 0]]) ell(g, X(CX - 14 - o), y, 3, 3.6, 'A', [null]); });
    ell(g, CX, 30, 7, 5, 'S'); ell(g, CX, 27, 2.4, 1.6, 'K');
    sym((d, X) => eye(g, X(CX - 7), 22, 1.0, f.eyes, d));
    mouth(g, CX, 31, 4, 3.4, f.mouth === 'smile' ? 'fang' : f.mouth);
    return { top: [CX, 9], eyeY: 22, back: [CX + 10, 14], hand: [CX + 20, 36], s: 1 };
  },
  fish(g, r, f) {
    // round puffer fish with fins and big lips, a tail peeking out
    poly(g, [[CX + 12, 34], [CX + 25, 25], [CX + 23, 34], [CX + 25, 43]], 'W');
    sym((d, X) => poly(g, [[X(CX - 14), 34], [X(CX - 24), 38], [X(CX - 22), 44], [X(CX - 13), 41]], 'W'));
    poly(g, [[CX - 8, 20], [CX - 2, 9], [CX + 5, 10], [CX + 9, 21]], 'W');
    ell(g, CX, 33, 16, 15, 'M'); ell(g, CX, 40, 10, 7, 'S');
    if (f.spikes) for (let a = 0; a < 7; a++) { const ang = -Math.PI * 0.95 + a * 0.32; put(g, CX + Math.cos(ang) * 17, 33 + Math.sin(ang) * 16, 'H'); }
    sym((d, X) => eye(g, X(CX - 7), 29, 1.15, f.eyes === 'dot' ? 'round' : f.eyes, d));
    ell(g, CX, 39, 4.6, 3.4, 'A'); ell(g, CX, 39, 2.4, 1.4, 'R');
    ell(g, CX - 8, 23, 2.4, 1.6, 'G', ['M']);
    return { top: [CX, 10], eyeY: 29, back: [CX + 2, 14], hand: [CX + 20, 40], s: 1 };
  },
  plant(g, r, f) {
    // flower monster: a petal ring around a smiling face, leaf arms, a round bulb with roots
    sym((d, X) => { line(g, X(CX - 5), 52, X(CX - 9), 55, 1.6, 'H'); });
    ell(g, CX, 45, 11, 8, 'M'); ell(g, CX, 47, 6, 4, 'S');
    sym((d, X) => poly(g, [[X(CX - 9), 41], [X(CX - 22), 33], [X(CX - 20), 41], [X(CX - 12), 45]], 'M'));
    const petals = 7 + Math.floor(r() * 3);
    for (let i = 0; i < petals; i++) { const a = (i / petals) * Math.PI * 2 - Math.PI / 2; ell(g, CX + Math.cos(a) * 12.5, 22 + Math.sin(a) * 12.5, 5.6, 5.6, 'W'); }
    ell(g, CX, 22, 10.5, 10.5, 'A');
    sym((d, X) => eye(g, X(CX - 4.5), 20, 0.85, f.eyes, d));
    mouth(g, CX, 25, 4.4, 4, f.mouth === 'fang' ? 'smile' : f.mouth);
    sym((d, X) => ell(g, X(CX - 7.5), 25, 1.6, 1, 'T', ['A']));
    return { top: [CX, 8], eyeY: 20, back: [CX + 12, 12], hand: [CX + 20, 34], s: 1 };
  },
  imp(g, r, f) {
    // little devil: big head, pointed ears and horns, bat wings, a trident, a forked tail
    sym((d, X) => poly(g, [[X(CX - 6), 32], [X(CX - 22), 20], [X(CX - 20), 27], [X(CX - 24), 29], [X(CX - 19), 34], [X(CX - 21), 38], [X(CX - 8), 40]], 'W'));
    line(g, CX + 6, 48, CX + 14, 50, 1.6, 'M'); poly(g, [[CX + 13, 47], [CX + 18, 50], [CX + 13, 53]], 'H');
    ell(g, CX, 41, 8, 8, 'M'); ell(g, CX, 43, 5, 5, 'S');
    sym((d, X) => { ell(g, X(CX - 4), 50, 3, 2.5, 'M'); });
    line(g, CX - 16, 52, CX - 16, 22, 1.6, 'H'); poly(g, [[CX - 20, 22], [CX - 12, 22], [CX - 16, 15]], 'H'); poly(g, [[CX - 20, 25], [CX - 20, 18], [CX - 18, 23]], 'H'); poly(g, [[CX - 12, 25], [CX - 12, 18], [CX - 14, 23]], 'H');
    line(g, CX - 7, 39, CX - 15, 36, 2.6, 'M');
    sym((d, X) => poly(g, [[X(CX - 9), 20], [X(CX - 19), 15], [X(CX - 11), 26]], 'M'));
    ell(g, CX, 24, 11, 11, 'M');
    sym((d, X) => poly(g, [[X(CX - 5), 15], [X(CX - 8), 6], [X(CX - 2), 13]], 'H'));
    sym((d, X) => eye(g, X(CX - 5), 23, 0.95, f.eyes === 'round' ? 'lid' : f.eyes, d));
    mouth(g, CX, 28, 5, 4, 'grin');
    return { top: [CX, 7], eyeY: 23, back: [CX + 10, 14], hand: [CX - 16, 30], s: 1 };
  },
  ghost(g, r, f) {
    // sheet ghost with a big open mouth and a curled tail
    poly(g, [[CX - 15, 28], [CX + 15, 28], [CX + 12, 42], [CX + 14, 50], [CX + 20, 53], [CX + 10, 54], [CX + 3, 48], [CX - 8, 44]], 'M');
    ell(g, CX, 25, 15, 15, 'M');
    sym((d, X) => ell(g, X(CX - 15), 34, 3.6, 2.4, 'M'));
    sym((d, X) => eye(g, X(CX - 6), 21, 1.05, f.eyes === 'dot' ? 'round' : f.eyes, d));
    mouth(g, CX, 27, 6, 8, f.mouth === 'grin' ? 'fang' : 'smile');
    ell(g, CX - 9, 14, 2.4, 3.6, 'G', ['M']);
    if (f.hat) { poly(g, [[CX - 13, 12], [CX + 13, 12], [CX + 3, -1], [CX - 2, 1]], 'A'); ell(g, CX, 12, 15, 2, 'A'); }
    return { top: [CX, f.hat ? 0 : 10], eyeY: 21, back: [CX + 12, 16], hand: [CX + 18, 34], s: 1 };
  },
  golem(g, r, f) {
    // brick golem: brick torso and arms, round head, glowing eyes
    sym((d, X) => { poly(g, [[X(CX - 15.6), 25], [X(CX - 23), 26], [X(CX - 24), 44], [X(CX - 15.6), 44]], 'M'); ell(g, X(CX - 19.8), 46.5, 4.6, 3.2, 'M'); });   // a gap from the torso gives the arms an outline
    sym((d, X) => { poly(g, [[X(CX - 11), 44], [X(CX - 3), 44], [X(CX - 3), 53], [X(CX - 12), 53]], 'M'); });
    poly(g, [[CX - 13.5, 22], [CX + 13.5, 22], [CX + 13.5, 46], [CX - 13.5, 46]], 'M');
    ell(g, CX, 14, 9, 8.5, 'M');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {      // mortar lines
      if (g[y][x] !== 'M' || y < 22) continue;
      const row = Math.floor((y - 22) / 5), off = row % 2 ? 4 : 0;
      if ((y - 22) % 5 === 0 || (x + off) % 8 === 0) g[y][x] = 'K';
    }
    poly(g, [[CX, 28], [CX + 5, 33], [CX, 38], [CX - 5, 33]], 'A');              // a gem set in its chest
    sym((d, X) => { ell(g, X(CX - 3.6), 13, 2.2, 2.6, 'E'); ell(g, X(CX - 3.4), 13.6, 1.2, 1.6, 'P'); });
    for (let x = -3; x <= 3; x++) put(g, CX + x, 18.5, 'K');
    return { top: [CX, 5], eyeY: 14, back: [CX + 12, 22], hand: [CX + 19, 47], s: 1 };
  },
  dragon(g, r, f) {
    // chubby dragon: bat wings, horned head with snout, scaled belly, claws, tail
    sym((d, X) => poly(g, [[X(CX - 8), 30], [X(CX - 25), 10], [X(CX - 22), 20], [X(CX - 27), 22], [X(CX - 21), 28], [X(CX - 25), 33], [X(CX - 11), 40]], 'W'));
    sym((d, X) => { line(g, X(CX - 10), 31, X(CX - 24), 12, 1, 'K'); });
    line(g, CX + 9, 49, CX + 20, 51, 3, 'M'); poly(g, [[CX + 19, 48], [CX + 25, 51], [CX + 19, 54]], 'H');
    ell(g, CX, 41, 12, 11, 'M');
    for (let i = 0; i < 4; i++) ell(g, CX, 35 + i * 4, 6.5 - Math.abs(i - 1.5), 1.6, 'S');
    sym((d, X) => { ell(g, X(CX - 7), 51, 4, 2.6, 'M'); for (const o of [-1.4, 0, 1.4]) put(g, X(CX - 7 + o), 53, 'H'); ell(g, X(CX - 11), 40, 2.6, 3.4, 'M'); });
    ell(g, CX, 20, 12, 11, 'M'); ell(g, CX, 27, 8, 5, 'S');
    sym((d, X) => { poly(g, [[X(CX - 7), 12], [X(CX - 13), 1], [X(CX - 9), 4], [X(CX - 3), 10]], 'H'); ell(g, X(CX - 3), 26, 0.9, 0.9, 'K'); });
    sym((d, X) => eye(g, X(CX - 6), 18, 0.95, f.eyes === 'dot' ? 'angry' : f.eyes, d));
    mouth(g, CX, 29, 5, 3.6, f.mouth === 'smile' ? 'grin' : f.mouth);
    return { top: [CX, 2], eyeY: 18, back: [CX + 9, 9], hand: [CX + 22, 26], s: 1 };
  },
};

// ------------------------------------------------------------------ type decorations
const DECOR = {
  fire(g, a) { const [x, y] = a.top; poly(g, [[x - 5, y + 4], [x - 1, y - 8], [x + 1, y - 2], [x + 4, y - 10], [x + 6, y + 4]], 'A'); poly(g, [[x - 2, y + 4], [x + 1, y - 3], [x + 3, y + 4]], 'G'); },
  water(g, a) { const [x, y] = a.back; poly(g, [[x - 3, y + 4], [x + 3, y - 7], [x + 5, y + 4]], 'W', [null]); ell(g, a.hand[0] + 2, a.hand[1] - 9, 2, 2.6, 'A'); },
  grass(g, a) { const [x, y] = a.top; line(g, x, y + 3, x, y - 2, 1.4, 'K'); ell(g, x - 4, y - 3, 4, 2, 'A'); ell(g, x + 4, y - 4, 4, 2, 'A'); },
  electric(g, a) { const [x, y] = a.top; poly(g, [[x - 1, y + 3], [x + 4, y - 4], [x + 1, y - 4], [x + 5, y - 11], [x - 2, y - 2], [x + 1, y - 2], [x - 3, y + 3]], 'A'); },
  ice(g, a) { const [x, y] = a.top; for (const o of [-6, 0, 6]) poly(g, [[x + o - 2.5, y + 4], [x + o, y - 6 + Math.abs(o) / 2], [x + o + 2.5, y + 4]], 'A'); },
  fight(g, a) { const y = a.eyeY - 6; for (let x = 0; x < N; x++) for (const yy of [y, y + 1, y + 2]) if (g[yy] && g[yy][x] === 'M') g[yy][x] = 'A'; line(g, a.back[0] + 3, y + 1, a.back[0] + 9, y + 5, 2, 'A'); },
  poison(g, a) { for (const [dx, dy, r] of [[-9, 6, 2], [7, 10, 1.6], [-3, 14, 1.3], [10, 2, 1.2]]) ell(g, CX + dx, a.eyeY + dy, r, r, 'A', ['M']); ell(g, a.hand[0], a.hand[1] - 6, 1.6, 2.4, 'A', [null]); },
  earth(g, a) { const [x, y] = a.top; poly(g, [[x - 7, y + 5], [x - 5, y - 1], [x - 1, y + 5]], 'A'); poly(g, [[x - 1, y + 5], [x + 2, y - 3], [x + 6, y + 5]], 'A'); },
  wind(g, a) { const [x, y] = a.top; for (const o of [-3, 0, 3]) poly(g, [[x + o - 1.6, y + 4], [x + o * 2, y - 7 - Math.abs(o) * -0.5], [x + o + 1.6, y + 4]], 'A'); },
  psychic(g, a) { ell(g, CX, a.eyeY - 6, 2.2, 2.2, 'A'); put(g, CX - 0.5, a.eyeY - 7, 'G'); },
  bug(g, a) { const [x, y] = a.top; sym((d, X) => { line(g, X(x - 3), y + 4, X(x - 6), y - 4, 1.2, 'K'); ell(g, X(x - 6.5), y - 5, 1.5, 1.5, 'A'); }); },
  rock(g, a) { for (const [dx, dy] of [[-8, -4], [6, -6], [9, 8]]) { const x = CX + dx, y = a.eyeY + dy - 4; poly(g, [[x - 3, y + 2], [x - 1, y - 2], [x + 3, y - 1], [x + 3, y + 3], [x - 1, y + 4]], 'A', ['M']); } },
  ghost(g, a) { ell(g, a.hand[0] + 3, a.hand[1] - 12, 2.4, 3, 'A', [null]); ell(g, a.hand[0] + 5, a.hand[1] - 18, 1.6, 2, 'A', [null]); },
  dragon(g, a) { const [x, y] = a.top; sym((d, X) => poly(g, [[X(x - 4), y + 6], [X(x - 8), y - 3], [X(x - 1), y + 4]], 'H', [null, 'M'])); },
  normal(g, a) { const [x, y] = a.top; ell(g, x + 1, y + 1, 3, 2, 'S', [null, 'M']); },
};

// ------------------------------------------------------------------ colours: each key gets 4 tones (light, base, shade, deep)
const ACCENT = { fire: [42, 100, 55], water: [200, 90, 80], grass: [110, 70, 48], electric: [52, 100, 58], ice: [190, 80, 88], fight: [0, 80, 52], poison: [285, 70, 62],
  earth: [32, 45, 42], wind: [0, 0, 96], psychic: [330, 90, 62], bug: [60, 25, 30], rock: [36, 18, 56], ghost: [270, 70, 80], dragon: [45, 90, 66], normal: [40, 60, 85] };
const TONE = { normal: [30, 62], ice: [55, 74], ghost: [40, 66], dragon: [60, 52], electric: [85, 58], rock: [32, 56], earth: [48, 58], bug: [60, 48], poison: [55, 56], psychic: [70, 64], wind: [55, 66] };
const hsl = (h, s, l) => `hsl(${((h % 360) + 360) % 360},${Math.max(0, Math.min(100, s))}%,${Math.max(0, Math.min(100, l))}%)`;
const tones = (h, s, l) => [hsl(h, s, l + 13), hsl(h, s, l), hsl(h + 6, s + 4, l - 12), hsl(h + 10, s + 6, l - 24)];
export function palette(spId, v) {
  const sp = SPECIES[spId - 1], r = rng(sp.seed + 3);
  const h0 = TYPE_INFO[sp.type].hue + (r() - 0.5) * 22;
  const [sat, lum] = TONE[sp.type] || [64, 56];
  const h = h0 + [0, 40, -40, 175, 0][v];
  const [ah, as, al] = ACCENT[sp.type];
  return {
    M: tones(h, sat, lum), S: tones(h + 25, sat * 0.45 + 8, Math.min(86, lum + 26)), W: tones(h - 18, sat + 6, lum - 10),
    A: tones(ah, as, al), H: tones(42, 40, 86), C: tones(46, 95, 56),
    E: ['#ffffff', '#ffffff', '#e2e8f0', '#c8d0dc'], P: ['#1a1a2a', '#141420', '#101018', '#0a0a10'], G: ['#ffffff', '#ffffff', '#ffffff', '#ffffff'],
    R: ['#d8304a', '#b81e36', '#8a1226', '#600818'], T: ['#ff9ab0', '#ff7a98', '#e85a7a', '#c84060'], Y: ['#ffffff', '#ffffff', '#e8e8f0', '#d0d0dc'], K: tones(h, 30, 16),
    O: hsl(h + 8, 40, 11), rainbow: v === 4, h, sat, lum,
  };
}
export const VARIANT_HUES = (spId) => [0, 1, 2, 3, 4].map((v) => palette(spId, v).M[1]);

// per-species look: eyes, mouth, extras
function features(sp, r) {
  return {
    eyes: ['round', 'round', 'lid', 'angry', 'dot'][Math.floor(r() * 5)],
    mouth: ['smile', 'smile', 'fang', 'grin', 'line'][Math.floor(r() * 5)],
    curl: r() < 0.75, mane: r() < 0.5, spikes: r() < 0.5, hat: sp.type === 'psychic' || r() < 0.15,
    crown: sp.rank >= 5,
  };
}
function build(spId) {
  const sp = SPECIES[spId - 1], r = rng(sp.seed);
  const g = grid();
  const f = features(sp, r);
  const a = BODY[sp.body](g, r, f);
  DECOR[sp.type](g, a);
  if (f.crown) { const x = a.top[0], y = Math.max(7, a.top[1]); poly(g, [[x - 6, y + 3], [x - 6, y - 4], [x - 3, y - 1], [x, y - 6], [x + 3, y - 1], [x + 6, y - 4], [x + 6, y + 3]], 'C'); put(g, x, y - 1, 'A'); }
  // tones: highlight on the upper-left rim, shade on the lower-right rim, deep shade on the lower part of each part
  const out = grid(), bbox = {};
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const k = g[y][x]; if (!k) continue; const b = bbox[k] || (bbox[k] = [y, y, x, x]); b[0] = Math.min(b[0], y); b[1] = Math.max(b[1], y); b[2] = Math.min(b[2], x); b[3] = Math.max(b[3], x); }
  const same = (x, y, k) => g[y] && g[y][x] === k;
  const shaded = 'MSWAHC';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const k = g[y][x];
    if (!k) { if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx])) out[y][x] = ['O', 0]; continue; }
    if (!shaded.includes(k)) { out[y][x] = [k, 1]; continue; }
    let tone = 1;
    // light from the upper left: a diagonal gradient across each part, dithered where the tone changes
    const b = bbox[k], ny = (y - b[0]) / Math.max(1, b[1] - b[0]), nx = (x - b[2]) / Math.max(1, b[3] - b[2]);
    const t = ny * 0.75 + nx * 0.35, dith = (x + y) % 2 ? 0.05 : -0.05;
    if (t + dith > 0.8) tone = 2;
    if (!same(x + 1, y + 1, k) || !same(x + 2, y + 2, k)) tone = Math.min(3, tone + 1);
    if (!same(x - 1, y - 1, k) && same(x + 1, y + 1, k)) tone = 0;
    else if (!same(x - 2, y - 2, k) && t < 0.5 && same(x + 1, y + 1, k)) tone = 0;
    out[y][x] = [k, tone];
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
    const cell = shape[y][x]; if (!cell) continue;
    const [k, tone] = cell;
    let col = k === 'O' ? pal.O : (pal[k] || pal.M)[tone];
    if (opts.shadow) col = k === 'O' ? '#0a0a14' : '#2c3044';
    else if (pal.rainbow && k === 'M') col = hsl(y * 7 + x * 3, 88, [76, 62, 50, 40][tone]);
    else if (pal.rainbow && k === 'O') col = '#4a2a00';
    c.fillStyle = col;
    c.fillRect((opts.flip ? N - 1 - x : x) * scale, y * scale, scale, scale);
  }
  if (pal.rainbow && !opts.shadow) {
    c.fillStyle = '#ffffff';
    for (const [x, y] of [[6, 8], [48, 12], [46, 46], [9, 40]]) { const X = opts.flip ? N - 1 - x : x; c.fillRect(X * scale, (y - 1) * scale, scale, scale * 3); c.fillRect((X - 1) * scale, y * scale, scale * 3, scale); }
  }
  cache.set(key, cv);
  return cv;
}
export const spriteURL = (spId, v, opts) => { const k = 'u' + spId + '/' + v + JSON.stringify(opts || {}); if (!cache.has(k)) cache.set(k, sprite(spId, v, opts).toDataURL()); return cache.get(k); };
