# Monster Masters 怪物大師

Catch, raise and fuse monsters, in the spirit of Pokémon and Dragon Quest Monsters. Chinese and English. (Vanilla JS, no build step)

**Play:** https://ywchen0711.github.io/monster-masters/

- **150 monsters**: 10 body plans (slime, mite, wing, fang, fin, bloom, imp, ghast, golem, drake) × 15 types, ranks F to S,
  six stats, a learnset each. Every monster is drawn procedurally as pixel art from its own seed, in **4 colours plus a hidden
  rainbow colour** (1 in 128).
- **15 types** with a full type chart, same-type bonus, critical hits.
- **200 skills**: 11 per type plus 35 general ones: physical / special / status, burn, poison, paralysis, sleep, freeze,
  confusion, flinch, stat stages, drain, recoil, multi-hit, priority, protect, recharge, self-destruct...
- **Battles all the time**: 10 areas, all open from the start; wild monsters to fight and catch with orbs (weaken them first),
  3 tamers per area, and wandering tamers while exploring.
- **Raising**: experience and levels, new skills while levelling (equip any 4), plus values from fusion.
- **Fusion** (Fusion Lab): two Lv 10+ monsters make a new one with the first parent's type and a higher body plan, inheriting
  their best skills and a plus bonus; rainbow parents make rainbow children more likely.
- Town: free healing, shop (orbs and medicine), storage, Monsterdex (seen / caught / colours found), bag. Progress saves itself.

## Code
- `js/data.js` types, type chart, the 200 skills, the generated 150 monsters, areas, tamers, items
- `js/model.js` monster instances, stats, experience, capture odds, fusion · `js/battle.js` the battle engine (no DOM)
- `js/art.js` procedural pixel monsters · `js/main.js` screens and battle UI · `js/i18n.js` text · `js/audio.js` sound
- `node tools/test.mjs` data checks, type chart, capture, fusion and 2000 random battles · `tools/gallery.html` all monsters on one page
