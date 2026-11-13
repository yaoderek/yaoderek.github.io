import { describe, expect, test } from 'vitest';
import { EFFECTS, applyEffect, photoBoothName, type EffectId } from './photobooth';

/** A w×h frame filled with one colour. */
function frame(w: number, h: number, rgb: [number, number, number]) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < px.length; i += 4) {
    px.set(rgb, i);
    px[i + 3] = 255;
  }
  return px;
}

const rgbAt = (px: Uint8ClampedArray, p: number) => [px[p * 4], px[p * 4 + 1], px[p * 4 + 2]];

describe('EFFECTS', () => {
  test("is Apple's 3×3 grid with Normal in the middle", () => {
    expect(EFFECTS).toHaveLength(9);
    expect(EFFECTS[4].name).toBe('Normal');
  });
});

describe('applyEffect', () => {
  test('Normal and Glow leave the pixels alone', () => {
    for (const effect of ['normal', 'glow'] as EffectId[]) {
      const px = frame(4, 4, [10, 120, 200]);
      applyEffect(effect, px, 4, 4);
      expect(rgbAt(px, 0)).toEqual([10, 120, 200]);
    }
  });

  test('Black & White makes every channel equal', () => {
    const px = frame(2, 2, [200, 40, 90]);
    applyEffect('bw', px, 2, 2);
    const [r, g, b] = rgbAt(px, 0);
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  test('Sepia warms grey: more red than blue', () => {
    const px = frame(2, 2, [120, 120, 120]);
    applyEffect('sepia', px, 2, 2);
    const [r, , b] = rgbAt(px, 0);
    expect(r).toBeGreaterThan(b);
  });

  test('Thermal reads dark as cold blue and bright as hot', () => {
    const dark = frame(2, 2, [0, 0, 0]);
    applyEffect('thermal', dark, 2, 2);
    const [r0, , b0] = rgbAt(dark, 0);
    expect(b0).toBeGreaterThan(r0);

    const bright = frame(2, 2, [230, 230, 230]);
    applyEffect('thermal', bright, 2, 2);
    const [r1, g1, b1] = rgbAt(bright, 0);
    expect(r1).toBe(255);
    expect(g1).toBeGreaterThan(b1);
  });

  test('X-Ray inverts: black comes out bright, white comes out dark', () => {
    const black = frame(2, 2, [0, 0, 0]);
    applyEffect('xray', black, 2, 2);
    expect(rgbAt(black, 0)[2]).toBeGreaterThan(200);

    const white = frame(2, 2, [255, 255, 255]);
    applyEffect('xray', white, 2, 2);
    expect(rgbAt(white, 0)[2]).toBeLessThan(50);
  });

  test('Comic Book inks an edge black and keeps flat areas flat', () => {
    // Left half black, right half white: one hard vertical edge.
    const w = 8;
    const h = 8;
    const px = frame(w, h, [255, 255, 255]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w / 2; x++) px.set([0, 0, 0], (y * w + x) * 4);
    applyEffect('comic', px, w, h);
    const row = 4;
    expect(rgbAt(px, row * w + w / 2)[0]).toBeLessThan(40); // the edge
    expect(rgbAt(px, row * w + w - 2)[0]).toBe(255); // flat white
  });

  test('Colored Pencil is blank paper wherever there is no edge', () => {
    const px = frame(6, 6, [30, 80, 160]);
    applyEffect('pencil', px, 6, 6);
    expect(rgbAt(px, 3 * 6 + 3)).toEqual([252, 250, 244]);
  });

  test('Pop Art prints each quadrant in its own colours', () => {
    const w = 8;
    const h = 8;
    const px = frame(w, h, [128, 128, 128]);
    applyEffect('popart', px, w, h);
    const corners = [0, w - 1, (h - 1) * w, h * w - 1].map((p) => rgbAt(px, p).join());
    expect(new Set(corners).size).toBe(4);
  });
});

describe('photoBoothName', () => {
  test("names a picture the way Photo Booth does", () => {
    expect(photoBoothName(new Date(2026, 10, 13, 14, 41), [])).toBe(
      'Photo on 11-13-26 at 2.41 PM.jpg'
    );
    expect(photoBoothName(new Date(2026, 0, 5, 0, 7), [])).toBe('Photo on 1-5-26 at 12.07 AM.jpg');
  });

  test('numbers a second picture taken in the same minute', () => {
    const first = 'Photo on 11-13-26 at 2.41 PM.jpg';
    const second = 'Photo on 11-13-26 at 2.41 PM #2.jpg';
    expect(photoBoothName(new Date(2026, 10, 13, 14, 41), [first])).toBe(second);
    expect(photoBoothName(new Date(2026, 10, 13, 14, 41), [first, second])).toBe(
      'Photo on 11-13-26 at 2.41 PM #3.jpg'
    );
  });
});
