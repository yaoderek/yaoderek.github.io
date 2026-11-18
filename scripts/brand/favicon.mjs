// "dy" in Derek's hand: the d and the y of the signature, drawn by the same
// simulated pen as the intro, in cream on a Big Sur night.
//
//   npm run favicon -> public/favicon.svg, favicon-96x96.png, apple-touch-icon.png
import fs from 'node:fs';
import path from 'node:path';
import { launch } from './browser.mjs';
import { WORDS, simulate, toPage } from './signature.mjs';

const pub = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..', 'public');
const f = (n) => +n.toFixed(2);

// The d runs from its lead-in up to where the e begins; the y from its first
// stroke down through the descender loop, up to where it swings into the a.
// The y is slid left to sit right after the d.
const at = (word, x, y) => word.findIndex(([px, py]) => px === x && py === y);
const [derek, yao] = WORDS;
const D = derek.slice(at(derek, 10, 70), at(derek, 160, 40));
const Y = yao.slice(0, at(yao, 896, 52)).map(([x, y, c]) => [x - 560, y, c]);
const strokes = [D, Y].map((targets) => simulate(targets.map(toPage)));

const PAD = 4.2; // room between the letters and the tile's edge, in 32nds
const STROKE = 2.1;
const MIN_STEP = 0.35;

/** The two strokes as one path, fitted and centred in a 32×32 box. */
function letters() {
  const pts = strokes.flat();
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = (32 - 2 * PAD) / Math.max(x1 - x0, y1 - y0);
  const ox = (32 - (x1 - x0) * k) / 2;
  const oy = (32 - (y1 - y0) * k) / 2;
  return strokes
    .map((s) => {
      // The pen samples far finer than 32 units can show; keep a point only
      // once the line has moved a visible distance from the last one kept.
      const kept = [];
      for (const [x, y] of s) {
        const p = [(x - x0) * k + ox, (y - y0) * k + oy];
        const last = kept.at(-1);
        if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= MIN_STEP) kept.push(p);
      }
      const end = s.at(-1);
      kept.push([(end[0] - x0) * k + ox, (end[1] - y0) * k + oy]);
      return 'M' + kept.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L');
    })
    .join(' ');
}

function svg({ size = 32, rounded = true } = {}) {
  const rx = rounded ? ' rx="7.2"' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="night" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a2151"/>
      <stop offset="1" stop-color="#2c4a6e"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32"${rx} fill="url(#night)"/>
  <path d="${letters()}" fill="none" stroke="#f3e9d8" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
}

fs.writeFileSync(path.join(pub, 'favicon.svg'), svg());

const browser = await launch();
async function png(file, opts) {
  const page = await browser.newPage({ viewport: { width: opts.size, height: opts.size } });
  await page.setContent(`<body style="margin:0">${svg(opts)}</body><style>svg{display:block}</style>`);
  await page.screenshot({ path: path.join(pub, file), omitBackground: true });
}
await png('favicon-96x96.png', { size: 96 });
// iOS applies its own corner mask, so the touch icon is full-bleed
await png('apple-touch-icon.png', { size: 180, rounded: false });
await browser.close();
console.log('wrote public/favicon.svg, favicon-96x96.png, apple-touch-icon.png');
