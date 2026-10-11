import { SPECIES, SKILLS, TYPES, TYPE_INFO, AREAS, TAMERS, ITEMS, ITEM, RANKS, STATS, STARTERS, STARTER_LV, STARTER_PLUS, areaPool, eff } from './data.js?v=2';
import { makeMon, sp, stat, maxHp, heal, expFor, fusionResult, fuse, FUSE_MIN_LV, bestMoves } from './model.js?v=2';
import { Battle } from './battle.js?v=2';
import { spriteURL } from './art.js?v=2';
import { sfx, music } from './audio.js?v=2';
import { t, L, getLang, setLang, M, STAT_NAME, STATUS_NAME } from './i18n.js?v=2';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const wait = (ms) => new Promise((r) => setTimeout(r, ms * (S.fast ? 0.35 : 1)));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ------------------------------------------------------------------ save
const KEY = 'mm.save.v1';
const fresh = () => ({ started: false, gold: 500, party: [], box: [], bag: { orb: 5, potion: 3 }, dex: { seen: {}, caught: {} }, tamers: {}, sound: true });
let save = (() => { try { return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { return fresh(); } })();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save, (k, v) => (k.startsWith('_') ? undefined : v))); } catch (e) { /* private mode */ } };
const S = { view: 'title', area: null, battle: null, busy: false, fast: false, ret: 'town' };

// ------------------------------------------------------------------ small helpers
const name = (m) => L(sp(m).name);
const typeChip = (ty) => `<span class="type" style="--c:${TYPE_INFO[ty].color}">${L(TYPE_INFO[ty])}</span>`;
const rankChip = (r) => `<span class="rank r${r}">${RANKS[r]}</span>`;
const img = (spId, v, o = {}) => `<img class="mon ${o.cls || ''}" src="${spriteURL(spId, v, { scale: 3, flip: !!o.flip, shadow: !!o.shadow })}" alt="">`;
const hpPct = (m) => Math.max(0, (100 * m.hp) / maxHp(m));
const hpColor = (p) => (p > 50 ? '#3ad06a' : p > 20 ? '#f2c12e' : '#e8452c');
const seen = (id) => !!save.dex.seen[id];
const caught = (id) => (save.dex.caught[id] || []).length > 0;
function markSeen(m) { save.dex.seen[m.sp] = 1; }
function markCaught(m) { const c = save.dex.caught[m.sp] || (save.dex.caught[m.sp] = []); if (!c.includes(m.v)) c.push(m.v); save.dex.seen[m.sp] = 1; }
function toast(msg, ms = 1800) { const el = $('toast'); el.innerHTML = msg; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), ms); }
function modal(html, onClose) {
  $('modal').innerHTML = `<div class="sheet">${html}</div>`; $('modal').hidden = false;
  $('modal').onclick = (e) => { if (e.target.id === 'modal') { closeModal(); if (onClose) onClose(); } };
}
function closeModal() { $('modal').hidden = true; $('modal').innerHTML = ''; }
const allMons = () => save.party.concat(save.box);

// ------------------------------------------------------------------ top bar + navigation
function top(title, back) {
  $('tTitle').textContent = title;
  $('tBack').hidden = !back; $('tBack').onclick = () => { sfx.play('click'); back && back(); };
  $('tGold').textContent = `💰 ${save.gold}`;
  $('tLang').textContent = t('lang');
}
function go(view, arg) {
  S.view = view; closeModal();
  const f = VIEWS[view]; f(arg);
  window.scrollTo(0, 0); $('main').scrollTop = 0;
}
const VIEWS = {
  title() {
    top(t('title'), null); music.play('town');
    $('main').innerHTML = `<div class="titleScr">
      <div class="logoMons">${[1, 33, 64, 91, 125, 150].map((id, i) => img(id, i === 5 ? 4 : i % 4)).join('')}</div>
      <h1>${t('title')}</h1><h2>${t('sub')}</h2>
      ${save.started ? `<button class="big" id="bCont">${t('cont')}</button>` : ''}
      <button class="${save.started ? 'ghost' : 'big'}" id="bNew">${t('newGame')}</button></div>`;
    if ($('bCont')) $('bCont').onclick = () => { sfx.unlock(); go('town'); };
    $('bNew').onclick = () => { sfx.unlock(); if (save.started && !confirm(t('newQ'))) return; save = fresh(); persist(); go('starter'); };
  },
  starter() {
    top(t('title'), null);
    $('main').innerHTML = `<p class="center big-t">${t('chooseStarter')}</p><div class="starters">${STARTERS.map((id) => {
      const s = SPECIES[id - 1]; return `<button class="card starter" data-id="${id}">${img(id, 0)}<b>${L(s.name)}</b>${typeChip(s.type)}</button>`; }).join('')}</div>`;
    $('main').querySelectorAll('.starter').forEach((b) => b.onclick = () => {
      const m = makeMon(+b.dataset.id, STARTER_LV, { plus: STARTER_PLUS, v: 0 });
      save.party = [m]; save.started = true; markCaught(m); persist();
      sfx.play('caught'); toast(t('starterGo', name(m)), 2500); go('town');
    });
  },
  town() {
    top(t('town'), null); music.play('town'); S.ret = 'town';
    const btn = (id, ic, label) => `<button class="tile" data-go="${id}"><span>${ic}</span>${label}</button>`;
    $('main').innerHTML = `<div class="townScene">${save.party.map((m) => img(m.sp, m.v, { flip: true })).join('')}</div>
      <div class="tiles">${btn('map', '🗺️', t('map'))}${btn('heal', '💖', t('heal'))}${btn('shop', '🛒', t('shop'))}${btn('fusion', '🧬', t('fusion'))}
      ${btn('party', '🐾', t('party'))}${btn('box', '📦', t('box'))}${btn('dex', '📖', t('dex'))}${btn('bag', '🎒', t('bag'))}</div>
      <p class="dexCount">${t('dex')}: ${t('seen')} ${Object.keys(save.dex.seen).length} · ${t('caught')} ${Object.keys(save.dex.caught).length} / 150</p>`;
    $('main').querySelectorAll('.tile').forEach((b) => b.onclick = () => {
      sfx.play('click');
      if (b.dataset.go === 'heal') { allMons().forEach(heal); persist(); sfx.play('heal'); toast(t('healDone')); go('town'); return; }
      S.ret = 'town'; go(b.dataset.go);
    });
  },
  map() {
    top(t('map'), () => go('town')); music.play('explore');
    $('main').innerHTML = `<div class="areas">${AREAS.map((a) => {
      const beat = TAMERS.filter((tm) => tm.area === a.id && save.tamers[tm.id]).length;
      return `<button class="area" data-a="${a.id}" style="--s1:${a.sky[0]};--s2:${a.sky[1]};--g:${a.ground}">
        <b>${L(a)}</b><small>${t('lvRange', a.lv[0], a.lv[1])}</small><span class="types">${a.types.map(typeChip).join('')}</span><small>⚔ ${beat}/3</small></button>`; }).join('')}</div>`;
    $('main').querySelectorAll('.area').forEach((b) => b.onclick = () => { sfx.play('click'); go('area', b.dataset.a); });
  },
  area(id) {
    const a = AREAS.find((x) => x.id === id); S.area = a; S.ret = 'area';
    top(L(a), () => go('map')); music.play('explore');
    const pool = areaPool(a).slice(0, 5);
    const tms = TAMERS.filter((tm) => tm.area === id);
    $('main').innerHTML = `<div class="areaScene" style="--s1:${a.sky[0]};--s2:${a.sky[1]};--g:${a.ground}">${pool.map((s, i) => `<span style="left:${8 + i * 18}%;bottom:${10 + (i % 2) * 14}%">${img(s.id, 0, { shadow: !seen(s.id), flip: i % 2 === 0 })}</span>`).join('')}</div>
      <button class="big wide" id="bExplore">${t('explore')}</button>
      <h3>${t('tamers')}</h3><div class="tamers">${tms.map((tm) => `<div class="tamer"><div><b>${L(tm.name)}</b><small>${tm.team.length} × Lv ${Math.min(...tm.team.map((x) => x.lv))}–${Math.max(...tm.team.map((x) => x.lv))} · 💰${tm.gold}</small>
        <span class="minis">${tm.team.map((x) => img(x.sp, x.v, { shadow: !seen(x.sp), cls: 'mini' })).join('')}</span>${save.tamers[tm.id] ? `<small class="won">🏆 ${t('beaten', save.tamers[tm.id])}</small>` : ''}</div>
        <button data-tm="${tm.id}">${t('challenge')}</button></div>`).join('')}</div>
      <div class="row2"><button class="ghost" id="bTown">${t('toTown')}</button><button class="ghost" id="bMap">${t('toMap')}</button></div>`;
    $('bExplore').onclick = () => explore(a);
    $('bTown').onclick = () => go('town'); $('bMap').onclick = () => go('map');
    $('main').querySelectorAll('[data-tm]').forEach((b) => b.onclick = () => {
      const tm = TAMERS.find((x) => x.id === b.dataset.tm);
      if (!save.party.some((m) => m.hp > 0)) { toast(t('needLead')); return; }
      const foes = tm.team.map((x) => makeMon(x.sp, x.lv, { v: x.v }));
      startBattle(foes, { tamer: tm, name: L(tm.name), gold: save.tamers[tm.id] ? Math.round(tm.gold / 2) : tm.gold });
    });
  },
  party() {
    top(t('party'), () => go(S.ret === 'area' ? 'area' : 'town', S.area && S.area.id));
    $('main').innerHTML = `<div class="list">${save.party.map((m, i) => monRow(m, i)).join('')}</div>`;
    $('main').querySelectorAll('.monRow').forEach((r) => r.onclick = () => monDetail(r.dataset.uid));
  },
  box() {
    top(t('box'), () => go('town'));
    $('main').innerHTML = save.box.length ? `<div class="grid">${save.box.map((m) => `<button class="boxMon" data-uid="${m.uid}">${img(m.sp, m.v)}<small>Lv ${m.lv}</small></button>`).join('')}</div>` : `<p class="center">${t('boxEmpty')}</p>`;
    $('main').querySelectorAll('.boxMon').forEach((b) => b.onclick = () => monDetail(b.dataset.uid));
  },
  dex() {
    top(t('dex'), () => go('town'));
    $('main').innerHTML = `<p class="center">${t('seen')} ${Object.keys(save.dex.seen).length} · ${t('caught')} ${Object.keys(save.dex.caught).length} / 150</p>
      <div class="grid dex">${SPECIES.map((s) => { const c = save.dex.caught[s.id] || []; return `<button class="dexMon ${caught(s.id) ? 'got' : ''}" data-id="${s.id}"><small>#${String(s.id).padStart(3, '0')}</small>${seen(s.id) ? img(s.id, c.includes(4) ? 4 : c[0] ?? 0, { shadow: !caught(s.id) }) : '<span class="q">?</span>'}
        <span class="dots">${[0, 1, 2, 3, 4].map((v) => `<i class="${c.includes(v) ? 'on' : ''} ${v === 4 ? 'rb' : ''}"></i>`).join('')}</span></button>`; }).join('')}</div>`;
    $('main').querySelectorAll('.dexMon').forEach((b) => b.onclick = () => dexDetail(+b.dataset.id));
  },
  bag() {
    top(t('bag'), () => go(S.ret === 'area' ? 'area' : 'town', S.area && S.area.id));
    $('main').innerHTML = `<div class="list">${ITEMS.map((it) => `<div class="itemRow"><span class="ic">${it.icon}</span><b>${L(it)}</b><small>× ${save.bag[it.id] || 0}</small>${it.kind !== 'orb' && save.bag[it.id] ? `<button data-i="${it.id}">${t('choose')}</button>` : ''}</div>`).join('')}</div>`;
    $('main').querySelectorAll('[data-i]').forEach((b) => b.onclick = () => pickTarget(b.dataset.i, (m) => { useItemOutside(b.dataset.i, m); go('bag'); }));
  },
  shop() {
    top(t('shop'), () => go('town'));
    $('main').innerHTML = `<div class="list">${ITEMS.map((it) => `<div class="itemRow"><span class="ic">${it.icon}</span><b>${L(it)}</b><small>${t('owned', save.bag[it.id] || 0)}</small><button data-i="${it.id}" ${save.gold < it.price ? 'class="poor"' : ''}>💰 ${it.price}</button></div>`).join('')}</div>`;
    $('main').querySelectorAll('[data-i]').forEach((b) => b.onclick = () => {
      const it = ITEM[b.dataset.i];
      if (save.gold < it.price) { toast(t('notEnough')); return; }
      save.gold -= it.price; save.bag[it.id] = (save.bag[it.id] || 0) + 1; persist(); sfx.play('click'); go('shop');
    });
  },
  fusion() {
    top(t('fusion'), () => go('town'));
    S.fuse = S.fuse || { a: null, b: null };
    const A = allMons().find((m) => m.uid === S.fuse.a), B = allMons().find((m) => m.uid === S.fuse.b);
    const slot = (m, k) => `<button class="slot" data-k="${k}">${m ? `${img(m.sp, m.v)}<b>${name(m)}</b><small>Lv ${m.lv} ${m.plus ? '+' + m.plus : ''}</small>` : `<span class="q">＋</span><small>${t(k === 'a' ? 'parentA' : 'parentB')}</small>`}</button>`;
    let res = '';
    if (A && B) {
      const r = fusionResult(A, B), rs = r.species;
      res = `<div class="fuseRes"><h3>${t('result')}</h3>${img(rs.id, 0, { shadow: !seen(rs.id) })}<b>${seen(rs.id) ? L(rs.name) : '???'}</b> ${typeChip(rs.type)} ${rankChip(rs.rank)} <small>${t('plus')} +${r.plus}</small>
        <p><small>${t('inherit')}: ${r.inherit.map((id) => L(SKILLS[id])).join('、')}</small></p><button class="big" id="bFuse">${t('fuseGo')}</button></div>`;
    }
    $('main').innerHTML = `<p class="help">${t('fusionHelp')}</p><div class="slots">${slot(A, 'a')}<span class="plusSign">＋</span>${slot(B, 'b')}</div>${res}`;
    $('main').querySelectorAll('.slot').forEach((b) => b.onclick = () => {
      const other = b.dataset.k === 'a' ? S.fuse.b : S.fuse.a;
      const list = allMons().filter((m) => m.lv >= FUSE_MIN_LV && m.uid !== other);
      if (!list.length) { toast(`${t('noMons')} (${t('fuseNeed')})`); return; }
      modal(`<h3>${t('pick')}</h3><div class="list">${list.map((m) => monRow(m)).join('')}</div>`);
      $('modal').querySelectorAll('.monRow').forEach((r) => r.onclick = () => { S.fuse[b.dataset.k] = r.dataset.uid; closeModal(); go('fusion'); });
    });
    if ($('bFuse')) $('bFuse').onclick = () => {
      if (!confirm(t('fuseQ'))) return;
      const child = fuse(A, B);
      const inParty = save.party.findIndex((m) => m.uid === A.uid || m.uid === B.uid);
      save.party = save.party.filter((m) => m.uid !== A.uid && m.uid !== B.uid);
      save.box = save.box.filter((m) => m.uid !== A.uid && m.uid !== B.uid);
      if (inParty >= 0 || save.party.length === 0) save.party.splice(Math.max(0, inParty), 0, child); else save.box.push(child);
      markCaught(child); S.fuse = { a: null, b: null }; persist();
      sfx.play(child.v === 4 ? 'rainbow' : 'fuse');
      modal(`<div class="center born">${img(child.sp, child.v, { cls: 'big' })}<h2>${t('fused', name(child))}</h2>${child.v === 4 ? `<p>${t('rainbowCaught')}</p>` : ''}<button class="big" id="bOk">OK</button></div>`);
      $('bOk').onclick = () => { closeModal(); go('fusion'); };
    };
  },
};

function monRow(m, i) {
  const p = hpPct(m), s = sp(m);
  return `<div class="monRow ${m.hp <= 0 ? 'down' : ''}" data-uid="${m.uid}">${img(m.sp, m.v, { cls: 'sm' })}<div class="mi">
    <span class="tl"><b>${name(m)} ${m.v === 4 ? '<span class="rbw">✦</span>' : ''}</b>${typeChip(s.type)}${rankChip(s.rank)}</span><small>Lv ${m.lv}${m.plus ? ` · +${m.plus}` : ''}${m.status ? ` · ${STATUS_NAME[getLang()][m.status]}` : ''}</small>
    <span class="hpbar"><i style="width:${p}%;background:${hpColor(p)}"></i></span><small>${m.hp}/${maxHp(m)}</small></div>${i === 0 ? '<span class="lead">★</span>' : ''}</div>`;
}

function monDetail(uid) {
  const m = allMons().find((x) => x.uid === uid); if (!m) return;
  const s = sp(m), inParty = save.party.includes(m);
  const sn = STAT_NAME[getLang()];
  const next = m.lv < 100 ? expFor(m.lv + 1) - m.exp : 0;
  modal(`<div class="detail"><div class="dh">${img(m.sp, m.v, { cls: 'big' })}<div><h2>${name(m)} ${m.v === 4 ? '<span class="rbw">✦</span>' : ''}</h2>${typeChip(s.type)} ${rankChip(s.rank)}
      <p>Lv ${m.lv} · ${t('plus')} +${m.plus}<br><small>${t('nextLv', next)}</small></p></div></div>
    <h3>${t('stats')}</h3><div class="stats">${STATS.map((k) => `<div><span>${sn[k]}</span><b>${k === 'hp' ? `${m.hp}/${maxHp(m)}` : stat(m, k)}</b><i style="width:${Math.min(100, s.base[k] / 1.6)}%"></i></div>`).join('')}</div>
    <h3>${t('learned')}</h3><div class="skills">${m.learned.map((id) => skillChip(id, m.moves.includes(id))).join('')}</div>
    <div class="row2">${inParty ? `<button id="dLead">${t('lead')}</button><button id="dBox">${t('toBoxBtn')}</button>` : `<button id="dParty">${t('toPartyBtn')}</button><button id="dRel" class="danger">${t('release')}</button>`}</div></div>`);
  $('modal').querySelectorAll('.skill').forEach((b) => b.onclick = () => {
    const id = +b.dataset.id;
    if (m.moves.includes(id)) { if (m.moves.length > 1) m.moves = m.moves.filter((x) => x !== id); }
    else if (m.moves.length < 4) m.moves.push(id);
    else { toast('4 / 4'); return; }
    persist(); monDetail(uid);
  });
  const refresh = () => { closeModal(); go(S.view); };
  if ($('dLead')) $('dLead').onclick = () => { save.party = [m, ...save.party.filter((x) => x !== m)]; persist(); refresh(); };
  if ($('dBox')) $('dBox').onclick = () => { if (save.party.filter((x) => x !== m && x.hp > 0).length < 1) { toast(t('needLead')); return; } save.party = save.party.filter((x) => x !== m); save.box.push(m); persist(); refresh(); };
  if ($('dParty')) $('dParty').onclick = () => { if (save.party.length >= 6) { toast(t('partyFull')); return; } save.box = save.box.filter((x) => x !== m); save.party.push(m); persist(); refresh(); };
  if ($('dRel')) $('dRel').onclick = () => { if (!confirm(t('releaseQ', name(m)))) return; save.box = save.box.filter((x) => x !== m); persist(); refresh(); };
}
function skillChip(id, on) {
  const k = SKILLS[id];
  const cat = k.cat === 'p' ? '⚔' : k.cat === 's' ? '✺' : '◎';
  return `<button class="skill ${on ? 'on' : ''}" data-id="${id}" style="--c:${TYPE_INFO[k.type].color}"><b>${L(k)}</b><small>${cat} ${k.power || '—'} · ${k.acc ? k.acc + '%' : '∞'}</small></button>`;
}
function dexDetail(id) {
  const s = SPECIES[id - 1];
  if (!seen(id)) { modal(`<div class="center">${img(id, 0, { shadow: true, cls: 'big' })}<h2>#${String(id).padStart(3, '0')} ???</h2></div>`); return; }
  const c = save.dex.caught[id] || [];
  const areas = AREAS.filter((a) => areaPool(a).some((x) => x.id === id));
  const sn = STAT_NAME[getLang()];
  modal(`<div class="detail"><div class="dh">${img(id, c.includes(4) ? 4 : c[0] ?? 0, { cls: 'big', shadow: !c.length })}<div><h2>#${String(id).padStart(3, '0')} ${L(s.name)}</h2>${typeChip(s.type)} ${rankChip(s.rank)}</div></div>
    <h3>${t('variants')}</h3><div class="variants">${[0, 1, 2, 3, 4].map((v) => c.includes(v) ? img(id, v, { cls: 'sm' }) : `<span class="vq ${v === 4 ? 'rb' : ''}">?</span>`).join('')}</div>
    <h3>${t('stats')}</h3><div class="stats">${STATS.map((k) => `<div><span>${sn[k]}</span><b>${s.base[k]}</b><i style="width:${Math.min(100, s.base[k] / 1.6)}%"></i></div>`).join('')}</div>
    <h3>${t('foundIn')}</h3><p>${areas.length ? areas.map((a) => L(a)).join('、') : t('nowhere')}</p>
    <h3>${t('learnset')}</h3><div class="skills">${s.learn.map(([lv, sk]) => `<span class="lv">Lv${lv}</span>${skillChip(sk, false)}`).join('')}</div></div>`);
}
function pickTarget(itemId, cb) {
  const it = ITEM[itemId];
  const ok = (m) => (it.kind === 'revive' ? m.hp <= 0 : m.hp > 0 && (m.hp < maxHp(m) || (it.cure && m.status)));
  modal(`<h3>${t('useOn')}</h3><div class="list">${save.party.map((m, i) => monRow(m, i)).join('')}</div>`);
  $('modal').querySelectorAll('.monRow').forEach((r) => { const m = save.party.find((x) => x.uid === r.dataset.uid); if (!ok(m)) r.classList.add('dis'); else r.onclick = () => { closeModal(); cb(m); }; });
}
function useItemOutside(itemId, m) {
  const it = ITEM[itemId];
  if (it.kind === 'revive') m.hp = Math.floor(maxHp(m) / 2), m.status = null;
  else { m.hp = Math.min(maxHp(m), m.hp + it.hp); if (it.cure) m.status = null; }
  save.bag[itemId]--; persist(); sfx.play('heal');
}

// ------------------------------------------------------------------ exploring
function explore(a) {
  if (!save.party.some((m) => m.hp > 0)) { toast(t('needLead')); return; }
  sfx.play('encounter');
  const pool = areaPool(a);
  const pick = () => { const w = pool.map((s) => 1 / Math.pow(1 + s.rank - a.ranks[0], 1.3)); let x = Math.random() * w.reduce((p, q) => p + q, 0); for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x <= 0) return pool[i]; } return pool[0]; };
  const lv = () => a.lv[0] + Math.floor(Math.random() * (a.lv[1] - a.lv[0] + 1));
  if (Math.random() < 0.12) {
    const names = { zh: ['阿明', '小葵', '大雄', '美咲', '阿嘉', '小雨', '阿豪', '莉莉'], en: ['Ben', 'Aoi', 'Max', 'Misa', 'Jack', 'Rain', 'Hao', 'Lily'] };
    const i = Math.floor(Math.random() * 8);
    const foes = Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => makeMon(pick().id, Math.min(a.lv[1] + 2, lv() + 2)));
    startBattle(foes, { tamer: { id: 'wanderer' }, name: `${t('wanderer')} ${names[getLang()][i]}`, gold: 40 + a.lv[1] * 6 });
    return;
  }
  startBattle([makeMon(pick().id, lv())], { wild: true });
}

// ------------------------------------------------------------------ battle UI
const B = () => S.battle;
let disp = { p: 0, f: 0 };
function fmtMon(m) {
  if (save.party.includes(m)) return name(m);
  return S.bopts.wild ? M().wild(name(m)) : M().foe(name(m));
}
function fmtMsg(e) {
  const f = M()[e.k];
  if (!f) return '';
  const args = (e.a || []).map((x) => (x && x.sp ? fmtMon(x) : x && x.en ? L(x) : typeof x === 'string' && STAT_NAME.en[x] ? STAT_NAME[getLang()][x] : x && x.name && x.team ? L(x.name) : x));
  if (e.k === 'foeSends') args[0] = S.bopts.name || '';
  let s = typeof f === 'function' ? f(...args) : f;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
async function startBattle(foes, opts) {
  closeModal();
  S.battle = new Battle(save.party, foes, opts); S.bopts = opts;
  foes.forEach(markSeen); persist();
  music.play(opts.tamer ? 'tamer' : 'battle');
  const a = S.area || AREAS[0];
  $('battle').hidden = false;
  $('battle').style.setProperty('--s1', a.sky[0]); $('battle').style.setProperty('--s2', a.sky[1]); $('battle').style.setProperty('--g', a.ground);
  disp = { p: B().me.hp, f: B().foe.hp };
  drawSide('p'); drawSide('f');
  $('cmd').innerHTML = '';
  $('fSprite').className = 'spr enter'; $('pSprite').className = 'spr enter';
  await say(opts.wild ? t('wildAppeared', name(foes[0])) : t('tamerChallenge', opts.name));
  if (B().foe.v === 4) { sfx.play('rainbow'); await say('✦✦✦'); }
  if (!opts.wild) await say(M().foeSends(opts.name, name(B().foe)));
  await say(M().go(name(B().me)));
  commands();
}
function drawSide(side) {
  const m = side === 'p' ? B().me : B().foe, s = sp(m);
  $(side + 'Sprite').innerHTML = img(m.sp, m.v, { flip: side === 'p' });
  $(side + 'Sprite').style.setProperty('--sz', 0.8 + s.rank * 0.07);
  const hp = Math.max(0, disp[side]), p = Math.max(0, (100 * hp) / maxHp(m));
  $(side + 'Info').innerHTML = `<div class="nm"><b>${name(m)}${m.v === 4 ? ' <span class="rbw">✦</span>' : ''}</b><span>Lv ${m.lv}</span></div>
    <div class="tl">${typeChip(s.type)}${m.status ? `<span class="st st-${m.status}">${STATUS_NAME[getLang()][m.status]}</span>` : ''}${side === 'f' && S.bopts.wild && caught(m.sp) ? '<span class="own">◉</span>' : ''}</div>
    <span class="hpbar"><i style="width:${p}%;background:${hpColor(p)}"></i></span>${side === 'p' ? `<small>${hp}/${maxHp(m)}</small><span class="expbar"><i style="width:${m.lv >= 100 ? 100 : Math.max(0, Math.min(100, (100 * (m.exp - expFor(m.lv))) / (expFor(m.lv + 1) - expFor(m.lv))))}%"></i></span>` : ''}`;
}
let sayResolve = null;
function say(text) {
  return new Promise((res) => {
    $('msg').textContent = text;
    sayResolve = res;
    setTimeout(() => { if (sayResolve === res) { sayResolve = null; res(); } }, S.fast ? 450 : 1050);
  });
}
$('msg').onclick = () => { if (sayResolve) { const r = sayResolve; sayResolve = null; r(); } };
function commands() {
  if (B().over) return;
  const me = B().me, wild = S.bopts.wild;
  $('msg').textContent = getLang() === 'zh' ? `${name(me)}要做什麼？` : `What will ${name(me)} do?`;
  $('cmd').innerHTML = `<div class="moves">${me.moves.map((id) => { const k = SKILLS[id], e = k.cat === 'x' ? 1 : eff(k.type, sp(B().foe).type);
      return `<button class="mv" data-m="${id}" style="--c:${TYPE_INFO[k.type].color}"><b>${L(k)}</b><small>${L(TYPE_INFO[k.type])} · ${k.power || '—'}${caught(B().foe.sp) || seen(B().foe.sp) ? (e > 1 ? ' ▲' : e < 1 ? ' ▼' : '') : ''}</small></button>`; }).join('')}</div>
    <div class="acts"><button data-a="switch">🔄 ${t('switchMon')}</button><button data-a="bag">🎒 ${t('bag')}</button>${wild ? `<button data-a="catch">🔴 ${t('catchIt')}</button><button data-a="run">🏃 ${t('run')}</button>` : ''}</div>`;
  $('cmd').querySelectorAll('.mv').forEach((b) => b.onclick = () => act({ kind: 'move', move: +b.dataset.m }));
  $('cmd').querySelectorAll('[data-a]').forEach((b) => b.onclick = () => {
    const a = b.dataset.a; sfx.play('click');
    if (a === 'run') act({ kind: 'run' });
    if (a === 'switch') switchMenu(false);
    if (a === 'bag') bagMenu(false);
    if (a === 'catch') bagMenu(true);
  });
}
function switchMenu(forced) {
  const list = save.party.map((m, i) => ({ m, i })).filter(({ m, i }) => m.hp > 0 && i !== B().pi);
  modal(`<h3>${forced ? t('whoNext') : t('switchMon')}</h3><div class="list">${list.map(({ m }) => monRow(m)).join('')}</div>${forced ? '' : `<button class="ghost" id="mBack">${t('back')}</button>`}`, forced ? () => switchMenu(true) : null);
  $('modal').querySelectorAll('.monRow').forEach((r) => r.onclick = () => { closeModal(); act({ kind: 'switch', to: save.party.findIndex((m) => m.uid === r.dataset.uid) }); });
  if ($('mBack')) $('mBack').onclick = closeModal;
}
function bagMenu(orbsOnly) {
  const items = ITEMS.filter((it) => (save.bag[it.id] || 0) > 0 && (orbsOnly ? it.kind === 'orb' : it.kind !== 'orb' || S.bopts.wild));
  modal(`<h3>${orbsOnly ? t('orbs') : t('bag')}</h3><div class="list">${items.length ? items.map((it) => `<div class="itemRow"><span class="ic">${it.icon}</span><b>${L(it)}</b><small>× ${save.bag[it.id]}</small><button data-i="${it.id}">${t('choose')}</button></div>`).join('') : `<p>${t('empty')}</p>`}</div><button class="ghost" id="mBack">${t('back')}</button>`);
  $('mBack').onclick = closeModal;
  $('modal').querySelectorAll('[data-i]').forEach((b) => b.onclick = () => {
    const it = ITEM[b.dataset.i];
    if (it.kind === 'orb') { closeModal(); save.bag[it.id]--; act({ kind: 'catch', item: it.id }); return; }
    pickTarget(it.id, (m) => { save.bag[it.id]--; act({ kind: 'item', item: it.id, target: save.party.indexOf(m) }); });
  });
}
async function act(action) {
  if (S.busy) return;
  S.busy = true; $('cmd').innerHTML = '';
  const ev = B().step(action);
  await play(ev);
  persist();
  S.busy = false;
  if (B().over) return finish();
  if (B().needSwitch) return switchMenu(true);
  commands();
}
async function play(ev) {
  for (const e of ev) {
    switch (e.t) {
      case 'msg': { const s = fmtMsg(e); if (s) await say(s); break; }
      case 'use': { const el = $(e.side + 'Sprite'); el.classList.remove('lunge'); void el.offsetWidth; el.classList.add('lunge'); const fx = $(e.side === 'p' ? 'fFx' : 'pFx'); fx.style.setProperty('--c', TYPE_INFO[e.type].color); fx.classList.remove('on'); void fx.offsetWidth; fx.classList.add('on'); await wait(320); break; }
      case 'hit': {
        disp[e.side] = Math.max(0, disp[e.side] - e.n);
        const el = $(e.side + 'Sprite'); el.classList.remove('hurt'); void el.offsetWidth; el.classList.add('hurt');
        sfx.play(e.mult > 1 ? 'super' : e.mult < 1 ? 'weak' : 'hit');
        if (e.n) pop(e.side, `-${e.n}`, e.crit ? '#ffd23a' : '#fff');
        drawSide(e.side); await wait(380); break;
      }
      case 'heal': { const m = e.side === 'p' ? B().me : B().foe; disp[e.side] = Math.min(maxHp(m), disp[e.side] + e.n); if (e.who && e.who.hp === maxHp(e.who)) disp[e.side] = maxHp(m); sfx.play('heal'); pop(e.side, `+${e.n}`, '#7aff9a'); drawSide(e.side); await wait(300); break; }
      case 'status': sfx.play('status'); drawSide(e.side); break;
      case 'stage': sfx.play('stat'); pop(e.side, e.n > 0 ? '▲' : '▼', e.n > 0 ? '#ff9a5a' : '#6ab0ff'); await wait(200); break;
      case 'faint': { sfx.play('faint'); const el = $(e.side + 'Sprite'); el.classList.add('faint'); await wait(600); break; }
      case 'send': { const el = $(e.side + 'Sprite'); el.className = 'spr enter'; disp[e.side] = e.who.hp; if (e.side === 'f') markSeen(e.who); drawSide(e.side); await wait(350); break; }
      case 'catch': await catchAnim(e); break;
      case 'exp': if (e.who === B().me) drawSide('p'); break;
      case 'level': sfx.play('level'); if (e.who === B().me) { disp.p = e.who.hp; drawSide('p'); } break;
      default: break;
    }
  }
}
function pop(side, text, color) {
  const d = document.createElement('div'); d.className = 'pop'; d.textContent = text; d.style.color = color;
  $(side + 'Sprite').appendChild(d); setTimeout(() => d.remove(), 900);
}
async function catchAnim(e) {
  const f = $('fSprite');
  const orb = document.createElement('div'); orb.className = 'orb'; f.appendChild(orb);
  await wait(450); f.classList.add('inorb');
  for (let i = 0; i < Math.max(1, e.shakes); i++) { sfx.play('shake'); orb.classList.remove('shake'); void orb.offsetWidth; orb.classList.add('shake'); await wait(650); }
  if (e.ok) { sfx.play('caught'); orb.classList.add('done'); await wait(500); }
  else { f.classList.remove('inorb'); orb.remove(); }
}
async function finish() {
  const o = B().over, opts = S.bopts;
  if (o.result === 'win') {
    sfx.play('win');
    let gold = opts.gold || B().foes.reduce((s, m) => s + m.lv * 4, 0);
    save.gold += gold;
    if (opts.tamer && opts.tamer.id !== 'wanderer') save.tamers[opts.tamer.id] = (save.tamers[opts.tamer.id] || 0) + 1;
    await say(t('win')); await say(t('gotGold', gold));
  }
  if (o.result === 'caught') {
    const m = o.mon; delete m._fainted;
    const isNew = !caught(m.sp);
    markCaught(m);
    if (save.party.length < 6) { save.party.push(m); await say(t('toParty', name(m))); } else { save.box.push(m); await say(t('toBox', name(m))); }
    if (m.v === 4) await say(t('rainbowCaught'));
    if (isNew) await say(t('newDex'));
  }
  if (o.result === 'lose') {
    const lost = Math.floor(save.gold / 4);
    save.gold -= lost; await say(t('lose')); await say(t('blackout', lost));
    allMons().forEach(heal);
  }
  for (const m of save.party) { delete m._down; delete m._fainted; }
  persist();
  $('battle').hidden = true; S.battle = null;
  if (o.result === 'lose') go('town'); else go('area', S.area.id);
}

// ------------------------------------------------------------------ boot
$('tLang').onclick = () => { setLang(getLang() === 'zh' ? 'en' : 'zh'); go(S.view, S.view === 'area' ? S.area.id : undefined); if (S.battle) { drawSide('p'); drawSide('f'); if (!S.busy) commands(); } };
$('tHelp').onclick = () => { modal(`<h2>${t('help')}</h2>${t('helpBody').map((p) => `<p>${p}</p>`).join('')}<button class="ghost" id="mBack">OK</button>`); $('mBack').onclick = closeModal; };
$('tSound').onclick = () => { save.sound = !save.sound; sfx.on = save.sound; $('tSound').textContent = save.sound ? '🔊' : '🔇'; persist(); };
sfx.on = save.sound !== false; $('tSound').textContent = save.sound !== false ? '🔊' : '🔇';
document.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
setLang(getLang());
if (params.has('fast')) S.fast = true;
if (params.has('demo')) {          // screenshots / tests: a ready-made save
  save = fresh(); save.started = true; save.gold = 3000;
  save.party = [makeMon(STARTERS[0], 24, { v: 0 }), makeMon(64, 22, { v: 4 }), makeMon(91, 20, { v: 2 }), makeMon(125, 30, { v: 1 })];
  save.box = [makeMon(34, 12), makeMon(19, 15, { v: 3 }), makeMon(150, 40, { v: 4 })];
  allMons().forEach(markCaught); for (let i = 1; i <= 60; i++) save.dex.seen[i] = 1;
  save.bag = { orb: 10, orb2: 3, potion: 5, potion2: 2, revive: 1 };
}
go(save.started ? 'town' : 'title');
if (params.get('go')) go(params.get('go'), params.get('arg'));
window.MM = { S, save: () => save, go, startBattle, act, explore, B, makeMon, AREAS, finish };
