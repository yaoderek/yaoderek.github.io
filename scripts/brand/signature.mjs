// The "derek yao" signature: a hand-authored monoline cursive path, sheared
// into a slant and smoothed with centripetal Catmull-Rom (sharp cusps kept).
// signatureStrokes() returns dense strokes normalised to width 1.

// y-up units, x-height 100. Each word is one continuous pen stroke;
// [x, y, 1] marks a sharp cusp.
export const WORDS = [
  [ // derek
    // d: bowl counter-clockwise, looped ascender, down the stem, exit
    [74, 82], [54, 100], [24, 96], [6, 66], [2, 28], [16, 4], [40, 0], [62, 16], [78, 46],
    [98, 116], [114, 172], [120, 206], [114, 220], [100, 212], [92, 182],
    [86, 130], [81, 76], [79, 32], [84, 9], [98, 0], [120, 8], [142, 28],
    // e
    [168, 50], [190, 72], [200, 92], [194, 106], [178, 104], [162, 84], [154, 54], [156, 22], [170, 2], [196, 0], [222, 14], [244, 36],
    // r: rise to a point, a little flag, then down the stem
    [262, 72], [270, 102, 1], [282, 94], [296, 96], [306, 102, 1],
    [302, 64], [298, 24], [304, 4], [322, 0], [346, 14], [366, 34],
    // e
    [392, 54], [414, 74], [424, 92], [418, 106], [402, 104], [386, 84], [378, 54], [380, 22], [394, 2], [420, 0], [446, 14], [468, 38],
    // k: looped ascender, stem, small loop arm, kicked leg
    [488, 80], [504, 140], [514, 186], [516, 212], [506, 222], [494, 206], [488, 170], [480, 110], [472, 50], [468, 2, 1],
    [474, 40], [488, 76], [508, 98], [530, 104], [542, 90], [532, 72], [508, 64], [490, 62, 1],
    [512, 50], [526, 24], [540, 4], [562, 0], [588, 14],
  ],
  [ // yao
    // y: u-like first half, looped descender
    [636, 72], [646, 100, 1], [640, 56], [640, 18], [654, 0], [678, 6], [696, 36], [706, 100, 1],
    [702, 40], [696, -24], [686, -78], [670, -108], [648, -112], [640, -94], [654, -64], [688, -32], [726, -6], [756, 18],
    // a: over the top, bowl counter-clockwise, stem, exit
    [776, 54], [794, 92, 1], [772, 102], [746, 96], [728, 68], [726, 30], [740, 4], [764, 0], [786, 18], [798, 52], [804, 100, 1],
    [800, 50], [800, 14], [814, 0], [838, 6], [860, 30],
    // o: up and around, finished with a little flourish off the top
    [880, 70], [894, 100, 1], [870, 100], [854, 80], [850, 44], [860, 12], [882, 0], [908, 8], [922, 40], [918, 80], [898, 100], [882, 96],
    [904, 92], [934, 94], [964, 104],
  ],
];

const SLANT = 0.22;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (v) => Math.hypot(v[0], v[1]);

// split a polyline at sharp corners so Catmull-Rom doesn't round them off
function splitCusps(pts) {
  const out = [[pts[0]]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = sub(pts[i], pts[i - 1]), b = sub(pts[i + 1], pts[i]);
    const cos = (a[0] * b[0] + a[1] * b[1]) / (len(a) * len(b) || 1);
    out.at(-1).push(pts[i]);
    if (pts[i].cusp || cos < -0.6) out.push([pts[i]]);
  }
  out.at(-1).push(pts.at(-1));
  return out;
}

function catmull(pts) {
  if (pts.length < 3) return pts;
  // reflect the end points to get tangents at the ends
  const P = [sub(pts[0], sub(pts[1], pts[0])), ...pts, sub(pts.at(-1), sub(pts.at(-2), pts.at(-1)))];
  const out = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const t0 = 0, t1 = t0 + Math.sqrt(len(sub(p1, p0))) || 1e-4;
    const t2 = t1 + (Math.sqrt(len(sub(p2, p1))) || 1e-4), t3 = t2 + (Math.sqrt(len(sub(p3, p2))) || 1e-4);
    const n = Math.max(2, Math.ceil(len(sub(p2, p1)) / 2.5));
    for (let k = i === 1 ? 0 : 1; k <= n; k++) {
      const t = t1 + (t2 - t1) * (k / n);
      const L = (a, b, ta, tb) => [0, 1].map((j) => ((tb - t) * a[j] + (t - ta) * b[j]) / (tb - ta));
      const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
      const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
      out.push(L(B1, B2, t1, t2));
    }
  }
  return out;
}

export function signatureStrokes() {
  // shear into a slant (y flipped to screen space), keeping the cusp flags
  const raw = WORDS.map((w) => w.map(([px, py, c]) => Object.assign([px + py * SLANT, -py], { cusp: !!c })));
  const strokes = raw.map((s) => splitCusps(s).flatMap((piece, i) => {
    const c = catmull(piece);
    return i === 0 ? c : c.slice(1);
  }));

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of strokes) for (const [px, py] of s) {
    minX = Math.min(minX, px); maxX = Math.max(maxX, px);
    minY = Math.min(minY, py); maxY = Math.max(maxY, py);
  }
  const w = maxX - minX;
  return {
    aspect: (maxY - minY) / w,
    strokes: strokes.map((s) => s.map(([px, py]) => [+((px - minX) / w).toFixed(5), +((py - minY) / w).toFixed(5)])),
  };
}
