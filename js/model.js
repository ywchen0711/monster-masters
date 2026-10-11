// Monster instances: stats, experience, learning, capture odds, fusion. Pure logic.
import { SPECIES, SKILLS, STATS, BODIES, BODY_INFO, TYPES } from './data.js?v=2';

export const sp = (m) => SPECIES[m.sp - 1];
let uidN = Date.now() % 100000;
const uid = () => (++uidN).toString(36) + Math.random().toString(36).slice(2, 6);

// variant: 0..3 normal colours, 4 = the hidden rainbow colour (1 in 128)
export function rollVariant(shinyOdds = 128) { return Math.random() < 1 / shinyOdds ? 4 : Math.floor(Math.random() * 4); }

export function makeMon(speciesId, lv, o = {}) {
  const s = SPECIES[speciesId - 1];
  const m = { uid: uid(), sp: speciesId, v: o.v ?? rollVariant(), lv, exp: expFor(lv), plus: o.plus || 0,
    iv: o.iv || STATS.map(() => Math.floor(Math.random() * 16)), learned: [], moves: [], status: null, hp: 0 };
  for (const [l, sk] of s.learn) if (l <= lv) m.learned.push(sk);
  for (const sk of o.inherit || []) if (!m.learned.includes(sk)) m.learned.push(sk);
  m.moves = bestMoves(m);
  m.hp = stat(m, 'hp');
  return m;
}
// keep the 4 strongest damaging skills, plus at most one status skill
export function bestMoves(m) {
  const all = m.learned.map((id) => SKILLS[id]);
  const s = sp(m);
  const score = (k) => (k.cat === 'x' ? 0 : k.power * (k.type === s.type ? 1.5 : 1) * ((k.acc || 100) / 100));
  const atk = all.filter((k) => k.cat !== 'x').sort((a, b) => score(b) - score(a));
  const st = all.filter((k) => k.cat === 'x');
  const pick = atk.slice(0, st.length ? 3 : 4).concat(st.slice(-1));
  while (pick.length < 4 && atk.length > pick.length) pick.push(atk[pick.length]);
  return [...new Set(pick.map((k) => k.id))].slice(0, 4);
}
export function stat(m, k) {
  const b = sp(m).base[k], iv = m.iv[STATS.indexOf(k)], pl = 1 + m.plus * 0.03;
  if (k === 'hp') return Math.floor((((2 * b + iv) * m.lv) / 100 + m.lv + 10) * pl);
  return Math.floor((((2 * b + iv) * m.lv) / 100 + 5) * pl);
}
export const maxHp = (m) => stat(m, 'hp');
export const expFor = (lv) => Math.floor(0.8 * lv * lv * lv);
// experience for beating a monster
export const expYield = (foe, tamer) => Math.floor((sp(foe).exp * foe.lv) / 6 * (tamer ? 1.5 : 1));
// add exp; returns the list of things that happened (level ups, new skills)
export function gainExp(m, n) {
  const out = [];
  if (m.lv >= 100) return out;
  m.exp += n;
  while (m.lv < 100 && m.exp >= expFor(m.lv + 1)) {
    const oldMax = maxHp(m);
    m.lv++;
    m.hp += maxHp(m) - oldMax;
    out.push({ kind: 'level', lv: m.lv });
    for (const [l, sk] of sp(m).learn) if (l === m.lv && !m.learned.includes(sk)) {
      m.learned.push(sk);
      const before = m.moves.slice();
      if (m.moves.length < 4) m.moves.push(sk); else m.moves = bestMoves(m);
      out.push({ kind: 'learn', skill: sk, equipped: m.moves.includes(sk), replaced: before.find((x) => !m.moves.includes(x)) });
    }
  }
  return out;
}
export function heal(m) { m.hp = maxHp(m); m.status = null; }

// capture chance for a wild monster
const RANK_CATCH = [1, 0.8, 0.62, 0.46, 0.32, 0.2, 0.1];
export function catchChance(foe, orbMult) {
  const hpPart = 1 - (2 / 3) * (foe.hp / maxHp(foe));
  const st = foe.status === 'slp' || foe.status === 'frz' ? 2 : foe.status ? 1.5 : 1;
  return Math.min(0.97, hpPart * RANK_CATCH[sp(foe).rank] * orbMult * st * 0.9 + 0.03);
}

// ------------------------------------------------------------------ fusion (DQM style)
// result: the first parent's type, the body one step above the higher-ranked parent's body;
// level 1 with a plus bonus, inherits up to 4 of the parents' best skills; rainbow is likelier from rainbow parents
export const FUSE_MIN_LV = 10;
export function fusionResult(a, b) {
  const sa = sp(a), sb = sp(b);
  const bi = Math.max(BODIES.indexOf(sa.body), BODIES.indexOf(sb.body));
  const body = BODIES[Math.min(BODIES.length - 1, bi + 1)];
  const type = sa.type;
  const res = SPECIES.find((s) => s.body === body && s.type === type);
  const plus = Math.min(99, Math.max(a.plus, b.plus) + Math.floor((a.lv + b.lv) / 8));
  const pool = [...new Set([...a.learned, ...b.learned])].map((id) => SKILLS[id]).filter((k) => k.cat !== 'x' || Math.random() < 0.5);
  const inherit = pool.sort((x, y) => y.power - x.power).slice(0, 4).map((k) => k.id);
  return { species: res, plus, inherit, shinyOdds: a.v === 4 || b.v === 4 ? 16 : 96 };
}
export function fuse(a, b) {
  const r = fusionResult(a, b);
  return makeMon(r.species.id, 1, { plus: r.plus, inherit: r.inherit, v: rollVariant(r.shinyOdds) });
}
export { TYPES };
