// "Gubat sa Baybayon" (battle on the shore): an original, procedurally generated war-drum piece.
// Synthesized live with the Web Audio API, so there is no audio file and nothing copyrighted.
// Voices are modeled loosely on Mindanao gong-and-drum ensembles:
//   agung     deep hanging gongs on the strong beats
//   kulintang a row of small tuned gongs playing a driving ostinato
//   dabakan   a goblet drum with fast, fierce patterns
//   babendil  a thin timekeeper gong on the off-beats
// It builds over four bars, then loops. Starts only from a user gesture (browser rule).
import { useSyncExternalStore } from 'react';

const BPM = 138, STEP = 60 / BPM / 4; // sixteenth notes
const KULINTANG = [392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5]; // pentatonic-leaning gong row
const MELODY = [0, 2, 3, 2, 4, 3, 2, 0, 5, 4, 3, 4, 6, 5, 4, 2]; // indices into KULINTANG, one bar
const DRUM = 'x..xx.x.x.xxx.x.'.split(''); // dabakan, one bar
const FILL = 'x.xxx.xxx.xxxxxx'.split('');

let ctx = null, master = null, timer = null, nextTime = 0, step = 0, playing = false;
const listeners = new Set();
const emit = () => listeners.forEach(l => l());
const PREF = 'sugilanon.music';

export const musicPreferred = () => { try { return localStorage.getItem(PREF) !== 'off'; } catch { return true; } };
const remember = on => { try { localStorage.setItem(PREF, on ? 'on' : 'off'); } catch { /* private mode */ } };

function gong(t, freq, { gain = 0.3, decay = 1.8, partials = [1, 2.0, 2.76, 5.4], bright = 0.35 } = {}) {
  partials.forEach((p, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * p, t);
    o.frequency.exponentialRampToValueAtTime(freq * p * 0.995, t + decay); // the slight sag of a struck gong
    const level = gain * (i === 0 ? 1 : bright / i);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay / (1 + i * 0.6));
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + decay + 0.1);
  });
}

function drum(t, { pitch = 150, gain = 0.55, slap = false } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(pitch, t);
  o.frequency.exponentialRampToValueAtTime(pitch * 0.42, t + 0.14);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.25);
  // The skin: a short burst of filtered noise.
  const len = Math.floor(ctx.sampleRate * 0.06), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), ng = ctx.createGain();
  n.buffer = buf;
  f.type = 'bandpass';
  f.frequency.value = slap ? 2600 : 1200;
  ng.gain.value = slap ? 0.35 : 0.18;
  n.connect(f).connect(ng).connect(master);
  n.start(t);
}

function schedule() {
  while (nextTime < ctx.currentTime + 0.12) {
    const t = nextTime, s = step % 16, bar = Math.floor(step / 16) % 4;
    const build = Math.min(3, Math.floor(step / 16)); // layers arrive over the first bars
    if (s === 0) gong(t, 82.4, { gain: 0.5, decay: 3.2, bright: 0.25 }); // agung, low E
    if (s === 8) gong(t, 92.5, { gain: 0.35, decay: 2.4, bright: 0.25 });
    const pattern = bar === 3 ? FILL : DRUM;
    if (pattern[s] === 'x') drum(t, { pitch: s % 4 === 0 ? 120 : 175, gain: s % 4 === 0 ? 0.6 : 0.42, slap: s % 4 === 2 });
    if (build >= 1 && s % 2 === 0) gong(t, KULINTANG[MELODY[(s + bar * 2) % 16]], { gain: 0.11, decay: 0.7, partials: [1, 2.4, 4.1], bright: 0.5 });
    if (build >= 2 && s % 4 === 2) gong(t, 1318.5, { gain: 0.05, decay: 0.25, partials: [1, 2.7], bright: 0.6 }); // babendil
    if (build >= 3 && s % 2 === 1 && bar % 2 === 1) gong(t, KULINTANG[MELODY[s] + 1] ?? 1046.5, { gain: 0.06, decay: 0.4, partials: [1, 2.4], bright: 0.4 });
    nextTime += STEP;
    step++;
  }
}

export async function startMusic({ remember: save = true } = {}) {
  if (playing) return;
  ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  await ctx.resume();
  master = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp).connect(ctx.destination);
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(0.55, ctx.currentTime + 1.2); // fade in
  step = 0;
  nextTime = ctx.currentTime + 0.08;
  timer = setInterval(schedule, 25);
  playing = true;
  if (save) remember(true);
  emit();
}

export function stopMusic({ remember: save = false } = {}) {
  if (!playing) return;
  clearInterval(timer);
  const g = master, t = ctx.currentTime;
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8); // fade out
  setTimeout(() => g.disconnect(), 900);
  playing = false;
  if (save) remember(false);
  emit();
}

export const useMusicPlaying = () => useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => playing);
