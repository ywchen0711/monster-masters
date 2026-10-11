// Chinese / English. The lobby opens games with ?lang=zh|en: that choice wins and is remembered.
const KEY = 'mm.lang';
let lang = 'zh';
try {
  const q = (location.search.match(/[?&]lang=(zh|en)(?![a-z])/) || [])[1];
  if (q) { lang = q; localStorage.setItem(KEY, q); }
  else { const s = localStorage.getItem(KEY); lang = s === 'en' || s === 'zh' ? s : /^zh/i.test(navigator.language || 'zh') ? 'zh' : 'en'; }
} catch (e) { /* private mode */ }
export const getLang = () => lang;
export function setLang(l) { lang = l; try { localStorage.setItem(KEY, l); } catch (e) { /* ignore */ } document.documentElement.lang = l === 'zh' ? 'zh-Hant' : 'en'; }
export const L = (o) => (o ? o[lang] ?? o.en : '');
export const t = (k, ...a) => { const v = TXT[lang][k] ?? TXT.en[k] ?? k; return typeof v === 'function' ? v(...a) : v; };

export const STAT_NAME = {
  zh: { hp: 'HP', atk: '攻擊', def: '防禦', spa: '特攻', spd: '特防', spe: '速度', acc: '命中', crit: '會心' },
  en: { hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed', acc: 'Accuracy', crit: 'Crit' },
};
export const STATUS_NAME = {
  zh: { burn: '燒傷', psn: '中毒', par: '麻痺', slp: '睡眠', frz: '冰凍' },
  en: { burn: 'BRN', psn: 'PSN', par: 'PAR', slp: 'SLP', frz: 'FRZ' },
};

const TXT = {
  zh: {
    title: '怪物大師', sub: 'Monster Masters', newQ: '確定要重新開始嗎？目前的進度會被清除。', newGame: '新遊戲', cont: '繼續冒險', lang: 'EN',
    chooseStarter: '選擇你的第一隻夥伴怪物！', starterGo: (n) => `就決定是你了，${n}！`,
    town: '怪物牧場鎮', map: '世界地圖', party: '隊伍', box: '保管箱', dex: '圖鑑', bag: '背包', shop: '商店', heal: '治療中心', fusion: '合成研究所',
    healDone: '你的怪物都恢復精神了！', gold: '金幣', buy: '購買', owned: (n) => `持有 ${n}`, notEnough: '金幣不夠',
    explore: '🔍 探索草叢', tamers: '怪物使', challenge: '挑戰', beaten: (n) => `已擊敗 ${n} 次`, toTown: '🏠 回城鎮', toMap: '🗺️ 地圖',
    lvRange: (a, b) => `Lv ${a}–${b}`, wildAppeared: (n) => `野生的 ${n} 出現了！`, tamerChallenge: (n) => `${n} 向你發起對戰！`, wanderer: '流浪怪物使',
    fight: '戰鬥', switchMon: '換怪', catchIt: '收服', run: '逃跑', back: '返回', choose: '選擇',
    win: '你贏了！', gotGold: (n) => `得到了 ${n} 金幣！`, lose: '你的怪物全部倒下了……', blackout: (n) => `你逃回城鎮，掉了 ${n} 金幣。`,
    toParty: (n) => `${n} 加入了隊伍！`, toBox: (n) => `隊伍滿了，${n} 送到保管箱。`, newDex: '新的圖鑑資料！', rainbowCaught: '✦ 是隱藏的彩虹色！',
    needLead: '至少要留一隻能戰鬥的怪物在隊伍裡', partyFull: '隊伍已經 6 隻了', release: '放生', releaseQ: (n) => `確定要放生 ${n} 嗎？`,
    toBoxBtn: '存到保管箱', toPartyBtn: '帶進隊伍', lead: '設為隊首', moves: '招式', learned: '學會的招式（點選裝備，最多 4 招）', stats: '素質', rank: '等級',
    plus: '+值', exp: '經驗', nextLv: (n) => `升級還需 ${n}`, seen: '見過', caught: '收服', variants: '顏色', foundIn: '出沒地區', nowhere: '只能靠合成取得',
    learnset: '升級學會的技能', fusionHelp: '選兩隻 Lv 10 以上的怪物合成。新怪物：第一隻的屬性、比雙親更高階的體型、繼承強力招式和 +值。雙親會消失。',
    parentA: '父母 A（決定屬性）', parentB: '父母 B', pick: '選擇', result: '合成結果', inherit: '繼承招式', fuseGo: '✨ 開始合成！', fuseQ: '雙親會消失，確定嗎？',
    fused: (n) => `${n} 誕生了！`, fuseNeed: '需要 Lv 10 以上', noMons: '沒有可以選的怪物', empty: '（空）', boxEmpty: '保管箱是空的',
    useOn: '要用在誰身上？', orbs: '收服球', heals: '回復道具', cantCatch: '不能收服別人的怪物！', cantRun: '不能從怪物使的對戰中逃跑！',
    whoNext: '要派誰上場？', fainted: '倒下', help: '說明',
    helpBody: [
      '在世界地圖選一個區域，按「探索草叢」遇到野生怪物。先把牠打到沒什麼 HP，再丟收服球比較容易收服。',
      '屬性相剋：效果絕佳的招式傷害 2 倍。和自己同屬性的招式威力 1.5 倍。',
      '每隻怪物有 4 種顏色，偶爾會出現閃亮的隱藏彩虹色（1/128）！',
      '回城鎮可以免費治療、買道具、在合成研究所合成更強的怪物。所有區域一開始就能去，但越後面的怪物越強。',
      '每個區域有 3 位怪物使可以挑戰，探索時也會遇到流浪的怪物使。',
    ],
    m: {
      used: (a, k) => `${a}使用了${k}！`, missed: (a) => `${a}的攻擊沒有命中！`, immune: (d) => `對${d}好像沒有效果……`, hits: (n) => `擊中了 ${n} 次！`,
      crit: '會心一擊！', super: '效果絕佳！', weak: '效果不太好……', drained: (d) => `從${d}吸取了體力！`, recoil: (a) => `${a}受到了反作用力的傷害！`,
      becameConfused: (a) => `${a}混亂了！`, protecting: (a) => `${a}擺出了防守的架勢！`, protected: (d) => `${d}守住了攻擊！`,
      healed: (a, n) => `${a}回復了 ${n} 點 HP！`, fullHp: (a) => `${a}的 HP 已經滿了！`, cured: (a) => `${a}的狀態恢復正常了！`, rested: (a) => `${a}睡著並恢復了全部體力！`,
      st_burn: (a) => `${a}被燒傷了！`, st_psn: (a) => `${a}中毒了！`, st_par: (a) => `${a}麻痺了，可能會動不了！`, st_slp: (a) => `${a}睡著了！`, st_frz: (a) => `${a}被凍住了！`,
      failed: '但是失敗了！', cantRise: (a, s) => `${a}的${s}已經不會再提高了！`, cantFall: (a, s) => `${a}的${s}已經不會再降低了！`,
      rose: (a, s) => `${a}的${s}提高了！`, rose2: (a, s) => `${a}的${s}大幅提高了！`, fell: (a, s) => `${a}的${s}降低了！`, fell2: (a, s) => `${a}的${s}大幅降低了！`,
      burnHurt: (a) => `${a}受到燒傷的傷害！`, psnHurt: (a) => `${a}受到毒的傷害！`, tired: (a) => `戰鬥太久了，${a}筋疲力盡！`,
      fainted: (a) => `${a}倒下了！`, foeSends: (tm, a) => `${tm}派出了${a}！`, levelUp: (a, lv) => `${a}升到了 Lv ${lv}！`,
      learned: (a, k) => `${a}學會了${k}！`, learnedBox: (a, k) => `${a}學會了${k}！（可在隊伍畫面裝備）`,
      recharge: (a) => `${a}必須休息一回合！`, flinched: (a) => `${a}畏縮了，無法行動！`, woke: (a) => `${a}醒過來了！`, asleep: (a) => `${a}正在呼呼大睡。`,
      thawed: (a) => `${a}解凍了！`, frozen: (a) => `${a}被凍住了，無法行動！`, paralyzed: (a) => `${a}麻痺了，無法行動！`, unconfused: (a) => `${a}不再混亂了！`,
      confused: (a) => `${a}混亂中……`, hurtSelf: (a) => `${a}不知所措地攻擊了自己！`, revived: (a) => `${a}恢復了意識！`,
      caught: (a) => `成功收服了${a}！`, broke: (a) => `${a}從球裡跑出來了！`, ran: '順利逃走了！', noRun: '逃不掉！', comeBack: (a) => `${a}，回來吧！`, go: (a) => `上吧，${a}！`,
      wild: (n) => `野生的${n}`, foe: (n) => `對方的${n}`,
    },
  },
  en: {
    title: 'Monster Masters', sub: '怪物大師', newQ: 'Start over? Your current progress will be erased.', newGame: 'New game', cont: 'Continue', lang: '中文',
    chooseStarter: 'Choose your first partner monster!', starterGo: (n) => `I choose you, ${n}!`,
    town: 'Ranch Town', map: 'World map', party: 'Party', box: 'Storage', dex: 'Monsterdex', bag: 'Bag', shop: 'Shop', heal: 'Healing Center', fusion: 'Fusion Lab',
    healDone: 'Your monsters are fully healed!', gold: 'Gold', buy: 'Buy', owned: (n) => `Own ${n}`, notEnough: 'Not enough gold',
    explore: '🔍 Explore the grass', tamers: 'Tamers', challenge: 'Challenge', beaten: (n) => `Beaten ${n}×`, toTown: '🏠 Town', toMap: '🗺️ Map',
    lvRange: (a, b) => `Lv ${a}–${b}`, wildAppeared: (n) => `A wild ${n} appeared!`, tamerChallenge: (n) => `${n} wants to battle!`, wanderer: 'Wandering Tamer',
    fight: 'Fight', switchMon: 'Switch', catchIt: 'Catch', run: 'Run', back: 'Back', choose: 'Choose',
    win: 'You won!', gotGold: (n) => `You got ${n} gold!`, lose: 'All your monsters fainted...', blackout: (n) => `You hurried back to town and dropped ${n} gold.`,
    toParty: (n) => `${n} joined your party!`, toBox: (n) => `Your party is full, so ${n} went to Storage.`, newDex: 'New Monsterdex data!', rainbowCaught: '✦ It has the hidden rainbow colours!',
    needLead: 'Keep at least one healthy monster in your party', partyFull: 'Your party already has 6', release: 'Release', releaseQ: (n) => `Release ${n}?`,
    toBoxBtn: 'To Storage', toPartyBtn: 'To party', lead: 'Make lead', moves: 'Moves', learned: 'Known skills (tap to equip, up to 4)', stats: 'Stats', rank: 'Rank',
    plus: 'Plus', exp: 'EXP', nextLv: (n) => `${n} to next level`, seen: 'Seen', caught: 'Caught', variants: 'Colours', foundIn: 'Found in', nowhere: 'Only through fusion',
    learnset: 'Skills learned by level', fusionHelp: 'Fuse two monsters of Lv 10+. The new monster has the first parent\'s type, a higher body plan than either parent, their best skills and a plus bonus. Both parents are used up.',
    parentA: 'Parent A (sets the type)', parentB: 'Parent B', pick: 'Pick', result: 'Result', inherit: 'Inherited skills', fuseGo: '✨ Fuse!', fuseQ: 'Both parents will be gone. Fuse them?',
    fused: (n) => `${n} was born!`, fuseNeed: 'Needs Lv 10+', noMons: 'No monsters to pick', empty: '(empty)', boxEmpty: 'Storage is empty',
    useOn: 'Use it on whom?', orbs: 'Orbs', heals: 'Medicine', cantCatch: "You can't catch another tamer's monster!", cantRun: "You can't run from a tamer battle!",
    whoNext: 'Who goes next?', fainted: 'fainted', help: 'Help',
    helpBody: [
      'Pick an area on the world map and explore the grass to meet wild monsters. Wear them down first: monsters with little HP are much easier to catch.',
      'Type matchups: super-effective skills deal double damage. Skills of your own type are 1.5× stronger.',
      'Every monster comes in 4 colours, and once in a while in the sparkling hidden rainbow colour (1 in 128)!',
      'Back in town you can heal for free, buy items and fuse stronger monsters in the Fusion Lab. Every area is open from the start, but the later ones are much tougher.',
      'Each area has 3 tamers to challenge, and wandering tamers show up while you explore.',
    ],
    m: {
      used: (a, k) => `${a} used ${k}!`, missed: (a) => `${a}'s attack missed!`, immune: (d) => `It doesn't affect ${d}...`, hits: (n) => `Hit ${n} times!`,
      crit: 'A critical hit!', super: "It's super effective!", weak: "It's not very effective...", drained: (d) => `Drained energy from ${d}!`, recoil: (a) => `${a} is hit by recoil!`,
      becameConfused: (a) => `${a} became confused!`, protecting: (a) => `${a} is protecting itself!`, protected: (d) => `${d} protected itself!`,
      healed: (a, n) => `${a} recovered ${n} HP!`, fullHp: (a) => `${a}'s HP is already full!`, cured: (a) => `${a} is back to normal!`, rested: (a) => `${a} fell asleep and got healthy!`,
      st_burn: (a) => `${a} was burned!`, st_psn: (a) => `${a} was poisoned!`, st_par: (a) => `${a} is paralyzed! It may not move!`, st_slp: (a) => `${a} fell asleep!`, st_frz: (a) => `${a} was frozen solid!`,
      failed: 'But it failed!', cantRise: (a, s) => `${a}'s ${s} won't go any higher!`, cantFall: (a, s) => `${a}'s ${s} won't go any lower!`,
      rose: (a, s) => `${a}'s ${s} rose!`, rose2: (a, s) => `${a}'s ${s} rose sharply!`, fell: (a, s) => `${a}'s ${s} fell!`, fell2: (a, s) => `${a}'s ${s} harshly fell!`,
      burnHurt: (a) => `${a} is hurt by its burn!`, psnHurt: (a) => `${a} is hurt by poison!`, tired: (a) => `The battle drags on: ${a} is worn out!`,
      fainted: (a) => `${a} fainted!`, foeSends: (tm, a) => `${tm} sent out ${a}!`, levelUp: (a, lv) => `${a} grew to Lv ${lv}!`,
      learned: (a, k) => `${a} learned ${k}!`, learnedBox: (a, k) => `${a} learned ${k}! (equip it from the Party screen)`,
      recharge: (a) => `${a} must recharge!`, flinched: (a) => `${a} flinched and couldn't move!`, woke: (a) => `${a} woke up!`, asleep: (a) => `${a} is fast asleep.`,
      thawed: (a) => `${a} thawed out!`, frozen: (a) => `${a} is frozen solid!`, paralyzed: (a) => `${a} is paralyzed! It can't move!`, unconfused: (a) => `${a} snapped out of confusion!`,
      confused: (a) => `${a} is confused...`, hurtSelf: (a) => `${a} hurt itself in its confusion!`, revived: (a) => `${a} came back to its senses!`,
      caught: (a) => `Gotcha! ${a} was caught!`, broke: (a) => `${a} broke free!`, ran: 'Got away safely!', noRun: "Couldn't get away!", comeBack: (a) => `${a}, come back!`, go: (a) => `Go, ${a}!`,
      wild: (n) => `the wild ${n}`, foe: (n) => `the foe's ${n}`,
    },
  },
};
export const M = () => TXT[lang].m;
