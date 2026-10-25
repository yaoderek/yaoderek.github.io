// A coast redwood at dusk: tall rust trunk with the crown held high, built
// from drooping branch sprays that alternate sides, over a Big Sur sky.
//
//   npm run favicon -> public/favicon.svg, favicon-96x96.png, apple-touch-icon.png
import fs from 'node:fs';
import path from 'node:path';
import { launch } from './browser.mjs';

const pub = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..', 'public');
const f = (n) => +n.toFixed(2);
const CX = 16;

// [side, y, reach] — side 1 right, -1 left, 0 the leader at the top
const SPRAYS = [
  [0, 0, 0], [1, 5.6, 2.6], [-1, 6.9, 2.9], [1, 8.5, 3.7], [-1, 10.0, 4.1],
  [1, 11.6, 4.6], [-1, 13.2, 5.0], [1, 14.9, 5.3], [-1, 16.6, 4.8], [1, 18.2, 4.0], [-1, 19.6, 2.8],
];
function spray([s, y, reach]) {
  if (s === 0) return `M${CX} 1.8 C${CX + 1.3} 3.6 ${CX + 1.7} 5.6 ${CX + 0.9} 7 L${CX - 0.9} 7 C${CX - 1.7} 5.6 ${CX - 1.3} 3.6 ${CX} 1.8 Z`;
  // lifts off the trunk, reaches out, droops at the tip, and returns along a
  // nearly flat underside
  const x0 = CX - s * 1.0, tip = CX + s * reach;
  return `M${f(x0)} ${f(y - 1.2)} C${f(CX + s * reach * 0.5)} ${f(y - 2.3)} ${f(tip)} ${f(y - 0.4)} ${f(tip + s * 0.2)} ${f(y + 1.5)}`
    + ` C${f(CX + s * reach * 0.7)} ${f(y + 0.9)} ${f(CX + s * reach * 0.35)} ${f(y + 1.5)} ${f(x0)} ${f(y + 1.3)} Z`;
}
// one path per piece so overlapping sprays never cancel out under nonzero fill
const crown = [...SPRAYS.map(spray), `M${CX - 1.1} 6 L${CX + 1.1} 6 L${CX + 1.1} 19.6 L${CX - 1.1} 19.6 Z`];
const trunk = `M${CX - 0.7} 12 L${CX + 0.7} 12 L${CX + 1.25} 26.6 Q${CX + 1.5} 28.6 ${CX + 3.4} 29.4 L${CX - 3.4} 29.4 Q${CX - 1.5} 28.6 ${CX - 1.25} 26.6 Z`;

function svg({ size = 32, rounded = true } = {}) {
  const rx = rounded ? ' rx="7.2"' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1c3856"/>
      <stop offset="1" stop-color="#d9926c"/>
    </linearGradient>
    <radialGradient id="sun" cx="16" cy="30" r="15" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffd6a6" stop-opacity=".75"/>
      <stop offset="1" stop-color="#ffd6a6" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="32" height="32"${rx} fill="url(#sky)"/>
  <rect width="32" height="32"${rx} fill="url(#sun)"/>
  <path d="${trunk}" fill="#4e1d12"/>
  <g fill="#0f2219">
    ${crown.map((d) => `<path d="${d}"/>`).join('\n    ')}
  </g>
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
