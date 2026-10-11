// Tiny Web Audio synth: battle sound effects and a looping tune for town / exploring / battles.
let ctx = null, master = null, mg = null, on = true, loop = null, song = null;
function ac() {
  if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); master = ctx.createGain(); master.gain.value = 0.45; master.connect(ctx.destination); mg = ctx.createGain(); mg.gain.value = 0.16; mg.connect(master); }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(f, t0, d, { type = 'square', vol = 0.12, slide = 0, out } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t0 + d);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g); g.connect(out || master); o.start(t0); o.stop(t0 + d + 0.02);
}
function noise(t0, d, vol = 0.2, f = 1200) {
  const n = Math.floor(ctx.sampleRate * d), b = ctx.createBuffer(1, n, ctx.sampleRate), x = b.getChannelData(0);
  for (let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = b; fl.type = 'lowpass'; fl.frequency.value = f; g.gain.value = vol;
  s.connect(fl); fl.connect(g); g.connect(master); s.start(t0);
}
const N = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const sfx = {
  unlock() { ac(); }, set on(v) { on = v; if (!v) music.stop(); else if (song) music.play(song, true); }, get on() { return on; },
  play(k) {
    if (!on || !ac()) return; const t = ctx.currentTime;
    switch (k) {
      case 'hit': noise(t, 0.12, 0.25, 1800); tone(180, t, 0.1, { type: 'square', vol: 0.08, slide: 0.5 }); break;
      case 'super': noise(t, 0.2, 0.3, 2500); tone(300, t, 0.18, { type: 'sawtooth', vol: 0.1, slide: 0.4 }); break;
      case 'weak': noise(t, 0.08, 0.12, 700); break;
      case 'faint': tone(N(64), t, 0.5, { type: 'triangle', vol: 0.2, slide: 0.3 }); break;
      case 'heal': [72, 76, 79, 84].forEach((m, i) => tone(N(m), t + i * 0.06, 0.2, { type: 'triangle', vol: 0.12 })); break;
      case 'level': [72, 76, 79, 84, 88].forEach((m, i) => tone(N(m), t + i * 0.07, 0.22, { vol: 0.07 })); break;
      case 'shake': tone(N(60), t, 0.08, { type: 'square', vol: 0.08 }); tone(N(55), t + 0.1, 0.08, { type: 'square', vol: 0.08 }); break;
      case 'caught': [67, 72, 76, 79, 84, 79, 84].forEach((m, i) => tone(N(m), t + i * 0.09, 0.2, { vol: 0.08 })); break;
      case 'status': tone(N(80), t, 0.15, { type: 'sine', vol: 0.12, slide: 0.6 }); break;
      case 'stat': tone(N(70), t, 0.2, { type: 'sine', vol: 0.1, slide: 1.6 }); break;
      case 'click': tone(N(84), t, 0.04, { vol: 0.05 }); break;
      case 'encounter': for (let i = 0; i < 6; i++) tone(N(60 + (i % 2) * 7 + i), t + i * 0.06, 0.08, { vol: 0.07 }); break;
      case 'win': [72, 76, 79, 84, 79, 84, 88].forEach((m, i) => tone(N(m), t + i * 0.1, 0.25, { vol: 0.08 })); break;
      case 'fuse': for (let i = 0; i < 10; i++) tone(N(60 + i * 3), t + i * 0.08, 0.3, { type: 'triangle', vol: 0.1 }); break;
      case 'rainbow': for (let i = 0; i < 8; i++) tone(N(84 + (i % 4) * 3), t + i * 0.05, 0.15, { type: 'sine', vol: 0.08 }); break;
      default: break;
    }
  },
};
const SONGS = {
  town: { bpm: 100, root: 60, prog: [0, 5, 7, 5], lead: [12, 16, 19, 16, 14, 12, 9, 12] },
  explore: { bpm: 118, root: 62, prog: [0, -3, 5, 7], lead: [7, 9, 12, 9, 14, 12, 9, 7] },
  battle: { bpm: 150, root: 57, prog: [0, 0, 5, 3], lead: [12, 15, 12, 10, 12, 17, 15, 10] },
  tamer: { bpm: 160, root: 55, prog: [0, 3, 5, 7], lead: [12, 14, 15, 17, 19, 17, 15, 14] },
};
export const music = {
  play(id, force) {
    if (song === id && loop && !force) return; song = id; this.stop();
    if (!on || !ac()) return;
    const s = SONGS[id], beat = 60 / s.bpm / 2; let next = ctx.currentTime + 0.05, step = 0;
    const tick = () => { while (next < ctx.currentTime + 0.5) { const r = s.root + s.prog[Math.floor(step / 8) % 4], i = step % 8; tone(N(r - 12 + (i % 2) * 7), next, beat * 0.9, { type: 'triangle', vol: 0.45, out: mg }); if (i % 2 === 0) tone(N(r + s.lead[(step / 2) % 8 | 0]), next, beat * 1.6, { vol: 0.1, out: mg }); next += beat; step++; } };
    tick(); loop = setInterval(tick, 150);
  },
  stop() { if (loop) clearInterval(loop); loop = null; },
};
