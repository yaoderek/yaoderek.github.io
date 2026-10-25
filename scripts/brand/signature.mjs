// The "derek yao" signature, drawn by a simulated hand (see below) through
// hand-placed targets. signatureStrokes() returns timed strokes normalised to
// width 1.

// y-up units, x-height 100. Each entry is one continuous pen stroke;
// [x, y, 1] marks a sharp cusp. Written like a signature: a flicked lead-in,
// tall narrow loops, long connecting strokes, and a swash off the final "o"
// that sweeps back under the whole name.
export const WORDS = [
  [ // derek
    // lead-in flick up into the d
    [-46, 34], [10, 70], [80, 96, 1],
    // d: bowl counter-clockwise, tall looped ascender, down the stem, exit
    [56, 104], [24, 96], [5, 64], [2, 26], [18, 2], [44, -2], [68, 16], [84, 48],
    [104, 130], [124, 210], [132, 262], [124, 280], [108, 268], [98, 226],
    [90, 150], [84, 80], [82, 30], [88, 6], [104, -2], [130, 10], [160, 40],
    // e
    [186, 66], [210, 92], [216, 110], [206, 120], [188, 110], [172, 80], [168, 40], [178, 8], [202, -2], [232, 8], [262, 36],
    // r: rise to a point, a little flag, then down the stem
    [282, 74], [292, 108, 1], [306, 96], [322, 100], [334, 108, 1],
    [330, 64], [326, 22], [334, 2], [356, -2], [384, 14], [410, 38],
    // e
    [436, 62], [460, 90], [468, 108], [458, 120], [440, 110], [424, 80], [420, 40], [430, 8], [456, -2], [486, 8], [514, 36],
    // k: tall looped ascender, stem, small loop arm, kicked leg
    [536, 84], [556, 160], [570, 226], [574, 268], [562, 282], [548, 264], [540, 214], [530, 140], [520, 60], [514, 0, 1],
    [522, 46], [538, 84], [562, 106], [588, 112], [600, 96], [588, 76], [560, 68], [540, 66, 1],
    [566, 52], [584, 24], [600, 4], [626, -2], [660, 14], [690, 40],
  ],
  [ // yao
    // y: u-like first half, a long descender loop that swings back up into the a
    [742, 60], [756, 104, 1], [748, 56], [748, 16], [764, -2], [792, 6], [812, 40], [824, 104, 1],
    [818, 30], [808, -50], [794, -120], [770, -170], [740, -180], [726, -160], [740, -120], [780, -74], [830, -34], [870, 4],
    // a: over the top, bowl counter-clockwise, stem, exit
    [896, 52], [918, 94, 1], [892, 106], [862, 98], [842, 66], [840, 26], [856, 0], [884, -4], [910, 18], [924, 56], [932, 106, 1],
    [926, 50], [926, 12], [942, -2], [970, 6], [994, 32],
    // o, closed at the top
    [1016, 72], [1032, 104, 1], [1004, 106], [984, 82], [980, 42], [994, 8], [1020, -4], [1050, 8], [1064, 46], [1058, 88], [1034, 106], [1014, 98],
    // swash: flick out to the right, then a fast curved sweep back under the name
    [1050, 92], [1092, 72], [1114, 32], [1102, -14], [1052, -52], [950, -80], [800, -96],
    [620, -100], [440, -92], [280, -76], [150, -56], [80, -42],
  ],
];

const SLANT = 0.4;
const NARROW = 0.86; // letters run narrow and lean hard, like a fast hand

// ---------- a simulated hand ----------
// The points above aren't traced. They're targets for a pen with momentum,
// like a wrist: it accelerates toward the next target, cuts the corner, and
// moves on before it quite arrives, overshooting slightly. Cusps make it
// come almost to rest and turn. The speed, rounding and wobble all come out
// of that motion, and every sample keeps the time it was drawn at.

// two springs in series: an "intent" chases the targets, and the pen chases
// the intent. One spring alone leaves kinks where it switches targets; two
// give the smooth, continuous curvature of a real wrist.
const INTENT = { omega: 70, zeta: 0.9 };
const HAND = { omega: 52, zeta: 0.82 };
const REACH = 12;     // how close the intent gets before heading for the next target
const REACH_CUSP = 3;
const DT = 1 / 2000;

// seeded so every render is the same hand
let seed = 11;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

function humanise(word) {
  // a hand is never exact: each target lands a little off, the baseline
  // drifts, and letters swell and shrink as the writer goes
  return word.map(([x, y, c]) => {
    const size = 1 + 0.07 * Math.sin(x / 97 + 1.3);
    const drift = 7 * Math.sin(x / 210 + 0.4);
    return [x + (rand() - 0.5) * 5, y * size + drift + (rand() - 0.5) * 4, c];
  });
}

function spring(p, v, target, { omega, zeta }) {
  const ax = omega * omega * (target[0] - p[0]) - 2 * zeta * omega * v[0];
  const ay = omega * omega * (target[1] - p[1]) - 2 * zeta * omega * v[1];
  v[0] += ax * DT; v[1] += ay * DT;
  p[0] += v[0] * DT; p[1] += v[1] * DT;
}

function simulate(targets) {
  const start = targets[0];
  // both already moving toward the second target as the pen lands
  const lead = [(targets[1][0] - start[0]) * 3, (targets[1][1] - start[1]) * 3];
  const ip = [...start.slice(0, 2)], iv = [...lead];
  const pp = [...start.slice(0, 2)], pv = [...lead];
  let t = 0, i = 1;
  const out = [[pp[0], pp[1], 0]];
  for (let step = 0; step < 400000; step++) {
    const target = targets[Math.min(i, targets.length - 1)];
    spring(ip, iv, target, INTENT);
    spring(pp, pv, ip, HAND);
    t += DT;
    const last = out.at(-1);
    if (Math.hypot(pp[0] - last[0], pp[1] - last[1]) > 1.2) out.push([pp[0], pp[1], t]);
    if (i < targets.length) {
      const reach = target[2] ? REACH_CUSP : REACH;
      if (Math.hypot(target[0] - ip[0], target[1] - ip[1]) < reach) i++;
    } else if (Math.hypot(target[0] - pp[0], target[1] - pp[1]) < 2) break;
  }
  out.push([pp[0], pp[1], t]);
  return out;
}

export function signatureStrokes() {
  // slant and narrow the targets (y flipped to screen space), then let the
  // hand draw through them
  const strokes = WORDS.map((w) => simulate(humanise(w).map(([px, py, c]) => [px * NARROW + py * SLANT, -py, !!c])));

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of strokes) for (const [px, py] of s) {
    minX = Math.min(minX, px); maxX = Math.max(maxX, px);
    minY = Math.min(minY, py); maxY = Math.max(maxY, py);
  }
  const w = maxX - minX;
  return {
    aspect: (maxY - minY) / w,
    // [x, y, seconds since this stroke's pen-down]
    strokes: strokes.map((s) => s.map(([px, py, t]) => [+((px - minX) / w).toFixed(5), +((py - minY) / w).toFixed(5), +t.toFixed(4)])),
  };
}
