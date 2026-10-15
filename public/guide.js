// Shared by the writing practice (writing.js) and the stroke recorder (admin_strokes.php).
// Stroke points are stored as [x, y] in 0..1 of a square box, so both must draw the letter
// at exactly the same size and place in that box: always through guideGlyph().
const GUIDE_FONT = px => `700 ${px}px Vazirmatn, Tahoma, sans-serif`;

// Google Fonts serves Arabic as a separate subset, so load it with the letter itself.
async function guideFontReady(glyph) {
  try { await document.fonts.load(GUIDE_FONT(100), glyph); } catch {}
}

// The isolated letter, centred on its outline; 0.6 of the box tall at most, never wider than 0.8 of it.
function guideGlyph(g, glyph, S, color) {
  g.save();
  g.direction = 'ltr'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.font = GUIDE_FONT(S);
  let m = g.measureText(glyph);
  const big = Math.max(m.actualBoundingBoxLeft + m.actualBoundingBoxRight, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
  g.font = GUIDE_FONT(Math.min(0.6 * S, 0.8 * S * S / big));
  m = g.measureText(glyph);
  g.fillStyle = color;
  g.fillText(glyph, S / 2 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2,
    S / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
  g.restore();
}

// Stroke as a path in canvas pixels; a one-point stroke (a dot) becomes a round dot.
function guideLine(g, pts, S) {
  g.beginPath();
  pts.forEach(([x, y], i) => i ? g.lineTo(x * S, y * S) : g.moveTo(x * S, y * S));
  if (pts.length === 1) g.lineTo(pts[0][0] * S + 0.1, pts[0][1] * S);
  g.stroke();
}

const guideLen = pts => pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

// First `len` of a stroke's length.
function guideCut(pts, len) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], d = Math.hypot(bx - ax, by - ay);
    if (len >= d) { out.push(pts[i]); len -= d; continue; }
    out.push([ax + (bx - ax) * len / d, ay + (by - ay) * len / d]);
    break;
  }
  return out;
}

// Plays the writing of the letter: calls render(partial strokes) every frame, then onEnd().
// Returns a function that stops it.
function guideAnimate(strokes, render, onEnd = () => {}) {
  const SPEED = 0.6, PAUSE = 250; // box widths per second; ms between strokes
  const lens = strokes.map(guideLen), durs = lens.map(l => Math.max(l / SPEED * 1000, 200));
  let stopped = false, t0 = null;
  requestAnimationFrame(function frame(now) {
    if (stopped) return;
    t0 ??= now;
    let t = now - t0;
    const partial = [];
    for (let k = 0; k < strokes.length; k++) {
      if (t >= durs[k] + PAUSE) { partial.push(strokes[k]); t -= durs[k] + PAUSE; continue; }
      partial.push(guideCut(strokes[k], lens[k] * Math.min(t / durs[k], 1)));
      render(partial);
      return requestAnimationFrame(frame);
    }
    render(partial);
    onEnd();
  });
  return () => { stopped = true; };
}
