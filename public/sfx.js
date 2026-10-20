// Sound effects for the site and «دنياي السعيدة», all synthesized here with the Web Audio API: no speech, no recordings, no files.
// Bells, xylophone, soft bubbles and sparkles in a happy pentatonic, every voice with a soft start and end (no clicks).
// Usage: AudioManager.play('correct'). The playground (admin_sounds.php) lists them all and tunes the shared settings.
const AudioManager = (() => {
  // pitch: semitones · speed: tempo · bright: how much treble passes · space: the echo that lets bells ring
  const P = { volume: 0.7, muted: false, pitch: 0, speed: 1, bright: 1, space: 0.25 };
  const SAFE = 0.5;         // a child's ears: full volume is half of full scale, after a compressor
  const MAX_VOICES = 40;    // a storm of taps can't pile up sound
  let ctx = null, out = null, bus = null, soft = null, wet = null, voices = 0, noise = null;
  const last = {};

  function setup() {
    if (ctx) return ctx;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    bus = ctx.createGain();
    soft = ctx.createBiquadFilter(); soft.type = 'lowpass'; // nothing sharp reaches the ear
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
    out = ctx.createGain();
    // a little room: a soft, darkened echo
    const delay = ctx.createDelay(1), fb = ctx.createGain(), damp = ctx.createBiquadFilter();
    delay.delayTime.value = 0.16; fb.gain.value = 0.3; damp.type = 'lowpass'; damp.frequency.value = 2500;
    wet = ctx.createGain();
    bus.connect(soft);
    bus.connect(delay); delay.connect(damp); damp.connect(fb); fb.connect(delay); damp.connect(wet); wet.connect(soft);
    soft.connect(comp); comp.connect(out); out.connect(ctx.destination);
    apply(true);
    return ctx;
  }
  function apply(now) {
    if (!ctx) return;
    const t = ctx.currentTime, k = now ? 0.001 : 0.05;
    out.gain.setTargetAtTime(P.muted ? 0 : P.volume * SAFE, t, k);
    soft.frequency.setTargetAtTime(2500 + 5500 * P.bright, t, k);
    wet.gain.setTargetAtTime(P.space, t, k);
  }
  // mobile browsers start audio only inside a touch: wake it on every touch (cheap when already running)
  addEventListener('pointerdown', () => { if (setup() && ctx.state !== 'running') ctx.resume(); }, { capture: true, passive: true });

  const hz = f => f * 2 ** (P.pitch / 12);
  const at = t => ctx.currentTime + 0.012 + t / P.speed;
  const vary = (amt = 0.03) => 1 + (Math.random() * 2 - 1) * amt; // repeated sounds never quite the same
  const pick = a => a[Math.random() * a.length | 0];

  // one voice: an oscillator (optionally frequency-modulated) under an envelope that starts and ends at silence
  function note(freq, t, dur, o = {}) {
    if (voices >= MAX_VOICES) return;
    const start = at(t), len = dur / P.speed, peak = o.gain ?? 0.15, a = (o.attack ?? 0.004) / P.speed;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(hz(freq), start);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(hz(o.to), start + (o.sweep ?? dur) / P.speed);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(peak, start + a);
    if (o.hold) g.gain.setValueAtTime(peak, start + a + o.hold / P.speed);
    g.gain.exponentialRampToValueAtTime(0.0001, start + len);
    if (o.fm) { // FM: a second oscillator wobbles the first one's pitch, its depth dying away (a glassy shimmer)
      const m = ctx.createOscillator(), mg = ctx.createGain();
      m.frequency.value = hz(freq) * o.fm.ratio;
      mg.gain.setValueAtTime(hz(freq) * o.fm.index, start);
      mg.gain.exponentialRampToValueAtTime(1, start + len);
      m.connect(mg); mg.connect(osc.frequency);
      m.start(start); m.stop(start + len + 0.05);
    }
    osc.connect(g);
    let end = g;
    if (o.lp) { end = ctx.createBiquadFilter(); end.type = 'lowpass'; end.frequency.value = o.lp; g.connect(end); }
    end.connect(bus);
    voices++;
    osc.onended = () => { voices--; osc.disconnect(); g.disconnect(); };
    osc.start(start);
    osc.stop(start + len + 0.05);
  }
  // a bell or a glockenspiel: inharmonic partials, the high ones fading first
  function bell(f, t, dur = 0.9, gain = 0.1) {
    [[1, 1], [2.76, 0.32], [5.4, 0.1], [8.93, 0.04]].forEach(([r, a], i) => note(f * r, t, dur / (1 + i * 0.8), { gain: gain * a, attack: 0.003 }));
  }
  // a xylophone bar: a woody, quickly damped tone
  function xylo(f, t, gain = 0.14) {
    [[1, 1], [3.93, 0.22], [9.5, 0.05]].forEach(([r, a], i) => note(f * r, t, 0.35 / (1 + i * 1.5), { gain: gain * a, attack: 0.002, type: i ? 'sine' : 'triangle' }));
  }
  // a soft breath of filtered noise (made here, once: half a second of random samples)
  function hush(t, dur, o) {
    if (voices >= MAX_VOICES) return;
    if (!noise) {
      noise = ctx.createBuffer(1, ctx.sampleRate / 2, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const start = at(t), len = dur / P.speed;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise; src.loop = true;
    f.type = 'bandpass'; f.Q.value = o.q ?? 1;
    f.frequency.setValueAtTime(o.from, start);
    f.frequency.exponentialRampToValueAtTime(o.to ?? o.from, start + len);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(o.gain, start + len * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, start + len);
    src.connect(f); f.connect(g); g.connect(bus);
    voices++;
    src.onended = () => { voices--; src.disconnect(); f.disconnect(); };
    src.start(start, Math.random() * 0.3);
    src.stop(start + len + 0.05);
  }

  // notes of a C major pentatonic: anything played from it sounds happy together
  const N = { C4: 261.63, G4: 392, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, D6: 1174.66,
    E6: 1318.51, G6: 1567.98, A6: 1760, C7: 2093, E7: 2637 };
  const SPARKS = [N.G6, N.A6, N.C7, N.D6, N.E7, N.E6];

  // name → [Arabic name, English name, the shortest gap between two plays (ms), how it is made]
  const FX = {
    pop: ['لمس زرّ', 'Soft Pop', 40, () => { const v = vary(0.05); note(560 * v, 0, 0.09, { to: 300 * v, sweep: 0.07, gain: 0.2 }); note(1120 * v, 0, 0.05, { gain: 0.04 }); }],
    bubble: ['اختيار صورة', 'Bubble Click', 50, () => { const v = vary(0.06); note(380 * v, 0, 0.13, { to: 980 * v, sweep: 0.08, gain: 0.18 }); note(570 * v, 0.03, 0.09, { to: 1400 * v, sweep: 0.05, gain: 0.05 }); }],
    pickup: ['رفع صورة', 'Soft Pick Up', 80, () => { note(330, 0, 0.18, { type: 'triangle', to: 620, sweep: 0.12, gain: 0.13 }); xylo(N.G5 * vary(), 0.06, 0.07); }],
    swipe: ['تمرير الصورة', 'Card Swipe', 120, () => { hush(0, 0.3, { from: 500 * vary(0.1), to: 1700, q: 0.8, gain: 0.05 }); xylo(pick([N.E6, N.G6, N.A5]), 0.2, 0.06); }],
    move: ['تحريك صورة', 'Gentle Motion', 160, () => hush(0, 0.2, { from: 700 * vary(0.15), to: 1300, q: 1.4, gain: 0.03 })],
    snap: ['وضع صورة', 'Magnetic Snap', 60, () => { note(210, 0, 0.13, { to: 90, sweep: 0.08, gain: 0.26 }); xylo(N.C6, 0.02, 0.13); note(N.G6, 0.05, 0.18, { gain: 0.035 }); }],
    correct: ['إجابة صحيحة', 'Happy Chime', 120, () => pick([[N.C6, N.E6, N.G6], [N.G5, N.C6, N.E6], [N.E6, N.G6, N.C7]]).forEach((f, i) => bell(f, i * 0.08, 0.9, 0.11))],
    wrong: ['إجابة خاطئة', 'Gentle Boop', 150, () => { note(330, 0, 0.17, { type: 'triangle', to: 262, sweep: 0.14, gain: 0.12, lp: 1100 }); note(262, 0.17, 0.22, { type: 'triangle', to: 220, sweep: 0.16, gain: 0.1, lp: 1000 }); }],
    disappear: ['اختفاء صورة', 'Magic Disappear', 200, () => {
      note(1600, 0, 0.55, { to: 300, sweep: 0.5, gain: 0.06, fm: { ratio: 2.5, index: 2.5 } });
      [N.G6, N.E6, N.C6, N.A5].forEach((f, i) => bell(f, 0.05 + i * 0.07, 0.4, 0.04));
    }],
    appear: ['ظهور صورة', 'Magic Appear', 200, () => {
      note(300, 0, 0.5, { to: 1600, sweep: 0.45, gain: 0.05, fm: { ratio: 2.5, index: 2 } });
      [N.A5, N.C6, N.E6, N.G6].forEach((f, i) => bell(f, 0.05 + i * 0.07, 0.5, 0.045));
    }],
    match: ['زوجان متطابقان', 'Matching Melody', 150, () => { xylo(N.G5, 0, 0.12); xylo(N.C6, 0.11, 0.12); bell(N.E6, 0.22, 0.8, 0.08); bell(N.C7, 0.22, 0.6, 0.03); }],
    flip: ['قلب بطاقة', 'Card Flip', 60, () => { hush(0, 0.08, { from: 2600 * vary(0.1), to: 1800, q: 0.9, gain: 0.12 }); note(900 * vary(), 0.01, 0.06, { to: 640, sweep: 0.04, gain: 0.07 }); }],
    star: ['نجمة', 'Sparkle', 60, () => { for (let i = 0; i < 5; i++) bell(pick(SPARKS), i * 0.055, 0.45, 0.04); }],
    badge: ['وسام', 'Achievement Fanfare', 400, () => {
      [[N.C5, 0], [N.E5, 0.12], [N.G5, 0.24]].forEach(([f, t]) => note(f, t, 0.22, { type: 'triangle', gain: 0.1, lp: 3000 }));
      note(N.C6, 0.36, 0.9, { type: 'triangle', gain: 0.1, lp: 3000, hold: 0.25 });
      [N.C6, N.E6, N.G6].forEach(f => bell(f, 0.36, 1.2, 0.05));
      for (let i = 0; i < 4; i++) bell(pick(SPARKS), 0.5 + i * 0.07, 0.4, 0.025);
    }],
    victory: ['إتمام مرحلة', 'Victory Melody', 500, () => {
      [[N.C6, 0], [N.E6, 0.14], [N.G6, 0.28], [N.E6, 0.42], [N.G6, 0.56]].forEach(([f, t]) => xylo(f, t, 0.12));
      bell(N.C7, 0.72, 1.2, 0.08);
      [[N.C4, 0], [N.G4, 0.28], [N.C5, 0.72]].forEach(([f, t]) => note(f, t, 0.5, { type: 'triangle', gain: 0.08, lp: 1200 }));
    }],
    hint: ['تلميح', 'Soft Hint', 300, () => { note(N.A5, 0, 0.7, { attack: 0.08, gain: 0.05 }); note(N.E6, 0.14, 0.8, { attack: 0.1, gain: 0.04, fm: { ratio: 2, index: 0.4 } }); }],
    welcome: ['بداية اللعبة', 'Welcome Melody', 500, () => {
      [N.C5, N.G5, N.C6, N.E6, N.G6].forEach((f, i) => bell(f, i * 0.1, 0.9, 0.07));
      note(420, 0.55, 0.14, { to: 1000, sweep: 0.09, gain: 0.12 });
    }],
    celebrate: ['نهاية كلّ الألعاب', 'Celebration Melody', 1500, () => pick([() => {
      [N.C6, N.D6, N.E6, N.G6, N.E6, N.G6, N.A6, N.C7].forEach((f, i) => xylo(f, i * 0.12, 0.11));
      [[N.C4, 0], [N.G4, 0.48], [N.C5, 0.96]].forEach(([f, t]) => note(f, t, 0.6, { type: 'triangle', gain: 0.08, lp: 1200 }));
      [N.C6, N.E6, N.G6, N.C7].forEach(f => bell(f, 1, 1.6, 0.05));
      for (let i = 0; i < 10; i++) bell(pick(SPARKS), 1.1 + i * 0.08, 0.5, 0.025);
    }, () => { // a slower sung tune, ending on a soft C chord
      [N.C5, N.E5, N.G5, N.A5, N.C6, N.A5, 987.77, N.D6, N.C6].forEach((f, i) => note(f, i * 0.26, 0.38, { type: 'triangle', gain: 0.085 }));
      note(N.C5, 2.35, 0.48, { gain: 0.042 });
      note(N.G5, 2.35, 0.48, { gain: 0.04 });
      note(N.C6, 2.35, 0.55, { gain: 0.038 });
    }])()],
  };

  return {
    play(name) {
      const fx = FX[name];
      if (!fx || P.muted || !setup()) return;
      if (ctx.state !== 'running') ctx.resume();
      const now = performance.now();
      if (now - (last[name] || 0) < fx[2]) return;
      last[name] = now;
      try { fx[3](); } catch {} // a sound must never break the game
    },
    set(p) { Object.assign(P, p); apply(); },
    get: () => ({ ...P }),
    list: () => Object.entries(FX).map(([id, [ar, en]]) => ({ id, ar, en })),
    // silence everything now (sounds already scheduled included): the next play starts a fresh context
    stopAll() { if (ctx) { ctx.close(); ctx = null; noise = null; voices = 0; } },
  };
})();
