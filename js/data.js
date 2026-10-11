// Monster Masters: types, type chart, 200 skills, 150 monsters, areas, tamers, items. Pure data + deterministic generation.

// ------------------------------------------------------------------ seeded random (the same monsters for every player)
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// ------------------------------------------------------------------ types
export const TYPES = ['normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fight', 'poison', 'earth', 'wind', 'psychic', 'bug', 'rock', 'ghost', 'dragon'];
export const TYPE_INFO = {
  normal: { zh: '一般', en: 'Normal', color: '#a8a878', hue: 35 }, fire: { zh: '火', en: 'Fire', color: '#f08030', hue: 14 },
  water: { zh: '水', en: 'Water', color: '#6890f0', hue: 215 }, grass: { zh: '草', en: 'Grass', color: '#78c850', hue: 105 },
  electric: { zh: '電', en: 'Electric', color: '#f8d030', hue: 50 }, ice: { zh: '冰', en: 'Ice', color: '#98d8d8', hue: 185 },
  fight: { zh: '格鬥', en: 'Fighting', color: '#c03028', hue: 2 }, poison: { zh: '毒', en: 'Poison', color: '#a040a0', hue: 290 },
  earth: { zh: '地面', en: 'Ground', color: '#e0c068', hue: 38 }, wind: { zh: '風', en: 'Wind', color: '#a890f0', hue: 255 },
  psychic: { zh: '超能', en: 'Psychic', color: '#f85888', hue: 335 }, bug: { zh: '蟲', en: 'Bug', color: '#a8b820', hue: 70 },
  rock: { zh: '岩石', en: 'Rock', color: '#b8a038', hue: 45 }, ghost: { zh: '幽靈', en: 'Ghost', color: '#705898', hue: 270 },
  dragon: { zh: '龍', en: 'Dragon', color: '#7038f8', hue: 258 },
};
// attacker -> defender multipliers (anything not listed is 1)
const CHART = {
  normal: { rock: 0.5, ghost: 0 },
  fire: { grass: 2, ice: 2, bug: 2, fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5 },
  water: { fire: 2, earth: 2, rock: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
  grass: { water: 2, earth: 2, rock: 2, fire: 0.5, grass: 0.5, poison: 0.5, wind: 0.5, bug: 0.5, dragon: 0.5 },
  electric: { water: 2, wind: 2, electric: 0.5, grass: 0.5, dragon: 0.5, earth: 0 },
  ice: { grass: 2, earth: 2, wind: 2, dragon: 2, fire: 0.5, water: 0.5, ice: 0.5 },
  fight: { normal: 2, ice: 2, rock: 2, poison: 0.5, wind: 0.5, psychic: 0.5, bug: 0.5, ghost: 0 },
  poison: { grass: 2, poison: 0.5, earth: 0.5, rock: 0.5, ghost: 0.5 },
  earth: { fire: 2, electric: 2, poison: 2, rock: 2, grass: 0.5, bug: 0.5, wind: 0 },
  wind: { grass: 2, fight: 2, bug: 2, electric: 0.5, rock: 0.5 },
  psychic: { fight: 2, poison: 2, psychic: 0.5 },
  bug: { grass: 2, psychic: 2, fire: 0.5, fight: 0.5, poison: 0.5, wind: 0.5, ghost: 0.5 },
  rock: { fire: 2, ice: 2, wind: 2, bug: 2, fight: 0.5, earth: 0.5 },
  ghost: { psychic: 2, ghost: 2, normal: 0 },
  dragon: { dragon: 2 },
};
export const eff = (atk, def) => (CHART[atk][def] ?? 1);

// ------------------------------------------------------------------ skills
// [en, zh, cat (p physical / s special / x status), power, accuracy (0 = never misses), effects]
// effects: burn10 psn30 par30 slp frz10 conf20 flinch30 (status + chance), crit, recoil33, drain50, heal50, multi (2-5 hits),
// double, prio, recharge, faint, rest, cure, protect, hex, facade, selfconf, foe:def-1@30 / self:atk+2 (stage changes)
const TS = {
  normal: [['Tackle', '撞擊', 'p', 40, 100, ''], ['Quick Attack', '電光一閃', 'p', 40, 100, 'prio'], ['Headbutt', '頭錘', 'p', 70, 100, 'flinch30'],
    ['Body Slam', '泰山壓頂', 'p', 85, 100, 'par30'], ['Hyper Voice', '巨聲', 's', 90, 100, ''], ['Swift', '高速星星', 's', 60, 0, ''],
    ['Fury Swipes', '亂抓', 'p', 18, 85, 'multi'], ['Slam', '摔打', 'p', 80, 75, ''], ['Double-Edge', '捨身衝撞', 'p', 120, 100, 'recoil33'],
    ['Hyper Beam', '破壞光線', 's', 150, 90, 'recharge'], ['Giga Impact', '終極衝擊', 'p', 150, 90, 'recharge']],
  fire: [['Ember', '火花', 's', 40, 100, 'burn10'], ['Flame Claw', '火焰爪', 'p', 50, 100, 'crit'], ['Fire Spin', '火焰漩渦', 's', 55, 90, 'burn20'],
    ['Flame Fang', '火焰牙', 'p', 65, 95, 'burn10 flinch10'], ['Fireball', '火球', 's', 70, 100, ''], ['Blaze Kick', '火焰踢', 'p', 85, 90, 'crit burn10'],
    ['Lava Plume', '熔岩噴發', 's', 80, 100, 'burn30'], ['Heat Wave', '熱風', 's', 95, 90, 'burn10'], ['Flare Charge', '閃焰衝鋒', 'p', 120, 100, 'recoil33'],
    ['Inferno', '煉獄', 's', 100, 60, 'burn100'], ['Solar Flare', '太陽閃焰', 's', 130, 90, 'self:spa-2']],
  water: [['Water Gun', '水槍', 's', 40, 100, ''], ['Aqua Jet', '水流噴射', 'p', 40, 100, 'prio'], ['Bubble Beam', '泡沫光線', 's', 65, 100, 'foe:spe-1@10'],
    ['Waterfall', '攀瀑', 'p', 80, 100, 'flinch20'], ['Scald', '熱水', 's', 80, 100, 'burn30'], ['Aqua Tail', '水流尾', 'p', 90, 90, ''],
    ['Surf', '衝浪', 's', 90, 100, ''], ['Crabhammer', '蟹鉗錘', 'p', 100, 90, 'crit'], ['Hydro Pump', '水炮', 's', 110, 80, ''],
    ['Tidal Crash', '海嘯衝擊', 'p', 120, 100, 'recoil33'], ['Aqua Ring', '水流環', 'x', 0, 0, 'heal50']],
  grass: [['Vine Whip', '藤鞭', 'p', 45, 100, ''], ['Absorb', '吸取', 's', 35, 100, 'drain50'], ['Razor Leaf', '飛葉快刀', 'p', 55, 95, 'crit'],
    ['Mega Drain', '超級吸取', 's', 50, 100, 'drain50'], ['Seed Bomb', '種子炸彈', 'p', 80, 100, ''], ['Giga Drain', '終極吸取', 's', 75, 100, 'drain50'],
    ['Energy Ball', '能量球', 's', 90, 100, 'foe:spd-1@10'], ['Leaf Blade', '葉刃', 'p', 90, 100, 'crit'], ['Petal Storm', '花瓣風暴', 's', 110, 85, ''],
    ['Wood Hammer', '木槌', 'p', 120, 100, 'recoil33'], ['Synthesis', '光合作用', 'x', 0, 0, 'heal50']],
  electric: [['Thunder Shock', '電擊', 's', 40, 100, 'par10'], ['Spark', '電光', 'p', 65, 100, 'par30'], ['Shock Wave', '電擊波', 's', 60, 0, ''],
    ['Thunder Fang', '雷電牙', 'p', 65, 95, 'par10 flinch10'], ['Volt Spin', '伏特旋轉', 's', 70, 100, ''], ['Discharge', '放電', 's', 80, 100, 'par30'],
    ['Thunderbolt', '十萬伏特', 's', 90, 100, 'par10'], ['Wild Charge', '瘋狂伏特', 'p', 90, 100, 'recoil25'], ['Thunder', '打雷', 's', 110, 70, 'par30'],
    ['Zap Cannon', '電磁炮', 's', 120, 50, 'par100'], ['Charge', '充電', 'x', 0, 0, 'self:spa+1 self:spd+1']],
  ice: [['Powder Snow', '細雪', 's', 40, 100, 'frz10'], ['Ice Shard', '冰礫', 'p', 40, 100, 'prio'], ['Icy Wind', '冰凍之風', 's', 55, 95, 'foe:spe-1'],
    ['Ice Fang', '冰凍牙', 'p', 65, 95, 'frz10 flinch10'], ['Frost Breath', '冰息', 's', 60, 90, 'crit'], ['Aurora Beam', '極光束', 's', 65, 100, 'foe:atk-1@10'],
    ['Ice Punch', '冰凍拳', 'p', 75, 100, 'frz10'], ['Ice Beam', '冰凍光束', 's', 90, 100, 'frz10'], ['Icicle Crash', '冰柱墜擊', 'p', 85, 90, 'flinch30'],
    ['Blizzard', '暴風雪', 's', 110, 70, 'frz10'], ['Glacier Smash', '冰河粉碎', 'p', 120, 100, 'recoil33']],
  fight: [['Karate Chop', '空手劈', 'p', 50, 100, 'crit'], ['Rock Smash', '碎岩', 'p', 40, 100, 'foe:def-1@50'], ['Low Kick', '踢倒', 'p', 60, 100, ''],
    ['Power-Up Punch', '增強拳', 'p', 40, 100, 'self:atk+1'], ['Brick Break', '劈瓦', 'p', 75, 100, ''], ['Aura Sphere', '波導彈', 's', 80, 0, ''],
    ['Drain Punch', '吸取拳', 'p', 75, 100, 'drain50'], ['Sky Uppercut', '衝天拳', 'p', 85, 90, ''], ['Close Combat', '近身戰', 'p', 120, 100, 'self:def-1 self:spd-1'],
    ['Focus Blast', '真氣彈', 's', 120, 70, 'foe:spd-1@10'], ['Bulk Up', '健美', 'x', 0, 0, 'self:atk+1 self:def+1']],
  poison: [['Poison Sting', '毒針', 'p', 25, 100, 'psn30'], ['Acid', '溶解液', 's', 40, 100, 'foe:spd-1@10'], ['Smog', '濁霧', 's', 35, 90, 'psn40'],
    ['Poison Fang', '毒牙', 'p', 50, 100, 'psn50'], ['Sludge', '污泥攻擊', 's', 65, 100, 'psn30'], ['Poison Jab', '毒擊', 'p', 80, 100, 'psn30'],
    ['Venom Drench', '毒液浸透', 's', 70, 100, 'foe:atk-1@50'], ['Sludge Bomb', '污泥炸彈', 's', 90, 100, 'psn30'], ['Toxic Wave', '劇毒波', 's', 110, 85, 'psn20'],
    ['Gunk Shot', '垃圾射擊', 'p', 120, 80, 'psn30'], ['Toxic', '劇毒', 'x', 0, 90, 'psn100']],
  earth: [['Mud Slap', '擲泥', 's', 30, 100, 'foe:spe-1@50'], ['Mud Shot', '泥巴射擊', 's', 55, 95, 'foe:spe-1'], ['Bulldoze', '重踏', 'p', 60, 100, 'foe:spe-1'],
    ['Bone Club', '骨棒', 'p', 65, 90, 'flinch10'], ['Stomping Tantrum', '跺腳', 'p', 75, 100, ''], ['Dig', '挖洞', 'p', 80, 100, ''],
    ['Drill Run', '直衝鑽', 'p', 80, 95, 'crit'], ['Earth Power', '大地之力', 's', 90, 100, 'foe:spd-1@10'], ['Earthquake', '地震', 'p', 100, 100, ''],
    ['Precipice Blades', '斷崖之劍', 'p', 120, 85, ''], ['Sand Attack', '潑沙', 'x', 0, 100, 'foe:atk-1']],
  wind: [['Gust', '起風', 's', 40, 100, ''], ['Peck', '啄', 'p', 35, 100, ''], ['Wing Attack', '翅膀攻擊', 'p', 60, 100, ''],
    ['Aerial Ace', '燕返', 'p', 60, 0, ''], ['Air Cutter', '空氣利刃', 's', 60, 95, 'crit'], ['Drill Peck', '啄鑽', 'p', 80, 100, ''],
    ['Air Slash', '空氣斬', 's', 75, 95, 'flinch30'], ['Sky Dive', '俯衝', 'p', 90, 95, ''], ['Hurricane', '暴風', 's', 110, 70, 'conf30'],
    ['Brave Bird', '勇鳥猛攻', 'p', 120, 100, 'recoil33'], ['Tailwind', '順風', 'x', 0, 0, 'self:spe+2']],
  psychic: [['Confusion', '念力', 's', 50, 100, 'conf10'], ['Psybeam', '幻象光線', 's', 65, 100, 'conf10'], ['Psycho Cut', '精神利刃', 'p', 70, 100, 'crit'],
    ['Zen Headbutt', '意念頭錘', 'p', 80, 90, 'flinch20'], ['Psyshock', '精神衝擊', 's', 80, 100, ''], ['Extrasensory', '神通力', 's', 80, 100, 'flinch10'],
    ['Psychic', '精神強念', 's', 90, 100, 'foe:spd-1@10'], ['Psystrike', '精神擊破', 's', 100, 100, ''], ['Future Sight', '預知未來', 's', 120, 90, ''],
    ['Hypnosis', '催眠術', 'x', 0, 60, 'slp100'], ['Calm Mind', '冥想', 'x', 0, 0, 'self:spa+1 self:spd+1']],
  bug: [['Fury Cutter', '連斬', 'p', 40, 95, 'double'], ['Struggle Bug', '蟲之抵抗', 's', 50, 100, 'foe:spa-1'], ['Pin Missile', '飛彈針', 'p', 25, 95, 'multi'],
    ['Bug Bite', '蟲咬', 'p', 60, 100, ''], ['Signal Beam', '信號光束', 's', 75, 100, 'conf10'], ['Leech Life', '吸血', 'p', 80, 100, 'drain50'],
    ['X-Scissor', '十字剪', 'p', 80, 100, ''], ['Lunge', '猛撲', 'p', 80, 100, 'foe:atk-1'], ['Bug Buzz', '蟲鳴', 's', 90, 100, 'foe:spd-1@10'],
    ['Megahorn', '超級角擊', 'p', 120, 85, ''], ['String Shot', '吐絲', 'x', 0, 95, 'foe:spe-2']],
  rock: [['Rock Throw', '落石', 'p', 50, 90, ''], ['Rollout', '滾動', 'p', 40, 90, 'double'], ['Smack Down', '擊落', 'p', 55, 100, ''],
    ['Rock Tomb', '岩石封鎖', 'p', 60, 95, 'foe:spe-1'], ['Ancient Power', '原始之力', 's', 60, 100, 'self:spa+1@20'], ['Power Gem', '力量寶石', 's', 80, 100, ''],
    ['Rock Slide', '岩崩', 'p', 75, 90, 'flinch30'], ['Stone Edge', '尖石攻擊', 'p', 100, 80, 'crit'], ['Meteor Beam', '流星光束', 's', 120, 90, ''],
    ['Head Smash', '雙刃頭錘', 'p', 150, 80, 'recoil50'], ['Rock Polish', '岩石打磨', 'x', 0, 0, 'self:spe+2']],
  ghost: [['Lick', '舌舔', 'p', 30, 100, 'par30'], ['Astonish', '驚嚇', 'p', 30, 100, 'flinch30'], ['Night Shade', '黑夜魔影', 's', 55, 0, ''],
    ['Shadow Sneak', '影子偷襲', 'p', 40, 100, 'prio'], ['Hex', '禍不單行', 's', 65, 100, 'hex'], ['Shadow Claw', '暗影爪', 'p', 70, 100, 'crit'],
    ['Shadow Ball', '暗影球', 's', 80, 100, 'foe:spd-1@20'], ['Phantom Force', '潛靈奇襲', 'p', 90, 100, ''], ['Poltergeist', '靈騷', 'p', 110, 90, ''],
    ['Spirit Wail', '怨靈哀嚎', 's', 120, 85, 'conf20'], ['Will-O-Wisp', '鬼火', 'x', 0, 85, 'burn100']],
  dragon: [['Twister', '龍捲風', 's', 40, 100, 'flinch20'], ['Dragon Breath', '龍息', 's', 60, 100, 'par30'], ['Dragon Tail', '龍尾', 'p', 60, 90, ''],
    ['Breaking Swipe', '廣域破壞', 'p', 60, 100, 'foe:atk-1'], ['Dragon Fang', '龍牙', 'p', 70, 100, 'flinch10'], ['Dragon Claw', '龍爪', 'p', 80, 100, ''],
    ['Dragon Pulse', '龍之波動', 's', 85, 100, ''], ['Dragon Rush', '龍之俯衝', 'p', 100, 75, 'flinch20'], ['Outrage', '逆鱗', 'p', 120, 100, 'selfconf'],
    ['Draco Meteor', '流星群', 's', 130, 90, 'self:spa-2'], ['Dragon Dance', '龍之舞', 'x', 0, 0, 'self:atk+1 self:spe+1']],
};
// 35 general skills: [type, en, zh, cat, power, acc, effects]
const GEN = [
  ['normal', 'Growl', '叫聲', 'x', 0, 100, 'foe:atk-1'], ['normal', 'Leer', '瞪眼', 'x', 0, 100, 'foe:def-1'], ['normal', 'Scary Face', '鬼面', 'x', 0, 100, 'foe:spe-2'],
  ['normal', 'Swords Dance', '劍舞', 'x', 0, 0, 'self:atk+2'], ['normal', 'Nasty Plot', '詭計', 'x', 0, 0, 'self:spa+2'], ['normal', 'Iron Defense', '鐵壁', 'x', 0, 0, 'self:def+2'],
  ['normal', 'Amnesia', '瞬間失憶', 'x', 0, 0, 'self:spd+2'], ['normal', 'Agility', '高速移動', 'x', 0, 0, 'self:spe+2'], ['normal', 'Focus Energy', '聚氣', 'x', 0, 0, 'self:crit+2'],
  ['normal', 'Protect', '守住', 'x', 0, 0, 'protect'], ['normal', 'Recover', '自我再生', 'x', 0, 0, 'heal50'], ['psychic', 'Rest', '睡覺', 'x', 0, 0, 'rest'],
  ['normal', 'Refresh', '煥然一新', 'x', 0, 0, 'cure heal25'], ['normal', 'Sing', '唱歌', 'x', 0, 55, 'slp100'], ['grass', 'Sleep Powder', '催眠粉', 'x', 0, 75, 'slp100'],
  ['grass', 'Stun Spore', '麻痺粉', 'x', 0, 75, 'par100'], ['poison', 'Poison Powder', '毒粉', 'x', 0, 75, 'psn100'], ['electric', 'Thunder Wave', '電磁波', 'x', 0, 90, 'par100'],
  ['ghost', 'Confuse Ray', '奇異之光', 'x', 0, 100, 'conf100'], ['normal', 'Charm', '撒嬌', 'x', 0, 100, 'foe:atk-2'], ['normal', 'Screech', '刺耳聲', 'x', 0, 85, 'foe:def-2'],
  ['normal', 'Fake Tears', '假哭', 'x', 0, 100, 'foe:spd-2'], ['grass', 'Cotton Spore', '棉孢子', 'x', 0, 100, 'foe:spe-2'], ['normal', 'Howl', '長嚎', 'x', 0, 0, 'self:atk+1'],
  ['water', 'Withdraw', '縮入殼中', 'x', 0, 0, 'self:def+1'], ['normal', 'Self-Destruct', '自爆', 'p', 200, 100, 'faint'], ['normal', 'Explosion', '大爆炸', 'p', 250, 100, 'faint'],
  ['normal', 'Fury Attack', '亂擊', 'p', 15, 85, 'multi'], ['fight', 'Double Kick', '二連踢', 'p', 30, 100, 'double'], ['normal', 'Bite', '咬住', 'p', 60, 100, 'flinch30'],
  ['normal', 'Crunch', '咬碎', 'p', 80, 100, 'foe:def-1@20'], ['normal', 'Feint Attack', '出奇一擊', 'p', 60, 0, ''], ['normal', 'Facade', '硬撐', 'p', 70, 100, 'facade'],
  ['normal', 'Return', '報恩', 'p', 100, 100, ''], ['normal', 'Last Resort', '珍藏', 'p', 140, 90, ''],
];

function parseFx(str) {
  const fx = { stages: [] };
  for (const tok of str.split(/\s+/).filter(Boolean)) {
    let m;
    if ((m = tok.match(/^(burn|psn|par|slp|frz|conf|flinch)(\d+)$/))) { if (m[1] === 'flinch') fx.flinch = +m[2]; else fx.status = { s: m[1], p: +m[2] }; }
    else if ((m = tok.match(/^(self|foe):(\w+)([+-]\d)(?:@(\d+))?$/))) fx.stages.push({ who: m[1], stat: m[2], n: +m[3], p: m[4] ? +m[4] : 100 });
    else if ((m = tok.match(/^(recoil|drain|heal)(\d+)$/))) fx[m[1]] = +m[2] / 100;
    else fx[tok] = true;
  }
  return fx;
}
export const SKILLS = [];
for (const t of TYPES) TS[t].forEach(([en, zh, cat, power, acc, f], i) => SKILLS.push({ id: SKILLS.length, type: t, en, zh, cat, power, acc, fx: parseFx(f), tier: i }));
for (const [t, en, zh, cat, power, acc, f] of GEN) SKILLS.push({ id: SKILLS.length, type: t, en, zh, cat, power, acc, fx: parseFx(f), tier: -1, gen: true });
export const SKILL_BY_EN = Object.fromEntries(SKILLS.map((s) => [s.en, s]));
const typeSkill = (t, i) => SKILLS.find((s) => s.type === t && s.tier === i && !s.gen).id;
const GENERAL = SKILLS.filter((s) => s.gen && s.cat === 'x').map((s) => s.id);

// ------------------------------------------------------------------ monsters: 10 body plans x 15 types = 150 species
export const BODIES = ['slime', 'bug', 'bird', 'beast', 'fish', 'plant', 'imp', 'ghost', 'golem', 'dragon'];
export const BODY_INFO = {
  slime: { en: 'slime', zh: '史萊姆', rank: 0, w: [1.0, 0.9, 0.95, 1.0, 1.0, 0.9], basic: 'Tackle', affinity: 'normal' },
  bug: { en: 'mite', zh: '甲蟲', rank: 0, w: [0.85, 1.05, 0.95, 0.8, 0.85, 1.2], basic: 'Fury Attack', affinity: 'bug' },
  bird: { en: 'wing', zh: '翼鳥', rank: 1, w: [0.9, 1.05, 0.8, 0.9, 0.8, 1.3], basic: 'Peck', affinity: 'wind' },
  beast: { en: 'fang', zh: '牙獸', rank: 1, w: [1.0, 1.25, 0.9, 0.75, 0.8, 1.2], basic: 'Bite', affinity: 'fight' },
  fish: { en: 'fin', zh: '鰭魚', rank: 1, w: [1.1, 1.0, 1.05, 1.0, 1.0, 0.95], basic: 'Tackle', affinity: 'water' },
  plant: { en: 'bloom', zh: '花精', rank: 1, w: [1.1, 0.8, 1.0, 1.2, 1.2, 0.7], basic: 'Absorb', affinity: 'grass' },
  imp: { en: 'imp', zh: '小魔', rank: 2, w: [0.9, 0.9, 0.9, 1.3, 1.0, 1.1], basic: 'Feint Attack', affinity: 'psychic' },
  ghost: { en: 'ghast', zh: '幽靈', rank: 3, w: [0.85, 0.9, 0.9, 1.3, 1.2, 1.1], basic: 'Lick', affinity: 'ghost' },
  golem: { en: 'golem', zh: '魔像', rank: 3, w: [1.2, 1.25, 1.4, 0.6, 0.9, 0.55], basic: 'Rock Throw', affinity: 'rock' },
  dragon: { en: 'drake', zh: '飛龍', rank: 4, w: [1.1, 1.25, 1.0, 1.15, 1.0, 1.0], basic: 'Twister', affinity: 'dragon' },
};
const TYPE_WORD = {
  normal: ['Fluff', '絨'], fire: ['Flare', '焰'], water: ['Aqua', '泡'], grass: ['Leaf', '葉'], electric: ['Volt', '雷'], ice: ['Frost', '霜'],
  fight: ['Brawl', '拳'], poison: ['Toxi', '毒'], earth: ['Terra', '砂'], wind: ['Gale', '颯'], psychic: ['Psy', '念'], bug: ['Buzz', '蟲'],
  rock: ['Crag', '岩'], ghost: ['Spook', '冥'], dragon: ['Wyrm', '龍'],
};
const SPECIAL_NAMES = { 'bug/bug': ['Hivequeen', '蟲后'], 'dragon/dragon': ['Dragonlord', '龍王'], 'ghost/ghost': ['Phantom', '魅影'], 'rock/golem': ['Cragtitan', '岩之巨神'], 'wind/bird': ['Skyking', '天空之王'], 'water/fish': ['Leviathan', '利維坦'], 'grass/plant': ['Florabelle', '花之女王'] };
const TYPE_RANK = { electric: 1, ice: 1, fight: 1, psychic: 1, ghost: 1, dragon: 2 };
// which stats a type leans toward: [hp, atk, def, spa, spd, spe]
const TYPE_LEAN = {
  normal: [1.1, 1, 1, 0.95, 1, 1], fire: [0.95, 1.1, 0.9, 1.1, 0.95, 1.05], water: [1.1, 1, 1.05, 1, 1.05, 0.9], grass: [1.05, 0.95, 1.05, 1.05, 1.1, 0.85],
  electric: [0.9, 0.95, 0.9, 1.15, 1, 1.2], ice: [1, 0.95, 0.95, 1.15, 1.1, 0.9], fight: [1.1, 1.25, 1, 0.75, 0.95, 1], poison: [1, 1, 1.1, 0.95, 1.1, 0.95],
  earth: [1.05, 1.15, 1.15, 0.85, 0.9, 0.85], wind: [0.95, 1.1, 0.9, 1, 0.9, 1.2], psychic: [0.95, 0.8, 0.9, 1.25, 1.15, 1.05], bug: [0.95, 1.1, 1, 0.85, 0.95, 1.1],
  rock: [1.05, 1.15, 1.25, 0.8, 0.9, 0.75], ghost: [0.9, 0.9, 1, 1.15, 1.15, 1.05], dragon: [1.05, 1.1, 1.05, 1.1, 1.05, 1.05],
};
export const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
export const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const LEARN_LV = [1, 6, 11, 16, 21, 27, 33, 39, 46, 53, 60];

export const SPECIES = [];
for (const body of BODIES) for (const type of TYPES) {
  const id = SPECIES.length + 1;
  const r = rng(id * 7919 + 13);
  const bi = BODY_INFO[body];
  const rank = Math.min(6, bi.rank + (TYPE_RANK[type] || 0));
  const total = 290 + rank * 42 + Math.round((r() - 0.5) * 30);
  const w = bi.w.map((x, i) => x * TYPE_LEAN[type][i] * (0.9 + r() * 0.2));
  const sum = w.reduce((a, b) => a + b, 0);
  const base = w.map((x) => Math.max(15, Math.round((x / sum) * total)));
  const special = SPECIAL_NAMES[`${type}/${body}`];
  const tw = TYPE_WORD[type];
  const name = special ? { en: special[0], zh: special[1] } : { en: tw[0] + bi.en, zh: tw[1] + bi.zh };
  // learnset: the body's basic attack, own-type skills as it levels, a few from its body's affinity, a few status skills
  const learn = [[1, SKILL_BY_EN[bi.basic].id]];
  LEARN_LV.forEach((lv, i) => learn.push([lv === 1 ? 1 : lv, typeSkill(type, i)]));
  const aff = bi.affinity === type ? 'normal' : bi.affinity;
  [[9, 1], [24, 4], [42, 7]].forEach(([lv, i]) => learn.push([lv, typeSkill(aff, i)]));
  [4, 18, 36].forEach((lv) => learn.push([lv, GENERAL[Math.floor(r() * GENERAL.length)]]));
  const seen = new Set(); const ls = [];
  for (const [lv, sk] of learn.sort((a, b) => a[0] - b[0])) if (!seen.has(sk)) { seen.add(sk); ls.push([lv, sk]); }
  SPECIES.push({ id, body, type, rank, base: Object.fromEntries(STATS.map((s, i) => [s, base[i]])), name, learn: ls, seed: id * 104729 + 7, exp: 40 + rank * 25 });
}

// ------------------------------------------------------------------ areas (all open from the start) and their tamers
export const AREAS = [
  { id: 'meadow', zh: '新手草原', en: 'Starter Meadow', types: ['normal', 'grass', 'bug', 'wind'], lv: [2, 7], ranks: [0, 1], sky: ['#8fd8ff', '#d8f4c0'], ground: '#7ac85a' },
  { id: 'forest', zh: '微光森林', en: 'Glimmer Forest', types: ['grass', 'bug', 'poison', 'psychic'], lv: [6, 13], ranks: [0, 2], sky: ['#2a6a4a', '#6ab07a'], ground: '#3a7a3a' },
  { id: 'lake', zh: '湛藍湖畔', en: 'Azure Lakeside', types: ['water', 'ice', 'wind', 'normal'], lv: [9, 16], ranks: [0, 2], sky: ['#6ab8ff', '#bfe8ff'], ground: '#4a90d0' },
  { id: 'plateau', zh: '雷鳴高原', en: 'Thunder Plateau', types: ['electric', 'wind', 'normal', 'fight'], lv: [13, 21], ranks: [1, 3], sky: ['#3a3a6a', '#8a8ab0'], ground: '#9a8a5a' },
  { id: 'volcano', zh: '赤紅火山', en: 'Crimson Volcano', types: ['fire', 'rock', 'earth', 'fight'], lv: [18, 27], ranks: [1, 3], sky: ['#5a1a0a', '#c84a1a'], ground: '#5a3a2a' },
  { id: 'snow', zh: '冰晶雪原', en: 'Crystal Snowfield', types: ['ice', 'water', 'rock', 'psychic'], lv: [22, 31], ranks: [1, 4], sky: ['#9ab8d8', '#eef6ff'], ground: '#e8f2ff' },
  { id: 'caves', zh: '迴音洞窟', en: 'Echo Caverns', types: ['rock', 'earth', 'poison', 'ghost', 'bug'], lv: [26, 36], ranks: [2, 4], sky: ['#141418', '#3a3440'], ground: '#4a4048' },
  { id: 'ruins', zh: '幽影古城', en: 'Shadow Ruins', types: ['ghost', 'psychic', 'poison', 'fight'], lv: [32, 42], ranks: [2, 5], sky: ['#1a0a2a', '#4a2a5a'], ground: '#3a2a3a' },
  { id: 'summit', zh: '天空之巔', en: 'Sky Summit', types: ['wind', 'electric', 'psychic', 'ice', 'dragon'], lv: [38, 50], ranks: [3, 5], sky: ['#4a7aff', '#ffe6f6'], ground: '#c8d0e0' },
  { id: 'sanctum', zh: '龍之聖域', en: 'Dragon Sanctum', types: ['dragon', 'fire', 'ice', 'ghost', 'electric'], lv: [46, 62], ranks: [3, 6], sky: ['#120a2a', '#5a2a8a'], ground: '#2a1a3a' },
];
export function areaPool(area) { return SPECIES.filter((s) => area.types.includes(s.type) && s.rank >= area.ranks[0] && s.rank <= area.ranks[1]); }

const TAMER_NAMES = [
  ['捕蟲少年 小傑', 'Bug Catcher Jay'], ['野餐女孩 美美', 'Picnicker Mimi'], ['新手訓練家 阿哲', 'Rookie Zack'],
  ['森林守護者 葉子', 'Ranger Leafa'], ['毒草學家 莫博士', 'Dr. Mo the Herbalist'], ['念力少女 星星', 'Psychic Stella'],
  ['釣魚高手 老王', 'Angler Wang'], ['游泳健將 小海', 'Swimmer Kai'], ['冰湖少女 雪兒', 'Skater Snow'],
  ['電氣小子 阿雷', 'Sparky Ray'], ['空手道家 大剛', 'Karate Kang'], ['風之旅人 飛飛', 'Wanderer Fei'],
  ['火山研究員 赤炎', 'Volcanologist Blaze'], ['登山家 岩叔', 'Hiker Rocky'], ['格鬥家 鐵拳', 'Fighter Iron'],
  ['冰原獵人 霜月', 'Frost Hunter Luna'], ['滑雪教練 阿凜', 'Ski Coach Rin'], ['占卜師 水晶', 'Fortune Teller Crystal'],
  ['洞窟探險家 阿土', 'Spelunker Dusty'], ['化石迷 骨頭', 'Fossil Fan Bones'], ['靈媒 夜子', 'Medium Yoru'],
  ['古城騎士 暗月', 'Ruin Knight Umbra'], ['幽靈公主 薇薇', 'Ghost Princess Vivi'], ['武鬥僧 空', 'Monk Kong'],
  ['天空使者 雲雀', 'Sky Herald Lark'], ['雷神信徒 震', 'Storm Priest Zhen'], ['冰晶術士 霜華', 'Ice Mage Shuang'],
  ['龍騎士 焰', 'Dragon Knight Yan'], ['龍之巫女 琉璃', 'Dragon Maiden Ruri'], ['龍王使者 德拉科', 'Draco, Dragonlord\'s Herald'],
];
export const TAMERS = [];
AREAS.forEach((a, ai) => {
  const pool = areaPool(a);
  for (let k = 0; k < 3; k++) {
    const r = rng(9001 + ai * 31 + k * 7);
    const n = Math.min(6, 2 + Math.floor(ai / 3) + k);
    const team = [];
    for (let i = 0; i < n; i++) {
      const sp = pool[Math.floor(r() * pool.length)];
      team.push({ sp: sp.id, lv: Math.round(a.lv[0] + (a.lv[1] - a.lv[0]) * (0.55 + 0.15 * k) + i), v: Math.floor(r() * 4) });
    }
    const nm = TAMER_NAMES[ai * 3 + k];
    TAMERS.push({ id: `${a.id}-${k}`, area: a.id, name: { zh: nm[0], en: nm[1] }, team, gold: 60 + ai * 70 + k * 40, boss: k === 2 });
  }
});

// ------------------------------------------------------------------ items
export const ITEMS = [
  { id: 'orb', zh: '收服球', en: 'Capture Orb', price: 100, kind: 'orb', mult: 1, icon: '🔴' },
  { id: 'orb2', zh: '高級球', en: 'Great Orb', price: 300, kind: 'orb', mult: 1.6, icon: '🔵' },
  { id: 'orb3', zh: '超級球', en: 'Ultra Orb', price: 800, kind: 'orb', mult: 2.4, icon: '🟡' },
  { id: 'potion', zh: '傷藥', en: 'Potion', price: 80, kind: 'heal', hp: 50, icon: '🧪' },
  { id: 'potion2', zh: '好傷藥', en: 'Super Potion', price: 250, kind: 'heal', hp: 200, icon: '💊' },
  { id: 'full', zh: '全復藥', en: 'Full Restore', price: 700, kind: 'heal', hp: 9999, cure: true, icon: '✨' },
  { id: 'revive', zh: '復活草', en: 'Revival Herb', price: 600, kind: 'revive', icon: '🌿' },
];
export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const STARTER_LV = 7, STARTER_PLUS = 5;
export const STARTERS = [SPECIES.find((s) => s.body === 'slime' && s.type === 'fire').id, SPECIES.find((s) => s.body === 'slime' && s.type === 'water').id, SPECIES.find((s) => s.body === 'slime' && s.type === 'grass').id];
