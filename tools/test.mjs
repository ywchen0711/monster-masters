// node tools/test.mjs : data, type chart, capture, fusion and thousands of random battles
import { SPECIES, SKILLS, TYPES, eff, AREAS, TAMERS, areaPool, STARTERS, RANKS, STARTER_LV, STARTER_PLUS } from '../js/data.js';
import { makeMon, stat, maxHp, catchChance, fuse, fusionResult, sp, heal } from '../js/model.js';
import { Battle } from '../js/battle.js';

let fail = 0;
const ok = (name, c, info = '') => { console.log((c ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : '')); if (!c) fail++; };

ok('150 monsters', SPECIES.length === 150, SPECIES.length);
ok('200 skills', SKILLS.length === 200, SKILLS.length);
ok('unique monster names', new Set(SPECIES.map((s) => s.name.en)).size === 150 && new Set(SPECIES.map((s) => s.name.zh)).size === 150);
ok('unique skill names', new Set(SKILLS.map((s) => s.en)).size === 200 && new Set(SKILLS.map((s) => s.zh)).size === 200,
  [...SKILLS.map((s) => s.zh)].filter((x, i, a) => a.indexOf(x) !== i).join(','));
ok('every species learns >= 8 skills', SPECIES.every((s) => s.learn.length >= 8), Math.min(...SPECIES.map((s) => s.learn.length)));
ok('type chart', eff('water', 'fire') === 2 && eff('fire', 'water') === 0.5 && eff('electric', 'earth') === 0 && eff('normal', 'ghost') === 0);
const byRank = RANKS.map((r, i) => SPECIES.filter((s) => s.rank === i).length);
console.log('  monsters per rank', RANKS.map((r, i) => `${r}:${byRank[i]}`).join(' '));
ok('every area has monsters', AREAS.every((a) => areaPool(a).length >= 6), AREAS.map((a) => a.id + ':' + areaPool(a).length).join(' '));
ok('30 tamers', TAMERS.length === 30);
const used = new Set(SPECIES.flatMap((s) => s.learn.map((l) => l[1])));
console.log(`  skills some monster learns by level: ${used.size}/200`);

// capture odds
const wild = makeMon(SPECIES.find((s) => s.rank === 0).id, 5);
const p1 = catchChance(wild, 1); wild.hp = 1; const p2 = catchChance(wild, 1);
ok('low HP is easier to catch', p2 > p1, `${p1.toFixed(2)} -> ${p2.toFixed(2)}`);
// fusion
const a = makeMon(STARTERS[0], 20), b = makeMon(SPECIES.find((s) => s.body === 'bird').id, 15);
const r = fusionResult(a, b), child = fuse(a, b);
ok('fusion makes the next body up, parent A type', r.species.body === 'beast' && r.species.type === sp(a).type && child.lv === 1 && child.plus > 0, `${r.species.name.en} plus ${r.plus}`);
ok('fusion inherits skills', r.inherit.length > 0 && r.inherit.every((id) => child.learned.includes(id)));
// rainbow odds
let rainbow = 0; for (let i = 0; i < 20000; i++) if (makeMon(1, 1).v === 4) rainbow++;
ok('hidden rainbow colour about 1/128', rainbow > 80 && rainbow < 260, rainbow + '/20000');

// random battles: never get stuck, always end
let ends = { win: 0, lose: 0 }, maxTurns = 0, errors = 0;
for (let i = 0; i < 2000; i++) {
  const lv = 5 + Math.floor(Math.random() * 50);
  const party = [0, 1, 2].map(() => makeMon(1 + Math.floor(Math.random() * 150), lv));
  const foes = [0, 1].map(() => makeMon(1 + Math.floor(Math.random() * 150), lv));
  const B = new Battle(party, foes, i % 2 ? { tamer: TAMERS[0] } : { wild: true });
  try {
    let t = 0;
    while (!B.over && t++ < 300) {
      if (B.needSwitch) { B.step({ kind: 'switch', to: party.findIndex((m) => m.hp > 0) }); continue; }
      const mv = B.me.moves[Math.floor(Math.random() * B.me.moves.length)];
      B.step({ kind: 'move', move: mv });
    }
    maxTurns = Math.max(maxTurns, t);
    if (B.over) ends[B.over.result] = (ends[B.over.result] || 0) + 1;
  } catch (e) { errors++; if (errors < 3) console.log(e.stack); }
}
ok('2000 random battles end without errors', errors === 0 && ends.win + ends.lose === 2000, JSON.stringify(ends) + ' longest ' + maxTurns + ' turns');

// a starter at level 5 vs the meadow
let wins = 0;
const meadow = areaPool(AREAS[0]);
for (let i = 0; i < 400; i++) {
  const me = makeMon(STARTERS[i % 3], STARTER_LV, { plus: STARTER_PLUS });
  const foe = makeMon(meadow[Math.floor(Math.random() * meadow.length)].id, 2 + Math.floor(Math.random() * 5));
  const B = new Battle([me], [foe], { wild: true });
  let t = 0;
  while (!B.over && t++ < 100) B.step({ kind: 'move', move: B.me.moves.reduce((x, y) => (SKILLS[y].power > SKILLS[x].power ? y : x)) });
  if (B.over && B.over.result === 'win') wins++;
}
ok('a starter beats most meadow monsters', wins > 300, `${wins}/400`);
// growth curve sample
const m = makeMon(STARTERS[0], 1);
console.log('  starter stats lv1/25/50:', [1, 25, 50].map((lv) => { m.lv = lv; return `${lv}:${maxHp(m)}hp/${stat(m, 'atk')}a/${stat(m, 'spe')}s`; }).join('  '));
console.log(fail ? `${fail} FAILED` : 'all passed');
process.exit(fail ? 1 : 0);
