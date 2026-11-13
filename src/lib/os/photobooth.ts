/**
 * Photo Booth's effects, as pixel operations on a frame's RGBA bytes. They run
 * on raw pixels rather than canvas filters because Safari draws no canvas
 * filters at all. Glow is the exception: it's a blur, which the component
 * gets cheaply by scaling a frame down and back up.
 */

export type EffectId =
  | 'sepia'
  | 'bw'
  | 'thermal'
  | 'xray'
  | 'normal'
  | 'comic'
  | 'pencil'
  | 'glow'
  | 'popart';

/** Apple's first page of effects, in its 3×3 order, Normal in the middle. */
export const EFFECTS: { id: EffectId; name: string }[] = [
  { id: 'sepia', name: 'Sepia' },
  { id: 'bw', name: 'Black & White' },
  { id: 'thermal', name: 'Thermal Camera' },
  { id: 'xray', name: 'X-Ray' },
  { id: 'normal', name: 'Normal' },
  { id: 'comic', name: 'Comic Book' },
  { id: 'pencil', name: 'Colored Pencil' },
  { id: 'glow', name: 'Glow' },
  { id: 'popart', name: 'Pop Art' },
];

type Pixels = Uint8ClampedArray;

const luma = (px: Pixels, i: number) =>
  0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];

/** A 256-entry colour lookup, interpolated between stops at 0..1. */
function ramp(stops: [number, [number, number, number]][]): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let v = 0; v < 256; v++) {
    const t = v / 255;
    let k = 0;
    while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const [t0, c0] = stops[k];
    const [t1, c1] = stops[k + 1];
    const f = t1 === t0 ? 0 : Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
    for (let ch = 0; ch < 3; ch++) lut[v * 3 + ch] = c0[ch] + (c1[ch] - c0[ch]) * f;
  }
  return lut;
}

// Cold to hot, the way a thermal camera reads: deep blue through purple and
// red to yellow and white.
const THERMAL = ramp([
  [0, [10, 0, 120]],
  [0.25, [90, 0, 180]],
  [0.45, [225, 0, 90]],
  [0.65, [255, 120, 0]],
  [0.85, [255, 230, 0]],
  [1, [255, 255, 255]],
]);

// A film negative lit from behind: dark becomes a cold, bright blue-white.
const XRAY = ramp([
  [0, [235, 245, 255]],
  [0.35, [140, 185, 230]],
  [0.75, [30, 55, 95]],
  [1, [5, 10, 25]],
]);

function mapThrough(px: Pixels, lut: Uint8ClampedArray) {
  for (let i = 0; i < px.length; i += 4) {
    const v = Math.round(luma(px, i)) * 3;
    px[i] = lut[v];
    px[i + 1] = lut[v + 1];
    px[i + 2] = lut[v + 2];
  }
}

/** Edge strength at each pixel (Sobel on brightness); 0 along the border. */
function edges(px: Pixels, w: number, h: number): Float32Array {
  const l = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) l[p] = luma(px, p * 4);
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const gx =
        l[p - w + 1] + 2 * l[p + 1] + l[p + w + 1] - l[p - w - 1] - 2 * l[p - 1] - l[p + w - 1];
      const gy =
        l[p + w - 1] + 2 * l[p + w] + l[p + w + 1] - l[p - w - 1] - 2 * l[p - w] - l[p - w + 1];
      out[p] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return out;
}

// Four Warhol prints: each quadrant's shadows, midtones and highlights.
const POP_ART: [number, number, number][][] = [
  [[27, 20, 100], [255, 59, 141], [255, 225, 77]],
  [[11, 110, 79], [255, 127, 17], [142, 249, 243]],
  [[123, 31, 162], [0, 194, 255], [245, 247, 73]],
  [[217, 4, 41], [255, 183, 3], [254, 250, 224]],
];

/**
 * Apply an effect to a frame in place. `w`×`h` is the frame's size; Glow and
 * Normal leave the pixels as they are (Glow is drawn by the component).
 */
export function applyEffect(effect: EffectId, px: Pixels, w: number, h: number): void {
  switch (effect) {
    case 'sepia':
      for (let i = 0; i < px.length; i += 4) {
        const [r, g, b] = [px[i], px[i + 1], px[i + 2]];
        px[i] = 0.393 * r + 0.769 * g + 0.189 * b;
        px[i + 1] = 0.349 * r + 0.686 * g + 0.168 * b;
        px[i + 2] = 0.272 * r + 0.534 * g + 0.131 * b;
      }
      return;

    case 'bw':
      for (let i = 0; i < px.length; i += 4) {
        const v = (luma(px, i) - 128) * 1.25 + 128;
        px[i] = px[i + 1] = px[i + 2] = v;
      }
      return;

    case 'thermal':
      mapThrough(px, THERMAL);
      return;

    case 'xray':
      mapThrough(px, XRAY);
      return;

    case 'comic': {
      // Ink outlines over three flat tones of grey, like a printed panel.
      const e = edges(px, w, h);
      for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        const l = luma(px, i);
        const tone = l > 150 ? 255 : l > 80 ? 175 : 35;
        const v = e[p] > 160 ? 20 : tone;
        px[i] = px[i + 1] = px[i + 2] = v;
      }
      return;
    }

    case 'pencil': {
      // Strokes only where there's an edge, in a darker shade of the colour
      // underneath; everywhere else is paper.
      const e = edges(px, w, h);
      for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        const s = Math.min(1, e[p] / 180);
        px[i] = 252 - s * (252 - px[i] * 0.75);
        px[i + 1] = 250 - s * (250 - px[i + 1] * 0.75);
        px[i + 2] = 244 - s * (244 - px[i + 2] * 0.75);
      }
      return;
    }

    case 'popart': {
      // The whole frame at half size, four times, each in its own colours.
      const src = px.slice();
      const hw = Math.ceil(w / 2);
      const hh = Math.ceil(h / 2);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const qx = x < hw ? 0 : 1;
          const qy = y < hh ? 0 : 1;
          const sx = Math.min(w - 1, (x - qx * hw) * 2);
          const sy = Math.min(h - 1, (y - qy * hh) * 2);
          const l = luma(src, (sy * w + sx) * 4);
          const colour = POP_ART[qy * 2 + qx][l > 160 ? 2 : l > 85 ? 1 : 0];
          const i = (y * w + x) * 4;
          px[i] = colour[0];
          px[i + 1] = colour[1];
          px[i + 2] = colour[2];
        }
      }
      return;
    }

    case 'normal':
    case 'glow':
      return;
  }
}

/**
 * The name Photo Booth gives a picture, "Photo on 11-13-26 at 2.41 PM.jpg",
 * with " #2", " #3"… when one by that name was already taken this session.
 */
export function photoBoothName(date: Date, taken: string[]): string {
  const yy = String(date.getFullYear() % 100).padStart(2, '0');
  const hours = date.getHours();
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  const mm = String(date.getMinutes()).padStart(2, '0');
  const stem = `Photo on ${date.getMonth() + 1}-${date.getDate()}-${yy} at ${h12}.${mm} ${
    hours < 12 ? 'AM' : 'PM'
  }`;
  let name = `${stem}.jpg`;
  for (let n = 2; taken.includes(name); n++) name = `${stem} #${n}.jpg`;
  return name;
}
