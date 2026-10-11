// Turn-based 1-on-1 battle with party switching. Pure logic: step(action) returns a list of events for the UI to play.
import { SKILLS, eff, ITEM } from './data.js?v=1';
import { sp, stat, maxHp, catchChance, expYield, gainExp, bestMoves } from './model.js?v=1';

const STAGE = (n) => (n >= 0 ? (2 + n) / 2 : 2 / (2 - n));
const STRUGGLE = { id: -1, type: 'none', en: 'Struggle', zh: '掙扎', cat: 'p', power: 40, acc: 0, fx: { recoil: 0.25, stages: [] } };

export class Battle {
  // opts: { wild: true } or { tamer: {...} }
  constructor(party, foes, opts = {}) {
    this.party = party; this.foes = foes; this.opts = opts;
    this.pi = party.findIndex((m) => m.hp > 0); this.fi = 0;
    this.side = { p: fresh(), f: fresh() };
    this.over = null; this.turn = 0; this.runTries = 0; this.participants = new Set([this.party[this.pi].uid]);
    this.needSwitch = false;
    for (const m of party) delete m._down;
  }
  get me() { return this.party[this.pi]; }
  get foe() { return this.foes[this.fi]; }

  // action: { kind: 'move', move: skillId } | { kind: 'switch', to } | { kind: 'item', item, target } | { kind: 'catch', item } | { kind: 'run' }
  step(action) {
    const ev = [];
    if (this.over) return ev;
    this.turn++;
    if (this.needSwitch) {                       // a forced switch after a faint is free
      if (action.kind !== 'switch') return ev;
      this.switchTo(action.to, ev); this.needSwitch = false; return ev;
    }
    const foeAct = this.foeAction();
    const mine = { side: 'p', act: action }, theirs = { side: 'f', act: foeAct };
    const order = this.order(mine, theirs);
    this.firstMover = order[0].side;
    for (const o of order) {
      if (this.over) break;
      if (o.side === 'p') this.doPlayer(o.act, ev); else this.doFoe(o.act, ev);
      if (this.checkFaints(ev)) break;
    }
    if (!this.over && !this.needSwitch) this.endOfTurn(ev);
    this.side.p.protect = false; this.side.f.protect = false;
    return ev;
  }
  order(a, b) {
    const pr = (o) => (o.act.kind === 'move' ? (this.skill(o.act.move).fx.prio ? 1 : 0) + (this.skill(o.act.move).fx.protect ? 4 : 0) : 6);
    const spd = (o) => { const m = o.side === 'p' ? this.me : this.foe; return stat(m, 'spe') * STAGE(this.side[o.side].st.spe) * (m.status === 'par' ? 0.5 : 1); };
    const pa = pr(a), pb = pr(b);
    if (pa !== pb) return pa > pb ? [a, b] : [b, a];
    const sa = spd(a), sb = spd(b);
    if (sa !== sb) return sa > sb ? [a, b] : [b, a];
    return Math.random() < 0.5 ? [a, b] : [b, a];
  }
  skill(id) { return id === -1 ? STRUGGLE : SKILLS[id]; }

  foeAction() {
    const f = this.foe, m = this.me;
    // if nothing it knows can touch the player's monster, it struggles (typeless)
    const useful = f.moves.filter((id) => { const k = this.skill(id); return k.cat === 'x' || eff(k.type, sp(m).type) > 0; });
    const opts = useful.length ? useful : [-1];
    // tamers pick the best expected damage most of the time; wild monsters are more random
    const smart = this.opts.tamer ? 0.8 : 0.45;
    if (Math.random() < smart) {
      let best = opts[0], bv = -1;
      for (const id of opts) {
        const k = this.skill(id);
        let v = k.cat === 'x' ? (k.fx.heal && f.hp < maxHp(f) * 0.4 ? 120 : k.fx.status && !m.status ? 55 : 25) : k.power * eff(k.type, sp(m).type) * (k.type === sp(f).type ? 1.5 : 1) * ((k.acc || 100) / 100);
        v *= 0.85 + Math.random() * 0.3;
        if (v > bv) { bv = v; best = id; }
      }
      return { kind: 'move', move: best };
    }
    return { kind: 'move', move: opts[Math.floor(Math.random() * opts.length)] };
  }

  doPlayer(act, ev) {
    if (act.kind === 'move') return this.useMove('p', act.move, ev);
    if (act.kind === 'switch') return this.switchTo(act.to, ev);
    if (act.kind === 'item') {
      const it = ITEM[act.item], t = this.party[act.target ?? this.pi];
      if (it.kind === 'revive') { if (t.hp > 0) return; t.hp = Math.floor(maxHp(t) / 2); t.status = null; delete t._down; ev.push({ t: 'msg', k: 'revived', a: [t] }); }
      else { const before = t.hp; t.hp = Math.min(maxHp(t), t.hp + it.hp); if (it.cure) t.status = null; ev.push({ t: 'heal', side: 'p', who: t, n: t.hp - before }); ev.push({ t: 'msg', k: 'healed', a: [t, t.hp - before] }); }
      ev.push({ t: 'item', item: act.item });
      return;
    }
    if (act.kind === 'catch') {
      const it = ITEM[act.item], p = catchChance(this.foe, it.mult);
      const shakes = Math.random() < p ? 3 : Math.floor(Math.random() * 3);
      ev.push({ t: 'item', item: act.item });
      ev.push({ t: 'catch', shakes, ok: shakes === 3, p });
      if (shakes === 3) { this.over = { result: 'caught', mon: this.foe }; ev.push({ t: 'msg', k: 'caught', a: [this.foe] }); }
      else ev.push({ t: 'msg', k: 'broke', a: [this.foe] });
      return;
    }
    if (act.kind === 'run') {
      this.runTries++;
      const odds = (stat(this.me, 'spe') * 32) / Math.max(1, stat(this.foe, 'spe')) / 64 + 0.25 * this.runTries;
      if (Math.random() < odds) { this.over = { result: 'ran' }; ev.push({ t: 'msg', k: 'ran' }); }
      else ev.push({ t: 'msg', k: 'noRun' });
    }
  }
  doFoe(act, ev) { if (act.kind === 'move') this.useMove('f', act.move, ev); }

  switchTo(i, ev) {
    if (i === this.pi || !this.party[i] || this.party[i].hp <= 0) return;
    ev.push({ t: 'msg', k: 'comeBack', a: [this.me] });
    this.pi = i; this.side.p = fresh(); this.participants.add(this.me.uid);
    ev.push({ t: 'send', side: 'p', who: this.me });
    ev.push({ t: 'msg', k: 'go', a: [this.me] });
  }

  useMove(side, id, ev) {
    const atk = side === 'p' ? this.me : this.foe, def = side === 'p' ? this.foe : this.me;
    const S = this.side[side], D = this.side[side === 'p' ? 'f' : 'p'];
    if (atk.hp <= 0) return;
    if (S.recharge) { S.recharge = false; ev.push({ t: 'msg', k: 'recharge', a: [atk] }); return; }
    if (S.flinch) { S.flinch = false; ev.push({ t: 'msg', k: 'flinched', a: [atk] }); return; }
    // status that stops a move
    if (atk.status === 'slp') {
      if (--S.sleep <= 0) { atk.status = null; ev.push({ t: 'msg', k: 'woke', a: [atk] }); }
      else { ev.push({ t: 'msg', k: 'asleep', a: [atk] }); return; }
    }
    if (atk.status === 'frz') {
      if (Math.random() < 0.25) { atk.status = null; ev.push({ t: 'msg', k: 'thawed', a: [atk] }); }
      else { ev.push({ t: 'msg', k: 'frozen', a: [atk] }); return; }
    }
    if (atk.status === 'par' && Math.random() < 0.25) { ev.push({ t: 'msg', k: 'paralyzed', a: [atk] }); return; }
    if (S.conf > 0) {
      S.conf--;
      if (S.conf === 0) ev.push({ t: 'msg', k: 'unconfused', a: [atk] });
      else {
        ev.push({ t: 'msg', k: 'confused', a: [atk] });
        if (Math.random() < 0.33) {
          const d = Math.max(1, Math.floor(((2 * atk.lv / 5 + 2) * 40 * stat(atk, 'atk') / stat(atk, 'def')) / 50 + 2));
          atk.hp = Math.max(0, atk.hp - d);
          ev.push({ t: 'hit', side, who: atk, n: d, self: true }); ev.push({ t: 'msg', k: 'hurtSelf', a: [atk] });
          return;
        }
      }
    }
    const k = this.skill(id);
    ev.push({ t: 'use', side, who: atk, skill: k.id, type: k.type });
    ev.push({ t: 'msg', k: 'used', a: [atk, k] });
    const fx = k.fx;
    // status moves that target the user
    if (k.cat === 'x' && !fx.status && !fx.stages.some((s) => s.who === 'foe')) { this.selfEffects(side, atk, k, ev); return; }
    if (D.protect && k.cat !== 'x') { ev.push({ t: 'msg', k: 'protected', a: [def] }); return; }
    if (k.acc && Math.random() * 100 >= k.acc * STAGE(S.st.acc || 0)) { ev.push({ t: 'msg', k: 'missed', a: [atk] }); if (fx.faint) this.selfFaint(atk, side, ev); return; }
    if (k.cat === 'x') { this.applyFoeEffects(side, atk, def, k, ev, true); return; }
    const mult = k.type === 'none' ? 1 : eff(k.type, sp(def).type);
    if (mult === 0) { ev.push({ t: 'msg', k: 'immune', a: [def] }); return; }
    const hits = fx.multi ? [2, 2, 3, 3, 4, 5][Math.floor(Math.random() * 6)] : fx.double ? 2 : 1;
    let total = 0, crit = false;
    for (let h = 0; h < hits && def.hp > 0; h++) {
      const r = this.damage(atk, def, k, S, D);
      crit = crit || r.crit;
      def.hp = Math.max(0, def.hp - r.dmg); total += r.dmg;
      ev.push({ t: 'hit', side: side === 'p' ? 'f' : 'p', who: def, n: r.dmg, crit: r.crit, mult });
    }
    if (hits > 1) ev.push({ t: 'msg', k: 'hits', a: [hits] });
    if (crit) ev.push({ t: 'msg', k: 'crit' });
    if (mult > 1) ev.push({ t: 'msg', k: 'super' }); else if (mult < 1) ev.push({ t: 'msg', k: 'weak' });
    if (fx.drain && total > 0) { const n = Math.max(1, Math.floor(total * fx.drain)); atk.hp = Math.min(maxHp(atk), atk.hp + n); ev.push({ t: 'heal', side, who: atk, n }); ev.push({ t: 'msg', k: 'drained', a: [def] }); }
    if (fx.recoil && total > 0) { const n = Math.max(1, Math.floor(total * fx.recoil)); atk.hp = Math.max(0, atk.hp - n); ev.push({ t: 'hit', side, who: atk, n, self: true }); ev.push({ t: 'msg', k: 'recoil', a: [atk] }); }
    if (fx.recharge) S.recharge = true;
    if (fx.selfconf && !S.conf) { S.conf = 2 + Math.floor(Math.random() * 3); ev.push({ t: 'msg', k: 'becameConfused', a: [atk] }); }
    if (fx.faint) this.selfFaint(atk, side, ev);
    if (def.hp > 0) {
      if (fx.flinch && Math.random() * 100 < fx.flinch && this.firstMover === side) D.flinch = true;
      this.applyFoeEffects(side, atk, def, k, ev, false);
    }
    for (const s of fx.stages.filter((x) => x.who === 'self')) if (Math.random() * 100 < s.p) this.stage(side, atk, s.stat, s.n, ev);
  }
  selfFaint(atk, side, ev) { atk.hp = 0; ev.push({ t: 'hit', side, who: atk, n: 0, self: true }); }
  damage(atk, def, k, S, D) {
    const phys = k.cat === 'p';
    const A = stat(atk, phys ? 'atk' : 'spa') * STAGE(S.st[phys ? 'atk' : 'spa']);
    const Df = stat(def, phys ? 'def' : 'spd') * STAGE(D.st[phys ? 'def' : 'spd']);
    let power = k.power;
    if (k.fx.hex && def.status) power *= 2;
    if (k.fx.facade && atk.status) power *= 2;
    const critStage = (S.st.crit || 0) + (k.fx.crit ? 1 : 0);
    const crit = Math.random() < [1 / 16, 1 / 8, 1 / 2, 1][Math.min(3, critStage)];
    let d = ((2 * atk.lv / 5 + 2) * power * A / Df) / 50 + 2;
    d *= k.type === sp(atk).type ? 1.5 : 1;
    d *= k.type === 'none' ? 1 : eff(k.type, sp(def).type);
    if (crit) d *= 1.5;
    if (phys && atk.status === 'burn') d *= 0.5;
    d *= 0.85 + Math.random() * 0.15;
    return { dmg: Math.max(1, Math.floor(d)), crit };
  }
  selfEffects(side, atk, k, ev) {
    const fx = k.fx, S = this.side[side];
    if (fx.protect) { S.protect = true; ev.push({ t: 'msg', k: 'protecting', a: [atk] }); }
    if (fx.heal) { const n = Math.min(maxHp(atk) - atk.hp, Math.floor(maxHp(atk) * fx.heal)); atk.hp += n; ev.push({ t: 'heal', side, who: atk, n }); ev.push({ t: 'msg', k: n ? 'healed' : 'fullHp', a: [atk, n] }); }
    if (fx.cure && atk.status) { atk.status = null; ev.push({ t: 'msg', k: 'cured', a: [atk] }); }
    if (fx.rest) { const n = maxHp(atk) - atk.hp; atk.hp = maxHp(atk); atk.status = 'slp'; S.sleep = 2; ev.push({ t: 'heal', side, who: atk, n }); ev.push({ t: 'msg', k: 'rested', a: [atk] }); }
    for (const s of fx.stages) if (s.who === 'self') this.stage(side, atk, s.stat, s.n, ev);
  }
  applyFoeEffects(side, atk, def, k, ev, isStatusMove) {
    const fx = k.fx, os = side === 'p' ? 'f' : 'p', D = this.side[os];
    let did = false;
    if (fx.status && Math.random() * 100 < fx.status.p) {
      const s = fx.status.s;
      if (s === 'conf') { if (!D.conf) { D.conf = 2 + Math.floor(Math.random() * 3); ev.push({ t: 'msg', k: 'becameConfused', a: [def] }); did = true; } }
      else if (!def.status && !(s === 'burn' && sp(def).type === 'fire') && !(s === 'frz' && sp(def).type === 'ice') && !(s === 'psn' && sp(def).type === 'poison') && !(s === 'par' && sp(def).type === 'electric')) {
        def.status = s; if (s === 'slp') D.sleep = 1 + Math.floor(Math.random() * 3);
        ev.push({ t: 'status', side: os, who: def, s }); ev.push({ t: 'msg', k: 'st_' + s, a: [def] }); did = true;
      }
    }
    for (const s of fx.stages) if (s.who === 'foe' && Math.random() * 100 < s.p) { this.stage(os, def, s.stat, s.n, ev); did = true; }
    for (const s of fx.stages) if (s.who === 'self' && isStatusMove) this.stage(side, atk, s.stat, s.n, ev);
    if (isStatusMove && !did && (fx.status || fx.stages.some((x) => x.who === 'foe'))) ev.push({ t: 'msg', k: 'failed' });
  }
  stage(side, m, st, n, ev) {
    const S = this.side[side];
    const cur = S.st[st] || 0, nv = Math.max(-6, Math.min(6, cur + n));
    if (nv === cur) { ev.push({ t: 'msg', k: n > 0 ? 'cantRise' : 'cantFall', a: [m, st] }); return; }
    S.st[st] = nv;
    ev.push({ t: 'stage', side, who: m, stat: st, n });
    ev.push({ t: 'msg', k: n > 0 ? (n > 1 ? 'rose2' : 'rose') : n < -1 ? 'fell2' : 'fell', a: [m, st] });
  }
  endOfTurn(ev) {
    // very long battles: both sides tire and lose 1/8 HP a turn, so every battle ends
    if (this.turn > 60) for (const [side, m] of [['p', this.me], ['f', this.foe]]) {
      if (m.hp <= 0) continue;
      const n = Math.max(1, Math.floor(maxHp(m) / 8)); m.hp = Math.max(0, m.hp - n);
      ev.push({ t: 'hit', side, who: m, n, self: true }); ev.push({ t: 'msg', k: 'tired', a: [m] });
    }
    for (const [side, m] of [['p', this.me], ['f', this.foe]]) {
      if (m.hp <= 0) continue;
      if (m.status === 'burn' || m.status === 'psn') {
        const n = Math.max(1, Math.floor(maxHp(m) / (m.status === 'burn' ? 16 : 8)));
        m.hp = Math.max(0, m.hp - n);
        ev.push({ t: 'hit', side, who: m, n, self: true }); ev.push({ t: 'msg', k: m.status === 'burn' ? 'burnHurt' : 'psnHurt', a: [m] });
      }
    }
    this.checkFaints(ev);
  }
  // returns true when the turn must stop (someone fainted)
  checkFaints(ev) {
    let stop = false;
    if (this.foe.hp <= 0 && !this.foe._fainted) {
      this.foe._fainted = true; stop = true;
      ev.push({ t: 'faint', side: 'f', who: this.foe }); ev.push({ t: 'msg', k: 'fainted', a: [this.foe] });
      this.giveExp(ev);
      const next = this.foes.findIndex((m) => m.hp > 0);
      if (next < 0) { this.over = { result: 'win' }; }
      else { this.fi = next; this.side.f = fresh(); ev.push({ t: 'send', side: 'f', who: this.foe }); ev.push({ t: 'msg', k: 'foeSends', a: [this.opts.tamer, this.foe] }); }
    }
    if (this.me.hp <= 0 && !this.me._down) {
      this.me._down = true; stop = true;
      ev.push({ t: 'faint', side: 'p', who: this.me }); ev.push({ t: 'msg', k: 'fainted', a: [this.me] });
      if (!this.party.some((m) => m.hp > 0)) { if (!this.over) this.over = { result: 'lose' }; }
      else if (!this.over) { this.needSwitch = true; ev.push({ t: 'needSwitch' }); }
    }
    return stop;
  }
  giveExp(ev) {
    const n = expYield(this.foe, !!this.opts.tamer);
    for (const m of this.party) {
      if (m.hp <= 0) continue;
      const share = this.participants.has(m.uid) ? n : Math.floor(n / 2);
      const res = gainExp(m, share);
      ev.push({ t: 'exp', who: m, n: share });
      for (const r of res) {
        if (r.kind === 'level') ev.push({ t: 'level', who: m, lv: r.lv }), ev.push({ t: 'msg', k: 'levelUp', a: [m, r.lv] });
        if (r.kind === 'learn') ev.push({ t: 'msg', k: r.equipped ? 'learned' : 'learnedBox', a: [m, SKILLS[r.skill]] });
      }
    }
    for (const m of this.party) delete m._down;
  }
}
function fresh() { return { st: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, crit: 0 }, conf: 0, sleep: 0, flinch: false, protect: false, recharge: false }; }
export { bestMoves };
