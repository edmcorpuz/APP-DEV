// "Bangon, Mactan" (rise, Mactan): an original battle anthem, procedurally generated with the
// Web Audio API, so there is no audio file. The style borrows from modern epic-rock anthems
// (a slow half-time stomp, booming kicks, huge claps, a dark minor choir and a big build), but
// every note, rhythm and progression here is original; no melody is taken from any song.
// Mindanao voices carry the tune:
//   agung     deep hanging gongs on the downbeats
//   kulintang a row of small tuned gongs playing the ostinato and the hook
//   dabakan   goblet-drum rolls leading into each new section
//   babendil  a thin timekeeper gong on the off-beats
// Sixteen bars: intro (choir and gongs), the stomp enters, then the full battle. Then it loops
// at full strength. Starts only from a user gesture (browser rule).
import { useSyncExternalStore } from 'react';

const BPM = 80, STEP = 60 / BPM / 4; // sixteenth notes, 16 per bar
// D minor pentatonic gong row (D F G A C D F A).
const ROW = [293.66, 349.23, 392, 440, 523.25, 587.33, 698.46, 880];
// Chords, two bars each: Dm, Bb, F, C. Pad voices and the sub-bass root.
const CHORDS = [[146.83, 174.61, 220], [116.54, 146.83, 174.61], [130.81, 174.61, 220], [130.81, 164.81, 196]];
const ROOTS = [73.42, 58.27, 87.31, 65.41];
// Kulintang: an ostinato under the verse, a rising hook over the full section ('.' = rest).
const OSTINATO = '0.2.3.2.0.2.4.3.'.split('');
const HOOK = ['3.4.5...4.3.2...', '3.4.5.7.6.5.4...', '5.4.3.2.3...0...', '2.3.4.3.2.1.0...'].map(b => b.split(''));
const KICK = 'x.....x.x.......'.split(''); // boom ... boom-boom: the half-time stomp
const CLAP = '....x.......x...'.split('');
const ROLL = '........x.xxxxxx'.split(''); // dabakan, last bar of each four

let ctx = null, master = null, wet = null, timer = null, nextTime = 0, step = 0, playing = false;
const listeners = new Set();
const emit = () => listeners.forEach(l => l());
const PREF = 'sugilanon.music';

export const musicPreferred = () => { try { return localStorage.getItem(PREF) !== 'off'; } catch { return true; } };
const remember = on => { try { localStorage.setItem(PREF, on ? 'on' : 'off'); } catch { /* private mode */ } };

// A big-hall reverb: stereo noise with an exponential tail.
function reverb(seconds = 3.2) {
  const len = Math.floor(ctx.sampleRate * seconds), ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.5;
  }
  const c = ctx.createConvolver();
  c.buffer = ir;
  return c;
}

function bus(send) {
  const b = ctx.createGain();
  b.connect(master);
  if (send > 0) { const s = ctx.createGain(); s.gain.value = send; b.connect(s).connect(wet); }
  return b;
}

function noise(seconds) {
  const len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const n = ctx.createBufferSource();
  n.buffer = buf;
  return n;
}

function gong(t, freq, { gain = 0.3, decay = 3, partials = [1, 2.0, 2.76, 5.4], bright = 0.3, send = 0.4 } = {}) {
  const out = bus(send);
  partials.forEach((p, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(freq * p, t);
    o.frequency.exponentialRampToValueAtTime(freq * p * 0.994, t + decay); // the sag of a struck gong
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * (i === 0 ? 1 : bright / i), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay / (1 + i * 0.6));
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + decay + 0.1);
  });
}

// The stomp: a deep pitched boom with a short click on top.
function kick(t, gain = 0.9) {
  const out = bus(0.2), o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(38, t + 0.28);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.65);
}

// A crowd-sized clap: three noise bursts a few milliseconds apart, drenched in the hall.
function clap(t, gain = 0.5) {
  const out = bus(0.8), f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1400;
  f.Q.value = 0.8;
  f.connect(out);
  [0, 0.012, 0.026].forEach((dt, i) => {
    const n = noise(0.18), g = ctx.createGain(), at = t + dt;
    g.gain.setValueAtTime(gain * (i === 2 ? 1 : 0.6), at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + (i === 2 ? 0.18 : 0.03));
    n.connect(g).connect(f);
    n.start(at);
  });
}

function dabakan(t, gain = 0.3) {
  const out = bus(0.3), o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(210, t);
  o.frequency.exponentialRampToValueAtTime(110, t + 0.08);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.16);
}

// Choir pad: detuned saws through a vowel-like filter, swelling in over each chord.
function choir(t, notes, seconds, gain = 0.05) {
  const out = bus(0.6), lp = ctx.createBiquadFilter(), vowel = ctx.createBiquadFilter(), g = ctx.createGain();
  lp.type = 'lowpass';
  lp.frequency.value = 1600;
  vowel.type = 'peaking';
  vowel.frequency.value = 800; // an open "ah"
  vowel.gain.value = 9;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.7);
  g.gain.setValueAtTime(gain, t + seconds - 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds + 0.3);
  lp.connect(vowel).connect(g).connect(out);
  notes.flatMap(n => [n, n * 2]).forEach(freq => [-7, 7].forEach(cents => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.detune.value = cents;
    o.connect(lp);
    o.start(t);
    o.stop(t + seconds + 0.4);
  }));
}

function sub(t, freq, seconds) {
  const out = bus(0), o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.05);
  g.gain.setValueAtTime(0.22, t + seconds - 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + seconds + 0.05);
}

function schedule() {
  while (nextTime < ctx.currentTime + 0.15) {
    const t = nextTime, s = step % 16, bar = Math.floor(step / 16) % 16;
    const part = step < 256 ? Math.floor(bar / 4) : 3; // 0 intro, 1 stomp, 2-3 full; full from the second loop
    const chord = Math.floor(bar / 2) % 4, barLen = STEP * 16;
    if (s === 0 && bar % 2 === 0) {
      choir(t, CHORDS[chord], barLen * 2, part >= 2 ? 0.06 : 0.045);
      if (part >= 1) sub(t, ROOTS[chord], barLen * 2);
    }
    if (s === 0 && (part >= 1 || bar % 2 === 0)) gong(t, 73.42, { gain: 0.45, decay: 4, bright: 0.22 }); // agung
    if (s === 8 && part >= 2) gong(t, 65.41, { gain: 0.3, decay: 3, bright: 0.22 }); // the answering agung
    if (part >= 1) {
      if (KICK[s] === 'x') kick(t, s === 0 ? 0.95 : 0.8);
      if (CLAP[s] === 'x') clap(t, part >= 2 ? 0.55 : 0.42);
    } else if (s === 0) kick(t, 0.5); // a distant heartbeat under the intro
    if (bar % 4 === 3 && ROLL[s] === 'x') dabakan(t, 0.18 + (s / 16) * 0.2); // a roll that swells into the next section
    if (part === 1 && s % 2 === 0) {
      const n = OSTINATO[s];
      if (n !== '.') gong(t, ROW[+n], { gain: 0.07, decay: 0.8, partials: [1, 2.4, 4.1], bright: 0.5, send: 0.3 });
    }
    if (part >= 2) {
      const n = HOOK[bar % 4][s];
      if (n !== '.') gong(t, ROW[+n], { gain: 0.1, decay: 1.2, partials: [1, 2.4, 4.1], bright: 0.5, send: 0.4 });
      if (s % 4 === 2) gong(t, 1318.5, { gain: 0.035, decay: 0.25, partials: [1, 2.7], bright: 0.6, send: 0.2 }); // babendil
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
  wetGain.gain.value = 0.5;
  wet.connect(wetGain).connect(master); // through master, so the fade-out takes the reverb tail too
  master.connect(comp).connect(ctx.destination);
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(0.55, ctx.currentTime + 1.5); // fade in
  step = 0;
  nextTime = ctx.currentTime + 0.1;
  timer = setInterval(schedule, 25);
  playing = true;
  if (save) remember(true);
  emit();
}

export function stopMusic({ remember: save = false } = {}) {
  if (!playing) return;
  clearInterval(timer);
  const g = master, w = wet, t = ctx.currentTime;
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1); // fade out
  setTimeout(() => { g.disconnect(); w.disconnect(); }, 1100);
  playing = false;
  if (save) remember(false);
  emit();
}

export const useMusicPlaying = () => useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => playing);
