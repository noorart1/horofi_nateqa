// Celebrations, drawn with anime.js (public/vendor): confetti bursts, the star that flies to a learned letter, medal pops.
// Every function resolves at once under "reduce motion", and nothing here blocks a click (the layer ignores the pointer).
// anime.js (about 118 KB) is not on the page's first paint: it loads at idle time once the page is drawn, or at once when
// a moment needs it earlier, and that moment then waits for it (a press ring or a beat note is just skipped meanwhile).
const ANIME_SRC = new URL('vendor/anime-4.5.0.umd.min.js', document.currentScript.src).href;
let A = null, animeLoading = null;
function loadAnime() {
  return animeLoading ??= new Promise((res, rej) => {
    const s = Object.assign(document.createElement('script'), { src: ANIME_SRC });
    s.onload = () => res(A = window.anime);
    s.onerror = () => { animeLoading = null; rej(); }; // tried again next time
    document.head.append(s);
  });
}
addEventListener('load', () => (window.requestIdleCallback || setTimeout)(() => loadAnime().catch(() => {}), { timeout: 4000 }));
const animate = (...a) => A.animate(...a), createTimeline = (...a) => A.createTimeline(...a), random = (...a) => A.random(...a),
  stagger = (...a) => A.stagger(...a), cleanInlineStyles = (...a) => A.cleanInlineStyles(...a);
// animations on page elements end with cleanInlineStyles, so the CSS hover/press transforms work again
const clean = { onComplete: cleanInlineStyles };
// An element animated again before its last animation ended (next pressed fast): the old one is reverted first.
// Left running, its cleanInlineStyles fires when the new one takes over and stops the new one half-way.
const running = new WeakMap();
const restart = (el, params) => { running.get(el)?.revert(); const a = animate(el, params); running.set(el, a); return a; };

const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z" fill="#ffcb05" stroke="#e9a400" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const PARTY = ['#ffcb05', '#e9a400', '#6ed2f2', '#9560a6', '#7cc242', '#ffffff']; // no letter red, no action blue
const calm = matchMedia('(prefers-reduced-motion: reduce)');

// Particles go in a layer inside whatever is on top: an open modal <dialog> renders above all of <body>.
function layer() {
  const host = document.querySelector('dialog[open]') || document.body;
  let fx = host.querySelector(':scope > .fx');
  if (!fx) {
    fx = document.createElement('div');
    fx.className = 'fx';
    fx.ariaHidden = 'true';
    host.append(fx);
  }
  return fx;
}

const centre = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

function bit(x, y, size) {
  const shape = random(0, 2);
  const el = document.createElement('i');
  el.className = 'bit';
  if (shape === 0) el.innerHTML = STAR; // stars, dots and paper strips
  else el.style.background = PARTY[random(0, PARTY.length - 1)];
  if (shape === 1) el.style.borderRadius = '50%';
  const w = shape === 2 ? size * 0.45 : size;
  Object.assign(el.style, { left: x - w / 2 + 'px', top: y - size / 2 + 'px', width: w + 'px', height: size + 'px' });
  layer().append(el);
  return el;
}

/**
 * Gentle version for "reduce motion" (often just Windows' "Animation effects" being off): a few stars
 * glow and fade where they are, around (x, y), with no travel.
 */
function twinkle(x, y, count = 6, radius = 80) {
  return Promise.all(Array.from({ length: count }, (_, k) => {
    const a = k / count * 2 * Math.PI + random(-20, 20) / 100;
    const el = bit(x + Math.cos(a) * radius, y + Math.sin(a) * radius, random(20, 30));
    el.innerHTML = STAR.replace('fill="#ffcb05"', 'fill="#ffffff"'); // white: they show on the yellow panel too
    el.style.background = 'none';
    return animate(el, {
      opacity: [0, 1, 0], scale: [0.8, 1, 0.9], duration: 1100, delay: k * 90, ease: 'inOutSine',
      onComplete: () => el.remove(),
    }).then(() => {});
  }));
}

/** Confetti that bursts out of (x, y), rises, and falls back under gravity. */
function burst(x, y, count = 36, reach = 1) {
  if (calm.matches) return twinkle(x, y, Math.min(Math.ceil(count / 5), 8), 50 + 40 * reach);
  const runs = Array.from({ length: count }, () => {
    const el = bit(x, y, random(10, 22));
    const a = random(0, 628) / 100, d = random(60, 170) * reach, t = random(900, 1500);
    return animate(el, {
      x: Math.cos(a) * d,
      y: [{ to: Math.sin(a) * d - 70 * reach, duration: t * 0.4, ease: 'outCubic' }, { to: Math.sin(a) * d + 140 * reach, duration: t * 0.6, ease: 'inQuad' }],
      rotate: random(-540, 540),
      scale: [{ from: 0, to: 1, duration: 180, ease: 'outBack(3)' }, { to: 0.6, duration: t - 180 }],
      opacity: [{ to: 1, duration: t * 0.7 }, { to: 0, duration: t * 0.3 }],
      onComplete: () => el.remove(),
    });
  });
  return Promise.all(runs.map(r => r.then(() => {})));
}

/** Confetti raining over the whole screen (the finish of all 28 letters). */
function rain(count = 90) {
  if (calm.matches) return twinkle(innerWidth / 2, innerHeight / 3, 10, Math.min(innerWidth, innerHeight) / 3);
  return Promise.all(Array.from({ length: count }, () => {
    const el = bit(random(0, innerWidth), -30, random(10, 20));
    return animate(el, {
      y: innerHeight + 60, x: random(-80, 80), rotate: random(-720, 720),
      duration: random(1800, 3200), delay: random(0, 1400), ease: 'inSine',
      onComplete: () => el.remove(),
    }).then(() => {});
  }));
}

/** Bouncy pop for an element that just earned something. */
const pop = (el, big = 1.3) => !el ? Promise.resolve()
  : calm.matches ? animate(el, { scale: [1, 1.06, 1], duration: 600, ease: 'inOutSine', ...clean }).then(() => {}) // gentle: a soft swell
  : animate(el, { scale: [1, big, 0.92, 1], rotate: [0, -8, 6, 0], duration: 700, ease: 'outQuad', ...clean }).then(() => {});

const inView = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; };

/** Reduced motion: no flying, just a calm fade, so the reward still lands. */
const glow = el => !el ? Promise.resolve()
  : animate(el, { opacity: [1, 0.35, 1], duration: 700, ease: 'inOutSine' }).then(() => {});

/**
 * A letter was listened to the end for the first time: the badge cheers, confetti bursts from it,
 * a star flies from the ring to the letter's tile (or to whatever reward is on screen), and every
 * seventh letter the new medal pops in. The payoff always happens where the child can see it.
 */
function celebrateLetter(i, { medal = null, all = false } = {}) {
  const badge = document.getElementById('badge'), tile = document.getElementById('list').children[i];
  if (calm.matches) { // gentle: stars glow around the badge, the tile and medal swell softly
    const [x, y] = centre(badge);
    return Promise.all([twinkle(x, y, 7, badge.offsetWidth / 2 + 26), glow(badge), pop(inView(tile) ? tile : null), pop(medal), all && rain()]).then(() => {});
  }
  const [bx, by] = centre(badge), ring = badge.offsetWidth / 2 + 10;
  burst(bx, by, 40);
  const cheer = animate(badge, { scale: [1, 1.35, 1], rotate: [0, 360], duration: 900, ease: 'outElastic(1, .6)' });

  // landing: the tile if it is on screen, else the new medal, else back into the badge after a loop
  const target = inView(tile) ? tile : inView(medal) ? medal : null;
  const sx = bx, sy = by - ring; // launch from the top of the ring, so the letter stays visible
  const [tx, ty] = target ? centre(target) : [bx, by];
  const star = bit(sx, sy, 56);
  star.innerHTML = STAR;
  star.style.background = 'none';
  const lift = Math.max(Math.min(sy, ty) - 120, 40);
  const fly = createTimeline()
    .add(star, { scale: [{ from: 0, to: 1.4, duration: 300, ease: 'outBack(2)' }] })
    .add(star, {
      x: target ? { to: tx - sx, duration: 900, ease: 'inOutSine' } : [{ to: 90, duration: 450, ease: 'outSine' }, { to: 0, duration: 450, ease: 'inSine' }],
      y: [{ to: lift - sy, duration: 450, ease: 'outQuad' }, { to: ty - sy, duration: 450, ease: 'inQuad' }],
      rotate: { to: 360, duration: 900 },
      scale: { to: 0.5, duration: 900, ease: 'inQuad' },
    })
    .add(star, { opacity: 0, duration: 150, onComplete: () => star.remove() });

  return fly.then(() => {
    const land = target || badge, [cx, cy] = centre(land);
    burst(cx, cy, 14, 0.5);
    pop(land, land === badge ? 1.15 : 1.25);
    if (medal && medal !== target) pop(medal, 1.6);
    if (medal && inView(medal)) burst(...centre(medal), 24, 0.7);
    if (all) rain();
    return cheer;
  }).then(() => {});
}

/**
 * The child finished writing a letter: the pad bounces, confetti bursts from the letter (more for more stars),
 * the stars pop in one by one, and three stars also rain confetti over the screen.
 */
function celebrateWriting(starEls, pad, stars) {
  const [x, y] = centre(pad);
  if (calm.matches) {
    twinkle(x, y, 6 + stars * 2, pad.offsetWidth / 3);
    return animate(starEls, { opacity: [0, 1], duration: 500, delay: (_, k) => k * 200 }).then(() => {});
  }
  animate(pad, { scale: [1, 1.05, 0.98, 1], duration: 700, ease: 'outQuad', ...clean });
  burst(x, y, 20 + stars * 14, 0.9 + stars * 0.3);
  if (stars === 3) rain(70);
  return animate(starEls, {
    scale: [{ from: 0, to: 1.25, duration: 350, ease: 'outBack(2.5)' }, { to: 1, duration: 300 }],
    rotate: { from: -120, to: 0, duration: 650 },
    delay: (_, k) => 250 + k * 220,
  }).then(() => {});
}

// --- small moments ---

/**
 * Letter tiles bounce in when the child actually scrolls to them: tiles below the fold wait hidden,
 * and each batch that comes into view enters together, in reading order. Tiles already on screen stay as they are.
 */
function enterGrid(list) {
  if (calm.matches || !('IntersectionObserver' in window)) return;
  const below = [...list.children].filter(t => t.getBoundingClientRect().top > innerHeight);
  below.forEach(t => { t.style.opacity = '0'; });
  const io = new IntersectionObserver(entries => {
    const now = entries.filter(e => e.isIntersecting).map(e => e.target);
    if (!now.length) return;
    now.forEach(t => io.unobserve(t));
    now.sort((a, b) => [...list.children].indexOf(a) - [...list.children].indexOf(b));
    // the browser's own animations, not anime.js: transform and opacity then run on the compositor, so a phone
    // scrolling past the grid doesn't wait for them on the main thread (anime.js stuttered here)
    now.forEach((t, k) => {
      t.style.opacity = '';
      t.animate([{ transform: 'translateY(24px) scale(.75)', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 550, delay: k * 45, easing: 'cubic-bezier(.34, 1.8, .64, 1)', fill: 'backwards' });
    });
  }, { threshold: 0.35 }); // no negative margin: the last row sits at the very bottom of the page and must still trigger
  below.forEach(t => io.observe(t));
}

/** A new letter pops into the badge (it may come again before the last pop ended, so: restart, and fixed end values). */
function swapBadge(glyph) {
  if (calm.matches) return restart(glyph, { opacity: [0, 1], duration: 300, ...clean });
  restart(glyph, { scale: [0.3, 1], rotate: [-25, 0], opacity: [0, 1], duration: 550, ease: 'outBack(2.2)', ...clean });
}

/** A ring ripples out of anything pressed, in its own shape (circle, pill or rounded card), growing ~18px all round. */
function ripple(el) {
  if (calm.matches) return;
  const r = el.getBoundingClientRect(), grow = 36, dialog = document.querySelector('dialog[open]');
  // pinned to the page, not the screen: a tap on a tile may scroll the page, and the ring must stay on the tile
  const [dx, dy] = dialog ? [0, 0] : [scrollX, scrollY];
  const ring = document.createElement('i');
  ring.className = 'ring';
  Object.assign(ring.style, { left: r.left + dx + 'px', top: r.top + dy + 'px', width: r.width + 'px', height: r.height + 'px',
    borderRadius: getComputedStyle(el).borderRadius, position: dialog ? 'fixed' : 'absolute' });
  (dialog || document.body).append(ring);
  animate(ring, { scaleX: [1, (r.width + grow) / r.width], scaleY: [1, (r.height + grow) / r.height], opacity: [0.7, 0],
    duration: 550, ease: 'outQuad', onComplete: () => ring.remove() });
}
// every button, tile, thumbnail and link answers a press with a ring (click, so starting a scroll doesn't)
document.addEventListener('click', e => {
  const el = e.target.closest('button, a[href], [role="button"]');
  if (el && !el.disabled) ripple(el);
}, true);

/** One stroke of the letter is written: a few stars sparkle at its end. */
function strokeSparkle(x, y) {
  return calm.matches ? twinkle(x, y, 4, 26) : burst(x, y, 10, 0.35);
}

/** The writing pad springs open. */
function openPad(pad) {
  if (calm.matches) return;
  restart(pad, { scale: [0.85, 1], opacity: [0, 1], duration: 550, ease: 'outBack(1.6)', ...clean });
}

// --- while a song plays: the page comes alive (player.js drives these) ---

const NOTES = [
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.5 4v12.5M12.5 4c3 .8 5.5 2.6 5.5 5.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="9.6" cy="17" rx="3.4" ry="2.7" fill="currentColor"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 17V5.5L19 3.5V15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="6" cy="17.2" rx="3.2" ry="2.6" fill="currentColor"/><ellipse cx="16.5" cy="15.2" rx="3.2" ry="2.6" fill="currentColor"/></svg>',
];
const NOTE_INK = ['#ffffff', '#9560a6', '#7cc242']; // they rise over the yellow panel: no yellow, no action blue
let notesAlive = 0;

/** On a strong beat a little note flies out of the singing letter, sways up and fades. */
function singNote(badge) {
  if (notesAlive >= 6 || document.hidden) return;
  const r = badge.getBoundingClientRect(), side = random(0, 1) ? 1 : -1;
  const note = document.createElement('i');
  note.className = 'note';
  note.innerHTML = NOTES[random(0, 1)];
  const size = random(22, 34);
  Object.assign(note.style, { left: r.left + scrollX + r.width / 2 + side * r.width * 0.32 - size / 2 + 'px',
    top: r.top + scrollY + r.height * 0.25 - size / 2 + 'px', width: size + 'px', height: size + 'px', color: NOTE_INK[random(0, 2)] });
  document.body.append(note);
  notesAlive++;
  const done = () => { note.remove(); notesAlive--; };
  if (calm.matches) return animate(note, { opacity: [0, 1, 0], duration: 1200, ease: 'inOutSine', onComplete: done });
  animate(note, {
    y: { to: -random(70, 110), ease: 'outSine' },
    x: [{ to: side * random(14, 26), ease: 'inOutSine' }, { to: side * random(30, 50), ease: 'inOutSine' }],
    rotate: { from: side * -20, to: side * 25 },
    scale: [{ from: 0.3, to: 1.1, duration: 300, ease: 'outBack(2)' }, { to: 0.8, duration: 1300 }],
    opacity: [{ to: 1, duration: 250 }, { to: 1, duration: 800 }, { to: 0, duration: 550 }],
    duration: 1600, onComplete: done,
  });
}

/** Soft bubbles, stars and notes drift up behind the page while a song plays; they fade out when it stops. */
const sky = document.createElement('div');
sky.className = 'ambient';
sky.ariaHidden = 'true';
document.body.prepend(sky);
let drift = null;
function floater() {
  if (document.hidden || sky.childElementCount >= 10) return;
  const kind = random(0, 2), el = document.createElement('i'), size = random(16, 40);
  el.className = 'float';
  if (kind === 0) el.classList.add('bubble');
  else el.innerHTML = kind === 1 ? STAR : NOTES[random(0, 1)];
  if (kind === 2) el.style.color = random(0, 1) ? '#9560a6' : '#6ed2f2';
  Object.assign(el.style, { left: random(2, 94) + 'vw', top: '100vh', width: size + 'px', height: size + 'px' });
  sky.append(el);
  const t = random(9000, 14000);
  animate(el, {
    y: -(innerHeight + 80), duration: t, ease: 'linear',
    x: { to: random(-60, 60), duration: t, ease: 'inOutSine' },
    rotate: random(-90, 90),
    opacity: [{ to: random(30, 55) / 100, duration: 1200 }, { to: random(30, 55) / 100, duration: t - 2400 }, { to: 0, duration: 1200 }],
    onComplete: () => el.remove(),
  });
}
function ambient(on) {
  if (calm.matches) return; // drifting decoration is exactly what "reduce motion" asks us to leave out
  if (on && !drift) {
    floater();
    drift = setInterval(floater, 1300);
  } else if (!on && drift) {
    clearInterval(drift);
    drift = null;
    animate(sky.children, { opacity: 0, duration: 700, onComplete: () => sky.replaceChildren() });
  }
}

// The moments other files call: at once when anime.js is here, else once it has loaded (a promise stays a promise).
// A press ring or a beat note that comes before it is skipped: shown late, it would be in the wrong place or off the beat.
const later = fn => (...a) => A ? fn(...a) : loadAnime().then(() => fn(...a), () => {});
const orSkip = fn => (...a) => { if (A) return fn(...a); loadAnime().catch(() => {}); };
burst = later(burst); rain = later(rain); twinkle = later(twinkle); celebrateLetter = later(celebrateLetter);
celebrateWriting = later(celebrateWriting); swapBadge = later(swapBadge);
strokeSparkle = later(strokeSparkle); openPad = later(openPad); ambient = later(ambient);
ripple = orSkip(ripple); singNote = orSkip(singNote);
