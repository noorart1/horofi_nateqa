// The poem printed under each card picture, lit up half-line by half-line as it is sung (karaoke). Shared by the
// player (player.js) and the admin tool that records the timings (admin_lyrics.php).
// A song's cues are [[seconds, half-line], …] in time order: half-line 0..3 in singing order (top right, top left,
// bottom right, bottom left: each row is a verse, read right to left), or -1 while only the music plays.
// Where the four half-lines sit on every card, as fractions of the picture (measured on all 28: the layout is the same).
const LYR_BOXES = [[0.505, 0.822, 0.43, 0.068], [0.065, 0.822, 0.43, 0.068], [0.505, 0.892, 0.43, 0.068], [0.065, 0.892, 0.43, 0.068]];

/** Fills an overlay (it covers the picture exactly) with the four boxes. */
function lyricsBoxes(el) {
  el.replaceChildren(...LYR_BOXES.map(([x, y, w, h], k) => {
    const b = document.createElement('i');
    Object.assign(b.style, { left: x * 100 + '%', top: y * 100 + '%', width: w * 100 + '%', height: h * 100 + '%' });
    b.dataset.k = k;
    return b;
  }));
}

/** The half-line being sung at t, and how far into it (0..1, for the light sweeping right to left), or null. */
function lyricsAt(cues, t) {
  if (!cues?.length) return null;
  let i = -1;
  while (i + 1 < cues.length && cues[i + 1][0] <= t) i++;
  if (i < 0 || cues[i][1] < 0) return null;
  const end = cues[i + 1]?.[0] ?? cues[i][0] + 4; // the last one: a few seconds
  return { line: cues[i][1], p: Math.min(1, (t - cues[i][0]) / Math.max(0.3, end - cues[i][0])) };
}

/** Lights the half-line sung at t (null or no cues: all dark). */
function lyricsShow(el, cues, t) {
  const now = t == null ? null : lyricsAt(cues, t);
  for (const b of el.children) {
    const on = now?.line === +b.dataset.k;
    if (b.classList.contains('on') !== on) b.classList.toggle('on', on);
    if (on) b.style.setProperty('--p', (now.p * 100).toFixed(1) + '%');
  }
}
