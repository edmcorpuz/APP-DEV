// "Kaadlawon sa Mactan" (dawn at Mactan): an original, procedurally generated piece, slow and
// ceremonial, that rises the way the sun rises in the mural. Synthesized live with the Web Audio
// API, so there is no audio file and nothing copyrighted. Voices modeled loosely on Mindanao
// gong ensembles, played at a processional pace instead of a battle tempo:
//   drone     a low open fifth on D, breathing slowly: the sea before dawn
//   agung     deep hanging gongs, a pair a whole step apart, one per bar
//   dabakan   a soft heartbeat on the goblet drum
//   kulintang a sparse call-and-response melody on a minor pentatonic gong row
//   bell      one high, distant gong at the top of each cycle
// Everything passes through a generated reverb for depth. Eight bars, then it loops.
// Starts only from a user gesture (browser rule). File name kept so imports stay the same.
import { useSyncExternalStore } from 'react';

const BPM = 66, STEP = 60 / BPM / 2; // eighth notes, 8 per bar
const ROW = [293.66, 349.23, 392, 440, 523.25, 587.33, 698.46]; // D F G A C D F: minor pentatonic gong row
// Kulintang phrase for bars 5 to 8 (index into ROW, '.' = rest): a call, then its answer.
const PHRASE = ('0..2..3.' + '4...3.2.' + '2.3.5..4' + '3...0...').split('');
const HEART = 'x..x....'.split(''); // dabakan, one bar

let ctx = null, master = null, wet = null, timer = null, nextTime = 0, step = 0, playing = false, drones = [];
const listeners = new Set();
const emit = () => listeners.forEach(l => l());
const PREF = 'sugilanon.music';

export const musicPreferred = () => { try { return localStorage.getItem(PREF) !== 'off'; } catch { return true; } };
const remember = on => { try { localStorage.setItem(PREF, on ? 'on' : 'off'); } catch { /* private mode */ } };

// A hall-like reverb: stereo noise with an exponential tail.
function reverb(seconds = 4) {
  const len = Math.floor(ctx.sampleRate * seconds), ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  const c = ctx.createConvolver();
  c.buffer = ir;
  return c;
}

function out(node, send) {
  node.connect(master);
  if (send > 0) { const s = ctx.createGain(); s.gain.value = send; node.connect(s).connect(wet); }
}

function gong(t, freq, { gain = 0.3, decay = 4, partials = [1, 2.0, 2.76, 5.4], bright = 0.3, send = 0.5 } = {}) {
  const bus = ctx.createGain();
  out(bus, send);
  partials.forEach((p, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * p, t);
    o.frequency.exponentialRampToValueAtTime(freq * p * 0.994, t + decay); // the slight sag of a struck gong
    const level = gain * (i === 0 ? 1 : bright / i);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay / (1 + i * 0.5));
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + decay + 0.1);
  });
}

function heartbeat(t, accent) {
  const o = ctx.createOscillator(), g = ctx.createGain(), bus = ctx.createGain();
  out(bus, 0.25);
  o.frequency.setValueAtTime(accent ? 92 : 78, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.35);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.32, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + 0.6);
}

function startDrone(t) {
  const lp = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), depth = ctx.createGain();
  lp.type = 'lowpass';
  lp.frequency.value = 420;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.11, t + 6); // the drone fades in under the first gongs
  lfo.frequency.value = 0.07; // one slow breath every ~14 seconds
  depth.gain.value = 0.04;
  lfo.connect(depth).connect(g.gain);
  lp.connect(g);
  out(g, 0.4);
  const voices = [[73.42, 0], [73.42 * 1.004, 0], [110, 0]].map(([f]) => {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    o.connect(lp);
    o.start(t);
    return o;
  });
  lfo.start(t);
  drones = [...voices, lfo];
}

function schedule() {
  while (nextTime < ctx.currentTime + 0.2) {
    const t = nextTime, s = step % 8, bar = Math.floor(step / 8) % 8, firstPass = step < 64;
    if (s === 0 && bar === 0) gong(t, 1174.66, { gain: 0.035, decay: 6, partials: [1, 2.7, 5.1], bright: 0.4, send: 0.9 }); // distant bell
    if (s === 0) gong(t, bar % 2 ? 65.41 : 73.42, { gain: 0.5, decay: 7, bright: 0.22 }); // agung pair: D, then C
    if (s === 4 && bar % 4 === 3) gong(t, 55, { gain: 0.38, decay: 8, bright: 0.18 }); // a lower answer every fourth bar
    if ((!firstPass || bar >= 2) && HEART[s] === 'x') heartbeat(t, s === 0);
    if (!firstPass || bar >= 4) {
      const n = PHRASE[(bar % 4) * 8 + s];
      if (n !== '.') gong(t, ROW[+n], { gain: 0.09, decay: 2.6, partials: [1, 2.4, 4.1], bright: 0.4, send: 0.7 });
    }
    nextTime += STEP;
    step++;
  }
}

export async function startMusic({ remember: save = true } = {}) {
  if (playing) return;
  ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  await ctx.resume();
  master = ctx.createGain();
  wet = reverb();
  const wetGain = ctx.createGain(), comp = ctx.createDynamicsCompressor();
  wetGain.gain.value = 0.6;
  wet.connect(wetGain).connect(master); // through master, so the fade-out takes the reverb tail too
  master.connect(comp).connect(ctx.destination);
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(0.6, ctx.currentTime + 2.5); // slow fade in
  step = 0;
  nextTime = ctx.currentTime + 0.1;
  startDrone(nextTime);
  timer = setInterval(schedule, 25);
  playing = true;
  if (save) remember(true);
  emit();
}

export function stopMusic({ remember: save = false } = {}) {
  if (!playing) return;
  clearInterval(timer);
  const g = master, w = wet, t = ctx.currentTime, voices = drones;
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5); // fade out
  setTimeout(() => { voices.forEach(o => o.stop()); g.disconnect(); w.disconnect(); }, 1600);
  drones = [];
  playing = false;
  if (save) remember(false);
  emit();
}

export const useMusicPlaying = () => useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => playing);
